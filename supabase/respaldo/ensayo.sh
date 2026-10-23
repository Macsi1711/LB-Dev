#!/usr/bin/env bash
# Las pruebas del ensayo, dentro del contenedor. Lo arma y lo corre ensayo-local.sh: nunca
# directo, y nunca contra producción (cambia datos a propósito).
source "$(dirname "$0")/comun.sh"
requiere RESTAURAR_DB_URL CAJA_CARPETA FOTOS_ENDPOINT FOTOS_URL

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
rm -rf "$CAJA_CARPETA"
mkdir -p "$CAJA_CARPETA"
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
RESPALDO_FECHA=2025-09-01 bash "$aqui/respaldar.sh" >"$salida"
grep -q 'nuevas copiadas: 2' "$salida" || mal "La primera noche no copió las 2 fotos."
RESPALDO_FECHA=2026-10-01 bash "$aqui/respaldar.sh" >/dev/null
admin "insert into articulos (\"Codigo\", \"Nombre artículo\") values ('ENSAYO-RESPALDO', 'ARTICULO DEL ENSAYO')" >/dev/null
# Una tabla que no crean las migraciones, como la memoria del chat que arma n8n en producción.
admin "create table public.n8n_chat_histories (id serial primary key, session_id text, message jsonb);
  insert into public.n8n_chat_histories (session_id, message) values ('ensayo', '{}')" >/dev/null
RESPALDO_FECHA=2026-10-21 bash "$aqui/respaldar.sh" | tee "$salida" | sed 's/^/    /'

diario="$(caja listar "$DIARIO/" | paste -sd' ' -)"
[[ "$diario" == "$DIARIO/base-2026-10-01.tar.gz.age $DIARIO/base-2026-10-21.tar.gz.age" ]] ||
  mal "Diarios: $diario"
bien "quedan los diarios de los últimos 30 días (el de 2025-09-01 se borró)"
mensual="$(caja listar "$MENSUAL/" | paste -sd' ' -)"
[[ "$mensual" == "$MENSUAL/base-2026-10.tar.gz.age" ]] || mal "Mensuales: $mensual"
bien "queda el mensual de 2026-10 (el de 2025-09 tiene más de 12 meses y se borró)"
[[ "$(caja listar "$FOTOS/" | wc -l | tr -d ' ')" == "${#rutas[@]}" ]] ||
  mal "La caja no tiene las ${#rutas[@]} fotos."
grep -q 'nuevas copiadas: 0' "$salida" || mal "La tercera noche volvió a copiar fotos que ya estaban."
bien "las fotos se copian una sola vez"
caja bajar "$DIARIO/base-2026-10-21.tar.gz.age" >"$salida"
cabecera="$(head -c 21 "$salida")"
[[ "$cabecera" == age-encryption.org/v1 ]] || mal "El respaldo no está cifrado con age."
bien "la base viaja cifrada"

echo "## Se rompen datos: un artículo y todas las consultas"
consultas="$(admin 'select count(*) from consultas_bot')"
admin "delete from articulos where \"Codigo\" = 'ENSAYO-RESPALDO'" >/dev/null
admin 'delete from consultas_bot' >/dev/null
# La base donde se restaura no la tiene (como la de prueba, que solo tiene las migraciones).
admin 'drop table public.n8n_chat_histories' >/dev/null

echo "## Prueba de restauración (la del día 1 de cada mes)"
bash "$aqui/probar.sh" | tee "$salida" | sed 's/^/    /'
grep -q '⚠ public.n8n_chat_histories' "$salida" || mal "No avisó que salteó la tabla de n8n."
bien "una tabla que no crean las migraciones se saltea con un aviso, sin cortar la restauración"
[[ "$(admin "select count(*) from articulos where \"Codigo\" = 'ENSAYO-RESPALDO'")" == 1 ]] ||
  mal "No volvió el artículo borrado."
[[ "$(admin 'select count(*) from consultas_bot')" == "$consultas" ]] || mal "No volvieron las consultas."
bien "volvieron el artículo y las $consultas consultas"
[[ "$(admin "select count(*) from auth.users where email = 'vendedor@lois.local'")" == 1 ]] ||
  mal "No volvieron los usuarios."
bien "volvieron los usuarios"

echo "## Los seguros"
if RESTAURAR_DB_URL='postgresql://postgres@db.x.supabase.co:5432/postgres' bash "$aqui/probar.sh" >/dev/null 2>&1; then
  mal "probar.sh aceptó una base de Supabase en la nube."
fi
bien "probar.sh no acepta una base en la nube"
if bash "$aqui/restaurar.sh" >/dev/null 2>&1; then
  mal "restaurar.sh restauró sin CONFIRMO_DESTINO."
fi
bien "restaurar.sh no hace nada sin CONFIRMO_DESTINO"

echo "## Restauración de verdad: vuelve una foto borrada"
fotos_s3 s3 rm --only-show-errors "s3://fotos/${rutas[0]}"
host="$(printf '%s' "$RESTAURAR_DB_URL" | sed -E 's#^[^@]*@([^:/?]+).*#\1#')"
CONFIRMO_DESTINO="$host" RESTAURAR_FOTOS=si bash "$aqui/restaurar.sh" | sed 's/^/    /'
fotos_s3 s3api head-object --bucket fotos --key "${rutas[0]}" >/dev/null || mal "No volvió la foto."
bien "volvió la foto ${rutas[0]}"

echo "## Una foto nueva entra la noche siguiente, de a una"
fotos_s3 s3 cp --only-show-errors --content-type image/jpeg "$foto" "s3://fotos/999/Ensayo001.jpg"
RESPALDO_FECHA=2026-10-22 bash "$aqui/respaldar.sh" >"$salida"
grep -q 'nuevas copiadas: 1' "$salida" || mal "No copió la foto nueva."
[[ "$(caja listar "$FOTOS/999/")" == "$FOTOS/999/Ensayo001.jpg" ]] ||
  mal "La foto nueva no está en la caja."
fotos_s3 s3 rm --only-show-errors "s3://fotos/999/Ensayo001.jpg"
bien "copió solo la foto nueva"

echo "## Si falta una foto en la caja, la prueba mensual avisa"
caja borrar "$FOTOS/${rutas[0]}"
if bash "$aqui/probar.sh" >"$salida" 2>&1; then
  mal "probar.sh no detectó la foto que falta."
fi
grep -q 'Faltan 1 fotos' "$salida" || mal "probar.sh falló por otra cosa: $(tail -n 3 "$salida")"
bien "probar.sh falla y dice qué foto falta"

echo "## Limpieza"
admin "delete from articulos where \"Codigo\" = 'ENSAYO-RESPALDO'" >/dev/null
for ruta in "${rutas[@]}"; do
  fotos_s3 s3 rm --only-show-errors "s3://fotos/$ruta"
done
rm -rf "$CAJA_CARPETA"
echo "Ensayo completo: todo anduvo."
