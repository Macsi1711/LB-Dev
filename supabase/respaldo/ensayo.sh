#!/usr/bin/env bash
# Las pruebas del ensayo, dentro del contenedor. Lo arma y lo corre ensayo-local.sh: nunca
# directo, y nunca contra producción (cambia datos a propósito).
source "$(dirname "$0")/comun.sh"
requiere RESTAURAR_DB_URL CAJA_BUCKET FOTOS_ENDPOINT

aqui="$(dirname "$0")"
bien() { echo "  ✓ $*"; }
mal() {
  echo "  ✗ $*" >&2
  exit 1
}
admin() { psql "$RESTAURAR_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$1"; }
salida="$(mktemp)"

if [[ "$RESTAURAR_DB_URL" == *supabase.co* || "$RESTAURAR_DB_URL" == *supabase.com* ]]; then
  mal "El ensayo es solo contra el Supabase local."
fi

echo "## Preparación: caja vacía y dos fotos en las rutas que el seed asignó"
caja s3 rb --force "s3://$CAJA_BUCKET" >/dev/null 2>&1 || true
caja s3 mb "s3://$CAJA_BUCKET" >/dev/null
# Un JPEG de 1×1.
foto="$(mktemp)"
base64 -d >"$foto" <<<'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
mapfile -t rutas < <(admin 'select foto from articulos where foto is not null order by 1')
((${#rutas[@]} >= 2)) || mal "El seed tendría que tener al menos dos artículos con foto."
for ruta in "${rutas[@]}"; do
  fotos_s3 s3 cp --only-show-errors --content-type image/jpeg "$foto" "s3://fotos/$ruta"
done
bien "${#rutas[@]} fotos subidas al bucket fotos"

echo "## Tres noches de respaldo"
# La primera noche baja todas las fotos de una (como en producción la primera vez).
RESPALDO_FECHA=2025-09-01 RESPALDO_UMBRAL_FOTOS=0 bash "$aqui/respaldar.sh" >"$salida"
grep -q 'nuevas copiadas: 2' "$salida" || mal "La primera noche no copió las 2 fotos."
RESPALDO_FECHA=2026-10-01 bash "$aqui/respaldar.sh" >/dev/null
admin "insert into articulos (\"Codigo\", \"Nombre artículo\") values ('ENSAYO-RESPALDO', 'ARTICULO DEL ENSAYO')" >/dev/null
RESPALDO_FECHA=2026-10-21 bash "$aqui/respaldar.sh" | tee "$salida" | sed 's/^/    /'

diario="$(listar caja "$CAJA_BUCKET" "$DIARIO/" | paste -sd' ' -)"
[[ "$diario" == "$DIARIO/base-2026-10-01.tar.gz.age $DIARIO/base-2026-10-21.tar.gz.age" ]] ||
  mal "Diarios: $diario"
bien "quedan los diarios de los últimos 30 días (el de 2025-09-01 se borró)"
mensual="$(listar caja "$CAJA_BUCKET" "$MENSUAL/" | paste -sd' ' -)"
[[ "$mensual" == "$MENSUAL/base-2026-10.tar.gz.age" ]] || mal "Mensuales: $mensual"
bien "queda el mensual de 2026-10 (el de 2025-09 tiene más de 12 meses y se borró)"
[[ "$(listar caja "$CAJA_BUCKET" "$FOTOS/" | wc -l | tr -d ' ')" == "${#rutas[@]}" ]] ||
  mal "La caja no tiene las ${#rutas[@]} fotos."
grep -q 'nuevas copiadas: 0' "$salida" || mal "La tercera noche volvió a copiar fotos que ya estaban."
bien "las fotos se copian una sola vez"
cabecera="$(caja s3 cp --only-show-errors "s3://$CAJA_BUCKET/$DIARIO/base-2026-10-21.tar.gz.age" - | head -c 21)"
[[ "$cabecera" == age-encryption.org/v1 ]] || mal "El respaldo no está cifrado con age."
bien "la base viaja cifrada"

echo "## Una foto nueva entra la noche siguiente, de a una"
fotos_s3 s3 cp --only-show-errors --content-type image/jpeg "$foto" "s3://fotos/999/Ensayo001.jpg"
RESPALDO_FECHA=2026-10-22 bash "$aqui/respaldar.sh" >"$salida"
grep -q 'nuevas copiadas: 1' "$salida" || mal "No copió la foto nueva."
caja s3api head-object --bucket "$CAJA_BUCKET" --key "$FOTOS/999/Ensayo001.jpg" >/dev/null ||
  mal "La foto nueva no está en la caja."
fotos_s3 s3 rm --only-show-errors "s3://fotos/999/Ensayo001.jpg"
bien "copió solo la foto nueva"

echo "## Limpieza"
admin "delete from articulos where \"Codigo\" = 'ENSAYO-RESPALDO'" >/dev/null
for ruta in "${rutas[@]}"; do
  fotos_s3 s3 rm --only-show-errors "s3://fotos/$ruta"
done
caja s3 rb --force "s3://$CAJA_BUCKET" >/dev/null
echo "Ensayo completo: todo anduvo."
