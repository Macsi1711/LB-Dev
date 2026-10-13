-- Funciones RPC de la web. Todas son security invoker (respetan RLS), salvo es_admin()
-- y tiene_perfil(), que necesitan leer perfiles para que las policies no sean recursivas.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p where p.user_id = (select auth.uid()) and p.rol = 'admin'
  )
$$;

create or replace function public.tiene_perfil()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles p where p.user_id = (select auth.uid()))
$$;

-- Escapa los comodines de LIKE para que "50%" o "A_1" se busquen literal.
create or replace function public.escapar_like(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select replace(replace(replace(texto, '\', '\\'), '%', '\%'), '_', '\_')
$$;

-- Filtro común de buscar_articulos y contar_articulos: todas las palabras (AND) tienen que
-- aparecer en código, nombre, descripción u observaciones. Un código exacto siempre entra.
-- Es plpgsql con SQL dinámico para que cada palabra sea un LIKE separado y use el índice
-- trigram (LIKE ALL no lo usa). En el SQL solo se interpolan enteros; los textos van como
-- parámetros.
create or replace function public.filtrar_articulos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns setof public.v_articulos
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_codigo text := upper(trim(coalesce(p_q, '')));
  v_patrones text[];
  v_condiciones text[] := '{}';
  v_sql text := 'select v.* from public.v_articulos v
    where ($1::text is null or v.familia_codigo = $1)
      and ($2::boolean is null or v.tiene_foto = $2)';
begin
  select coalesce(array_agg('%' || public.escapar_like(w) || '%'), '{}')
  into v_patrones
  from unnest(string_to_array(public.normalizar_busqueda(p_q), ' ')) as w
  where w <> '';
  v_patrones := v_patrones[1:10];

  if cardinality(v_patrones) > 0 then
    for i in 1 .. cardinality(v_patrones) loop
      v_condiciones := v_condiciones || format(
        'public.articulo_texto_busqueda(v.codigo, v.nombre, v.descripcion, v.observaciones) like ($4)[%s]',
        i
      );
    end loop;
    v_sql := v_sql || ' and (upper(v.codigo) = $3 or ('
      || array_to_string(v_condiciones, ' and ') || '))';
  end if;

  return query execute v_sql using p_familia, p_con_foto, v_codigo, v_patrones;
end
$$;

-- Orden: código exacto, código que empieza con p_q, parecido del nombre, nombre alfabético.
create or replace function public.buscar_articulos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null,
  p_limit int default 40,
  p_offset int default 0
)
returns setof public.v_articulos
language sql
stable
security invoker
set search_path = ''
as $$
  select f.*
  from public.filtrar_articulos(p_q, p_familia, p_con_foto) f
  order by
    coalesce(upper(f.codigo) = upper(trim(coalesce(p_q, ''))), false) desc,
    coalesce(upper(f.codigo) like public.escapar_like(upper(trim(coalesce(p_q, '')))) || '%', false) desc,
    extensions.similarity(public.normalizar_busqueda(f.nombre), public.normalizar_busqueda(p_q)) desc,
    f.nombre asc nulls last,
    f.id
  limit least(greatest(coalesce(p_limit, 40), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function public.contar_articulos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) from public.filtrar_articulos(p_q, p_familia, p_con_foto)
$$;

-- Artículos con foto, en general (es_total) y por familia. Solo familias con es_producto:
-- las internas (333, 999, DV…) no se fotografían. Una familia que no está en `familias`
-- cuenta como producto.
create or replace function public.stats_fotos()
returns table (
  es_total boolean,
  familia_codigo text,
  familia_nombre text,
  total bigint,
  con_foto bigint,
  porcentaje numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    grouping(v.familia_codigo) = 1,
    v.familia_codigo,
    case when grouping(v.familia_codigo) = 0 then max(coalesce(f.nombre, v.familia_nombre)) end,
    count(*),
    count(*) filter (where v.tiene_foto),
    round(100.0 * count(*) filter (where v.tiene_foto) / nullif(count(*), 0), 1)
  from public.v_articulos v
  left join public.v_familias f on f.codigo = v.familia_codigo
  where coalesce(f.es_producto, true)
  group by grouping sets ((v.familia_codigo), ())
  order by grouping(v.familia_codigo) desc, 6 asc, 2
$$;
