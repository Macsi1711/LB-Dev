-- Búsqueda en lenguaje natural: "pastillas de freno para el onix" tiene que encontrar
-- "PASTILLA FRENO DEL. CHEVROLET ONIX". No toca columnas: el contrato con n8n queda igual.

-- Las palabras que se buscan: sin signos (salvo . / - % _, que usan los códigos y medidas), sin palabras de relleno, en singular y con las
-- abreviaturas del catálogo. Todo recorte deja un prefijo de la palabra, así que nunca se pierde
-- un artículo que antes se encontraba.
create or replace function public.terminos_busqueda(p_q text)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  with palabras as (
    select btrim(w, './-') as w
    from unnest(string_to_array(
      regexp_replace(public.normalizar_busqueda(p_q), '[^a-z0-9./%_-]+', ' ', 'g'), ' '
    )) as w
  ),
  validas as (
    select w from palabras where w <> ''
  ),
  utiles as (
    select w from validas
    where w not in (
      'a', 'al', 'ante', 'con', 'contra', 'de', 'del', 'desde', 'e', 'el', 'en', 'entre', 'es',
      'esa', 'ese', 'esta', 'este', 'hay', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi', 'o',
      'para', 'pero', 'por', 'que', 'se', 'sin', 'sobre', 'su', 'te', 'u', 'un', 'una', 'uno',
      'unos', 'unas', 'y', 'tenes', 'tenga', 'tengo', 'tiene', 'tienen', 'busco', 'buscar',
      'necesito', 'quiero', 'dame', 'pasame', 'mostrame', 'hola', 'che', 'buenas', 'buen', 'dia',
      'precio', 'cuanto', 'sale', 'vale', 'algun', 'alguna', 'alguno', 'algo', 'favor', 'porfa',
      'gracias', 'auto', 'autos', 'coche', 'vehiculo', 'repuesto', 'repuestos'
    )
  ),
  -- Si todo era relleno ("para"), se busca lo que se escribió.
  elegidas as (
    select w from utiles
    union all
    select w from validas where not exists (select 1 from utiles)
  ),
  terminos as (
    select case
      when w ~ '[0-9]' then w
      when w in ('trasera', 'trasero', 'traseras', 'traseros') then 'tras'
      when w in ('delantera', 'delantero', 'delanteras', 'delanteros') then 'del'
      when w in ('izquierda', 'izquierdo', 'izquierdas', 'izquierdos') then 'izq'
      when w in ('derecha', 'derecho', 'derechas', 'derechos') then 'der'
      when length(w) > 4 and w ~ '[^aeious]es$' then left(w, -2)   -- motores → motor
      when length(w) > 3 and w ~ 's$' and w !~ 'ss$' then left(w, -1) -- pastillas → pastilla
      else w
    end as t
    from elegidas
  )
  select coalesce((select array_agg(distinct t) from terminos), '{}')
$$;

-- Filtro estricto: todos los términos (AND) en código, nombre, descripción u observaciones. Un
-- código exacto siempre entra. SQL dinámico para que cada término sea un LIKE separado y use el
-- índice trigram; en el SQL solo se interpolan enteros.
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
  select coalesce(array_agg('%' || public.escapar_like(t) || '%'), '{}')
  into v_patrones
  from unnest(public.terminos_busqueda(p_q)) as t;
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

-- Cuando el estricto no trae nada: los que comparten más términos (como mínimo todos menos uno, o
-- uno si son dos). Un término cuenta si aparece o si se le parece por error de tipeo
-- (word_similarity >= 0.6, el umbral por defecto de <%). Primero el índice trigram descarta lo
-- que no tiene ningún término (un OR por término, con LIKE y <%) y recién después se puntúa.
create or replace function public.puntuar_parecidos(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns table (id bigint, coincidencias int, parecido real)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_terminos text[] := (public.terminos_busqueda(p_q))[1:10];
  v_patrones text[];
  v_por_termino text[] := '{}';
  v_texto constant text :=
    'public.articulo_texto_busqueda(v.codigo, v.nombre, v.descripcion, v.observaciones)';
  v_filtros constant text :=
    '($1::text is null or v.familia_codigo = $1) and ($2::boolean is null or v.tiene_foto = $2)';
begin
  if cardinality(v_terminos) = 0 then
    return;
  end if;
  select array_agg('%' || public.escapar_like(t) || '%' order by n)
  into v_patrones
  from unnest(v_terminos) with ordinality as u(t, n);

  -- Un SELECT por término, cada uno con el índice trigram.
  for i in 1 .. cardinality(v_terminos) loop
    v_por_termino := v_por_termino || format(
      'select v.id, %2$s as n from public.v_articulos v
       where %3$s and (%1$s like ($4)[%2$s] or ($3)[%2$s] operator(extensions.<%%) %1$s)',
      v_texto, i, v_filtros
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
        greatest(1, cardinality(v_terminos) - 1);
end
$$;

-- Orden del estricto: código exacto, código que empieza con p_q, parecido del nombre, nombre.
-- Orden de los parecidos: más términos encontrados, más parecido al texto, nombre.
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
begin
  if exists (select 1 from public.filtrar_articulos(p_q, p_familia, p_con_foto)) then
    return query
      select f.*
      from public.filtrar_articulos(p_q, p_familia, p_con_foto) f
      order by
        coalesce(upper(f.codigo) = v_codigo, false) desc,
        coalesce(upper(f.codigo) like public.escapar_like(v_codigo) || '%', false) desc,
        extensions.similarity(public.normalizar_busqueda(f.nombre), public.normalizar_busqueda(p_q)) desc,
        f.nombre asc nulls last,
        f.id
      limit v_limit offset v_offset;
  else
    return query
      select v.*
      from public.puntuar_parecidos(p_q, p_familia, p_con_foto) p
      join public.v_articulos v on v.id = p.id
      order by p.coincidencias desc, p.parecido desc, v.nombre asc nulls last, v.id
      limit v_limit offset v_offset;
  end if;
end
$$;

-- Cuántos muestra buscar_articulos y si son "lo más parecido" en vez de lo pedido.
create or replace function public.resumen_busqueda(
  p_q text default '',
  p_familia text default null,
  p_con_foto boolean default null
)
returns table (total bigint, aproximada boolean)
language plpgsql
stable
security invoker
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
  select r.total from public.resumen_busqueda(p_q, p_familia, p_con_foto) r
$$;

revoke execute on function
  public.puntuar_parecidos(text, text, boolean),
  public.resumen_busqueda(text, text, boolean)
from public, anon;

grant execute on function
  public.puntuar_parecidos(text, text, boolean),
  public.resumen_busqueda(text, text, boolean)
to authenticated;
