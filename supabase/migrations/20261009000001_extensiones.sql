-- Extensiones para la búsqueda por texto. En Supabase viven en el esquema `extensions`.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() no es IMMUTABLE y no se puede usar en índices. Este wrapper fija el diccionario.
create or replace function public.f_unaccent(texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, texto)
$$;

-- Normaliza un texto de búsqueda: sin tildes, en minúsculas, sin espacios repetidos.
create or replace function public.normalizar_busqueda(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(lower(public.f_unaccent(trim(coalesce(texto, '')))), '\s+', ' ', 'g')
$$;

-- Texto donde se busca: código, nombre, descripción y observaciones, normalizado.
-- La vista v_articulos y el índice trigram usan exactamente esta expresión.
create or replace function public.articulo_texto_busqueda(
  codigo text,
  nombre text,
  descripcion text,
  observaciones text
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.normalizar_busqueda(
    concat_ws(' ', codigo, nombre, descripcion, observaciones)
  )
$$;
