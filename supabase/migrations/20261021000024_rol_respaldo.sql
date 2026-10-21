-- lois_respaldo: el usuario con el que el respaldo nocturno (GitHub Actions) lee la base para
-- copiarla fuera de Supabase (docs/respaldo.md). Lee todo, también las filas con RLS (si no,
-- pg_dump falla), y no puede escribir nada: no tiene ningún privilegio de escritura y además
-- entra en solo lectura.
--
-- Se crea SIN contraseña (no puede entrar hasta que el admin la cargue a mano):
--   alter role lois_respaldo password '...';
-- La contraseña nunca va al repo: va solo a los secrets de GitHub.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lois_respaldo') then
    create role lois_respaldo login bypassrls;
  end if;
end
$$;

-- Sin superuser, createrole ni createdb (los valores por defecto: nombrarlos exige superusuario).
alter role lois_respaldo with login bypassrls;
alter role lois_respaldo set default_transaction_read_only = on;
alter role lois_respaldo set statement_timeout = '10min';
alter role lois_respaldo set idle_in_transaction_session_timeout = '15min';

-- SELECT sobre todas las tablas de todos los schemas (public, auth, storage, respaldo).
grant pg_read_all_data to lois_respaldo;
