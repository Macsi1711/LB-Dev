#!/usr/bin/env bash
# Respaldo nocturno: copia la base y las fotos a la caja (Cloudflare R2), fuera de Supabase.
# Lo corre .github/workflows/respaldo.yml todas las noches (docs/respaldo.md).
#   - La base va cifrada con age: solo la abre quien tiene la clave privada.
#   - Las fotos ya son públicas en la web: van tal cual y nunca se borran de la caja (solo se
#     suman las nuevas), así una foto borrada por error se puede recuperar.
#   - Quedan las copias de los últimos 30 días y la primera de cada mes durante 12 meses.
source "$(dirname "$0")/comun.sh"
requiere RESPALDO_DB_URL AGE_DESTINATARIO CAJA_ENDPOINT CAJA_BUCKET CAJA_ACCESS_KEY_ID \
  CAJA_SECRET_ACCESS_KEY FOTOS_ENDPOINT FOTOS_REGION FOTOS_ACCESS_KEY_ID FOTOS_SECRET_ACCESS_KEY

# RESPALDO_FECHA solo la usa el ensayo local, para probar las retenciones.
hoy="${RESPALDO_FECHA:-$(date -u +%F)}"
mes="${hoy:0:7}"
bucket_fotos="${FOTOS_BUCKET:-fotos}"
trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT
mkdir "$trabajo/base" "$trabajo/fotos"

echo "== Base ($hoy)"
# Una sesión abierta exporta una foto fija de la base (snapshot) que usan los conteos y los
# pg_dump: así cuadran entre sí aunque alguien escriba mientras tanto.
coproc SESION { psql "$RESPALDO_DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 2>&1; }
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
consulta 'commit;'
printf '\\q\n' >&"${SESION[1]}"
wait "$SESION_PID" || true

{
  echo "fecha=$hoy"
  echo "pg_dump=$(pg_dump --version)"
  echo "servidor=$(psql "$RESPALDO_DB_URL" -X -A -t -c 'show server_version')"
} >"$trabajo/base/info.txt"

archivo="$trabajo/base-$hoy.tar.gz.age"
tar -C "$trabajo/base" -cz . | age -r "$AGE_DESTINATARIO" -o "$archivo"
caja s3 cp --only-show-errors "$archivo" "s3://$CAJA_BUCKET/$DIARIO/base-$hoy.tar.gz.age"
echo "Subido $DIARIO/base-$hoy.tar.gz.age ($(du -h "$archivo" | cut -f1)):"
sed 's/^/  /' "$trabajo/base/conteos.tsv"

if [[ -z "$(listar caja "$CAJA_BUCKET" "$MENSUAL/base-$mes")" ]]; then
  caja s3 cp --only-show-errors "$archivo" "s3://$CAJA_BUCKET/$MENSUAL/base-$mes.tar.gz.age"
  echo "Es la primera del mes: queda también como $MENSUAL/base-$mes.tar.gz.age"
fi

echo "== Retención"
limite_dia="$(date -u -d "$hoy -$DIAS_DIARIOS days" +%F)"
while IFS= read -r clave; do
  fecha="${clave##*/base-}"
  fecha="${fecha%.tar.gz.age}"
  if ! [[ "$fecha" > "$limite_dia" ]]; then
    caja s3 rm --only-show-errors "s3://$CAJA_BUCKET/$clave"
    echo "Borrado $clave (tiene más de $DIAS_DIARIOS días)"
  fi
done < <(listar caja "$CAJA_BUCKET" "$DIARIO/")
limite_mes="$(date -u -d "$mes-01 -$MESES_MENSUALES months" +%Y-%m)"
while IFS= read -r clave; do
  mes_clave="${clave##*/base-}"
  mes_clave="${mes_clave%.tar.gz.age}"
  if ! [[ "$mes_clave" > "$limite_mes" ]]; then
    caja s3 rm --only-show-errors "s3://$CAJA_BUCKET/$clave"
    echo "Borrado $clave (tiene más de $MESES_MENSUALES meses)"
  fi
done < <(listar caja "$CAJA_BUCKET" "$MENSUAL/")

echo "== Fotos"
listar fotos_s3 "$bucket_fotos" '' >"$trabajo/en-supabase.txt"
listar caja "$CAJA_BUCKET" "$FOTOS/" | sed "s#^$FOTOS/##" >"$trabajo/en-caja.txt"
comm -23 "$trabajo/en-supabase.txt" "$trabajo/en-caja.txt" >"$trabajo/nuevas.txt"
nuevas="$(wc -l <"$trabajo/nuevas.txt" | tr -d ' ')"
if ((nuevas > ${RESPALDO_UMBRAL_FOTOS:-50})); then
  # Muchas (la primera vez): se bajan todas de una, que es más rápido que una por una.
  fotos_s3 s3 sync --only-show-errors "s3://$bucket_fotos" "$trabajo/fotos"
else
  while IFS= read -r clave; do
    fotos_s3 s3 cp --only-show-errors "s3://$bucket_fotos/$clave" "$trabajo/fotos/$clave"
  done <"$trabajo/nuevas.txt"
fi
if ((nuevas > 0)); then
  caja s3 sync --only-show-errors "$trabajo/fotos" "s3://$CAJA_BUCKET/$FOTOS/"
fi
echo "Fotos en Supabase: $(wc -l <"$trabajo/en-supabase.txt" | tr -d ' '); nuevas copiadas: $nuevas"

echo "Listo."
