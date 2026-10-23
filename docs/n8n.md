# Contrato con n8n y puesta en producción

## Contrato (no romper)

| Flujo | Rol       | Operación                                                                                                 | Objeto              |
| ----- | --------- | --------------------------------------------------------------------------------------------------------- | ------------------- |
| Bot   | `n8n_bot` | SELECT con SQL libre generado por la IA                                                                   | `articulos`         |
| Bot   | `n8n_bot` | `select trim("Codigo") as codigo, foto from articulos where foto is not null and trim("Codigo") = any(…)` | `articulos`         |
| Bot   | `n8n_app` | `select activo from usuarios_telegram where chat_id = $1` (**el flujo todavía no lo hace**)               | `usuarios_telegram` |
| Bot   | `n8n_app` | INSERT (**el flujo todavía no lo hace**)                                                                  | `consultas_bot`     |

**Desde el 2026-10-23 el bot entra como `n8n_bot`** (credencial `Lois bot (solo lectura)` en los
dos nodos de Postgres): solo lee `articulos`, en solo lectura y con tope de 5 segundos, así que
aunque la IA genere un `DELETE` o un `UPDATE`, la base lo rechaza. `n8n_app` tiene contraseña
recién cuando el flujo sume la lista blanca y el registro de consultas.

**Retirados (ADR-008):** el flujo "Lois Fotos" (escribía `"Imagen"` y `fotos_sin_match` desde la
carpeta de Drive) y el webhook "Lois Subir foto". Las fotos se cargan solo desde la web y van a
Supabase Storage. La migración `20261019000022_limpieza_drive.sql` borra `fotos_sin_match`, las
funciones que asignaban fotos de Drive y el permiso de `n8n_app` para escribir `"Imagen"`.

`familias` ya existe en producción con `"Código"` y `"Nombre"` (con tilde y sin clave): tampoco
se renombra. La web solo le agrega `es_producto` y la lee por la vista `v_familias`.

**Fotos:** están en Supabase Storage, bucket público `fotos`. `articulos.foto` tiene la ruta de la
foto grande (`<id>/<token>.jpg`) y la miniatura está al lado (`<id>/<token>.mini.jpg`). El link
público es `<SUPABASE_URL>/storage/v1/object/public/fotos/<foto>`. `"Imagen"` queda en la tabla con
el link de Drive de antes (no se borran columnas): ya no se usa para las fotos y n8n no la puede
escribir (lo verifica `apps/web/tests/integration/n8n-contract.int-spec.ts`).

## Antes de aplicar las migraciones en producción

1. **Duplicados de código.** No se agrega UNIQUE sobre `"Codigo"`. Revisá igual:
   ```sql
   select upper(trim("Codigo")), count(*) from articulos group by 1 having count(*) > 1;
   ```
2. **Cómo se conecta n8n.** El bot entra como `n8n_bot` (ver arriba). La credencial vieja
   `Lois` (usuario `postgres`) queda en n8n hasta el cierre de seguridad: antes de rotar la
   contraseña de `postgres`, revisar que ningún flujo publicado la use.
3. **El prompt del bot** nunca tiene que generar `SELECT *` sobre `articulos` (verificado el
   2026-10-23: nombra las columnas; el `SELECT *` del final es sobre su propio `WITH`):
   `articulos` suma las columnas `id` y `actualizado_en`, y el `UNION ALL` del bot cuenta columnas.
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

| Credencial en n8n         | Host            | Puerto | Base       | Usuario                 | SSL     |
| ------------------------- | --------------- | ------ | ---------- | ----------------------- | ------- |
| `Lois bot (solo lectura)` | host del pooler | 5432   | `postgres` | `n8n_bot.<project-ref>` | require |
| `Lois - app`              | host del pooler | 5432   | `postgres` | `n8n_app.<project-ref>` | require |

Como cadena: `postgresql://n8n_bot.<project-ref>:<contraseña>@<host-del-pooler>:5432/postgres?sslmode=require`

## Cambios en los flujos

- **Lois SQL:** _Execute a SQL query1_ y _Buscar fotos en Storage_ usan `Lois bot (solo lectura)`
  (hecho el 2026-10-23). Pendiente: después de _Edit Fields_, chequear la lista blanca con
  `Lois - app`. Al final de cada camino, insertar en
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
otro n8n: **Import from File**, elegir la credencial de OpenAI del bot en _Transcribir audio_ y
_Leer foto_, y activarlo. La URL de
producción (`/webhook/…`, no `/webhook-test/…`) va en `VITE_N8N_CONSULTA_URL` en Vercel.

**Pedido**

- `POST` a la URL del webhook.
- Sin sesión ([ADR-011](adr/011-mostrador-del-vendedor-sin-login.md)): los vendedores usan la web
  sin login. Si hay sesión, la web manda `Authorization: Bearer <token>`, pero el flujo no lo usa.
- Cuerpo `multipart/form-data`:
  - `tipo`: `audio` o `foto`.
  - `archivo`: el audio (`audio/webm`, `audio/mp4` u `audio/ogg`, hasta 60 s) o la foto
    (`image/jpeg`, hasta 1600 px).
- CORS: `https://mostrador-lois.vercel.app` y, para desarrollo, `http://localhost:5173` y
  `http://localhost:5180`.

**Qué hace el flujo**

1. **Audio:** el nodo de transcripción de OpenAI del bot. La transcripción va tal cual como texto a
   buscar: la búsqueda de la web ya ignora el relleno ("che, ¿tenés…?") y pasa a singular.
2. **Foto:** la misma cadena del bot (_Extract from File_ → _Convert to File_ → análisis de
   imagen con gpt-4o-mini). La consigna pide un JSON `{"texto", "leido", "pieza"}`: el código si
   se ve (también el grabado en la pieza, como en las pastillas) y, si no, la pieza y la marca o
   el modelo en hasta 6 palabras. En `leido` van todos los códigos y textos que leyó, y en `pieza`
   qué pieza es (tipo, una característica y el auto si figura), aunque haya leído un código. La
   web busca **solo el código** que encuentre en `texto` o en `leido`, aunque la IA lo haya
   mezclado con palabras (`photoCode()`). Si el código no está en el catálogo (el de otra marca,
   como FRAM `CH10246`), busca `pieza` y lo avisa (`photoFallback()`); si no hay código, busca
   `texto` y avisa cómo sacar la foto.
3. **Responde 200** con JSON:

   ```json
   {
     "texto": "pastilla freno onix",
     "transcripcion": "che, ¿tenés pastillas de freno para el Onix?"
   }
   ```

   `texto` vacío si no entendió nada. En una foto, `transcripcion` es lo que leyó y `pieza` (opcional)
   qué pieza es.

**Errores:** 400 si falta el archivo o el tipo, 413 si el archivo pasa el límite
de n8n y 500 para el resto. La web muestra un aviso y deja escribir. El webhook no escribe en
`consultas_bot`: la consulta la registra la web con `registrar_consulta()`, con el canal `web`.

## Webhook "Lois Subir foto" (retirado)

Subía a Drive la foto que se cargaba desde la web (ADR-007). Desde el ADR-008 la web sube directo a
Supabase Storage y asigna con `asignar_foto_subida()`, sin n8n: el flujo se desactiva y
`VITE_N8N_FOTOS_URL` ya no existe.
