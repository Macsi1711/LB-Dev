# Se incluye desde los scripts de esta carpeta (no se corre solo).
# Deja en SUPABASE_DB_URL la conexión a producción leída de .env.produccion, sin imprimirla.
# Se lee sin `source`: así un $ o un espacio en la contraseña no se interpreta.

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file="$raiz/.env.produccion"

if [[ ! -s "$env_file" ]]; then
  echo "Falta $env_file con SUPABASE_DB_URL=… (ver docs/produccion.md)." >&2
  exit 1
fi

SUPABASE_DB_URL="$(sed -n 's/^SUPABASE_DB_URL=//p' "$env_file" | head -n 1)"
SUPABASE_DB_URL="${SUPABASE_DB_URL%\"}"
SUPABASE_DB_URL="${SUPABASE_DB_URL#\"}"
if [[ -z "$SUPABASE_DB_URL" ]]; then
  echo "En $env_file no hay una línea SUPABASE_DB_URL=…" >&2
  exit 1
fi
export SUPABASE_DB_URL
