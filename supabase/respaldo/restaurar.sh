#!/usr/bin/env bash
# Restauración de verdad, solo en una emergencia y a mano (docs/respaldo.md): carga un respaldo
# de la caja (el último si no se pasa otro) en la base de destino y, con RESTAURAR_FOTOS=si,
# vuelve a subir al bucket las fotos que falten. La base de destino tiene que tener las
# migraciones aplicadas (por ejemplo, un proyecto de Supabase nuevo).
# VACÍA las tablas del destino antes de cargar: por eso pide CONFIRMO_DESTINO=<host del destino>.
source "$(dirname "$0")/comun.sh"
requiere RESTAURAR_DB_URL AGE_IDENTIDAD
requiere_caja

host="$(printf '%s' "$RESTAURAR_DB_URL" | sed -E 's#^[^@]*@([^:/?]+).*#\1#')"
if [[ "${CONFIRMO_DESTINO:-}" != "$host" ]]; then
  echo "Esto BORRA los datos de la base en $host y carga el respaldo." >&2
  echo "Si es lo que querés, volvé a correrlo con CONFIRMO_DESTINO=$host" >&2
  exit 1
fi

clave="${1:-$(ultimo_respaldo)}"
if [[ -z "$clave" ]]; then
  echo "No hay ningún respaldo en la caja." >&2
  exit 1
fi
trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT
mkdir "$trabajo/base" "$trabajo/fotos"

echo "== Restaurando $clave en $host"
bajar_respaldo "$clave" "$trabajo/base"
sed 's/^/  /' "$trabajo/base/info.txt"
restaurar_base "$trabajo/base" "$RESTAURAR_DB_URL"
echo "Base restaurada."

if [[ "${RESTAURAR_FOTOS:-no}" == si ]]; then
  requiere FOTOS_ENDPOINT FOTOS_REGION FOTOS_ACCESS_KEY_ID FOTOS_SECRET_ACCESS_KEY
  bucket_fotos="${FOTOS_BUCKET:-fotos}"
  echo "== Fotos: subiendo al bucket $bucket_fotos las que falten"
  listar_caja "$FOTOS/" >"$trabajo/en-caja.txt"
  listar_fotos_s3 "$bucket_fotos" >"$trabajo/en-supabase.txt"
  comm -23 "$trabajo/en-caja.txt" "$trabajo/en-supabase.txt" >"$trabajo/faltan.txt"
  while IFS= read -r clave_foto; do
    mkdir -p "$(dirname "$trabajo/fotos/$clave_foto")"
    caja bajar "$FOTOS/$clave_foto" >"$trabajo/fotos/$clave_foto"
  done <"$trabajo/faltan.txt"
  if [[ -s "$trabajo/faltan.txt" ]]; then
    fotos_s3 s3 cp --recursive --only-show-errors --content-type image/jpeg \
      "$trabajo/fotos" "s3://$bucket_fotos/"
  fi
  echo "Fotos subidas: $(wc -l <"$trabajo/faltan.txt" | tr -d ' ')"
fi
echo "Listo."
