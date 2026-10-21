-- Códigos con o sin separadores: en el catálogo el mismo código aparece como "PH 4386",
-- "ADB-2533" o "PD/363", y el vendedor (o la foto) lo escribe pegado, o al revés.
--   1. Un texto "compacto" de cada artículo (solo letras y números) con su índice trigram.
--   2. Los términos que parecen código ("ph4386", "pd/363", "36.060") se buscan también
--      compactos en ese texto. Los números sueltos ("1234") no: juntarían medidas ("1/2 34").
--   3. El artículo cuyo código es el buscado, sin contar separadores, va primero.
-- Separado ("PH 4386") ya encontraba al pegado: cada palabra es un término. No toca columnas:
-- el contrato con n8n queda igual.

create or replace function public.compactar_busqueda(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(public.normalizar_busqueda(texto), '[^a-z0-9]+', '', 'g')
$$;

-- Igual que articulo_texto_busqueda(), pero compacto. El índice usa exactamente esta expresión.
create or replace function public.articulo_texto_compacto(
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
  select public.compactar_busqueda(concat_ws(' ', codigo, nombre, descripcion, observaciones))
$$;

create index if not exists articulos_texto_compacto_trgm_idx
  on public.articulos using gin (
    public.articulo_texto_compacto(trim("Codigo"), "Nombre artículo", "Descripción", observaciones)
    extensions.gin_trgm_ops
  );

-- El término compacto si parece código: tiene un número y, además, letras o un separador
-- ("36.060"), con al menos 4 caracteres. Si no, null y se busca solo como antes.
create or replace function public.termino_compacto(p_termino text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select c
  from (select public.compactar_busqueda(p_termino) as c) x
  where p_termino ~ '[0-9]' and length(c) >= 4 and (c ~ '[a-z]' or p_termino ~ '[./-]')
$$;

-- Igual que en 0018, más la alternativa compacta de los términos que parecen código.
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
  if not public.tiene_perfil() then
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

-- Igual que en 0018, más la alternativa compacta de los términos que parecen código.
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
  if cardinality(v_terminos) = 0 or not public.tiene_perfil() then
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

-- Igual que en 0019, con el código sin separadores como segundo criterio de orden.
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
security invoker
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 40), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_codigo text := upper(trim(coalesce(p_q, '')));
  v_compacto text := nullif(public.compactar_busqueda(p_q), '');
begin
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
