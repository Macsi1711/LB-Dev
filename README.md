# Mostrador Lois

Web para buscar artículos de Lois y Boago desde el mostrador (celular o PC), con foto, y panel
de administración de fotos y del bot de Telegram. El backend es Supabase y convive con dos flujos
de n8n en producción.

- **Empezar a desarrollar:** [`docs/onboarding.md`](docs/onboarding.md) (correr local, crear el
  primer admin, tests).
- **n8n y producción:** [`docs/n8n.md`](docs/n8n.md) (contrato, contraseñas de los roles y
  cadenas de conexión).
- **Reglas del repo:** [`CLAUDE.md`](CLAUDE.md) · **Diseño:** [`DESIGN.md`](DESIGN.md)

## Variables de entorno (`apps/web/.env`)

| Variable                 | Qué es                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | URL del proyecto de Supabase                                       |
| `VITE_SUPABASE_ANON_KEY` | Clave **publishable**. Nunca la `service_role`.                    |
| `DATABASE_URL`           | Opcional, solo para los tests de integración contra Postgres local |

## Primer admin

Invitá al usuario desde el panel de Supabase (Authentication → Invite) y después:

```sql
update perfiles set rol = 'admin'
where user_id = (select id from auth.users where email = 'admin@ejemplo.com');
```
