#!/usr/bin/env bash
# Junta las migraciones de supabase/migrations/ en un solo archivo para pegar en el SQL Editor de
# Supabase (entra como postgres, sin contraseña). Es el camino cuando migrar.sh no puede conectarse.
#   bash supabase/produccion/armar-sql-editor.sh
# Genera supabase/produccion/sql-editor/2-migraciones.sql (git lo ignora: se arma de nuevo cada vez).
set -euo pipefail
raiz="$(cd "$(dirname "$0")/../.." && pwd)"
salida="$raiz/supabase/produccion/sql-editor/2-migraciones.sql"
migraciones=("$raiz"/supabase/migrations/*.sql)

{
  echo "-- PASO 2 · Migraciones de la web. Se pega ENTERO en el SQL Editor de Supabase y Run."
  echo "-- Generado por supabase/produccion/armar-sql-editor.sh a partir de supabase/migrations/."
  echo "-- No se edita a mano: si cambia una migración, se vuelve a generar."
  echo "--"
  echo "-- Va todo en un solo envío, sin begin/commit propios: si una sentencia falla, Postgres no"
  echo "-- aplica nada del archivo. Cada migración se puede volver a correr sin duplicar nada."
  echo "-- Supabase puede avisar que hay operaciones destructivas: son los 'drop policy if exists'"
  echo "-- que reemplazan permisos; no se borra ningún dato."
  for archivo in "${migraciones[@]}"; do
    echo
    echo "-- ═════ $(basename "$archivo") ═════"
    cat "$archivo"
  done
  echo
  echo "-- ═════ Historial: así la CLI de Supabase sabe que estas migraciones ya están aplicadas ═════"
  echo "create schema if not exists supabase_migrations;"
  echo "create table if not exists supabase_migrations.schema_migrations (version text not null primary key);"
  echo "alter table supabase_migrations.schema_migrations add column if not exists statements text[];"
  echo "alter table supabase_migrations.schema_migrations add column if not exists name text;"
  echo "insert into supabase_migrations.schema_migrations (version, name) values"
  ultimo=$((${#migraciones[@]} - 1))
  for i in "${!migraciones[@]}"; do
    nombre="$(basename "${migraciones[$i]}" .sql)"
    separador=","
    [[ $i -eq $ultimo ]] && separador=""
    echo "  ('${nombre%%_*}', '${nombre#*_}')$separador"
  done
  echo "on conflict (version) do nothing;"
} > "$salida"

echo "Listo: ${salida#"$raiz"/} (${#migraciones[@]} migraciones, $(wc -l < "$salida" | tr -d ' ') líneas)."
