-- PASO 1 · Respaldo. Se pega en el SQL Editor de Supabase (proyecto de la empresa) y Run.
-- Copia articulos y familias, tal como están, al schema `respaldo`. Ese schema no lo publica la
-- API de Supabase y no tiene permisos para anon ni authenticated: no lo ve nadie desde afuera.
-- Si se corre dos veces, no pisa la primera copia (que es la de antes de migrar).

create schema if not exists respaldo;
revoke all on schema respaldo from public, anon, authenticated;

create table if not exists respaldo.articulos_antes_de_la_web as table public.articulos;
create table if not exists respaldo.familias_antes_de_la_web as table public.familias;

comment on table respaldo.articulos_antes_de_la_web is
  'Copia de public.articulos antes de aplicar las migraciones de la web (Mostrador Lois).';
comment on table respaldo.familias_antes_de_la_web is
  'Copia de public.familias antes de aplicar las migraciones de la web (Mostrador Lois).';

-- Las dos columnas de cada par tienen que dar igual. Si no, NO sigas con el paso 2.
select
  (select count(*) from public.articulos)                                as articulos_hoy,
  (select count(*) from respaldo.articulos_antes_de_la_web)              as articulos_respaldo,
  (select count(*) from public.articulos where "Imagen" ilike '%http%')  as fotos_hoy,
  (select count(*) from respaldo.articulos_antes_de_la_web
    where "Imagen" ilike '%http%')                                       as fotos_respaldo,
  (select count(*) from public.familias)                                 as familias_hoy,
  (select count(*) from respaldo.familias_antes_de_la_web)               as familias_respaldo;
