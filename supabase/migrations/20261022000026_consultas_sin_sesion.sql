-- Las búsquedas sin sesión también quedan en Métricas (ADR-010). Para que nadie llene la tabla
-- a propósito: sin sesión se guardan como texto, sin usuario, con el texto acortado a 200 y
-- como mucho 30 por minuto entre todas (las demás se descartan sin error). Si no viene la
-- cantidad, quedan sin contar: sin sesión no se vuelve a buscar. Con sesión, igual que en 0019.

create index if not exists consultas_bot_web_sin_sesion_idx
  on public.consultas_bot (created_at desc) where canal = 'web' and user_id is null;

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
  v_fuente text := p_fuente;
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
    v_fuente := 'texto';
    v_escuchado := null;
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
    'web', auth.uid(), v_fuente, nullif(trim(v_q), ''), nullif(trim(v_escuchado), ''),
    p_familia, p_con_foto, v_total, v_aproximada, nullif(trim(p_error), '')
  );
end
$$;

grant execute on function
  public.registrar_consulta(text, text, boolean, text, text, text, bigint, boolean)
to anon;
