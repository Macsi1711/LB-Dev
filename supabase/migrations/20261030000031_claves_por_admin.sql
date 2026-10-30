-- El admin les cambia la contraseña a los vendedores desde la web (ADR-014), sin mail de
-- recuperación: vendedores_web() los lista y cambiar_clave_vendedor() pone la nueva.
--
-- Security definer porque la web no lee ni escribe auth.users; las dos chequean el admin a mano.
-- Solo tocan cuentas con perfil de vendedor: la contraseña de un admin no se cambia desde acá.

create or replace function public.vendedores_web()
returns table (user_id uuid, nombre text, email text, ultimo_ingreso timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el admin ve los vendedores' using errcode = '42501';
  end if;

  return query
    select p.user_id, p.nombre, u.email::text, u.last_sign_in_at
    from public.perfiles p
    join auth.users u on u.id = p.user_id
    where p.rol = 'vendedor'
    order by coalesce(p.nombre, u.email);
end
$$;

-- Mismo mínimo que pide la web al elegir contraseña (8). bcrypt con costo 10, como Supabase Auth.
create or replace function public.cambiar_clave_vendedor(p_user_id uuid, p_clave text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el admin cambia contraseñas' using errcode = '42501';
  end if;

  if length(coalesce(p_clave, '')) < 8 then
    raise exception 'La contraseña tiene que tener al menos 8 caracteres' using errcode = '22023';
  end if;

  update auth.users u set
    encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
    updated_at = now()
  where u.id = p_user_id
    and exists (select 1 from public.perfiles p where p.user_id = u.id and p.rol = 'vendedor');
  if not found then
    raise exception 'No existe el vendedor %', p_user_id using errcode = 'P0002';
  end if;
end
$$;

revoke all on function public.vendedores_web() from public, anon;
revoke all on function public.cambiar_clave_vendedor(uuid, text) from public, anon;
grant execute on function public.vendedores_web() to authenticated;
grant execute on function public.cambiar_clave_vendedor(uuid, text) to authenticated;
