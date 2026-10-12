#!/usr/bin/env bash
# Aplica supabase/migrations/ a la base de producción. SOLO con el OK explícito del dueño.
#   bash supabase/produccion/migrar.sh            simulacro: lista lo que aplicaría, no cambia nada
#   bash supabase/produccion/migrar.sh --aplicar  respaldo de public en ~/Respaldos-Lois y después aplica
set -euo pipefail
source "$(dirname "$0")/conexion.sh"
cd "$raiz"

if [[ "${1:-}" != "--aplicar" ]]; then
  echo "Simulacro (no cambia nada). Para aplicar: bash supabase/produccion/migrar.sh --aplicar"
  pnpm exec supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
  exit 0
fi

respaldos="$HOME/Respaldos-Lois"
mkdir -p "$respaldos"
respaldo="$respaldos/public-$(date +%Y%m%d-%H%M%S).dump"
echo "Respaldo del schema public en $respaldo…"
docker run --rm -e SUPABASE_DB_URL postgres:17-alpine \
  sh -c 'pg_dump "$SUPABASE_DB_URL" --schema=public --format=custom --no-owner --no-privileges' \
  > "$respaldo"
if [[ ! -s "$respaldo" ]]; then
  echo "El respaldo quedó vacío: no se aplica nada." >&2
  exit 1
fi
echo "Respaldo listo ($(du -h "$respaldo" | cut -f1)). Aplicando migraciones…"
pnpm exec supabase db push --db-url "$SUPABASE_DB_URL"
