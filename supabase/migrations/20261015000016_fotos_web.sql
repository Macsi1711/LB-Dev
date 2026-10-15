-- Fotos subidas desde la web: n8n las sube a Drive (subcarpeta "Fotos desde la web") y la web
-- las asigna al artículo elegido. El link queda con el formato del contrato con n8n.

-- Historial: quién subió qué foto a qué artículo y cuál había antes (para poder volver atrás).
create table if not exists public.fotos_subidas (
  id               bigint generated always as identity primary key,
  articulo_id      bigint not null,
  codigo           text,
  drive_id         text not null,
  imagen_anterior  text,
  user_id          uuid default auth.uid() references auth.users on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists fotos_subidas_created_at_idx on public.fotos_subidas (created_at desc);

alter table public.fotos_subidas enable row level security;
revoke all on public.fotos_subidas from anon, authenticated;
grant select on public.fotos_subidas to authenticated;

drop policy if exists fotos_subidas_usuarios_leen on public.fotos_subidas;
create policy fotos_subidas_usuarios_leen on public.fotos_subidas
  for select to authenticated using ((select public.tiene_perfil()));

-- Escribe la foto en el artículo y la deja en el historial. security definer para escribir el
-- historial sin darle INSERT a nadie; por eso chequea el perfil a mano.
create or replace function public.asignar_imagen_drive(p_articulo_id bigint, p_drive_id text)
returns public.v_articulos
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_anterior text;
  v_codigo text;
  v_resultado public.v_articulos;
begin
  if not public.tiene_perfil() then
    raise exception 'Solo los usuarios de la web suben fotos' using errcode = '42501';
  end if;
  if p_drive_id is null or p_drive_id !~ '^[A-Za-z0-9_-]{10,200}$' then
    raise exception 'El id de Drive no es válido' using errcode = '22023';
  end if;

  select a."Imagen", trim(a."Codigo") into v_anterior, v_codigo
  from public.articulos a where a.id = p_articulo_id
  for update;
  if not found then
    raise exception 'No existe el artículo %', p_articulo_id using errcode = 'P0002';
  end if;

  update public.articulos
  set "Imagen" = 'https://drive.google.com/file/d/' || p_drive_id || '/view?usp=drivesdk'
  where id = p_articulo_id;

  insert into public.fotos_subidas (articulo_id, codigo, drive_id, imagen_anterior, user_id)
  values (p_articulo_id, v_codigo, p_drive_id, v_anterior, auth.uid());

  select * into v_resultado from public.v_articulos v where v.id = p_articulo_id;
  return v_resultado;
end
$$;

revoke execute on function public.asignar_imagen_drive(bigint, text) from public, anon;
grant execute on function public.asignar_imagen_drive(bigint, text) to authenticated;
