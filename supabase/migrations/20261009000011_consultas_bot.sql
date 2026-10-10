-- Consultas del bot con el nombre del usuario. usuario_nombre en null = "no autorizado".
create or replace view public.v_consultas_bot
with (security_invoker = true)
as
select
  c.id, c.chat_id, c.fuente, c.texto, c.sql_generado, c.cantidad, c.error, c.created_at,
  u.nombre as usuario_nombre
from public.consultas_bot c
left join public.usuarios_telegram u on u.chat_id = c.chat_id;

revoke all on public.v_consultas_bot from anon, authenticated;
grant select on public.v_consultas_bot to authenticated;

-- Lo que se busca y no se encuentra: textos con 0 resultados, agrupados sin tildes ni
-- mayúsculas. Deja afuera los rechazos (no autorizado, errores del validador).
create or replace function public.ranking_sin_resultados(p_dias int default 30, p_limit int default 20)
returns table (texto text, veces bigint, ultima timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select min(c.texto), count(*), max(c.created_at)
  from public.consultas_bot c
  where c.cantidad = 0
    and c.error is null
    and nullif(trim(c.texto), '') is not null
    and c.created_at >= now() - make_interval(days => greatest(coalesce(p_dias, 30), 1))
  group by public.normalizar_busqueda(c.texto)
  order by 2 desc, 3 desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

-- Mini-KPIs del bot. "Hoy" es el día en Argentina.
create or replace function public.kpis_bot()
returns table (
  consultas_hoy bigint,
  consultas_semana bigint,
  porcentaje_sin_resultados numeric,
  usuarios_activos bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (
      where c.created_at >= date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires')
        at time zone 'America/Argentina/Buenos_Aires'
    ),
    count(*) filter (where c.created_at >= now() - interval '7 days'),
    round(
      100.0 * count(*) filter (where c.created_at >= now() - interval '7 days' and c.cantidad = 0)
        / nullif(count(*) filter (where c.created_at >= now() - interval '7 days' and c.cantidad is not null), 0),
      1
    ),
    (select count(*) from public.usuarios_telegram u where u.activo)
  from public.consultas_bot c
$$;

revoke execute on function public.ranking_sin_resultados(int, int), public.kpis_bot() from public, anon;
grant execute on function public.ranking_sin_resultados(int, int), public.kpis_bot() to authenticated;
