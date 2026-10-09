create table if not exists public.familias (
  codigo       text primary key,          -- = articulos."codigo  familia"
  nombre       text,
  es_producto  boolean not null default true
);

create table if not exists public.perfiles (
  user_id     uuid primary key references auth.users on delete cascade,
  nombre      text,
  rol         text not null default 'vendedor' check (rol in ('vendedor', 'admin')),
  created_at  timestamptz not null default now()
);

-- Lista blanca del bot de Telegram.
create table if not exists public.usuarios_telegram (
  chat_id     bigint primary key,
  nombre      text not null,
  activo      boolean not null default true,
  notas       text,
  created_at  timestamptz not null default now()
);

-- n8n escribe una fila por cada consulta al bot. chat_id no tiene FK a propósito:
-- también se registran los chats no autorizados.
create table if not exists public.consultas_bot (
  id            bigint generated always as identity primary key,
  chat_id       bigint,
  fuente        text check (fuente in ('texto', 'foto', 'audio')),
  texto         text,
  sql_generado  text,
  cantidad      int,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists consultas_bot_created_at_idx on public.consultas_bot (created_at desc);
create index if not exists consultas_bot_chat_id_idx on public.consultas_bot (chat_id, created_at desc);

-- n8n escribe los archivos de Drive que no coincidieron con ningún código.
create table if not exists public.fotos_sin_match (
  id          bigint generated always as identity primary key,
  drive_id    text unique,
  archivo     text,
  candidatos  text,                       -- separados por '|', como los arma n8n
  link        text,
  resuelto    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists fotos_sin_match_pendientes_idx
  on public.fotos_sin_match (created_at desc) where not resuelto;
