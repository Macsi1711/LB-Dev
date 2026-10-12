# Deploy en Vercel

La web es un sitio estático (Vite) que habla directo con Supabase. Vercel lo construye desde
GitHub: `main` → producción y cada PR → preview.

## 1. Importar el repo (una sola vez)

En vercel.com → **Add New → Project** → importar `Macsi1711/LB-Dev`:

| Campo             | Valor                                        |
| ----------------- | -------------------------------------------- |
| Framework Preset  | Vite                                         |
| Root Directory    | `apps/web`                                   |
| Build / Install   | los toma de `apps/web/vercel.json`           |
| Production Branch | `main` (Settings → Git, después de importar) |

**Environment Variables** (Production y Preview):

| Variable                 | Valor                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | `https://<project-ref>.supabase.co`                                                                    |
| `VITE_SUPABASE_ANON_KEY` | la clave **publishable** (`sb_publishable_…`). Nunca la `service_role`: la app no arranca si la ponés. |

## 1 bis. Si Vercel no ve el repo (cuentas distintas)

Cuando la cuenta de Vercel no puede acceder al repo de GitHub, se despliega **sin la integración
de Git**: GitHub Actions construye y publica con un token
([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)). La cuenta de Vercel puede
ser cualquiera (email, Google o GitHub). Los comandos se corren desde la raíz del repo; si
`npx` se queja de la versión de Node, correlos desde otra carpeta con `--cwd`.

1. **Entrar a Vercel desde la terminal:** `npx vercel@latest login`.
2. **Crear y vincular el proyecto:** `npx vercel@latest link`. A "Link to existing project?"
   respondé que no; nombre `mostrador-lois`; directorio del código `./apps/web`. Queda un
   `.vercel/project.json` (ignorado por git) con `orgId` y `projectId`.
3. **Variables del proyecto** (Vercel → Settings → Environment Variables, Production): mientras
   no esté el Supabase de la empresa, `VITE_DEMO=1`. Después, `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` (publishable), y se borra `VITE_DEMO`.
4. **Token:** vercel.com/account/tokens → crear uno para "GitHub Actions LB-Dev".
5. **Cargar en GitHub** (Settings → Secrets and variables → Actions):
   - Variables: `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`, con los valores de `.vercel/project.json`.
   - Secreto: `VERCEL_TOKEN`. Desde la terminal, `gh secret set VERCEL_TOKEN` lo pide sin
     mostrarlo. **Nunca** se pega en un chat, un issue ni el repo.
6. **Publicar:** cada push a `main` despliega solo. Para el primero, Actions → Deploy → _Run
   workflow_. El link de producción queda en el resumen del job.

## 2. Supabase → Authentication → URL Configuration

- **Site URL:** el dominio de producción (ej. `https://mostrador-lois.vercel.app`).
- **Redirect URLs:** `https://<dominio>/**` y, para las previews, `https://*-<equipo>.vercel.app/**`.
- **Authentication → Sign In / Providers:** _Allow new users to sign up_ apagado. El login por
  email queda prendido.

Sin esto, el link de "olvidé mi contraseña" vuelve a localhost.

## 3. Dominio propio (opcional)

Vercel → Settings → Domains → agregar el dominio y cargar en el DNS el registro que indica Vercel
(un `CNAME` a `cname.vercel-dns.com` para un subdominio). Después, actualizar la Site URL de
Supabase.

## Rutas

`vercel.json` reescribe todo a `index.html` para que `/fotos` o `/nueva-clave` funcionen al
recargar, y agrega headers básicos de seguridad y caché larga para `/assets`.
