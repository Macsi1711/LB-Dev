-- Usuarios de prueba SOLO para el Supabase local (no se cargan en producción ni en la base
-- pelada del hook de la nube). Contraseña de los dos: "mostrador-local".
--   admin@lois.local     → admin
--   vendedor@lois.local  → vendedor
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('mostrador-local', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', u.nombre), now(), now(),
  '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@lois.local', 'Admin Local'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'vendedor@lois.local', 'Vendedor Local')
) as u(id, email, nombre)
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.email in ('admin@lois.local', 'vendedor@lois.local')
on conflict do nothing;

update public.perfiles set rol = 'admin' where user_id = 'a0000000-0000-4000-8000-000000000001';
