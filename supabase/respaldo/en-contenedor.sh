#!/usr/bin/env bash
# Corre un script de esta carpeta dentro de un Alpine con age, curl, node, aws-cli y el cliente de
# Postgres 17: el mismo entorno en la máquina de cada uno y en GitHub Actions. Monta el repo
# entero, solo lectura, para que caja.mjs encuentre @vercel/blob (antes, pnpm install). Las
# variables pasan por nombre (-e VAR), así los secretos no quedan en la línea de comandos.
# Uso: bash supabase/respaldo/en-contenedor.sh respaldar.sh|probar.sh|restaurar.sh [argumentos]
# Con RED_DOCKER=<red> el contenedor entra a esa red (la del Supabase local, en el ensayo).
set -euo pipefail

repo="$(cd "$(dirname "$0")/../.." && pwd)"
script="${1:?Falta el script: respaldar.sh, probar.sh o restaurar.sh}"
shift

opciones=(--rm -i -v "$repo:/repo:ro")
for v in RESPALDO_DB_URL RESPALDO_FECHA AGE_DESTINATARIO AGE_IDENTIDAD \
  BLOB_READ_WRITE_TOKEN CAJA_CARPETA FOTOS_URL \
  FOTOS_ENDPOINT FOTOS_REGION FOTOS_BUCKET FOTOS_ACCESS_KEY_ID FOTOS_SECRET_ACCESS_KEY \
  RESTAURAR_DB_URL RESTAURAR_FOTOS CONFIRMO_DESTINO; do
  if [[ -n "${!v:-}" ]]; then
    opciones+=(-e "$v")
  fi
done
if [[ -n "${RED_DOCKER:-}" ]]; then
  # host.docker.internal: los puertos publicados en la máquina (también en Linux, para la CI).
  opciones+=(--network "$RED_DOCKER" --add-host host.docker.internal:host-gateway)
fi

docker run "${opciones[@]}" alpine:3.22 sh -c '
  apk add --no-cache -q bash coreutils age curl nodejs aws-cli postgresql17-client >/dev/null 2>&1 &&
  exec bash "/repo/supabase/respaldo/$0" "$@"' "$script" "$@"
