-- Familias. En producción la tabla ya existe con "Código" y "Nombre" (con tilde y sin clave) y
-- otros procesos la pueden usar: no se renombra nada, la web solo le suma es_producto.
create table if not exists public.familias (
  "Código"  text,                         -- = articulos."codigo  familia"
  "Nombre"  text
);
alter table public.familias add column if not exists es_producto boolean not null default true;
create index if not exists familias_codigo_idx on public.familias ("Código");

-- Nombres limpios para la web y una fila por código (la tabla no tiene clave y podría repetir).
-- Si alguna fila repetida marca la familia como interna, gana esa.
create or replace view public.v_familias
with (security_invoker = true)
as
select f."Código" as codigo, min(f."Nombre") as nombre, bool_and(f.es_producto) as es_producto
from public.familias f
where nullif(trim(f."Código"), '') is not null
group by f."Código";

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
