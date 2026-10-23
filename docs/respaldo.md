# Respaldo de la base y las fotos

Todas las noches GitHub Actions copia la base y las fotos de producción a una caja privada de
Vercel Blob, fuera de Supabase, y el día 1 de cada mes prueba que la copia se puede restaurar
(decisión en [ADR-012](adr/012-respaldo-en-vercel-blob.md)).

## Qué se guarda

| Qué                                                            | Cómo                                   | Dónde, en la caja                        |
| -------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| La base (artículos, usuarios, fotos asignadas, consultas, bot) | `pg_dump` cifrado con age, a las 03:00 | `base/diario/base-AAAA-MM-DD.tar.gz.age` |
| La primera copia de cada mes                                   | La misma, copiada                      | `base/mensual/base-AAAA-MM.tar.gz.age`   |
| Las fotos (bucket `fotos`)                                     | Por su link público, solo las nuevas   | `fotos/<id>/<token>.jpg`                 |

- Quedan los diarios de los **últimos 30 días** y los mensuales de **12 meses**. Las fotos nunca
  se borran de la caja, así una borrada por error se recupera.
- Dentro de cada copia: `datos.sql` (lo que se restaura), `conteos.tsv` (filas por tabla),
  `respaldo.sql` (el schema `respaldo`), y de referencia `esquema.sql` y `storage-objects.sql`.
- **No** se guardan las sesiones abiertas: después de restaurar, todos vuelven a entrar.

## Puesta en marcha (una vez)

1. **Usuario de la base:** aplicar la migración `20261021000024_rol_respaldo.sql` (SQL Editor) y
   ponerle contraseña: `alter role lois_respaldo password '…';`. Conviene que tenga solo letras
   y números (va dentro de un link).
2. **Caja:** en Vercel, en el equipo de Lois, Storage → Create → **Blob**, con acceso
   **Private** (no se puede cambiar después) y sin conectarlo a ningún proyecto. Del store sale
   el `BLOB_READ_WRITE_TOKEN`.
3. **Clave de cifrado:** generar un par con `age-keygen` (ver abajo). La **pública** va como
   variable; la **privada** se guarda en dos lugares seguros (gestor de contraseñas y una copia
   fuera de línea, **nunca en Drive**) y también como secret, para la prueba mensual.
4. **GitHub** → Settings → Secrets and variables → Actions:

   | Secret                  | Qué es                                                                       |
   | ----------------------- | ---------------------------------------------------------------------------- |
   | `RESPALDO_DB_URL`       | Session pooler con `lois_respaldo.<ref>`, su contraseña y `?sslmode=require` |
   | `BLOB_READ_WRITE_TOKEN` | El token del store de Vercel Blob                                            |
   | `AGE_IDENTIDAD`         | La clave privada de age (la línea `AGE-SECRET-KEY-…`)                        |

   | Variable           | Qué es                                                     |
   | ------------------ | ---------------------------------------------------------- |
   | `AGE_DESTINATARIO` | La clave pública de age (`age1…`)                          |
   | `FOTOS_URL`        | `https://<ref>.supabase.co/storage/v1/object/public/fotos` |

5. **Primera corrida:** Actions → Respaldo → Run workflow → `respaldar`, y después `probar`.

Para generar la clave de age sin instalar nada:

```bash
docker run --rm alpine:3.22 sh -c 'apk add --no-cache -q age >/dev/null && age-keygen'
```

## Todos los días

- Nada. Si una corrida falla, GitHub le manda un mail a quien editó `respaldo.yml`.
- GitHub apaga los workflows programados de los repos públicos sin actividad en 60 días: el
  respaldo se vuelve a habilitar solo después de cada corrida. Igual conviene mirar una vez por
  mes en Actions que la última corrida de **Respaldo** esté en verde.

## Ensayo local

```bash
pnpm db:start
pnpm respaldo:ensayo
```

Respalda tres "noches" contra el Supabase local (la caja es una carpeta dentro del contenedor,
porque Vercel Blob no se levanta en local), rompe datos, prueba la restauración, restaura una
foto borrada y chequea los seguros. Lo corre también la CI en cada PR. No toca producción ni
Vercel.

## En una emergencia

Los scripts corren en Docker, después de `pnpm install`, con `BLOB_READ_WRITE_TOKEN` y
`AGE_IDENTIDAD` (la clave privada) exportadas en la terminal: leelas con
`read -rs NOMBRE && export NOMBRE`, así no quedan en el historial. Un archivo suelto también se
puede bajar a mano desde Vercel → Storage → el store → Browser.

**Recuperar algo puntual** (un artículo borrado, las fotos de un día): restaurar en el Supabase
**local** y copiar de ahí lo que haga falta. Sin argumento usa el último respaldo; si no, pasale
la clave, por ejemplo `base/diario/base-2026-10-20.tar.gz.age`.

```bash
pnpm db:start
RED_DOCKER=supabase_network_mostrador-lois \
RESTAURAR_DB_URL=postgresql://postgres:postgres@db:5432/postgres \
  bash supabase/respaldo/en-contenedor.sh probar.sh base/diario/base-2026-10-20.tar.gz.age
```

**Rehacer todo** (se perdió el proyecto de Supabase):

1. Crear un proyecto nuevo y aplicarle las migraciones (`docs/produccion.md`).
2. Restaurar la base y las fotos. Vacía las tablas del destino, por eso pide confirmar el host.
   Para volver a subir las fotos hacen falta claves S3 del proyecto nuevo (Storage → S3):

   ```bash
   RESTAURAR_DB_URL='<Session pooler del proyecto nuevo, como postgres>' \
   CONFIRMO_DESTINO='<el host de ese link>' RESTAURAR_FOTOS=si \
   FOTOS_ENDPOINT=… FOTOS_REGION=… FOTOS_ACCESS_KEY_ID=… FOTOS_SECRET_ACCESS_KEY=… \
     bash supabase/respaldo/en-contenedor.sh restaurar.sh
   ```

3. Volver a cargar las contraseñas de `n8n_bot`, `n8n_app` y `lois_respaldo`, y apuntar n8n,
   Vercel y los secrets de GitHub al proyecto nuevo.
