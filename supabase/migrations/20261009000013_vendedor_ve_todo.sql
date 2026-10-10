-- Los vendedores ven y usan todas las secciones (Mostrador, Fotos y Bot). Lo único que queda
-- solo para el admin es agregar, cambiar o sacar usuarios del bot (usuarios_telegram).
-- No toca columnas: el contrato con n8n queda igual.

-- Asignar fotos a mano: cualquier usuario con perfil (el grant sigue limitando a "Imagen").
drop policy if exists articulos_admin_asigna_foto on public.articulos;
drop policy if exists articulos_usuarios_asignan_foto on public.articulos;
create policy articulos_usuarios_asignan_foto on public.articulos
  for update to authenticated
  using ((select public.tiene_perfil())) with check ((select public.tiene_perfil()));

-- Fotos sin match: las ve y las resuelve cualquier usuario con perfil.
drop policy if exists fotos_sin_match_admin_lee on public.fotos_sin_match;
drop policy if exists fotos_sin_match_usuarios_leen on public.fotos_sin_match;
create policy fotos_sin_match_usuarios_leen on public.fotos_sin_match
  for select to authenticated using ((select public.tiene_perfil()));

drop policy if exists fotos_sin_match_admin_resuelve on public.fotos_sin_match;
drop policy if exists fotos_sin_match_usuarios_resuelven on public.fotos_sin_match;
create policy fotos_sin_match_usuarios_resuelven on public.fotos_sin_match
  for update to authenticated
  using ((select public.tiene_perfil())) with check ((select public.tiene_perfil()));

-- Consultas del bot: las lee cualquier usuario con perfil.
drop policy if exists consultas_bot_admin on public.consultas_bot;
drop policy if exists consultas_bot_usuarios_leen on public.consultas_bot;
create policy consultas_bot_usuarios_leen on public.consultas_bot
  for select to authenticated using ((select public.tiene_perfil()));

-- Usuarios del bot: todos los ven; solo el admin los agrega, cambia o saca.
drop policy if exists usuarios_telegram_admin on public.usuarios_telegram;
drop policy if exists usuarios_telegram_usuarios_leen on public.usuarios_telegram;
create policy usuarios_telegram_usuarios_leen on public.usuarios_telegram
  for select to authenticated using ((select public.tiene_perfil()));

drop policy if exists usuarios_telegram_admin_agrega on public.usuarios_telegram;
create policy usuarios_telegram_admin_agrega on public.usuarios_telegram
  for insert to authenticated with check ((select public.es_admin()));

drop policy if exists usuarios_telegram_admin_cambia on public.usuarios_telegram;
create policy usuarios_telegram_admin_cambia on public.usuarios_telegram
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists usuarios_telegram_admin_saca on public.usuarios_telegram;
create policy usuarios_telegram_admin_saca on public.usuarios_telegram
  for delete to authenticated using ((select public.es_admin()));

create or replace function public.asignar_foto(p_foto_id bigint, p_articulo_id bigint)
returns public.v_articulos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_drive_id text;
  v_articulo public.v_articulos;
begin
  if not public.tiene_perfil() then
    raise exception 'Solo un usuario de la web puede asignar fotos' using errcode = '42501';
  end if;

  select f.drive_id into v_drive_id
  from public.fotos_sin_match f
  where f.id = p_foto_id and not f.resuelto
  for update;

  if v_drive_id is null then
    raise exception 'La foto no existe o ya fue resuelta' using errcode = 'P0002';
  end if;
  if v_drive_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'El ID de Drive de la foto no es válido' using errcode = '22023';
  end if;

  update public.articulos
  set "Imagen" = 'https://drive.google.com/file/d/' || v_drive_id || '/view?usp=drivesdk'
  where id = p_articulo_id;
  if not found then
    raise exception 'El artículo no existe' using errcode = 'P0002';
  end if;

  update public.fotos_sin_match set resuelto = true where id = p_foto_id;

  select * into v_articulo from public.v_articulos where id = p_articulo_id;
  return v_articulo;
end
$$;
