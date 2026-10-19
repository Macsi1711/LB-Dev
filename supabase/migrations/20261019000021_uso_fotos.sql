-- Cuánto espacio de Storage se usa, para avisar en la pantalla Fotos antes de llenar el plan
-- gratis (ADR-008). Suma todos los buckets porque el límite es del proyecto, no del bucket.
-- security definer para sumar archivos que el usuario no ve; por eso chequea el perfil a mano.
create or replace function public.uso_fotos()
returns table (bytes bigint, fotos bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.tiene_perfil() then
    raise exception 'Solo los usuarios de la web ven el uso de fotos' using errcode = '42501';
  end if;

  return query
  select
    (select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint from storage.objects o),
    (select count(*) from public.articulos a where a.foto is not null);
end
$$;

revoke execute on function public.uso_fotos() from public, anon;
grant execute on function public.uso_fotos() to authenticated;
