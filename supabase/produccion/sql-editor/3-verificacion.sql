-- PASO 3 · Verificación. Se pega en el SQL Editor después del paso 2 y Run. Solo lee.
-- Devuelve una fila por chequeo: tienen que estar todas en ✅. Compara contra el respaldo del
-- paso 1, así que confirma que los datos que usa n8n quedaron exactamente iguales.

with
contrato as (
  select count(*) as columnas
  from information_schema.columns
  where table_schema = 'public' and table_name = 'articulos' and data_type = 'text'
    and column_name in ('Codigo', 'Nombre artículo', 'Descripción', 'observaciones',
                        'codigo  familia', 'Nombre familia', 'Imagen')
),
diferencias as (
  -- Filas que cambiaron, aparecieron o desaparecieron en las 7 columnas del contrato.
  select count(*) as filas
  from public.articulos a
  full join respaldo.articulos_antes_de_la_web r on r."Codigo" = a."Codigo"
  where a."Codigo" is null or r."Codigo" is null
     or (a."Nombre artículo", a."Descripción", a.observaciones, a."codigo  familia",
         a."Nombre familia", a."Imagen")
        is distinct from
        (r."Nombre artículo", r."Descripción", r.observaciones, r."codigo  familia",
         r."Nombre familia", r."Imagen")
),
familias_perdidas as (
  select count(*) as filas
  from respaldo.familias_antes_de_la_web r
  where not exists (
    select 1 from public.familias f
    where f."Código" is not distinct from r."Código" and f."Nombre" is not distinct from r."Nombre"
  )
),
nuevos as (
  select
    (select count(*) from unnest(array['perfiles', 'usuarios_telegram', 'consultas_bot',
       'fotos_sin_match', 'v_articulos', 'v_familias', 'v_articulos_sin_foto',
       'v_consultas_bot']) t where to_regclass('public.' || t) is not null) as tablas,
    (select count(distinct proname) from pg_proc
      where pronamespace = 'public'::regnamespace and proname = any (array['f_unaccent',
        'normalizar_busqueda', 'articulo_texto_busqueda', 'es_admin', 'tiene_perfil',
        'mi_perfil', 'filtrar_articulos', 'buscar_articulos', 'contar_articulos', 'stats_fotos',
        'sugerir_codigos', 'asignar_foto', 'crear_perfil_usuario', 'sincronizar_familias',
        'ranking_sin_resultados', 'kpis_bot', 'escapar_like', 'tocar_actualizado_en'])) as funciones,
    (select count(*) from pg_policies where schemaname = 'public') as politicas,
    (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity
       and relname in ('articulos', 'familias', 'perfiles', 'usuarios_telegram', 'consultas_bot',
                       'fotos_sin_match')) as con_rls,
    (select count(*) from public.articulos
      where public.articulo_texto_busqueda(trim("Codigo"), "Nombre artículo", "Descripción",
                                           observaciones) like '%bujia%') as bujias,
    (select count(*) from supabase_migrations.schema_migrations
      where version between '20261009000001' and '20261009000013') as historial
),
chequeos (n, chequeo, esperado, obtenido, ok) as (
  select 1, 'Artículos: misma cantidad que antes',
         (select count(*) from respaldo.articulos_antes_de_la_web)::text,
         (select count(*) from public.articulos)::text,
         (select count(*) from public.articulos)
           = (select count(*) from respaldo.articulos_antes_de_la_web)
  union all
  select 2, 'Artículos: ningún dato de n8n cambió (7 columnas)', '0 filas distintas',
         (select filas from diferencias) || ' filas distintas', (select filas from diferencias) = 0
  union all
  select 3, 'Columnas del contrato con n8n, todas texto', '7',
         (select columnas from contrato)::text, (select columnas from contrato) = 7
  union all
  select 4, 'Artículos: id cargado y sin repetir', 'sí',
         case when (select count(*) filter (where id is null) = 0 and count(distinct id) = count(*)
                    from public.articulos) then 'sí' else 'no' end,
         (select count(*) filter (where id is null) = 0 and count(distinct id) = count(*)
          from public.articulos)
  union all
  select 5, 'Familias: no se perdió ninguna fila', '0 perdidas',
         (select filas from familias_perdidas) || ' perdidas', (select filas from familias_perdidas) = 0
  union all
  select 6, 'Familias nuevas agregadas desde articulos', 'las que faltaban',
         ((select count(*) from public.familias)
           - (select count(*) from respaldo.familias_antes_de_la_web))::text,
         (select count(*) from public.familias)
           >= (select count(*) from respaldo.familias_antes_de_la_web)
  union all
  select 7, 'Familias internas (no son producto)', 'las de la lista que existan',
         (select count(*) from public.familias where not es_producto)::text, true
  union all
  select 8, 'Tablas y vistas nuevas', '8', tablas::text, tablas = 8 from nuevos
  union all
  select 9, 'Funciones de la web', '18', funciones::text, funciones = 18 from nuevos
  union all
  select 10, 'Políticas de permisos (RLS)', '19', politicas::text, politicas = 19 from nuevos
  union all
  select 11, 'RLS prendido en las 6 tablas', '6', con_rls::text, con_rls = 6 from nuevos
  union all
  select 12, 'Sin sesión (anon) no se lee articulos', 'no puede',
         case when has_table_privilege('anon', 'public.articulos', 'select')
              then 'puede' else 'no puede' end,
         not has_table_privilege('anon', 'public.articulos', 'select')
  union all
  select 13, 'Roles de n8n creados (todavía sin contraseña)', 'n8n_app, n8n_bot',
         coalesce((select string_agg(rolname, ', ' order by rolname) from pg_roles
                   where rolname in ('n8n_bot', 'n8n_app')), 'ninguno'),
         (select count(*) from pg_roles where rolname in ('n8n_bot', 'n8n_app')) = 2
  union all
  select 14, 'Perfil automático al invitar usuarios', 'trigger creado',
         case when exists (select 1 from pg_trigger where tgname = 'crear_perfil_al_crear_usuario'
                             and tgrelid = 'auth.users'::regclass)
              then 'trigger creado' else 'falta' end,
         exists (select 1 from pg_trigger where tgname = 'crear_perfil_al_crear_usuario'
                   and tgrelid = 'auth.users'::regclass)
  union all
  select 15, 'Búsqueda sin tildes ("bujia" encuentra "bujía")', 'más de 0', bujias::text, bujias > 0
  from nuevos
  union all
  select 16, 'Historial de migraciones', '13', historial::text, historial = 13 from nuevos
)
select n, chequeo, esperado, obtenido, case when ok then '✅' else '❌ revisar' end as estado
from chequeos
order by n;
