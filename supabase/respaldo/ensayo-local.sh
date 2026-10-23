#!/usr/bin/env bash
# Ensayo de punta a punta del respaldo contra el Supabase LOCAL (pnpm db:start): las pruebas
# están en ensayo.sh.
# La caja es una carpeta dentro del contenedor (Vercel Blob no se levanta en local): no toca
# producción ni Vercel. Lo corre también la CI.
# Uso: bash supabase/respaldo/ensayo-local.sh
set -euo pipefail

carpeta="$(cd "$(dirname "$0")" && pwd)"
proyecto=mostrador-lois
export RED_DOCKER="supabase_network_$proyecto"
# La base, por la red de Supabase (alias db). Storage, por el puerto publicado de la API (55421):
# por dentro de la red la firma S3 no coincide, porque el gateway cambia el host.

# Claves S3 del Storage local: son las fijas de desarrollo de la CLI, no secretos.
eval "$(cd "$carpeta/../.." && pnpm exec supabase status -o env 2>/dev/null | grep '^S3_PROTOCOL_')"
s3="http://host.docker.internal:55421/storage/v1/s3"
export FOTOS_ENDPOINT="$s3" FOTOS_REGION="$S3_PROTOCOL_REGION" \
  FOTOS_ACCESS_KEY_ID="$S3_PROTOCOL_ACCESS_KEY_ID" FOTOS_SECRET_ACCESS_KEY="$S3_PROTOCOL_ACCESS_KEY_SECRET"
# Las fotos se bajan por su link público, como en producción.
export FOTOS_URL="http://host.docker.internal:55421/storage/v1/object/public/fotos"
export CAJA_CARPETA=/tmp/caja-ensayo

# Contraseña SOLO local del usuario del respaldo (la misma que usa respaldo.int-spec.ts).
docker exec "supabase_db_$proyecto" psql -U postgres -X -q \
  -c "alter role lois_respaldo password 'lois_respaldo_local'"
export RESPALDO_DB_URL="postgresql://lois_respaldo:lois_respaldo_local@db:5432/postgres"
export RESTAURAR_DB_URL="postgresql://postgres:postgres@db:5432/postgres"

# Un par de claves de age solo para el ensayo: se tira al terminar.
claves="$(docker run --rm alpine:3.22 sh -c 'apk add --no-cache -q age >/dev/null && age-keygen 2>/dev/null')"
AGE_IDENTIDAD="$(grep '^AGE-SECRET-KEY-' <<<"$claves")"
AGE_DESTINATARIO="$(sed -n 's/^# public key: //p' <<<"$claves")"
export AGE_IDENTIDAD AGE_DESTINATARIO

bash "$carpeta/en-contenedor.sh" ensayo.sh
