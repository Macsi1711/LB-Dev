-- DESHACER · Solo si algo sale mal justo después del paso 2 (por ejemplo, el bot deja de responder).
-- Se pega en el SQL Editor y Run. Saca todo lo que agregaron las migraciones de la web y deja
-- articulos y familias como estaban: mismas columnas y los datos de n8n intactos.
--
-- Ojo: borra las tablas nuevas (perfiles, usuarios_telegram, consultas_bot, fotos_sin_match) con lo
-- que tengan adentro. Pensado para usar el mismo día, antes de cargar usuarios o de que n8n escriba
-- ahí. No toca el schema `respaldo` ni los datos de articulos (no hace falta: el paso 2 no los cambia).
-- Las extensiones pg_trgm y unaccent quedan instaladas: no molestan a nadie.

-- Permisos y políticas
drop policy if exists articulos_leen_usuarios on public.articulos;
drop policy if exists articulos_admin_asigna_foto on public.articulos;
drop policy if exists articulos_usuarios_asignan_foto on public.articulos;
drop policy if exists n8n_bot_lee_articulos on public.articulos;
drop policy if exists n8n_app_lee_articulos on public.articulos;
drop policy if exists n8n_app_escribe_foto on public.articulos;
drop policy if exists familias_leen_usuarios on public.familias;
revoke all on public.articulos, public.familias from anon, authenticated;

-- Perfil automático en Auth
drop trigger if exists crear_perfil_al_crear_usuario on auth.users;

-- Vistas y funciones (primero las que dependen de otras)
drop function if exists public.asignar_foto(bigint, bigint);
drop function if exists public.sugerir_codigos(text[], int);
drop function if exists public.filtrar_articulos(text, text, boolean);
drop function if exists public.buscar_articulos(text, text, boolean, int, int);
drop function if exists public.contar_articulos(text, text, boolean);
drop function if exists public.stats_fotos();
drop function if exists public.ranking_sin_resultados(int, int);
drop function if exists public.kpis_bot();
drop function if exists public.sincronizar_familias();
drop view if exists public.v_articulos_sin_foto;
drop view if exists public.v_consultas_bot;
drop view if exists public.v_articulos;
drop view if exists public.v_familias;

-- Tablas nuevas (mi_perfil devuelve una fila de perfiles: va antes; es_admin y tiene_perfil van
-- después, porque las usan las políticas de esas tablas)
drop function if exists public.mi_perfil();
drop function if exists public.crear_perfil_usuario();
drop table if exists public.fotos_sin_match;
drop table if exists public.consultas_bot;
drop table if exists public.usuarios_telegram;
drop table if exists public.perfiles;
drop function if exists public.es_admin();
drop function if exists public.tiene_perfil();
drop function if exists public.escapar_like(text);

-- articulos: trigger, índices y las dos columnas nuevas
drop trigger if exists articulos_actualizado_en on public.articulos;
drop function if exists public.tocar_actualizado_en();
drop index if exists public.articulos_codigo_norm_idx;
drop index if exists public.articulos_texto_trgm_idx;
drop index if exists public.articulos_codigo_trgm_idx;
drop index if exists public.articulos_familia_idx;
drop index if exists public.articulos_id_key;
alter table public.articulos drop column if exists actualizado_en;
alter table public.articulos drop column if exists id;
drop function if exists public.articulo_texto_busqueda(text, text, text, text);
drop function if exists public.normalizar_busqueda(text);
drop function if exists public.f_unaccent(text);

-- familias: las filas que agregó la migración y la columna es_producto
delete from public.familias f
where not exists (
  select 1 from respaldo.familias_antes_de_la_web r
  where r."Código" is not distinct from f."Código" and r."Nombre" is not distinct from f."Nombre"
);
drop index if exists public.familias_codigo_idx;
alter table public.familias drop column if exists es_producto;

-- Roles de n8n (nunca tuvieron contraseña, nadie entró con ellos)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_bot') then
    revoke all on schema public, extensions from n8n_bot;
    revoke all on all tables in schema public from n8n_bot;
    drop role n8n_bot;
  end if;
  if exists (select 1 from pg_roles where rolname = 'n8n_app') then
    revoke all on schema public, extensions from n8n_app;
    revoke all on all tables in schema public from n8n_app;
    revoke all on all sequences in schema public from n8n_app;
    drop role n8n_app;
  end if;
end
$$;

-- Historial de migraciones
delete from supabase_migrations.schema_migrations
where version between '20261009000001' and '20261009000013';

-- Tiene que dar: 7 columnas en articulos, 2 en familias, mismas filas que el respaldo.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'articulos')            as columnas_articulos,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'familias')             as columnas_familias,
  (select count(*) from public.articulos)                                  as articulos,
  (select count(*) from respaldo.articulos_antes_de_la_web)                as articulos_respaldo,
  (select count(*) from public.familias)                                   as familias,
  (select count(*) from respaldo.familias_antes_de_la_web)                 as familias_respaldo;
