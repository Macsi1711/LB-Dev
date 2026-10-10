# ADR-003: Stack y capas de la web

- **Estado:** aceptado
- **Fecha:** 2026-10-09

## Contexto

La plantilla del repo proponía NestJS + Prisma, pero acá el backend es Supabase y no hace falta
una API propia (ADR-004). La lógica que queda en el cliente igual tiene que estar separada y
testeada.

## Decisión

Monorepo pnpm con `apps/web`: React 19, Vite, TypeScript estricto, Tailwind 4, shadcn/ui,
TanStack Query y Vitest. Cada feature vive en `src/features/<feature>/` con estas capas:

- `domain/`: TypeScript puro, sin React ni paquetes externos. Define los puertos en `ports.ts`.
  TDD y 90 % de cobertura.
- `data/`: adaptadores que implementan los puertos con Supabase. Reciben el cliente por
  parámetro y no importan `infra`.
- `ui/`: componentes y hooks. Usan los puertos por contexto y no importan `data` ni `infra`.
- `<feature>.module.tsx`: composition root. Conecta `infra` con `data` y provee los puertos.
- `index.ts`: única puerta de entrada desde otras features.

Lo transversal va en `src/infra/` (cliente de Supabase, sesión, tema) y en `src/shared/` (tipos
generados, errores y componentes base). `eslint-plugin-boundaries` v7 lo hace cumplir. En v7 los
elementos son carpetas: `index.ts` y `*.module.tsx` se distinguen por `fileInternalPath`.

## Alternativas descartadas

- NestJS + Prisma: duplica lo que ya resuelven PostgREST y RLS, y suma un servidor que mantener.
- Feature folders sin capas: el dominio termina acoplado a Supabase y a React.

## Consecuencias

Los tests del dominio no necesitan red ni DOM. Para probar `ui` alcanza con puertos falsos.
