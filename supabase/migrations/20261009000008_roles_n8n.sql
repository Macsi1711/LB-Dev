-- Roles de Postgres para los flujos de n8n. Se conectan por el Session pooler (puerto 5432)
-- con el usuario n8n_bot.<project-ref> / n8n_app.<project-ref>.
--
-- Los roles se crean SIN contraseña (no pueden entrar hasta que el admin la cargue a mano):
--   alter role n8n_bot password '...';
--   alter role n8n_app password '...';
-- Las contraseñas nunca van al repo. Ver docs/n8n.md.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'n8n_bot') then
    create role n8n_bot login;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'n8n_app') then
    create role n8n_app login;
  end if;
end
$$;

-- n8n_bot: lo usa SOLO el nodo que ejecuta el SQL que genera la IA. Aunque alguien le haga
-- prompt injection al bot, este rol no puede modificar nada: además de la transacción de solo
-- lectura (que se puede desactivar con SET), no tiene ningún privilegio de escritura.
alter role n8n_bot set default_transaction_read_only = on;
alter role n8n_bot set statement_timeout = '5s';
-- Mismo search_path que tenía n8n antes: si la IA usa unaccent() o similarity(), sigue andando.
alter role n8n_bot set search_path = public, extensions;

grant usage on schema public, extensions to n8n_bot;
grant select on public.articulos to n8n_bot;

drop policy if exists n8n_bot_lee_articulos on public.articulos;
create policy n8n_bot_lee_articulos on public.articulos
  for select to n8n_bot using (true);

-- n8n_app: el resto de los nodos (lista blanca, log de consultas, fotos).
alter role n8n_app set statement_timeout = '15s';
alter role n8n_app set search_path = public, extensions;

grant usage on schema public, extensions to n8n_app;
grant select on public.articulos, public.usuarios_telegram to n8n_app;
grant update ("Imagen") on public.articulos to n8n_app;
grant insert on public.consultas_bot, public.fotos_sin_match to n8n_app;
-- select + update en fotos_sin_match: lo necesita un upsert (ON CONFLICT DO UPDATE).
grant select, update on public.fotos_sin_match to n8n_app;
grant usage on all sequences in schema public to n8n_app;

drop policy if exists n8n_app_lee_articulos on public.articulos;
create policy n8n_app_lee_articulos on public.articulos
  for select to n8n_app using (true);

drop policy if exists n8n_app_escribe_foto on public.articulos;
create policy n8n_app_escribe_foto on public.articulos
  for update to n8n_app using (true) with check (true);

drop policy if exists n8n_app_lee_usuarios_telegram on public.usuarios_telegram;
create policy n8n_app_lee_usuarios_telegram on public.usuarios_telegram
  for select to n8n_app using (true);

drop policy if exists n8n_app_registra_consultas on public.consultas_bot;
create policy n8n_app_registra_consultas on public.consultas_bot
  for insert to n8n_app with check (true);

drop policy if exists n8n_app_registra_fotos_sin_match on public.fotos_sin_match;
create policy n8n_app_registra_fotos_sin_match on public.fotos_sin_match
  for insert to n8n_app with check (true);

drop policy if exists n8n_app_lee_fotos_sin_match on public.fotos_sin_match;
create policy n8n_app_lee_fotos_sin_match on public.fotos_sin_match
  for select to n8n_app using (true);

drop policy if exists n8n_app_actualiza_fotos_sin_match on public.fotos_sin_match;
create policy n8n_app_actualiza_fotos_sin_match on public.fotos_sin_match
  for update to n8n_app using (true) with check (true);
