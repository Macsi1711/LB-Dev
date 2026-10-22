-- El Mostrador sin login es el del vendedor (ADR-011): además de texto, busca por audio y foto y
-- ve cuántos artículos tienen foto. Cambia dos cosas respecto de 0026:
--   * stats_fotos() se lee sin sesión. Son solo totales; corre con los permisos del dueño y
--     responde a quien puede buscar (puede_buscar(), 0025).
--   * Sin sesión, las consultas por audio y foto quedan como tales en Métricas, con lo escuchado
--     acortado a 500. Lo demás de 0026 sigue igual: sin usuario, texto a 200 y 30 por minuto.

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
security definer
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
  where coalesce(f.es_producto, true) and public.puede_buscar()
  group by grouping sets ((v.familia_codigo), ())
  order by grouping(v.familia_codigo) desc, 6 asc, 2
$$;

grant execute on function public.stats_fotos() to anon, authenticated;

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
  v_sin_sesion constant boolean := auth.uid() is null;
  v_q text := p_q;
  v_escuchado text := p_escuchado;
  v_total bigint := case when p_cantidad >= 0 then p_cantidad end;
  v_aproximada boolean := case when p_cantidad >= 0 then coalesce(p_aproximada, false) end;
begin
  if v_sin_sesion then
    if (select count(*) from public.consultas_bot c
        where c.canal = 'web' and c.user_id is null
          and c.created_at > now() - interval '1 minute') >= 30 then
      return;
    end if;
    v_q := left(p_q, 200);
    v_escuchado := left(p_escuchado, 500);
  elsif not public.tiene_perfil() then
    raise exception 'Solo los usuarios de la web registran consultas' using errcode = '42501';
  elsif v_total is null and p_error is null
     and (nullif(trim(coalesce(p_q, '')), '') is not null or p_familia is not null) then
    select r.total, r.aproximada into v_total, v_aproximada
    from public.resumen_busqueda(p_q, p_familia, p_con_foto) r;
  end if;
  insert into public.consultas_bot
    (canal, user_id, fuente, texto, escuchado, familia, solo_con_foto, cantidad, aproximada, error)
  values (
    'web', auth.uid(), p_fuente, nullif(trim(v_q), ''), nullif(trim(v_escuchado), ''),
    p_familia, p_con_foto, v_total, v_aproximada, nullif(trim(p_error), '')
  );
end
$$;
