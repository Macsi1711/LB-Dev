-- Fotos de los artículos en Supabase Storage (ADR-008): el Drive de Lois deja de usarse.
-- "Imagen" no se toca: el bot la sigue usando hasta que pase a leer `foto`.

-- Bucket público: la web y el bot leen la foto por URL. La web sube JPEG chicos (~120 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 1048576, array['image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Suben los usuarios con perfil, solo con la ruta <id>/<token>.jpg o <id>/<token>.mini.jpg.
-- Sin políticas de update ni delete: desde la web nadie pisa ni borra una foto.
drop policy if exists fotos_usuarios_suben on storage.objects;
create policy fotos_usuarios_suben on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and name ~ '^[0-9]+/[A-Za-z0-9_-]{8,64}(\.mini)?\.jpg$'
    and (select public.tiene_perfil())
  );

drop policy if exists fotos_usuarios_ven on storage.objects;
create policy fotos_usuarios_ven on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and (select public.tiene_perfil()));

-- Ruta de la foto dentro del bucket. La escribe solo asignar_foto_subida(): la web no tiene grant.
alter table public.articulos add column if not exists foto text;

-- El historial guarda también las fotos de Storage y la anterior, para poder volver atrás.
alter table public.fotos_subidas alter column drive_id drop not null;
alter table public.fotos_subidas add column if not exists foto text;
alter table public.fotos_subidas add column if not exists foto_anterior text;
alter table public.fotos_subidas drop constraint if exists fotos_subidas_drive_o_foto;
alter table public.fotos_subidas
  add constraint fotos_subidas_drive_o_foto check (drive_id is not null or foto is not null);

-- Tiene foto si está en Storage o si tiene link de Drive (mientras dure la transición).
create or replace view public.v_articulos
with (security_invoker = true)
as
select
  a.id,
  trim(a."Codigo")                                    as codigo,
  a."Nombre artículo"                                 as nombre,
  a."Descripción"                                     as descripcion,
  a.observaciones,
  a."codigo  familia"                                 as familia_codigo,
  a."Nombre familia"                                  as familia_nombre,
  a."Imagen"                                          as imagen_url,
  substring(a."Imagen" from '/d/([A-Za-z0-9_-]+)')    as imagen_drive_id,
  a.foto is not null or coalesce(a."Imagen" ilike '%http%', false) as tiene_foto,
  a.foto
from public.articulos a;

-- Se recrea para que sume la columna `foto` (su `v.*` se expande al crearla).
create or replace view public.v_articulos_sin_foto
with (security_invoker = true)
as
select v.*
from public.v_articulos v
left join public.v_familias f on f.codigo = v.familia_codigo
where not v.tiene_foto
  and coalesce(f.es_producto, true);

-- Asigna una foto ya subida al bucket. security definer para escribir `foto` y el historial
-- sin darle grants a nadie; por eso chequea el perfil a mano.
create or replace function public.asignar_foto_subida(p_articulo_id bigint, p_ruta text)
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

revoke execute on function public.asignar_foto_subida(bigint, text) from public, anon;
grant execute on function public.asignar_foto_subida(bigint, text) to authenticated;
