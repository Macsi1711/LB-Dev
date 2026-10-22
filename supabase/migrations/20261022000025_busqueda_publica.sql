-- Búsqueda sin sesión (ADR-010): en el Mostrador cualquiera busca por texto y el login queda
-- para el admin. Sin sesión (rol anon) se busca SOLO por buscar_articulos() y
-- resumen_busqueda(), que cortan en 200 por página: anon no lee las tablas ni las funciones
-- internas (filtrar_articulos, puntuar_parecidos), así nadie se lleva el catálogo de una.
-- Una sesión sin perfil (un perfil borrado a mano) sigue sin ver nada, como antes.

create or replace function public.puede_buscar()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is null or public.tiene_perfil()
$$;

-- Igual que en 0023, con puede_buscar() en vez de tiene_perfil().
create or replace function public.filtrar_articulos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns setof public.v_articulos
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_codigo text := upper(trim(coalesce(p_q, '')));
  v_patrones text[];
  v_compactos text[];
  v_condiciones text[] := '{}';
  v_texto constant text :=
    'public.articulo_texto_busqueda(v.codigo, v.nombre, v.descripcion, v.observaciones)';
  v_compacto constant text :=
    'public.articulo_texto_compacto(v.codigo, v.nombre, v.descripcion, v.observaciones)';
  v_sql text := 'select v.* from public.v_articulos v
    where ($1::text is null or v.familia_codigo = $1)
      and ($2::boolean is null or v.tiene_foto = $2)';
begin
  if not public.puede_buscar() then
    return;
  end if;

  select
    coalesce(array_agg('%' || public.escapar_like(t) || '%' order by n), '{}'),
    coalesce(array_agg('%' || public.termino_compacto(t) || '%' order by n), '{}')
  into v_patrones, v_compactos
  from unnest(public.terminos_busqueda(p_q)) with ordinality as u(t, n);
  v_patrones := v_patrones[1:10];

  if cardinality(v_patrones) > 0 then
    for i in 1 .. cardinality(v_patrones) loop
      v_condiciones := v_condiciones || case
        when v_compactos[i] is null then format('%s like ($4)[%s]', v_texto, i)
        else format('(%1$s like ($4)[%3$s] or %2$s like ($5)[%3$s])', v_texto, v_compacto, i)
      end;
    end loop;
    v_sql := v_sql || ' and (upper(v.codigo) = $3 or ('
      || array_to_string(v_condiciones, ' and ') || '))';
  end if;

  return query execute v_sql using p_familia, p_con_foto, v_codigo, v_patrones, v_compactos;
end
$$;

-- Igual que en 0023, con puede_buscar() en vez de tiene_perfil().
create or replace function public.puntuar_parecidos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns table (id bigint, coincidencias int, parecido real)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_terminos text[] := (public.terminos_busqueda(p_q))[1:10];
  v_patrones text[];
  v_compactos text[];
  v_por_termino text[] := '{}';
  v_texto constant text :=
    'public.articulo_texto_busqueda(v.codigo, v.nombre, v.descripcion, v.observaciones)';
  v_compacto constant text :=
    'public.articulo_texto_compacto(v.codigo, v.nombre, v.descripcion, v.observaciones)';
  v_filtros constant text :=
    '($1::text is null or v.familia_codigo = $1) and ($2::boolean is null or v.tiene_foto = $2)';
begin
  if cardinality(v_terminos) = 0 or not public.puede_buscar() then
    return;
  end if;
  select
    array_agg('%' || public.escapar_like(t) || '%' order by n),
    array_agg('%' || public.termino_compacto(t) || '%' order by n)
  into v_patrones, v_compactos
  from unnest(v_terminos) with ordinality as u(t, n);

  -- Un SELECT por término, cada uno con el índice trigram.
  for i in 1 .. cardinality(v_terminos) loop
    v_por_termino := v_por_termino || format(
      'select v.id, %2$s as n from public.v_articulos v
       where %3$s and (%1$s like ($4)[%2$s] or ($3)[%2$s] operator(extensions.<%%) %1$s%4$s)',
      v_texto, i, v_filtros,
      case when v_compactos[i] is not null then format(' or %s like ($7)[%s]', v_compacto, i) end
    );
  end loop;

  return query execute format(
    'with encontrados as (%2$s),
     puntaje as (
       select e.id, count(distinct e.n)::int as coincidencias
       from encontrados e group by e.id
     ),
     mejores as (
       select p.* from puntaje p
       where p.coincidencias >= $6
         and p.coincidencias = (select max(q.coincidencias) from puntaje q)
     )
     select m.id, m.coincidencias, extensions.word_similarity($5, %1$s)
     from mejores m join public.v_articulos v on v.id = m.id',
    v_texto, array_to_string(v_por_termino, ' union all ')
  )
  using p_familia, p_con_foto, v_terminos, v_patrones, public.normalizar_busqueda(p_q),
        greatest(1, cardinality(v_terminos) - 1), v_compactos;
end
$$;

-- Igual que en 0023, pero corre como dueño: "lo más parecido" se une con v_articulos, que anon
-- no puede leer. Sin permiso para buscar, no devuelve nada.
create or replace function public.buscar_articulos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null,
  p_limit int default 40,
  p_offset int default 0
)
returns setof public.v_articulos
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 40), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_codigo text := upper(trim(coalesce(p_q, '')));
  v_compacto text := nullif(public.compactar_busqueda(p_q), '');
begin
  if not public.puede_buscar() then
    return;
  end if;
  return query
    select f.*
    from public.filtrar_articulos(p_q, p_familia, p_con_foto) f
    order by
      coalesce(upper(f.codigo) = v_codigo, false) desc,
      coalesce(public.compactar_busqueda(f.codigo) = v_compacto, false) desc,
      coalesce(upper(f.codigo) like public.escapar_like(v_codigo) || '%', false) desc,
      extensions.similarity(public.normalizar_busqueda(f.nombre), public.normalizar_busqueda(p_q)) desc,
      f.nombre asc nulls last,
      f.id
    limit v_limit offset v_offset;
  if found then
    return;
  end if;
  -- Una página vacía más allá del final de los exactos es el fin de la lista, no "lo más parecido".
  if v_offset > 0 and exists (select 1 from public.filtrar_articulos(p_q, p_familia, p_con_foto)) then
    return;
  end if;

  return query
    select v.*
    from public.puntuar_parecidos(p_q, p_familia, p_con_foto) p
    join public.v_articulos v on v.id = p.id
    order by p.coincidencias desc, p.parecido desc, v.nombre asc nulls last, v.id
    limit v_limit offset v_offset;
end
$$;

-- Igual que en 0014, pero corre como dueño, así anon cuenta sin llamar a las funciones internas.
create or replace function public.resumen_busqueda(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns table (total bigint, aproximada boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  select count(*) into v_total from public.filtrar_articulos(p_q, p_familia, p_con_foto);
  if v_total > 0 then
    return query select v_total, false;
    return;
  end if;
  select count(*) into v_total from public.puntuar_parecidos(p_q, p_familia, p_con_foto);
  return query select v_total, v_total > 0;
end
$$;

-- Sin sesión: las dos funciones de la búsqueda y la lista de familias para el filtro.
grant execute on function
  public.buscar_articulos(text, text, boolean, int, int),
  public.resumen_busqueda(text, text, boolean)
to anon, authenticated;

grant select on public.familias, public.v_familias to anon;
drop policy if exists familias_leen_todos on public.familias;
create policy familias_leen_todos on public.familias for select to anon using (true);
