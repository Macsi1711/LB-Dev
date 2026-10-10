-- Artículos sin foto de familias de producto: la lista de tareas de la pantalla Fotos.
-- Mismo criterio que stats_fotos(): una familia que no está en `familias` cuenta como producto.
create or replace view public.v_articulos_sin_foto
with (security_invoker = true)
as
select v.*
from public.v_articulos v
left join public.familias f on f.codigo = v.familia_codigo
where not v.tiene_foto
  and coalesce(f.es_producto, true);

revoke all on public.v_articulos_sin_foto from anon, authenticated;
grant select on public.v_articulos_sin_foto to authenticated;
