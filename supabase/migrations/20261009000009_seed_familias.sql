-- Carga las familias desde articulos. Se puede volver a correr cuando aparezcan familias nuevas:
--   select public.sincronizar_familias();
-- Las familias internas (descuentos, devoluciones, varios…) quedan con es_producto = false.
create or replace function public.sincronizar_familias()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_nuevas integer;
begin
  insert into public.familias (codigo, nombre)
  select distinct on (a."codigo  familia") a."codigo  familia", a."Nombre familia"
  from public.articulos a
  where nullif(trim(a."codigo  familia"), '') is not null
  order by a."codigo  familia", a."Nombre familia" nulls last
  on conflict (codigo) do nothing;
  get diagnostics v_nuevas = row_count;

  update public.familias
  set es_producto = false
  where codigo in ('333', '444', '555', '555.001', '777', '777.001', '777.002', '888', '999', 'DV', 'VL');

  return v_nuevas;
end
$$;

revoke execute on function public.sincronizar_familias() from public, anon, authenticated;

select public.sincronizar_familias();
