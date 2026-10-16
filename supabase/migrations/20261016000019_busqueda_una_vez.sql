-- Cada consulta de la web calculaba la búsqueda tres veces (lo mostró la prueba de carga):
-- resumen_busqueda para contar, buscar_articulos (que además armaba la lista entera solo para
-- saber si había exactos) y registrar_consulta (que volvía a contar para las métricas).
--   1. buscar_articulos trae directo la página de exactos; solo si no hay, va a lo más parecido.
--   2. registrar_consulta usa la cantidad que la web ya conoce; si no viene, cuenta como antes.

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

-- Dos parámetros nuevos al final: las llamadas de antes siguen andando. Se borra la versión de
-- seis parámetros para que no queden dos funciones con el mismo nombre.
drop function if exists public.registrar_consulta(text, text, boolean, text, text, text);

create or replace function public.registrar_consulta(
  p_q text,
  p_familia text default null,
  p_con_foto boolean default null,
  p_fuente text default 'texto',
  p_escuchado text default null,
  p_error text default null,
  p_cantidad bigint default null,
  p_aproximada boolean default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_total bigint := case when p_cantidad >= 0 then p_cantidad end;
  v_aproximada boolean := case when p_cantidad >= 0 then coalesce(p_aproximada, false) end;
begin
  if not public.tiene_perfil() then
    raise exception 'Solo los usuarios de la web registran consultas' using errcode = '42501';
  end if;
  if v_total is null and p_error is null
     and (nullif(trim(coalesce(p_q, '')), '') is not null or p_familia is not null) then
    select r.total, r.aproximada into v_total, v_aproximada
    from public.resumen_busqueda(p_q, p_familia, p_con_foto) r;
  end if;
  insert into public.consultas_bot
    (canal, user_id, fuente, texto, escuchado, familia, solo_con_foto, cantidad, aproximada, error)
  values (
    'web', auth.uid(), p_fuente, nullif(trim(p_q), ''), nullif(trim(p_escuchado), ''),
    p_familia, p_con_foto, v_total, v_aproximada, nullif(trim(p_error), '')
  );
end
$$;

revoke execute on function
  public.registrar_consulta(text, text, boolean, text, text, text, bigint, boolean)
from public, anon;
grant execute on function
  public.registrar_consulta(text, text, boolean, text, text, text, bigint, boolean)
to authenticated;
