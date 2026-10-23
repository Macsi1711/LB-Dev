-- Alta de productos desde la web: el admin carga un artículo nuevo con crear_articulo().
--
-- Las columnas de articulos no se renombran ni cambian (contrato con n8n): solo se suman dos,
-- para saber qué artículos se cargaron desde la web y quién los cargó. Si algún día se vuelve a
-- importar el catálogo desde el sistema de gestión, estos son los que no hay que pisar.
alter table public.articulos add column if not exists creado_en_web timestamptz;
alter table public.articulos add column if not exists creado_por uuid;

-- La web no inserta directo en articulos (no tiene grant): pasa por esta función, que valida
-- todo y completa el nombre de la familia. Es security definer por eso; chequea el admin a mano.
create or replace function public.crear_articulo(
  p_codigo text,
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
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_nombre text := upper(trim(coalesce(p_nombre, '')));
  v_familia_nombre text;
  v_existente text;
  v_id bigint;
  v_resultado public.v_articulos;
begin
  if not public.es_admin() then
    raise exception 'Solo el admin carga productos' using errcode = '42501';
  end if;

  if v_codigo = '' or length(v_codigo) > 40 then
    raise exception 'El código es obligatorio (hasta 40 caracteres)' using errcode = '22023';
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

  -- De a uno: dos altas a la vez con el mismo código no pueden pasar las dos el chequeo.
  perform pg_advisory_xact_lock(hashtext('crear_articulo'));

  -- Mismo código aunque cambien mayúsculas, espacios, guiones o barras (como lo busca la web).
  select trim(a."Codigo") into v_existente
  from public.articulos a
  where public.compactar_busqueda(a."Codigo") = public.compactar_busqueda(v_codigo)
  limit 1;
  if found then
    raise exception 'Ya existe un artículo con el código %', v_existente using errcode = '23505';
  end if;

  insert into public.articulos (
    "Codigo", "Nombre artículo", "Descripción", observaciones,
    "codigo  familia", "Nombre familia", creado_en_web, creado_por
  )
  values (
    v_codigo, v_nombre, nullif(trim(p_descripcion), ''), nullif(trim(p_observaciones), ''),
    trim(p_familia), v_familia_nombre, now(), auth.uid()
  )
  returning id into v_id;

  select * into v_resultado from public.v_articulos v where v.id = v_id;
  return v_resultado;
end
$$;

revoke execute on function public.crear_articulo(text, text, text, text, text) from public, anon;
grant execute on function public.crear_articulo(text, text, text, text, text) to authenticated;
