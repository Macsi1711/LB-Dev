-- La búsqueda vuelve a usar el índice trigram (encontrado con la prueba de carga local).
-- Con RLS, Postgres no puede pasar al índice un LIKE ni una función que no son leakproof, así que
-- recorría los ~20.000 artículos en cada búsqueda (0,5–2 s con 1 CPU). Las dos funciones que
-- recorren la tabla pasan a correr como dueño (sin RLS) y chequean el perfil a mano: sin perfil
-- no devuelven nada, igual que antes con RLS. El resto queda igual que en 0014.

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
  v_condiciones text[] := '{}';
  v_sql text := 'select v.* from public.v_articulos v
    where ($1::text is null or v.familia_codigo = $1)
      and ($2::boolean is null or v.tiene_foto = $2)';
begin
  if not public.tiene_perfil() then
    return;
  end if;

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
  v_por_termino text[] := '{}';
  v_texto constant text :=
    'public.articulo_texto_busqueda(v.codigo, v.nombre, v.descripcion, v.observaciones)';
  v_filtros constant text :=
    '($1::text is null or v.familia_codigo = $1) and ($2::boolean is null or v.tiene_foto = $2)';
begin
  if cardinality(v_terminos) = 0 or not public.tiene_perfil() then
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

-- Como dueño, sin RLS: solo usuarios con sesión (el perfil lo chequean adentro).
revoke execute on function
  public.filtrar_articulos(text, text, boolean),
  public.puntuar_parecidos(text, text, boolean)
from public, anon;

grant execute on function
  public.filtrar_articulos(text, text, boolean),
  public.puntuar_parecidos(text, text, boolean)
to authenticated;
