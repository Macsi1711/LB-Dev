#!/usr/bin/env bash
# Prueba de restauración (una vez por mes, y en el ensayo local): baja un respaldo de la caja
# (el último si no se pasa otro), lo carga en una base DESCARTABLE con las migraciones aplicadas
# (Supabase local) y compara las filas con las que tenía la base al respaldarla. Además chequea
# que cada foto asignada a un artículo esté en la caja. Si algo no cuadra, termina con error.
# Nunca contra producción: vacía las tablas antes de cargar.
source "$(dirname "$0")/comun.sh"
requiere RESTAURAR_DB_URL AGE_IDENTIDAD
requiere_caja

if [[ "$RESTAURAR_DB_URL" == *supabase.co* || "$RESTAURAR_DB_URL" == *supabase.com* ]]; then
  echo "La prueba es solo contra una base descartable, nunca contra Supabase en la nube." >&2
  exit 1
fi

clave="${1:-$(ultimo_respaldo)}"
if [[ -z "$clave" ]]; then
  echo "No hay ningún respaldo en la caja." >&2
  exit 1
fi
trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT

echo "== Restaurando $clave en una base de prueba"
bajar_respaldo "$clave" "$trabajo"
sed 's/^/  /' "$trabajo/info.txt"
restaurar_base "$trabajo" "$RESTAURAR_DB_URL"

echo "== Filas: restauradas contra las del respaldo"
fallas=0
while IFS=$'\t' read -r tabla esperadas; do
  # storage.objects no se restaura con la base: lo rearma Storage al volver a subir las fotos.
  [[ "$tabla" == storage.objects ]] && continue
  hay="$(psql "$RESTAURAR_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "select count(*) from $tabla")"
  if [[ "$hay" == "$esperadas" ]]; then
    echo "  ✓ $tabla: $hay"
  else
    echo "  ✗ $tabla: $hay (en el respaldo: $esperadas)"
    fallas=1
  fi
done <"$trabajo/conteos.tsv"

echo "== Fotos: cada foto asignada a un artículo está en la caja"
psql "$RESTAURAR_DB_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c 'select foto from public.articulos where foto is not null' | sort >"$trabajo/asignadas.txt"
listar_caja "$FOTOS/" >"$trabajo/en-caja.txt"
comm -23 "$trabajo/asignadas.txt" "$trabajo/en-caja.txt" >"$trabajo/faltan.txt"
if [[ -s "$trabajo/faltan.txt" ]]; then
  echo "  ✗ Faltan $(wc -l <"$trabajo/faltan.txt" | tr -d ' ') fotos en la caja, por ejemplo:"
  head -n 5 "$trabajo/faltan.txt" | sed 's/^/    /'
  fallas=1
else
  echo "  ✓ $(wc -l <"$trabajo/asignadas.txt" | tr -d ' ') fotos asignadas, todas en la caja"
fi

if ((fallas)); then
  echo "La prueba de restauración FALLÓ." >&2
  exit 1
fi
echo "La prueba de restauración anduvo: el respaldo se puede usar."
