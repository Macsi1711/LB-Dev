# shellcheck shell=bash disable=SC2034 # las constantes las usan los scripts que lo incluyen
# Funciones que comparten respaldar.sh, probar.sh y restaurar.sh. Se incluye, no se corre solo.
# Corre dentro del contenedor de en-contenedor.sh (bash, age, aws-cli y el cliente de Postgres 17).
set -euo pipefail
# Mismo orden en sort y comm, sea cual sea el idioma de la máquina.
export LC_ALL=C

# Dónde quedan las cosas en la caja.
readonly DIARIO=base/diario
readonly MENSUAL=base/mensual
readonly FOTOS=fotos
readonly DIAS_DIARIOS=30
readonly MESES_MENSUALES=12

# aws-cli: direcciones path-style (Supabase Storage y MinIO no aceptan otra) y sin los checksums
# nuevos, que algunos S3 compatibles todavía rechazan.
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

# La caja: Cloudflare R2 en producción, MinIO en el ensayo local.
caja() {
  AWS_ACCESS_KEY_ID="$CAJA_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$CAJA_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="${CAJA_REGION:-auto}" aws --endpoint-url "$CAJA_ENDPOINT" "$@"
}

# El bucket de fotos de Supabase Storage, por su API compatible con S3.
fotos_s3() {
  AWS_ACCESS_KEY_ID="$FOTOS_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$FOTOS_SECRET_ACCESS_KEY" \
    AWS_DEFAULT_REGION="$FOTOS_REGION" aws --endpoint-url "$FOTOS_ENDPOINT" "$@"
}

# Claves de un bucket bajo un prefijo, una por línea y ordenadas. `cliente` es caja o fotos_s3.
listar() {
  local cliente="$1" bucket="$2" prefijo="$3" salida
  # Si falla aws, falla listar: una lista vacía por error haría creer que no hay nada.
  salida="$("$cliente" s3api list-objects-v2 --bucket "$bucket" --prefix "$prefijo" \
    --query 'Contents[].[Key]' --output text)" || return 1
  printf '%s\n' "$salida" | grep -v -e '^None$' -e '^$' | sort || true
}

# El respaldo más nuevo de la base, o vacío si no hay ninguno.
ultimo_respaldo() {
  listar caja "$CAJA_BUCKET" "$DIARIO/" | tail -n 1
}

# Baja un respaldo de la caja, lo descifra y lo deja desarmado en `destino`.
bajar_respaldo() {
  local clave="$1" destino="$2" identidad
  identidad="$(mktemp)"
  printf '%s\n' "$AGE_IDENTIDAD" >"$identidad"
  caja s3 cp --only-show-errors "s3://$CAJA_BUCKET/$clave" - |
    age -d -i "$identidad" | tar -xz -C "$destino"
  rm -f "$identidad"
}

# Carga un respaldo desarmado en la base `url`, que tiene que tener las migraciones aplicadas.
# VACÍA antes las tablas que vienen en el respaldo. Todo en una transacción: o entra entero o
# no cambia nada. Los triggers no corren (session_replication_role), así los datos quedan tal
# cual estaban. storage.objects no se carga: lo rearma Storage al volver a subir las fotos.
restaurar_base() {
  local dir="$1" url="$2" tablas
  tablas="$(sed -n 's/^COPY \([^ ]*\) (.*/\1/p' "$dir/datos.sql" | paste -sd, -)"
  if [[ -z "$tablas" ]]; then
    echo "El respaldo no trae datos (datos.sql vacío)." >&2
    return 1
  fi
  psql "$url" -X -q -v ON_ERROR_STOP=1 --single-transaction -o /dev/null \
    -c 'set client_min_messages = warning' \
    -c 'set session_replication_role = replica' \
    -c "truncate table $tablas cascade" \
    -f "$dir/datos.sql" \
    -c 'drop schema if exists respaldo cascade' \
    -f "$dir/respaldo.sql"
}
