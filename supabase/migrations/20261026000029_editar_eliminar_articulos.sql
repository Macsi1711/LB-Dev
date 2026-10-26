-- Editar y eliminar productos desde la web: solo el admin, con editar_articulo() y
-- eliminar_articulo().
--
-- Las columnas de articulos no se renombran ni cambian (contrato con n8n): solo se suman dos para
-- saber qué se corrigió desde la web y quién. El código no se edita: lo usan las fotos, la
-- búsqueda y el historial.
alter table public.articulos add column if not exists editado_en_web timestamptz;
alter table public.articulos add column if not exists editado_por uuid;

-- Al eliminar, antes se guarda el artículo entero acá: si fue un error, se recupera desde el SQL
-- Editor. La web no la lee ni la escribe (no tiene grants): solo eliminar_articulo().
create table if not exists public.articulos_eliminados (
  id             bigint generated always as identity primary key,
  articulo_id    bigint not null,
  codigo         text,
  datos          jsonb not null,
  eliminado_en   timestamptz not null default now(),
  eliminado_por  uuid
);
alter table public.articulos_eliminados enable row level security;
revoke all on public.articulos_eliminados from public, anon, authenticated;

-- Valida como crear_articulo() y completa el nombre de la familia. Security definer porque la web
-- no tiene grant de update sobre esas columnas; chequea el admin a mano.
create or replace function public.editar_articulo(
  p_id bigint,
  p_nombre text,
  p_familia text,
  p_descripcion text default null,
  p_observaciones text default null
)
returns public.v_articulos
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_nombre text := upper(trim(coalesce(p_nombre, '')));
  v_familia_nombre text;
  v_resultado public.v_articulos;
begin
  if not public.es_admin() then
    raise exception 'Solo el admin edita productos' using errcode = '42501';
  end if;

  if v_nombre = '' then
    raise exception 'El nombre es obligatorio' using errcode = '22023';
  end if;

  select f.nombre into v_familia_nombre
  from public.v_familias f
  where f.codigo = trim(p_familia) and f.es_producto;
  if not found then
    raise exception 'La familia % no existe', p_familia using errcode = '22023';
  end if;

  update public.articulos set
    "Nombre artículo" = v_nombre,
    "Descripción" = nullif(trim(p_descripcion), ''),
    observaciones = nullif(trim(p_observaciones), ''),
    "codigo  familia" = trim(p_familia),
    "Nombre familia" = v_familia_nombre,
    editado_en_web = now(),
    editado_por = auth.uid()
  where id = p_id;
  if not found then
    raise exception 'No existe el artículo %', p_id using errcode = 'P0002';
  end if;

  select * into v_resultado from public.v_articulos v where v.id = p_id;
  return v_resultado;
end
$$;

create or replace function public.eliminar_articulo(p_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_articulo public.articulos;
begin
  if not public.es_admin() then
    raise exception 'Solo el admin elimina productos' using errcode = '42501';
  end if;

  select * into v_articulo from public.articulos a where a.id = p_id for update;
  if not found then
    raise exception 'No existe el artículo %', p_id using errcode = 'P0002';
  end if;

  insert into public.articulos_eliminados (articulo_id, codigo, datos, eliminado_por)
  values (p_id, trim(v_articulo."Codigo"), to_jsonb(v_articulo), auth.uid());

  delete from public.articulos where id = p_id;
end
$$;

revoke execute on function public.editar_articulo(bigint, text, text, text, text) from public, anon;
grant execute on function public.editar_articulo(bigint, text, text, text, text) to authenticated;
revoke execute on function public.eliminar_articulo(bigint) from public, anon;
grant execute on function public.eliminar_articulo(bigint) to authenticated;
