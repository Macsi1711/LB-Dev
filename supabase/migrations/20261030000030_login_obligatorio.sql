-- Login obligatorio (ADR-013): sin sesión la base no responde, y el vendedor puede lo mismo que
-- le muestra la web: buscar, ver las familias, ver el contador de fotos y registrar sus
-- consultas. Lo demás (Métricas, lista de Telegram, subir y asignar fotos, uso del espacio,
-- "Imagen") queda para el admin. No toca columnas: el contrato con n8n queda igual.

-- Sin sesión: nada (deshace los grants a anon de 0025, 0026 y 0027).
create or replace function public.puede_buscar()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.tiene_perfil()
$$;

revoke execute on function
  public.buscar_articulos(text, text, boolean, int, int),
  public.resumen_busqueda(text, text, boolean),
  public.stats_fotos(),
  public.registrar_consulta(text, text, boolean, text, text, text, bigint, boolean)
from anon;

drop policy if exists familias_leen_todos on public.familias;
revoke select on public.familias, public.v_familias from anon;

-- Métricas y lista de Telegram: solo el admin (en 0013 las leía cualquier usuario con perfil).
drop policy if exists consultas_bot_usuarios_leen on public.consultas_bot;
drop policy if exists consultas_bot_admin_lee on public.consultas_bot;
create policy consultas_bot_admin_lee on public.consultas_bot
  for select to authenticated using ((select public.es_admin()));

drop policy if exists usuarios_telegram_usuarios_leen on public.usuarios_telegram;
drop policy if exists usuarios_telegram_admin_lee on public.usuarios_telegram;
create policy usuarios_telegram_admin_lee on public.usuarios_telegram
  for select to authenticated using ((select public.es_admin()));

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
  where u.id = p_user_id and public.es_admin()
$$;

-- Fotos: subir, asignar, el historial y el uso del espacio son del admin. Verlas sigue abierto a
-- quien tiene perfil (el bucket ya es público para las miniaturas del Mostrador).
drop policy if exists fotos_subidas_usuarios_leen on public.fotos_subidas;
drop policy if exists fotos_subidas_admin_lee on public.fotos_subidas;
create policy fotos_subidas_admin_lee on public.fotos_subidas
  for select to authenticated using ((select public.es_admin()));

drop policy if exists fotos_usuarios_suben on storage.objects;
drop policy if exists fotos_admin_sube on storage.objects;
create policy fotos_admin_sube on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and name ~ '^[0-9]+/[A-Za-z0-9_-]{8,64}(\.mini)?\.jpg$'
    and (select public.es_admin())
  );

drop policy if exists articulos_usuarios_asignan_foto on public.articulos;
drop policy if exists articulos_admin_asigna_foto on public.articulos;
create policy articulos_admin_asigna_foto on public.articulos
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create or replace function public.asignar_foto_subida(p_articulo_id bigint, p_ruta text)
returns public.v_articulos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior text;
  v_codigo text;
  v_resultado public.v_articulos;
begin
  if not public.es_admin() then
    raise exception 'Solo el admin sube fotos' using errcode = '42501';
  end if;

  select a.foto, trim(a."Codigo") into v_anterior, v_codigo
  from public.articulos a where a.id = p_articulo_id
  for update;
  if not found then
    raise exception 'No existe el artículo %', p_articulo_id using errcode = 'P0002';
  end if;

  -- La foto grande del mismo artículo; la miniatura se deduce de la ruta.
  if p_ruta is null or p_ruta !~ ('^' || p_articulo_id || '/[A-Za-z0-9_-]{8,64}\.jpg$') then
    raise exception 'La ruta de la foto no es válida' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o where o.bucket_id = 'fotos' and o.name = p_ruta
  ) then
    raise exception 'La foto no está subida' using errcode = '22023';
  end if;

  update public.articulos set foto = p_ruta where id = p_articulo_id;

  insert into public.fotos_subidas (articulo_id, codigo, foto, foto_anterior, user_id)
  values (p_articulo_id, v_codigo, p_ruta, v_anterior, auth.uid());

  select * into v_resultado from public.v_articulos v where v.id = p_articulo_id;
  return v_resultado;
end
$$;

create or replace function public.uso_fotos()
returns table (bytes bigint, fotos bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el admin ve el uso de fotos' using errcode = '42501';
  end if;

  return query
  select
    (select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint from storage.objects o),
    (select count(*) from public.articulos a where a.foto is not null);
end
$$;
