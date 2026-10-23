# shellcheck shell=bash disable=SC2034 # las constantes las usan los scripts que lo incluyen
# Funciones que comparten respaldar.sh, probar.sh y restaurar.sh. Se incluye, no se corre solo.
# Corre dentro del contenedor de en-contenedor.sh (bash, age, curl, node, aws-cli y el cliente de
# Postgres 17).
set -euo pipefail
# Mismo orden en sort y comm, sea cual sea el idioma de la máquina.
export LC_ALL=C

# Dónde quedan las cosas en la caja.
readonly DIARIO=base/diario
readonly MENSUAL=base/mensual
readonly FOTOS=fotos
readonly DIAS_DIARIOS=30
readonly MESES_MENSUALES=12

carpeta_respaldo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# aws-cli (solo para volver a subir fotos a Supabase en restaurar.sh y en el ensayo):
# direcciones path-style, que es lo único que acepta Supabase Storage, y sin los checksums nuevos.
AWS_CONFIG_FILE="$(mktemp)"
printf '[default]\ns3 =\n  addressing_style = path\n' >"$AWS_CONFIG_FILE"
export AWS_CONFIG_FILE
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
export AWS_PAGER=''

requiere() {
  local falta=0 v
  for v in "$@"; do
    if [[ -z "${!v:-}" ]]; then
      echo "Falta la variable $v (ver docs/respaldo.md)." >&2
      falta=1
    fi
  done
  return "$falta"
}

# Necesita BLOB_READ_WRITE_TOKEN (Vercel Blob, producción) o CAJA_CARPETA (el ensayo local).
requiere_caja() {
  if [[ -z "${BLOB_READ_WRITE_TOKEN:-}" && -z "${CAJA_CARPETA:-}" ]]; then
    echo "Falta la variable BLOB_READ_WRITE_TOKEN (ver docs/respaldo.md)." >&2
    return 1
  fi
}

# La caja: Vercel Blob en producción, una carpeta en el ensayo local (caja.mjs).
caja() {
  node "$carpeta_respaldo/caja.mjs" "$@"
}

# El bucket de fotos de Supabase Storage, por su API compatible con S3.
fotos_s3() {
  AWS_ACCESS_KEY_ID="$FOTOS_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$FOTOS_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$FOTOS_REGION" aws --endpoint-url "$FOTOS_ENDPOINT" "$@"
}

# Las claves del bucket de fotos de Supabase, una por línea y ordenadas.
listar_fotos_s3() {
  local salida
  # Si falla aws, falla esto: una lista vacía por error haría creer que no hay nada.
  salida="$(fotos_s3 s3api list-objects-v2 --bucket "$1" --query 'Contents[].[Key]' --output text)" ||
    return 1
  printf '%s\n' "$salida" | grep -v -e '^None$' -e '^$' | sort || true
}

# Lo que hay en la caja bajo `prefijo`, sin el prefijo.
listar_caja() {
  local prefijo="$1" salida
  salida="$(caja listar "$prefijo")" || return 1
  printf '%s\n' "$salida" | sed "s#^$prefijo##" | grep -v '^$' || true
}

# El respaldo más nuevo de la base, o vacío si no hay ninguno.
ultimo_respaldo() {
  local salida
  salida="$(caja listar "$DIARIO/")" || return 1
  printf '%s\n' "$salida" | tail -n 1
}

# Baja un respaldo de la caja, lo descifra y lo deja desarmado en `destino`.
bajar_respaldo() {
  local clave="$1" destino="$2" identidad
  identidad="$(mktemp)"
  printf '%s\n' "$AGE_IDENTIDAD" >"$identidad"
  caja bajar "$clave" | age -d -i "$identidad" | tar -xz -C "$destino"
  rm -f "$identidad"
}

# Las tablas y secuencias que existen en la base `url`, como las escribe pg_dump (schema.nombre).
relaciones() {
  psql "$1" -X -A -t -v ON_ERROR_STOP=1 -c "select format('%I.%I', n.nspname, c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p', 'S')"
}

# Carga un respaldo desarmado en la base `url`, que tiene que tener las migraciones aplicadas.
# VACÍA antes las tablas que vienen en el respaldo. Todo en una transacción: o entra entero o
# no cambia nada. Los triggers no corren (session_replication_role), así los datos quedan tal
# cual estaban. storage.objects no se carga: lo rearma Storage al volver a subir las fotos.
# Las tablas que las migraciones no crean (por ejemplo n8n_chat_histories, que la arma n8n
# cuando la necesita) se saltean con un aviso: si no, la carga entera falla.
restaurar_base() {
  local dir="$1" url="$2" tablas existentes
  existentes="$(relaciones "$url")"
  : >"$dir/datos-a-cargar.sql"
  awk -v existentes="$existentes" -v q="'" '
    BEGIN { n = split(existentes, lista, "\n"); for (i = 1; i <= n; i++) hay[lista[i]] = 1 }
    salteando { if ($0 == "\\.") salteando = 0; next }
    /^COPY / && !($2 in hay) {
      print "  ⚠ " $2 ": no está en esta base (no la crean las migraciones), se saltea"
      salteando = 1
      next
    }
    /^SELECT pg_catalog\.setval\(/ {
      secuencia = $0
      sub(/^SELECT pg_catalog\.setval\(/, "", secuencia)
      split(secuencia, partes, q)
      secuencia = partes[2]
      if (!(secuencia in hay)) next
    }
    { print > salida }
  ' salida="$dir/datos-a-cargar.sql" "$dir/datos.sql"
  tablas="$(sed -n 's/^COPY \([^ ]*\) (.*/\1/p' "$dir/datos-a-cargar.sql" | paste -sd, -)"
  if [[ -z "$tablas" ]]; then
    echo "El respaldo no trae datos (datos.sql vacío)." >&2
    return 1
  fi
  psql "$url" -X -q -v ON_ERROR_STOP=1 --single-transaction -o /dev/null \
    -c 'set client_min_messages = warning' \
    -c 'set session_replication_role = replica' \
    -c "truncate table $tablas cascade" \
    -f "$dir/datos-a-cargar.sql" \
    -c 'drop schema if exists respaldo cascade' \
    -f "$dir/respaldo.sql"
}
