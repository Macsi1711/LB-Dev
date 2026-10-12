-- Inspección de SOLO LECTURA de la base de producción, antes de aplicar las migraciones.
-- Se corre con supabase/produccion/inspeccionar.sh (ver docs/produccion.md).
-- Todo va dentro de una transacción read only que termina en rollback: no puede escribir nada.
-- No vuelca datos personales: de auth.users solo cuenta filas.

\pset footer off
\pset null '∅'
begin transaction read only;
set local statement_timeout = '30s';

\echo '== 1. Base =='
select current_database() as base, current_user as usuario, version() as version;
select pg_size_pretty(pg_database_size(current_database())) as tamano;

\echo '== 2. Extensiones (las migraciones usan pg_trgm y unaccent en el schema extensions) =='
select e.extname as extension, e.extversion as version, n.nspname as schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by 1;

\echo '== 3. Tablas y vistas de public, con filas estimadas =='
select c.relname as objeto,
       case c.relkind when 'r' then 'tabla' when 'p' then 'tabla particionada'
                      when 'v' then 'vista' when 'm' then 'vista materializada' end as tipo,
       c.reltuples::bigint as filas_estimadas,
       c.relrowsecurity as rls
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
order by 1;

\echo '== 4. Columnas de articulos (el contrato con n8n: ninguna se renombra ni cambia de tipo) =='
select ordinal_position as n, column_name as columna, data_type as tipo, is_nullable as nula,
       column_default as defecto, is_identity as identidad
from information_schema.columns
where table_schema = 'public' and table_name = 'articulos'
order by ordinal_position;

\echo '== 5. Las columnas que espera la web, ¿están con el nombre exacto? =='
select esperada,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'articulos' and column_name = esperada
       ) as existe
from unnest(array['Codigo', 'Nombre artículo', 'Descripción', 'observaciones',
                  'codigo  familia', 'Nombre familia', 'Imagen', 'id', 'actualizado_en']) as esperada;

\echo '== 6. Constraints, índices y triggers de articulos =='
select conname as constraint, contype as tipo, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = to_regclass('public.articulos')
order by 1;
select indexname as indice, indexdef as definicion
from pg_indexes
where schemaname = 'public' and tablename = 'articulos'
order by 1;
select tgname as trigger, pg_get_triggerdef(oid) as definicion
from pg_trigger
where tgrelid = to_regclass('public.articulos') and not tgisinternal
order by 1;

\echo '== 7. Objetos que crean las migraciones: si ya existen, hay que revisarlos antes =='
select nombre, to_regclass('public.' || nombre) is not null as ya_existe
from unnest(array['familias', 'perfiles', 'usuarios_telegram', 'consultas_bot',
                  'fotos_sin_match', 'v_articulos', 'v_articulos_sin_foto',
                  'v_consultas_bot']) as nombre;
select p.proname as funcion_que_ya_existe
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = any (array['f_unaccent', 'normalizar_busqueda', 'articulo_texto_busqueda',
                             'es_admin', 'tiene_perfil', 'mi_perfil', 'filtrar_articulos',
                             'buscar_articulos', 'contar_articulos', 'stats_fotos',
                             'sugerir_codigos', 'asignar_foto', 'crear_perfil_usuario',
                             'sincronizar_familias', 'ranking_sin_resultados', 'kpis_bot',
                             'escapar_like', 'tocar_actualizado_en'])
order by 1;

\echo '== 8. Políticas de RLS que ya existen en public =='
select tablename as tabla, policyname as politica, roles, cmd as operacion
from pg_policies
where schemaname = 'public'
order by 1, 2;

\echo '== 9. Roles que pueden entrar (para saber con cuál se conecta n8n) =='
select rolname as rol, rolcanlogin as login, rolsuper as superusuario, rolbypassrls as saltea_rls
from pg_roles
where rolcanlogin and rolname not like 'pg\_%'
order by 1;
select grantee as rol, string_agg(privilege_type, ', ' order by privilege_type) as permisos
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'articulos'
group by grantee
order by 1;

\echo '== 10. Quién está conectado ahora (sin IPs). Si n8n está activo, aparece su usuario =='
select usename as usuario, application_name as aplicacion, state as estado, count(*) as conexiones
from pg_stat_activity
where datname = current_database() and pid <> pg_backend_pid()
group by 1, 2, 3
order by 4 desc;

\echo '== 11. Datos de articulos: total, códigos vacíos y duplicados =='
select count(*) as total,
       count(distinct upper(trim("Codigo"))) as codigos_distintos,
       count(*) filter (where "Codigo" is null or trim("Codigo") = '') as sin_codigo
from public.articulos;
\echo 'Códigos repetidos (los 20 con más repeticiones):'
select upper(trim("Codigo")) as codigo, count(*) as veces
from public.articulos
where "Codigo" is not null and trim("Codigo") <> ''
group by 1
having count(*) > 1
order by 2 desc, 1
limit 20;

\echo '== 12. Fotos: cuántas tienen link y cuántas siguen el formato de n8n =='
select count(*) filter (where "Imagen" ilike '%http%') as con_foto,
       count(*) filter (
         where "Imagen" ~ '^https://drive\.google\.com/file/d/[A-Za-z0-9_-]+/view\?usp=drivesdk$'
       ) as formato_n8n,
       count(*) filter (
         where "Imagen" ilike '%http%'
           and "Imagen" !~ '^https://drive\.google\.com/file/d/[A-Za-z0-9_-]+/view\?usp=drivesdk$'
       ) as otro_formato
from public.articulos;
\echo 'Ejemplos de otro formato (comienzo del link):'
select left("Imagen", 70) as imagen
from public.articulos
where "Imagen" ilike '%http%'
  and "Imagen" !~ '^https://drive\.google\.com/file/d/[A-Za-z0-9_-]+/view\?usp=drivesdk$'
limit 5;

\echo '== 13. Familias que aparecen en articulos =='
select "codigo  familia" as familia, max("Nombre familia") as nombre, count(*) as articulos
from public.articulos
group by 1
order by 3 desc
limit 60;

\echo '== 14. Usuarios de la web e historial de migraciones =='
select count(*) as usuarios_auth from auth.users;
select to_regclass('supabase_migrations.schema_migrations') is not null as hay_historial \gset
\if :hay_historial
  select version, name from supabase_migrations.schema_migrations order by version;
\else
  \echo 'Sin historial de migraciones de Supabase: nunca se aplicó ninguna con la CLI.'
\endif

rollback;
\echo '== Fin: no se cambió nada =='
