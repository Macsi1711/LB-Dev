# CLAUDE.md — guía para agentes

**Mostrador Lois** es la web para buscar artículos de Lois y Bogao desde el mostrador y para
administrar las fotos y el bot de Telegram. El backend es Supabase (Postgres + Auth + RLS), sin
API propia. La misma base la usan **flujos de n8n en producción**: el bot de Telegram (canal
secundario: el principal es la web) y el que pasa audio y foto a texto para la web.

## Antes de tocar algo, leé

1. [`docs/n8n.md`](docs/n8n.md): el **contrato con n8n**. Romperlo deja sin bot al mostrador.
2. [`docs/adr/`](docs/adr/): las decisiones de arquitectura. Arrancá por la 003 (capas) y la 004
   (Supabase).
3. [`DESIGN.md`](DESIGN.md): manda en todo lo visual. Lo que figura como "Pendiente" no se
   inventa.
4. [`docs/glosario.md`](docs/glosario.md): cómo se llama cada cosa en el negocio y en el código.

## Reglas

- **Contrato con n8n:** no se renombran, borran ni cambian de tipo las columnas de `articulos`.
  Las fotos están en Supabase Storage (`articulos.foto`, bucket `fotos`, ADR-008): **Drive ya no
  se usa para nada**. `"Imagen"` queda sin uso y n8n ya no la puede escribir (lo verifica
  `n8n-contract.int-spec.ts`).
- **Migraciones:** van en `supabase/migrations/`, son idempotentes (`if not exists`,
  `create or replace`, `drop policy if exists`) y siempre van con `pnpm db:generate`.
  Nunca se aplican a un proyecto remoto sin el OK explícito del dueño.
- **Capas de la web** (`apps/web/src/features/<feature>/`): `ui → domain ← data`. El
  `<feature>.module.tsx` conecta `infra` y, desde otra feature, se entra solo por su `index.ts`.
  Lo hace cumplir `eslint-plugin-boundaries`: si salta, se corrige el diseño, nunca la regla.
- **TDD en el dominio:** el spec nace primero y en rojo. La cobertura mínima de `domain/` es del
  90 %.
- **Idiomas:** el código y los identificadores van en inglés. La UI, los docs, los comentarios,
  los commits y las PRs, en español rioplatense. Los nombres de la base van en español porque los
  fija el contrato (ADR-002).
- **Colores:** solo tokens de `apps/web/src/styles/tokens.css`. Ningún hex suelto.
- **Secretos:** nunca en el repo; solo `.env.example` con valores locales. Nunca se piden por
  chat. La `service_role` nunca va al frontend.
- **Git:** Conventional Commits con el asunto en minúscula y commits atómicos. PRs de menos de
  400 líneas contra `develop`, que se mergean solo con squash y con la confirmación del dueño.
  Toda decisión de arquitectura lleva su ADR; un ADR no se edita, se reemplaza por otro.
- Si el dueño dice "pará", se para del todo.
