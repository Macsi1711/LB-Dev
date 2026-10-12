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

## 1 bis. Si la web de Vercel no muestra el repo

Se puede crear e importar desde la terminal, que conecta el repo de GitHub igual. Corré los
comandos desde otra carpeta (el `.npmrc` del repo exige Node 22) con `--cwd`:

```bash
npx vercel@latest login
npx vercel@latest link --cwd /ruta/a/LB-Dev
```

`link` crea el proyecto y conecta el repo. Después, en el panel de Vercel, revisá la
configuración del paso 1 (Root Directory `apps/web`, Production Branch `main`) y las variables:
la CLI arranca con el Root Directory en `./`. También crea un `.env.local` con un token
temporal: queda ignorado por git y nunca se commitea.

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
