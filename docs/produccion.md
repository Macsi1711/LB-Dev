# Puesta en producción de la base

Cómo llevar las migraciones de `supabase/migrations/` a la base de la empresa sin cortar el bot.
**Nada se aplica sin el OK explícito del dueño.** El contrato con n8n está en [n8n.md](n8n.md).

## 0. Antes de empezar

1. **Conexión.** En el panel de Supabase de la empresa: **Connect → Session pooler**. Copiá el
   string y guardalo en `.env.produccion`, en la raíz del repo (git lo ignora):

   ```bash
   touch .env.produccion && open -e .env.produccion
   ```

   ```
   SUPABASE_DB_URL=postgresql://postgres.<ref>:<contraseña>@aws-0-<región>.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   La contraseña nunca va al repo ni a un chat. Si tiene `@ # / : ?`, va codificada (`@` → `%40`).

2. **Docker abierto.** Los scripts usan el `psql` y el `pg_dump` de la imagen `postgres:17-alpine`
   si no los tenés instalados.

3. **Momento.** La migración agrega una columna `id` y unos índices a `articulos`: en una tabla
   grande puede frenar unos segundos las escrituras de n8n. Elegí un horario de poco movimiento.

## 1. Inspección (solo lectura)

```bash
bash supabase/produccion/inspeccionar.sh > ~/inspeccion-lois.txt
```

Corre [`inspeccion.sql`](../supabase/produccion/inspeccion.sql) dentro de una transacción
`read only` que termina en `rollback`: no puede cambiar nada. No vuelca datos personales. Guardá
la salida **fuera del repo**.

## 2. Qué mirar antes de seguir

| Sección | Si ves…                                                            | Entonces…                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5       | Alguna columna del contrato en `false`                             | **Frenar.** La web y n8n esperan esos nombres exactos.                                                                                                                        |
| 4       | `"Codigo"` o `"Imagen"` con un tipo que no es texto                | Revisar antes: las funciones usan `upper`, `trim` y expresiones regulares.                                                                                                    |
| 5–6     | Ya hay una columna `id` que no es numérica o se repite             | **Frenar** y adaptar la migración `0002` (agrega `id` como identidad única).                                                                                                  |
| 7       | Tablas o funciones que ya existen                                  | `create … if not exists` no las cambia: compararlas con las migraciones antes de aplicar.                                                                                     |
| 9–10    | n8n entra con el usuario `postgres`                                | Nada se corta: el dueño de las tablas no pasa por RLS.                                                                                                                        |
| 9–10    | n8n entra con otro rol de Postgres                                 | Pasarlo a `n8n_bot` / `n8n_app` **antes** o en el mismo momento ([n8n.md](n8n.md)).                                                                                           |
| n8n     | Algún flujo usa el nodo de Supabase o la API con la clave **anon** | **Frenar.** La migración `0007` le saca a `anon` todo acceso a `articulos`. Pasar ese nodo a Postgres con `n8n_app` antes de migrar. Con la clave `service_role` no se corta. |
| 11      | Códigos repetidos                                                  | No se agrega UNIQUE. Anotarlos: el UPDATE de fotos de n8n escribe en todas las filas con ese código, como hoy.                                                                |
| 12      | Links con otro formato                                             | La web los cuenta "con foto" pero no puede mostrar la miniatura. n8n nuevo escribe el formato correcto.                                                                       |
| 14      | Sin historial de migraciones                                       | Normal: el simulacro va a listar las 13.                                                                                                                                      |

Esta tabla la completa el dueño con los resultados, y recién ahí se decide si seguir.

## 3. Simulacro

```bash
bash supabase/produccion/migrar.sh
```

Muestra qué migraciones aplicaría (`supabase db push --dry-run`). No cambia nada.

## 4. Aplicar (con OK explícito del dueño)

```bash
bash supabase/produccion/migrar.sh --aplicar
```

Primero respalda el schema `public` en `~/Respaldos-Lois/public-<fecha>.dump` (si el respaldo
sale vacío, no sigue) y después aplica las migraciones. Son aditivas: no borran ni renombran
columnas de `articulos`, y cada una se puede volver a correr.

## 5. Después de migrar

1. **Contraseñas de los roles de n8n** (SQL editor de Supabase, las carga el dueño):
   `alter role n8n_bot password '…'; alter role n8n_app password '…';`
2. **Flujos de n8n:** credenciales nuevas y los cambios de nodos de [n8n.md](n8n.md).
3. **Auth:** _Allow new users to sign up_ apagado, Site URL y Redirect URLs (ver
   [deploy.md](deploy.md), paso 2). Para producción conviene un SMTP propio: el de Supabase manda
   muy pocos mails por hora.
4. **Primer admin:** Authentication → Users → _Invite user_, y en el SQL editor:
   `update perfiles set rol = 'admin' where user_id = (select id from auth.users where email = '…');`
5. **Familias nuevas:** la migración `0009` agrega solo los códigos que faltan en la tabla
   `familias` que ya existe (con `"Código"` y `"Nombre"`) y marca las internas. Si después aparecen otras en
   `articulos`, `select public.sincronizar_familias();`.
6. **Verificación:**
   - Repetir la inspección: en la sección 7 todo tiene que estar en `true` y en la 8 tienen que
     aparecer las políticas.
   - Mandarle una consulta al bot por Telegram: tiene que responder y la consulta tiene que
     aparecer en `consultas_bot`.
   - La web con `VITE_SUPABASE_URL` y la clave publishable en `apps/web/.env.local`:
     `pnpm dev:web`, entrar con el admin y buscar.

## 6. Si algo sale mal

- **El bot deja de responder justo después de migrar:** lo más probable es que n8n entre con un
  rol que RLS ahora frena. Para volver al comportamiento anterior mientras se investiga, en el
  SQL editor: `alter table public.articulos disable row level security;`. La web sigue protegida
  por los permisos por columna. Cuando se arregle la credencial de n8n, se vuelve a habilitar.
- **Restaurar el respaldo** (solo con OK del dueño; pisa el schema `public`):

  ```bash
  docker run --rm -i -e SUPABASE_DB_URL postgres:17-alpine \
    sh -c 'pg_restore --clean --if-exists --no-owner -d "$SUPABASE_DB_URL"' \
    < ~/Respaldos-Lois/public-<fecha>.dump
  ```

  `SUPABASE_DB_URL` tiene que estar exportada en esa terminal (sale de `.env.produccion`).
