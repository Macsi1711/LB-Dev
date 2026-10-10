#!/usr/bin/env bash
# Prepara una sesión de Claude Code en la nube (sin Docker): dependencias, Postgres con las
# migraciones y el seed, y apps/web/.env. En una máquina local no hace nada: ahí se usa
# `pnpm db:start` con Supabase en Docker.
set -euo pipefail

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
PORT=55422
DB_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"

echo "› Instalando dependencias"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "› Levantando Postgres en el puerto ${PORT}"
if ! command -v pg_createcluster >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq postgresql postgresql-contrib >/dev/null
fi
PG_VERSION="$(ls /usr/lib/postgresql | sort -n | tail -1)"
if ! pg_lsclusters -h | awk '{print $2}' | grep -qx lois; then
  pg_createcluster "${PG_VERSION}" lois -p "${PORT}" >/dev/null
fi
pg_ctlcluster "${PG_VERSION}" lois start 2>/dev/null || true
su postgres -c "psql -p ${PORT} -qc \"alter role postgres password 'postgres'\""

if [[ ! -f apps/web/.env ]]; then
  cp apps/web/.env.example apps/web/.env
fi

echo "› Aplicando migraciones y seed"
YA_MIGRADA="$(psql "${DB_URL}" -tAc "select to_regclass('public.articulos') is not null")"
if [[ "${YA_MIGRADA}" != "t" ]]; then
  psql "${DB_URL}" -v ON_ERROR_STOP=1 -q -f supabase/sin-supabase/bootstrap.sql
  for f in supabase/migrations/*.sql; do
    psql "${DB_URL}" -v ON_ERROR_STOP=1 -q -f "${f}"
  done
  psql "${DB_URL}" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
fi

# Los tipos (pnpm db:generate) necesitan el stack de Supabase en Docker: en la nube se usan los
# commiteados, y la CI controla que coincidan con las migraciones.
echo "✓ Listo: pnpm test:integration corre contra ${DB_URL}"
