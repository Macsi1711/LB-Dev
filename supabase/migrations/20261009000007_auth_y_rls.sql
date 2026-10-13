-- Perfiles: todo usuario de Auth tiene uno. Sin registro público: los usuarios los invita el
-- admin desde el panel de Supabase, y al crearse quedan como vendedor.
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (user_id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end
$$;

create or replace trigger crear_perfil_al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

-- Usuarios que ya existían antes de esta migración.
insert into public.perfiles (user_id, nombre)
select u.id, coalesce(u.raw_user_meta_data ->> 'nombre', split_part(u.email, '@', 1))
from auth.users u
on conflict (user_id) do nothing;

-- La web la llama al iniciar sesión: devuelve el perfil y, si no existe, lo crea como vendedor.
create or replace function public.mi_perfil()
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión iniciada' using errcode = '28000';
  end if;

  insert into public.perfiles (user_id, nombre)
  select u.id, coalesce(u.raw_user_meta_data ->> 'nombre', split_part(u.email, '@', 1))
  from auth.users u
  where u.id = auth.uid()
  on conflict (user_id) do nothing;

  select * into v_perfil from public.perfiles where user_id = auth.uid();
  return v_perfil;
end
$$;

-- Privilegios. Supabase da ALL a anon y authenticated en las tablas nuevas: se saca todo y se
-- da solo lo necesario. Las policies de abajo deciden qué filas ve cada uno.
revoke all on
  public.articulos, public.familias, public.perfiles, public.usuarios_telegram,
  public.consultas_bot, public.fotos_sin_match, public.v_articulos, public.v_familias
from anon, authenticated;

grant select on public.articulos, public.familias, public.v_articulos, public.v_familias,
  public.perfiles to authenticated;
grant update ("Imagen") on public.articulos to authenticated;
grant select, insert, update, delete on public.usuarios_telegram to authenticated;
grant select on public.consultas_bot to authenticated;
grant select, update (resuelto) on public.fotos_sin_match to authenticated;

alter table public.articulos enable row level security;
alter table public.familias enable row level security;
alter table public.perfiles enable row level security;
alter table public.usuarios_telegram enable row level security;
alter table public.consultas_bot enable row level security;
alter table public.fotos_sin_match enable row level security;

-- Cualquier usuario con perfil (vendedor o admin) lee el catálogo.
drop policy if exists articulos_leen_usuarios on public.articulos;
create policy articulos_leen_usuarios on public.articulos
  for select to authenticated using ((select public.tiene_perfil()));

-- Solo el admin asigna fotos a mano (el grant limita el UPDATE a la columna "Imagen").
drop policy if exists articulos_admin_asigna_foto on public.articulos;
create policy articulos_admin_asigna_foto on public.articulos
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists familias_leen_usuarios on public.familias;
create policy familias_leen_usuarios on public.familias
  for select to authenticated using ((select public.tiene_perfil()));

drop policy if exists perfiles_propio_o_admin on public.perfiles;
create policy perfiles_propio_o_admin on public.perfiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_admin()));

drop policy if exists usuarios_telegram_admin on public.usuarios_telegram;
create policy usuarios_telegram_admin on public.usuarios_telegram
  for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists consultas_bot_admin on public.consultas_bot;
create policy consultas_bot_admin on public.consultas_bot
  for select to authenticated using ((select public.es_admin()));

drop policy if exists fotos_sin_match_admin_lee on public.fotos_sin_match;
create policy fotos_sin_match_admin_lee on public.fotos_sin_match
  for select to authenticated using ((select public.es_admin()));

drop policy if exists fotos_sin_match_admin_resuelve on public.fotos_sin_match;
create policy fotos_sin_match_admin_resuelve on public.fotos_sin_match
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- RPC: solo para usuarios logueados. Las funciones auxiliares de los índices
-- (f_unaccent, normalizar_busqueda, …) quedan públicas: las usan n8n y los índices.
revoke execute on function
  public.es_admin(), public.tiene_perfil(), public.mi_perfil(),
  public.filtrar_articulos(text, text, boolean),
  public.buscar_articulos(text, text, boolean, int, int),
  public.contar_articulos(text, text, boolean),
  public.stats_fotos(),
  public.sugerir_codigos(text[], int),
  public.asignar_foto(bigint, bigint),
  public.crear_perfil_usuario()
from public, anon;

grant execute on function
  public.es_admin(), public.tiene_perfil(), public.mi_perfil(),
  public.filtrar_articulos(text, text, boolean),
  public.buscar_articulos(text, text, boolean, int, int),
  public.contar_articulos(text, text, boolean),
  public.stats_fotos(),
  public.sugerir_codigos(text[], int),
  public.asignar_foto(bigint, bigint)
to authenticated;

revoke execute on function public.crear_perfil_usuario() from authenticated;
