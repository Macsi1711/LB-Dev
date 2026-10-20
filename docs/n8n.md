# Contrato con n8n y puesta en producción

## Contrato (no romper)

| Flujo | Rol       | Operación                                                                                                 | Objeto              |
| ----- | --------- | --------------------------------------------------------------------------------------------------------- | ------------------- |
| Bot   | `n8n_bot` | SELECT con SQL libre generado por la IA                                                                   | `articulos`         |
| Bot   | `n8n_app` | `select activo from usuarios_telegram where chat_id = $1`                                                 | `usuarios_telegram` |
| Bot   | `n8n_app` | INSERT                                                                                                    | `consultas_bot`     |
| Bot   | `n8n_bot` | `select trim("Codigo") as codigo, foto from articulos where foto is not null and trim("Codigo") = any(…)` | `articulos`         |

**Retirados (ADR-008):** el flujo "Lois Fotos" (escribía `"Imagen"` y `fotos_sin_match` desde la
carpeta de Drive) y el webhook "Lois Subir foto". Las fotos se cargan solo desde la web y van a
Supabase Storage.

`familias` ya existe en producción con `"Código"` y `"Nombre"` (con tilde y sin clave): tampoco
se renombra. La web solo le agrega `es_producto` y la lee por la vista `v_familias`.

**Fotos:** están en Supabase Storage, bucket público `fotos`. `articulos.foto` tiene la ruta de la
foto grande (`<id>/<token>.jpg`) y la miniatura está al lado (`<id>/<token>.mini.jpg`). El link
público es `<SUPABASE_URL>/storage/v1/object/public/fotos/<foto>`. `"Imagen"` queda en la tabla con
el link de Drive de antes (no se borran columnas): ya no se usa para las fotos ni se escribe; si
alguien la escribiera, el formato sigue siendo `https://drive.google.com/file/d/<ID>/view?usp=drivesdk` (lo
verifica `apps/web/tests/integration/n8n-contract.int-spec.ts`).

## Antes de aplicar las migraciones en producción

1. **Duplicados de código.** No se agrega UNIQUE sobre `"Codigo"`. Revisá igual:
   ```sql
   select upper(trim("Codigo")), count(*) from articulos group by 1 having count(*) > 1;
   ```
2. **Cómo se conecta hoy n8n.** Si usa el usuario `postgres` (dueño de las tablas), RLS no lo
   afecta y nada se corta al habilitarlo. Si usa otro rol, primero hay que pasarlo a
   `n8n_bot`/`n8n_app`.
3. **El prompt del bot** nunca tiene que generar `SELECT *`: `articulos` suma las columnas `id` y
   `actualizado_en`, y el `UNION ALL` del bot cuenta columnas.
4. Aplicar con la guía paso a paso de [produccion.md](produccion.md): inspección de solo
   lectura, simulacro, respaldo y migraciones con el OK del dueño.

## Contraseñas de los roles

Los roles se crean **sin contraseña**. Cargalas en el SQL editor de Supabase, nunca en el repo:

```sql
alter role n8n_bot password '<generala-con-un-gestor-de-contraseñas>';
alter role n8n_app password '<otra-distinta>';
```

## Conexión desde n8n (Session pooler)

Copiá el host de Supabase → Connect → **Session pooler**. Es del estilo
`aws-0-<región>.pooler.supabase.com`.

| Credencial en n8n           | Host            | Puerto | Base       | Usuario                 | SSL     |
| --------------------------- | --------------- | ------ | ---------- | ----------------------- | ------- |
| `Lois - bot (solo lectura)` | host del pooler | 5432   | `postgres` | `n8n_bot.<project-ref>` | require |
| `Lois - app`                | host del pooler | 5432   | `postgres` | `n8n_app.<project-ref>` | require |

Como cadena: `postgresql://n8n_bot.<project-ref>:<contraseña>@<host-del-pooler>:5432/postgres?sslmode=require`

## Cambios en los flujos

- **Lois SQL:** el nodo _Execute a SQL query1_ pasa a `Lois - bot`. Después de _Edit Fields_,
  chequear la lista blanca con `Lois - app`. Al final de cada camino, insertar en
  `consultas_bot` (chat_id, fuente, texto, sql_generado, cantidad, error). Si el usuario no está
  autorizado, insertar con `error = 'no autorizado'`.
- **Lois SQL, fotos (ADR-008):** después de _Execute a SQL query1_, _Buscar fotos en Storage_ trae
  `foto` de los códigos que devolvió el SQL (una sola consulta) y _Sumar fotos de Storage_ le suma
  a cada resultado su `foto_url` pública. Tiene foto el que tiene `foto_url`; Telegram la toma
  directo del link (_Enviar foto de Storage_). Sin Drive: no hay nodos de Google Drive ni
  credencial. El flujo está en [`n8n/lois-sql.json`](../n8n/lois-sql.json).

Si se agregan familias nuevas en `articulos`, corré `select public.sincronizar_familias();`.

## Webhook "Lois Consulta web" (audio y foto desde la web)

La web le manda un audio o una foto y n8n le devuelve **el texto a buscar**. La búsqueda la hace
la web. Decisión en el [ADR-005](adr/005-audio-y-foto-por-n8n.md).

El flujo está en [`n8n/lois-consulta-web.json`](../n8n/lois-consulta-web.json). Para cargarlo en
otro n8n: **Import from File**, reemplazar `<PROJECT_REF>` y `<CLAVE_PUBLISHABLE>` en el nodo
_Validar sesión_ (salen de Supabase → Settings → API Keys; la publishable no es secreta), elegir la
credencial de OpenAI del bot en _Transcribir audio_ y _Leer foto_, y activarlo. La URL de
producción (`/webhook/…`, no `/webhook-test/…`) va en `VITE_N8N_CONSULTA_URL` en Vercel.

**Pedido**

- `POST` a la URL del webhook.
- Header `Authorization: Bearer <token de Supabase del usuario>`.
- Cuerpo `multipart/form-data`:
  - `tipo`: `audio` o `foto`.
  - `archivo`: el audio (`audio/webm`, `audio/mp4` u `audio/ogg`, hasta 60 s) o la foto
    (`image/jpeg`, hasta 1600 px).
- CORS: `https://mostrador-lois.vercel.app` y, para desarrollo, `http://localhost:5173` y
  `http://localhost:5180`.

**Qué hace el flujo**

1. **Valida la sesión** ([ADR-006](adr/006-validacion-sesion-webhook.md)):
   `GET <SUPABASE_URL>/auth/v1/user` con `apikey: <clave publishable>` y el mismo
   `Authorization`. Si la respuesta no trae el `id` del usuario, responde 401.
2. **Audio:** el nodo de transcripción de OpenAI del bot. La transcripción va tal cual como texto a
   buscar: la búsqueda de la web ya ignora el relleno ("che, ¿tenés…?") y pasa a singular.
3. **Foto:** la misma cadena del bot (_Extract from File_ → _Convert to File_ → análisis de
   imagen con gpt-4o-mini). La consigna pide un JSON `{"texto", "leido"}`: el código si se ve
   (también el grabado en la pieza, como en las pastillas) y, si no, la pieza y la marca o el
   modelo en hasta 6 palabras. En `leido` van todos los códigos y textos que leyó. La web busca
   **solo el código** que encuentre en `texto` o en `leido`, aunque la IA lo haya mezclado con
   palabras (`photoCode()`); si no hay código, busca `texto` y avisa cómo sacar la foto.
4. **Responde 200** con JSON:

   ```json
   {
     "texto": "pastilla freno onix",
     "transcripcion": "che, ¿tenés pastillas de freno para el Onix?"
   }
   ```

   `texto` vacío si no entendió nada. En una foto, `transcripcion` es lo que leyó.

**Errores:** 401 sin sesión, 400 si falta el archivo o el tipo, 413 si el archivo pasa el límite
de n8n y 500 para el resto. La web muestra un aviso y deja escribir. El webhook no escribe en
`consultas_bot`: la consulta la registra la web con `registrar_consulta()`, con el canal `web`.

## Webhook "Lois Subir foto" (retirado)

Subía a Drive la foto que se cargaba desde la web (ADR-007). Desde el ADR-008 la web sube directo a
Supabase Storage y asigna con `asignar_foto_subida()`, sin n8n: el flujo se desactiva y
`VITE_N8N_FOTOS_URL` ya no existe.
