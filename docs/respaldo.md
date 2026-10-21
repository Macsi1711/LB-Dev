# Respaldo de la base y las fotos

Todas las noches GitHub Actions copia la base y las fotos de producción a una caja de
Cloudflare R2, fuera de Supabase, y el día 1 de cada mes prueba que la copia se puede restaurar
(decisión en [ADR-009](adr/009-respaldo-fuera-de-supabase.md)).

## Qué se guarda

| Qué                                                            | Cómo                                        | Dónde, en la caja                        |
| -------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| La base (artículos, usuarios, fotos asignadas, consultas, bot) | `pg_dump` cifrado con age, a las 03:00      | `base/diario/base-AAAA-MM-DD.tar.gz.age` |
| La primera copia de cada mes                                   | La misma, copiada                           | `base/mensual/base-AAAA-MM.tar.gz.age`   |
| Las fotos (bucket `fotos`)                                     | Tal cual (ya son públicas), solo las nuevas | `fotos/<id>/<token>.jpg`                 |

- Quedan los diarios de los **últimos 30 días** y los mensuales de **12 meses**. Las fotos nunca
  se borran de la caja, así una borrada por error se recupera.
- Dentro de cada copia: `datos.sql` (lo que se restaura), `conteos.tsv` (filas por tabla),
  `respaldo.sql` (el schema `respaldo`), y de referencia `esquema.sql` y `storage-objects.sql`.
- **No** se guardan las sesiones abiertas: después de restaurar, todos vuelven a entrar.

## Puesta en marcha (una vez)

1. **Usuario de la base:** aplicar la migración `20261021000024_rol_respaldo.sql` (SQL Editor) y
   ponerle contraseña: `alter role lois_respaldo password '…';`. Conviene que tenga solo letras
   y números (va dentro de un link).
2. **Caja:** en Cloudflare, con la cuenta de Lois, crear un bucket de R2 (por ejemplo
   `lois-respaldo`) y un token de API de R2 con permiso **Object Read & Write** solo sobre ese
   bucket.
3. **Fotos:** en Supabase, Storage → S3 → crear un par de claves de acceso.
4. **Clave de cifrado:** generar un par con `age-keygen` (ver abajo). La **pública** va al repo
   como variable; la **privada** se guarda en dos lugares seguros (gestor de contraseñas y una
   copia fuera de línea, **nunca en Drive**) y también como secret, para la prueba mensual.
5. **GitHub** → Settings → Secrets and variables → Actions:

   | Secret                    | Qué es                                                                       |
   | ------------------------- | ---------------------------------------------------------------------------- |
   | `RESPALDO_DB_URL`         | Session pooler con `lois_respaldo.<ref>`, su contraseña y `?sslmode=require` |
   | `CAJA_ACCESS_KEY_ID`      | Del token de R2                                                              |
   | `CAJA_SECRET_ACCESS_KEY`  | Del token de R2                                                              |
   | `FOTOS_ACCESS_KEY_ID`     | De las claves S3 de Supabase                                                 |
   | `FOTOS_SECRET_ACCESS_KEY` | De las claves S3 de Supabase                                                 |
   | `AGE_IDENTIDAD`           | La clave privada de age (la línea `AGE-SECRET-KEY-…`)                        |

   | Variable           | Qué es                                                                                  |
   | ------------------ | --------------------------------------------------------------------------------------- |
   | `AGE_DESTINATARIO` | La clave pública de age (`age1…`)                                                       |
   | `CAJA_ENDPOINT`    | `https://<account id>.r2.cloudflarestorage.com`                                         |
   | `CAJA_BUCKET`      | El nombre del bucket de R2                                                              |
   | `FOTOS_ENDPOINT`   | El endpoint S3 que muestra Supabase (`https://<ref>.storage.supabase.co/storage/v1/s3`) |
   | `FOTOS_REGION`     | La región que muestra Supabase al lado del endpoint                                     |

6. **Primera corrida:** Actions → Respaldo → Run workflow → `respaldar`, y después `probar`.

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

Respalda tres "noches" contra el Supabase local (la caja es un bucket aparte del mismo Supabase),
rompe datos, prueba la restauración, restaura una foto borrada y chequea los seguros. Lo corre
también la CI en cada PR. No toca producción ni Cloudflare.

## En una emergencia

Los scripts corren en Docker con las variables de arriba exportadas en la terminal (leelas con
`read -rs NOMBRE && export NOMBRE`, así no quedan en el historial). `AGE_IDENTIDAD` es la clave
privada.

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
2. Restaurar la base y las fotos. Vacía las tablas del destino, por eso pide confirmar el host:

   ```bash
   RESTAURAR_DB_URL='<Session pooler del proyecto nuevo, como postgres>' \
   CONFIRMO_DESTINO='<el host de ese link>' RESTAURAR_FOTOS=si \
   FOTOS_ENDPOINT=… FOTOS_REGION=… FOTOS_ACCESS_KEY_ID=… FOTOS_SECRET_ACCESS_KEY=… \
     bash supabase/respaldo/en-contenedor.sh restaurar.sh
   ```

3. Volver a cargar las contraseñas de `n8n_bot`, `n8n_app` y `lois_respaldo`, y apuntar n8n,
   Vercel y los secrets de GitHub al proyecto nuevo.
