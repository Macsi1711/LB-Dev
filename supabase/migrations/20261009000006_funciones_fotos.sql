-- RPC de la pantalla Fotos: sugerencias y asignación manual de fotos que no matchearon.

-- Los artículos con código más parecido a alguno de los textos (nombre de archivo y
-- candidatos de n8n). La extensión del archivo se ignora.
create or replace function public.sugerir_codigos(p_textos text[], p_limit int default 5)
returns table (id bigint, codigo text, nombre text, tiene_foto boolean, similitud real)
language sql
stable
security invoker
set search_path = ''
as $$
  with textos as (
    select upper(regexp_replace(trim(t), '\.[a-z0-9]{2,5}$', '', 'i')) as texto
    from unnest(p_textos) as t
    where trim(coalesce(t, '')) <> ''
  )
  , puntajes as (
    -- word_similarity premia el código contenido como palabra ("854000 copia" → 854000).
    select
      v.id, v.codigo, v.nombre, v.tiene_foto,
      max(greatest(
        extensions.similarity(upper(v.codigo), t.texto),
        extensions.word_similarity(upper(v.codigo), t.texto)
      )) as puntaje,
      max(extensions.similarity(upper(v.codigo), t.texto)) as desempate
    from public.v_articulos v
    cross join textos t
    where v.codigo is not null and v.codigo <> ''
    group by v.id, v.codigo, v.nombre, v.tiene_foto
  )
  select p.id, p.codigo, p.nombre, p.tiene_foto, p.puntaje
  from puntajes p
  where p.puntaje > 0
  order by p.puntaje desc, p.desempate desc, p.codigo
  limit least(greatest(coalesce(p_limit, 5), 1), 20)
$$;

-- Asigna a mano una foto que no matcheó: escribe "Imagen" con el formato del contrato con
-- n8n y marca la foto como resuelta, en la misma transacción.
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
  if not public.es_admin() then
    raise exception 'Solo un administrador puede asignar fotos' using errcode = '42501';
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
