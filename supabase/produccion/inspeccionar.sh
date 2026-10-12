#!/usr/bin/env bash
# Corre la inspección de SOLO LECTURA (inspeccion.sql) contra la base de producción.
# Usa el psql local si existe; si no, el de la imagen postgres:17-alpine de Docker.
# Uso: bash supabase/produccion/inspeccionar.sh > ~/inspeccion-lois.txt
set -euo pipefail
source "$(dirname "$0")/conexion.sh"
sql="$raiz/supabase/produccion/inspeccion.sql"

if command -v psql >/dev/null 2>&1; then
  psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$sql"
else
  docker run --rm -i -e SUPABASE_DB_URL postgres:17-alpine \
    sh -c 'psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f -' < "$sql"
fi
