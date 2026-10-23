#!/usr/bin/env bash
# Respaldo nocturno: copia la base y las fotos a la caja (Vercel Blob), fuera de Supabase.
# Lo corre .github/workflows/respaldo.yml todas las noches (docs/respaldo.md).
#   - La base va cifrada con age: solo la abre quien tiene la clave privada.
#   - Las fotos ya son públicas en la web: se bajan por su link, van tal cual y nunca se borran
#     de la caja (solo se suman las nuevas), así una foto borrada por error se puede recuperar.
#   - Quedan las copias de los últimos 30 días y la primera de cada mes durante 12 meses.
source "$(dirname "$0")/comun.sh"
requiere RESPALDO_DB_URL AGE_DESTINATARIO FOTOS_URL
requiere_caja

# RESPALDO_FECHA solo la usa el ensayo local, para probar las retenciones.
hoy="${RESPALDO_FECHA:-$(date -u +%F)}"
mes="${hoy:0:7}"
trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT
mkdir "$trabajo/base" "$trabajo/fotos"

echo "== Base ($hoy)"
# Una sesión abierta exporta una foto fija de la base (snapshot) que usan los conteos y los
# pg_dump: así cuadran entre sí aunque alguien escriba mientras tanto.
coproc SESION { psql "$RESPALDO_DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 2>&1; }
# Bash borra SESION_PID cuando la sesión termina: se guarda antes para poder esperarla.
pid_sesion="$SESION_PID"
# Deja la respuesta en $resultado: los descriptores del coproc no existen dentro de un $(…).
consulta() {
  printf '%s\n\\echo __fin__\n' "$1" >&"${SESION[1]}"
  resultado=''
  local linea
  while IFS= read -r linea <&"${SESION[0]}"; do
    if [[ "$linea" == __fin__ ]]; then
      resultado="${resultado%$'\n'}"
      return 0
    fi
    resultado+="$linea"$'\n'
  done
  echo "Se cortó la conexión con la base: $resultado" >&2
  return 1
}

consulta 'begin isolation level repeatable read read only; select pg_export_snapshot();'
snapshot="$resultado"
if [[ ! "$snapshot" =~ ^[0-9A-F]+-[0-9A-F]+-[0-9]+$ ]]; then
  echo "No se pudo abrir la foto fija de la base: $snapshot" >&2
  exit 1
fi

# Las tablas que se cuentan: las de public y respaldo, los usuarios y los archivos de Storage.
consulta "select format('%I.%I', n.nspname, c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and (n.nspname in ('public', 'respaldo')
         or (n.nspname, c.relname) in (('auth', 'users'), ('auth', 'identities'), ('storage', 'objects')))
  order by 1;"
conteo=''
while IFS= read -r tabla; do
  conteo+="select '$tabla', count(*) from $tabla union all "
done <<<"$resultado"
consulta "${conteo% union all };"
printf '%s\n' "$resultado" | tr '|' '\t' >"$trabajo/base/conteos.tsv"

volcar() {
  pg_dump "$RESPALDO_DB_URL" --snapshot="$snapshot" --no-owner --no-privileges "$@"
}
# datos.sql es lo que se restaura; el resto queda de referencia (y respaldo.sql, por si hace falta).
volcar --data-only --table='public.*' --table=auth.users --table=auth.identities \
  -f "$trabajo/base/datos.sql"
consulta "select exists (select 1 from pg_namespace where nspname = 'respaldo');"
if [[ "$resultado" == t ]]; then
  volcar --schema=respaldo -f "$trabajo/base/respaldo.sql"
else
  echo '-- La base no tenía el schema respaldo.' >"$trabajo/base/respaldo.sql"
fi
volcar --schema-only --schema=public -f "$trabajo/base/esquema.sql"
volcar --data-only --table=storage.objects -f "$trabajo/base/storage-objects.sql"
# Las fotos que hay en Supabase, de la misma foto fija.
consulta "select name from storage.objects where bucket_id = 'fotos';"
printf '%s\n' "$resultado" | grep -v '^$' | sort >"$trabajo/en-supabase.txt" || true
consulta 'commit;'
printf '\\q\n' >&"${SESION[1]}"
wait "$pid_sesion" || true

{
  echo "fecha=$hoy"
  echo "pg_dump=$(pg_dump --version)"
  echo "servidor=$(psql "$RESPALDO_DB_URL" -X -A -t -c 'show server_version')"
} >"$trabajo/base/info.txt"

archivo="$trabajo/base-$hoy.tar.gz.age"
tar -C "$trabajo/base" -cz . | age -r "$AGE_DESTINATARIO" -o "$archivo"
caja subir "$archivo" "$DIARIO/base-$hoy.tar.gz.age"
echo "Subido $DIARIO/base-$hoy.tar.gz.age ($(du -h "$archivo" | cut -f1)):"
sed 's/^/  /' "$trabajo/base/conteos.tsv"

mensual_del_mes="$(caja listar "$MENSUAL/base-$mes")"
if [[ -z "$mensual_del_mes" ]]; then
  caja subir "$archivo" "$MENSUAL/base-$mes.tar.gz.age"
  echo "Es la primera del mes: queda también como $MENSUAL/base-$mes.tar.gz.age"
fi

echo "== Retención"
# Las listas van a un archivo antes de recorrerlas: si falla la caja, falla el respaldo.
caja listar "$DIARIO/" >"$trabajo/diarios.txt"
limite_dia="$(date -u -d "$hoy -$DIAS_DIARIOS days" +%F)"
while IFS= read -r clave; do
  fecha="${clave##*/base-}"
  fecha="${fecha%.tar.gz.age}"
  if ! [[ "$fecha" > "$limite_dia" ]]; then
    caja borrar "$clave"
    echo "Borrado $clave (tiene más de $DIAS_DIARIOS días)"
  fi
done <"$trabajo/diarios.txt"
caja listar "$MENSUAL/" >"$trabajo/mensuales.txt"
limite_mes="$(date -u -d "$mes-01 -$MESES_MENSUALES months" +%Y-%m)"
while IFS= read -r clave; do
  mes_clave="${clave##*/base-}"
  mes_clave="${mes_clave%.tar.gz.age}"
  if ! [[ "$mes_clave" > "$limite_mes" ]]; then
    caja borrar "$clave"
    echo "Borrado $clave (tiene más de $MESES_MENSUALES meses)"
  fi
done <"$trabajo/mensuales.txt"

echo "== Fotos"
listar_caja "$FOTOS/" >"$trabajo/en-caja.txt"
comm -23 "$trabajo/en-supabase.txt" "$trabajo/en-caja.txt" >"$trabajo/nuevas.txt"
nuevas="$(wc -l <"$trabajo/nuevas.txt" | tr -d ' ')"
if ((nuevas > 0)); then
  # Una sola corrida de curl para todas: si falla una, falla el respaldo.
  while IFS= read -r clave; do
    printf 'url = "%s/%s"\noutput = "%s/%s"\n' "${FOTOS_URL%/}" "$clave" "$trabajo/fotos" "$clave"
  done <"$trabajo/nuevas.txt" >"$trabajo/curl.txt"
  curl -fsS --retry 3 --create-dirs --fail-early -K "$trabajo/curl.txt"
  caja subir-carpeta "$trabajo/fotos" "$FOTOS/"
fi
echo "Fotos en Supabase: $(wc -l <"$trabajo/en-supabase.txt" | tr -d ' '); nuevas copiadas: $nuevas"

echo "Listo."
