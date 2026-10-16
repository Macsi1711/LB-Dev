-- Vista con nombres limpios para la web. security_invoker: respeta el RLS de articulos.
-- Se crea solo si no existe: 0017 le suma columnas y un `create or replace` con menos fallaría.
do $$
begin
  if to_regclass('public.v_articulos') is null then
    create view public.v_articulos
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
      coalesce(a."Imagen" ilike '%http%', false)          as tiene_foto  -- mismo criterio que el bot
    from public.articulos a;
  end if;
end
$$;
