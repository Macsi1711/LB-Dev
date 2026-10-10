# ADR-004: Supabase como backend, sin API propia, y roles separados para n8n

- **Estado:** aceptado
- **Fecha:** 2026-10-09

## Contexto

La web y dos flujos de n8n comparten la base. Uno de los flujos ejecuta SQL **generado por una
IA** a partir de lo que escribe un vendedor, así que está expuesto a prompt injection.

## Decisión

- La web habla directo con Supabase (PostgREST + RPC) usando la clave publishable. La seguridad
  está en RLS y en grants por columna, con `es_admin()` como security definer.
- La lógica que necesita atomicidad o índices va en funciones SQL `security invoker`
  (`buscar_articulos`, `asignar_foto`…).
- n8n usa dos roles propios: `n8n_bot` (solo SELECT sobre `articulos`, transacciones de solo
  lectura y timeout de 5 s) y `n8n_app` (lo mínimo para la lista blanca, el log y las fotos).
  Los roles se crean sin contraseña y el admin la carga a mano.
- El contrato con n8n se verifica con tests de integración en cada PR.

## Alternativas descartadas

- Que n8n siga usando `postgres`: un DELETE inyectado borra el catálogo.
- Edge Functions o una API intermedia: suman latencia y código sin agregar seguridad que RLS no
  dé.

## Consecuencias

Toda tabla nueva tiene que revocar los grants por defecto de `anon` y `authenticated`. Las
migraciones se prueban contra Supabase local antes de aplicarse en producción.
