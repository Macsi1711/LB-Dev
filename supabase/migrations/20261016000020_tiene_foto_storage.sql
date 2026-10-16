-- "Tiene foto" = tiene foto en Supabase Storage (ADR-008, paso 5): el Drive de Lois se dejó de
-- usar y la web ya no muestra fotos de Drive. Así la cobertura, "Sin foto" y el filtro "Solo con
-- foto" cuentan lo mismo que se ve. "Imagen" queda en la tabla (contrato con n8n), sin uso.

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
  a.foto is not null                                  as tiene_foto,
  a.foto
from public.articulos a;
