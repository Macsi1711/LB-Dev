-- Las consultas de la web también van a las métricas: la web pasa a ser el canal principal y
-- Telegram queda de respaldo. Todo es aditivo: n8n sigue insertando en consultas_bot igual que
-- antes (canal queda en 'telegram' por defecto).
alter table public.consultas_bot
  add column if not exists canal text not null default 'telegram',
  add column if not exists user_id uuid references auth.users on delete set null,
  add column if not exists familia text,
  add column if not exists solo_con_foto boolean,
  add column if not exists aproximada boolean,
  add column if not exists escuchado text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.consultas_bot'::regclass and conname = 'consultas_bot_canal_check'
  ) then
    alter table public.consultas_bot
      add constraint consultas_bot_canal_check check (canal in ('telegram', 'web'));
  end if;
end
$$;

create index if not exists consultas_bot_user_id_idx
  on public.consultas_bot (user_id, created_at desc) where user_id is not null;

-- Nombre de un usuario de la web para las métricas. security definer porque perfiles solo deja
-- ver el propio (y un vendedor tiene que ver quién consultó). Solo responde a usuarios con perfil.
create or replace function public.nombre_usuario_web(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(p.nombre), ''), split_part(u.email, '@', 1))
  from auth.users u
  left join public.perfiles p on p.user_id = u.id
  where u.id = p_user_id and public.tiene_perfil()
$$;

-- Las columnas nuevas van al final: create or replace view no deja cambiar el orden.
-- usuario_nombre en null = chat de Telegram no autorizado.
create or replace view public.v_consultas_bot
with (security_invoker = true)
as
select
  c.id, c.chat_id, c.fuente, c.texto, c.sql_generado, c.cantidad, c.error, c.created_at,
  coalesce(u.nombre, public.nombre_usuario_web(c.user_id)) as usuario_nombre,
  c.canal, c.user_id, c.familia, c.solo_con_foto, c.aproximada, c.escuchado
from public.consultas_bot c
left join public.usuarios_telegram u on c.canal = 'telegram' and u.chat_id = c.chat_id;

revoke all on public.v_consultas_bot from anon, authenticated;
grant select on public.v_consultas_bot to authenticated;

-- La web la llama con cada mensaje del chat. Calcula cuántos resultados hubo con la misma
-- búsqueda que vio el usuario. Si el audio o la foto no se entendieron, va p_error y sin texto.
create or replace function public.registrar_consulta(
  p_q text,
  p_familia text default null,
  p_con_foto boolean default null,
  p_fuente text default 'texto',
  p_escuchado text default null,
  p_error text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_aproximada boolean;
begin
  if not public.tiene_perfil() then
    raise exception 'Solo los usuarios de la web registran consultas' using errcode = '42501';
  end if;
  if p_error is null and (nullif(trim(coalesce(p_q, '')), '') is not null or p_familia is not null) then
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

-- "Usuarios activos" pasa a ser quiénes consultaron en los últimos 7 días, por la web o por
-- Telegram (sin contar los chats no autorizados).
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
    count(distinct coalesce(c.user_id::text, 'tg:' || c.chat_id)) filter (
      where c.created_at >= now() - interval '7 days'
        and c.error is distinct from 'no autorizado'
    )
  from public.consultas_bot c
$$;

revoke execute on function
  public.nombre_usuario_web(uuid),
  public.registrar_consulta(text, text, boolean, text, text, text)
from public, anon;

grant execute on function
  public.nombre_usuario_web(uuid),
  public.registrar_consulta(text, text, boolean, text, text, text)
to authenticated;
