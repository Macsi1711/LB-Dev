-- Tabla que leen y escriben los flujos de n8n. Si ya existe NO se recrea ni se renombra nada:
-- los nombres de columna (con espacios y tildes) son parte del contrato con n8n.
create table if not exists public.articulos (
  "Codigo"           text,
  "Nombre artículo"  text,
  "Descripción"      text,
  observaciones      text,
  "codigo  familia"  text,   -- OJO: DOS espacios entre "codigo" y "familia"
  "Nombre familia"   text,
  "Imagen"           text    -- https://drive.google.com/file/d/<ID>/view?usp=drivesdk
);

-- Cambios aditivos: id y fecha de actualización.
alter table public.articulos
  add column if not exists id bigint generated always as identity;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.articulos'::regclass and contype = 'p'
  ) then
    alter table public.articulos add constraint articulos_pkey primary key (id);
  end if;
end
$$;

-- Si la tabla ya tenía otra PK, el id igual tiene que ser único para la web.
create unique index if not exists articulos_id_key on public.articulos (id);

alter table public.articulos
  add column if not exists actualizado_en timestamptz default now();

create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end
$$;

create or replace trigger articulos_actualizado_en
  before update on public.articulos
  for each row execute function public.tocar_actualizado_en();

-- Índices. El de código normalizado es el que usa n8n Fotos:
--   UPDATE ... WHERE upper(trim("Codigo")) = ANY(...)
create index if not exists articulos_codigo_norm_idx
  on public.articulos (upper(trim("Codigo")));

-- Trigram sobre código, nombre, descripción y observaciones (búsqueda por palabras).
create index if not exists articulos_texto_trgm_idx
  on public.articulos using gin (
    public.articulo_texto_busqueda(trim("Codigo"), "Nombre artículo", "Descripción", observaciones)
    extensions.gin_trgm_ops
  );

-- Trigram sobre el código, para sugerir artículos a las fotos que no matchearon.
create index if not exists articulos_codigo_trgm_idx
  on public.articulos using gin (upper(trim("Codigo")) extensions.gin_trgm_ops);

create index if not exists articulos_familia_idx on public.articulos ("codigo  familia");
