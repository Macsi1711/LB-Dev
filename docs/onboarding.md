# Onboarding: de cero a desarrollando en 30 minutos

## 1. Requisitos (5 min)

- Node 22 o más y pnpm 10: `corepack enable` toma la versión de `packageManager`.
- Docker corriendo: Supabase local levanta unos 8 contenedores.

## 2. Instalar y levantar (10 min la primera vez, por las imágenes de Docker)

```bash
pnpm install
pnpm db:start                          # Supabase local con migraciones y datos de ejemplo
cp apps/web/.env.example apps/web/.env
pnpm dev:web                           # http://localhost:5180
```

Puertos reservados para este proyecto: **55420 a 55429** para Supabase (API 55421, DB 55422,
Studio 55423, mails 55424) y **5180** para la web.

## 3. Crear tu usuario (5 min)

No hay registro público. En local:

1. Entrá a Studio (http://127.0.0.1:55423) → Authentication → Add user, con email y contraseña.
2. Para hacerlo admin, en el SQL editor:
   ```sql
   update perfiles set rol = 'admin'
   where user_id = (select id from auth.users where email = 'vos@ejemplo.com');
   ```

Los mails de "olvidé mi contraseña" llegan a http://127.0.0.1:55424.

## 4. Antes de abrir una PR

```bash
pnpm format:check && pnpm lint && pnpm typecheck
pnpm test              # unitarios + cobertura del dominio
pnpm test:integration  # contra el Supabase local: RLS, RPC y contrato con n8n
pnpm build
```

Los tests de integración usan `postgresql://postgres:postgres@127.0.0.1:55422/postgres`. Para
apuntar a otro Postgres local, definí `DATABASE_URL` en `apps/web/.env`.

## 5. Cambiar la base

```bash
pnpm exec supabase migration new <nombre>   # escribí el SQL, idempotente
pnpm db:reset                               # reaplica todo desde cero, con el seed
pnpm db:generate                            # regenera apps/web/src/shared/database.types.ts
```

La CI falla si los tipos commiteados no coinciden con las migraciones.
