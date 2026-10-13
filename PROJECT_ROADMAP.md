# Roadmap

Las fases y los estados se definen en conjunto con el dueño del proyecto. Cada fase cierra con
una versión en `main`; lo que está "En develop" sale en la release siguiente.

**Estados:** ✅ Hecho · 🟡 En develop · 🔒 Bloqueado (y por quién) · ⏳ Pendiente · 💡 Opcional

## Fases

1. **Base del repo:** monorepo, calidad, CI y documentación para trabajar con PRs chicas.
2. **Base de datos:** el esquema de la web sobre `articulos` sin romper el contrato con n8n.
3. **Web:** login, Mostrador, Fotos y Bot sobre Supabase.
4. **Identidad, demo y chat → v0.1.0:** la cara de Lois & Bogao, el modo demo y el Mostrador como
   chat.
5. **Permisos → v0.2.0:** el vendedor ve todo; solo el admin gestiona usuarios del bot.
6. **Producción → v1.0.0:** la web andando con los datos reales de la empresa, en Vercel, sin
   cortar el bot.
7. **Cierre del repo:** repo público, ramas protegidas y prueba de que una PR en rojo no entra.
8. **Mejoras:** lo que suma después de la 1.0, a definir con el dueño.

## Estado

| Fase | Entregable                                                                           | Estado                | PR            |
| ---- | ------------------------------------------------------------------------------------ | --------------------- | ------------- |
| 1    | Prettier, ESLint, husky, commitlint                                                  | ✅                    | #1            |
| 1    | Esqueleto de la web con capas, tokens y primer test                                  | ✅                    | #2            |
| 1    | DESIGN.md                                                                            | ✅                    | #3            |
| 1    | CI (verify, integration, canario de Node) y plantilla de PR                          | ✅                    | #9, #10       |
| 1    | ADRs, CLAUDE.md, onboarding, glosario y contrato con n8n                             | ✅                    | #11           |
| 1    | Hook de inicio de sesión para Claude Code                                            | ✅                    | #12           |
| 2    | Supabase local, tablas nuevas y vista `v_articulos`                                  | ✅                    | #4            |
| 2    | RPC de búsqueda, stats, sugerencias y asignación de fotos                            | ✅                    | #5, #6        |
| 2    | Perfiles automáticos y RLS por rol                                                   | ✅                    | #7            |
| 2    | Roles `n8n_bot` / `n8n_app` y tests del contrato con n8n                             | ✅                    | #8            |
| 2    | Vista de consultas del bot, ranking y KPIs                                           | ✅                    | #24           |
| 3    | Componentes base (shadcn/ui)                                                         | ✅                    | #13           |
| 3    | Login, rutas protegidas y recuperación de contraseña                                 | ✅                    | #14, #15, #16 |
| 3    | Layout con navegación, tema claro/oscuro y salir                                     | ✅                    | #17           |
| 3    | Mostrador: búsqueda, filtros, fotos y detalle                                        | ✅                    | #18, #19, #20 |
| 3    | Fotos: cobertura, sin foto con CSV, asignar o descartar                              | ✅                    | #21, #22      |
| 3    | Bot: usuarios habilitados, consultas, KPIs y ranking                                 | ✅                    | #23, #25, #26 |
| 3    | Configuración de Vercel y guía de deploy                                             | ✅                    | #27           |
| 4    | Modo demo con datos y fotos de ejemplo                                               | ✅                    | #30, #31      |
| 4    | Identidad de Lois & Bogao                                                            | ✅                    | #32           |
| 4    | Sugerencias de fotos por código y por nombre                                         | ✅                    | #34           |
| 4    | Mostrador como chat estilo Telegram / WhatsApp                                       | ✅                    | #36, #37, #38 |
| 4    | Arreglos del buscador y del celular                                                  | ✅                    | #29, #33, #35 |
| 4    | **Release v0.1.0**                                                                   | ✅                    | #28           |
| 5    | El vendedor ve todas las secciones; solo el admin gestiona usuarios del bot          | ✅                    | #39           |
| 5    | `.vercelignore` para que la CLI no suba el `.env`                                    | ✅                    | #41           |
| 5    | **Release v0.2.0**                                                                   | ✅                    | release/0.2.0 |
| 6    | Acceso a la base de la empresa (usuario de solo lectura y SQL Editor)                | ✅                    | #42, #45      |
| 6    | Inspección solo lectura: esquema real, familias y rol de n8n                         | ✅                    | #42           |
| 6    | Migraciones adaptadas a la tabla `familias` que ya existe                            | ✅                    | #46           |
| 6    | Respaldo, migraciones, verificación y deshacer para el SQL Editor                    | ✅                    | #47           |
| 6    | Confirmar si el bot hace `SELECT *` sobre `articulos`                                | ⏳ dueño              | —             |
| 6    | Aplicar las migraciones en producción, **con OK del dueño**                          | ⏳ dueño              | —             |
| 6    | Borrar `lois_inspeccion` y rotar la contraseña de `postgres`                         | 🔒 migraciones        | —             |
| 6    | Auth: registro apagado, Site URL, Redirect URLs y SMTP propio                        | 🔒 migraciones        | —             |
| 6    | Primer admin                                                                         | 🔒 migraciones        | —             |
| 6    | Proyecto en Vercel (permiso de GitHub o deploy por CLI)                              | ✅ `mostrador-lois`   | #41           |
| 6    | Variables reales en Vercel, sin modo demo                                            | 🔒 migraciones        | —             |
| 6    | Contraseñas de `n8n_bot` / `n8n_app` y cambios de los flujos ([n8n.md](docs/n8n.md)) | 🔒 migraciones        | —             |
| 6    | Fotos de Drive compartidas con "cualquiera con el link"                              | ⏳ verificar          | —             |
| 6    | Prueba de punta a punta con los flujos de n8n andando                                | 🔒 migraciones y n8n  | —             |
| 6    | Plan de Vercel para uso comercial (Pro)                                              | ⏳ decisión del dueño | —             |
| 6    | **Release v1.0.0**                                                                   | ⏳                    | —             |
| 7    | Repo público                                                                         | ⏳ aprobado           | —             |
| 7    | Protección de `develop` y `main` (verify obligatorio, sin push directo)              | ⏳                    | —             |
| 7    | Prueba: una PR en rojo no se puede mergear                                           | ⏳                    | —             |
| 8    | Alta de usuarios de la web desde la app (función en el servidor)                     | 💡                    | —             |
| 8    | Logo e ícono para instalar la app en el celular                                      | 💡                    | —             |
| 8    | Tests end-to-end en el navegador                                                     | 💡                    | —             |
| 8    | Confirmación propia al borrar en el demo publicado                                   | ✅                    | #43           |
