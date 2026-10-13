# Contrato con n8n y puesta en producción

## Contrato (no romper)

| Flujo | Rol       | Operación                                                                                                                | Objeto              |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Bot   | `n8n_bot` | SELECT con SQL libre generado por la IA                                                                                  | `articulos`         |
| Bot   | `n8n_app` | `select activo from usuarios_telegram where chat_id = $1`                                                                | `usuarios_telegram` |
| Bot   | `n8n_app` | INSERT                                                                                                                   | `consultas_bot`     |
| Fotos | `n8n_app` | `UPDATE articulos SET "Imagen" = … WHERE upper(trim("Codigo")) = ANY(…) RETURNING "Codigo", "Nombre artículo", "Imagen"` | `articulos`         |
| Fotos | `n8n_app` | `INSERT … ON CONFLICT (drive_id) DO NOTHING`                                                                             | `fotos_sin_match`   |

`familias` ya existe en producción con `"Código"` y `"Nombre"` (con tilde y sin clave): tampoco
se renombra. La web solo le agrega `es_producto` y la lee por la vista `v_familias`.

`"Imagen"` siempre tiene el formato `https://drive.google.com/file/d/<ID>/view?usp=drivesdk`.
Lo verifica `apps/web/tests/integration/n8n-contract.int-spec.ts`.

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
- **Lois Fotos:** _Escribir link en articulos_ pasa a `Lois - app`. El Code _Sin artículo_ se
  reemplaza por el INSERT en `fotos_sin_match` de la tabla de arriba.

Si se agregan familias nuevas en `articulos`, corré `select public.sincronizar_familias();`.

## Webhook "Lois Consulta web" (audio y foto desde la web)

La web le manda un audio o una foto y n8n le devuelve **el texto a buscar**. La búsqueda la hace
la web. Decisión en el [ADR-005](adr/005-audio-y-foto-por-n8n.md).

**Pedido**

- `POST` a la URL del webhook (va en `VITE_N8N_CONSULTA_URL` de la web).
- Header `Authorization: Bearer <token de Supabase del usuario>`.
- Cuerpo `multipart/form-data`:
  - `tipo`: `audio` o `foto`.
  - `archivo`: el audio (`audio/webm`, `audio/mp4` u `audio/ogg`, hasta 60 s) o la foto
    (`image/jpeg`, hasta 1600 px).
- CORS: permitir `https://mostrador-lois.vercel.app` y, para desarrollo,
  `http://localhost:5173`.

**Qué hace el flujo**

1. **Valida la sesión:** `POST <SUPABASE_URL>/rest/v1/rpc/tiene_perfil` con los headers
   `apikey: <clave publishable>` y el mismo `Authorization`. Si no devuelve `true`, responde 401.
2. **Audio:** el mismo nodo de transcripción del bot. **Foto:** el mismo nodo de imágenes del bot,
   con la consigna "leé la etiqueta, la caja o el código: devolvé el código del artículo si
   aparece y, si no, la pieza, la marca y el modelo".
3. **Pasa a palabras de búsqueda:** código si hay; si no, pieza + marca o modelo, sin saludos ni
   verbos, hasta 6 palabras. Por ejemplo, de "che, ¿tenés pastillas de freno para el Onix?" sale
   `pastilla freno onix`.
4. **Responde 200** con JSON:

   ```json
   {
     "texto": "pastilla freno onix",
     "transcripcion": "che, ¿tenés pastillas de freno para el Onix?"
   }
   ```

   `texto` vacío si no entendió nada. `transcripcion` es opcional (en una foto, lo que leyó).

**Errores:** 401 sin sesión o sin perfil, 413 si el archivo pasa los 10 MB, 500 para el resto.
La web muestra un aviso y deja escribir. No se registra en `consultas_bot`, que es solo del bot
de Telegram.
