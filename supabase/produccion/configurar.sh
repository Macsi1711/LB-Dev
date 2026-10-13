#!/usr/bin/env bash
# Arma .env.produccion (ignorado por git) sin pegar la contraseña dentro del link a mano.
# Pide el string del Session pooler (no es secreto) y la contraseña de la base sin mostrarla,
# la codifica para el link y prueba la conexión UNA vez (sin reintentos: Supabase bloquea la IP
# después de varios intentos fallidos).
# Uso: bash supabase/produccion/configurar.sh
set -euo pipefail

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
env_file="$raiz/.env.produccion"

echo "1) En Supabase: Connect → Session pooler. Copiá el string tal cual (con [YOUR-PASSWORD])."
read -r -p "   Pegalo acá: " pooler
pooler="$(printf '%s' "$pooler" | tr -d '[:space:]')"
if [[ ! "$pooler" =~ ^postgres(ql)?://[^:/@]+:.*@[^@/]+:[0-9]+/[^?]+ ]]; then
  echo "Eso no parece un string de conexión (postgresql://usuario:…@host:puerto/base)." >&2
  exit 1
fi

echo
echo "2) La contraseña de la BASE (la del proyecto, no la de tu login en supabase.com)."
read -r -s -p "   Escribila o pegala (no se ve): " clave
echo
if [[ -z "$clave" ]]; then
  echo "No se escribió ninguna contraseña." >&2
  exit 1
fi

# Arma el link en Python: codifica la contraseña (@ # / ? : % y demás) y fuerza sslmode=require.
# Todo va por variables de entorno, así la contraseña no aparece en la lista de procesos.
url="$(POOLER="$pooler" CLAVE="$clave" python3 - <<'PY'
import os, re
from urllib.parse import quote
pooler, clave = os.environ["POOLER"], os.environ["CLAVE"]
m = re.match(r"^postgres(?:ql)?://([^:/@]+):.*@([^@/]+:\d+/[^?]+)", pooler)
print(f"postgresql://{m.group(1)}:{quote(clave, safe='')}@{m.group(2)}?sslmode=require")
PY
)"
unset clave

umask 077
printf '%s\n' \
  '# Base de producción de Lois y Bogao. NO se commitea (.gitignore lo ignora).' \
  '# Generado por supabase/produccion/configurar.sh.' \
  "SUPABASE_DB_URL=$url" >"$env_file"
unset url
echo
echo "Guardado en .env.produccion. Probando la conexión (un solo intento)…"

source "$raiz/supabase/produccion/conexion.sh"
consulta="select 'conectado como ' || current_user || ' a ' || current_database()"
if command -v psql >/dev/null 2>&1; then
  psql "$SUPABASE_DB_URL" -X -q -t -A -c "$consulta"
else
  docker run --rm -e SUPABASE_DB_URL -e CONSULTA="$consulta" postgres:17-alpine \
    sh -c 'psql "$SUPABASE_DB_URL" -X -q -t -A -c "$CONSULTA"'
fi
echo "Listo: la conexión anda."
