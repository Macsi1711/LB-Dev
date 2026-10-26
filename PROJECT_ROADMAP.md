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

| Fase | Entregable                                                                                            | Estado                | PR             |
| ---- | ----------------------------------------------------------------------------------------------------- | --------------------- | -------------- |
| 1    | Prettier, ESLint, husky, commitlint                                                                   | ✅                    | #1             |
| 1    | Esqueleto de la web con capas, tokens y primer test                                                   | ✅                    | #2             |
| 1    | DESIGN.md                                                                                             | ✅                    | #3             |
| 1    | CI (verify, integration, canario de Node) y plantilla de PR                                           | ✅                    | #9, #10        |
| 1    | ADRs, CLAUDE.md, onboarding, glosario y contrato con n8n                                              | ✅                    | #11            |
| 1    | Hook de inicio de sesión para Claude Code                                                             | ✅                    | #12            |
| 2    | Supabase local, tablas nuevas y vista `v_articulos`                                                   | ✅                    | #4             |
| 2    | RPC de búsqueda, stats, sugerencias y asignación de fotos                                             | ✅                    | #5, #6         |
| 2    | Perfiles automáticos y RLS por rol                                                                    | ✅                    | #7             |
| 2    | Roles `n8n_bot` / `n8n_app` y tests del contrato con n8n                                              | ✅                    | #8             |
| 2    | Vista de consultas del bot, ranking y KPIs                                                            | ✅                    | #24            |
| 3    | Componentes base (shadcn/ui)                                                                          | ✅                    | #13            |
| 3    | Login, rutas protegidas y recuperación de contraseña                                                  | ✅                    | #14, #15, #16  |
| 3    | Layout con navegación, tema claro/oscuro y salir                                                      | ✅                    | #17            |
| 3    | Mostrador: búsqueda, filtros, fotos y detalle                                                         | ✅                    | #18, #19, #20  |
| 3    | Fotos: cobertura, sin foto con CSV, asignar o descartar                                               | ✅                    | #21, #22       |
| 3    | Bot: usuarios habilitados, consultas, KPIs y ranking                                                  | ✅                    | #23, #25, #26  |
| 3    | Configuración de Vercel y guía de deploy                                                              | ✅                    | #27            |
| 4    | Modo demo con datos y fotos de ejemplo                                                                | ✅                    | #30, #31       |
| 4    | Identidad de Lois & Bogao                                                                             | ✅                    | #32            |
| 4    | Sugerencias de fotos por código y por nombre                                                          | ✅                    | #34            |
| 4    | Mostrador como chat estilo Telegram / WhatsApp                                                        | ✅                    | #36, #37, #38  |
| 4    | Arreglos del buscador y del celular                                                                   | ✅                    | #29, #33, #35  |
| 4    | **Release v0.1.0**                                                                                    | ✅                    | #28            |
| 5    | El vendedor ve todas las secciones; solo el admin gestiona usuarios del bot                           | ✅                    | #39            |
| 5    | `.vercelignore` para que la CLI no suba el `.env`                                                     | ✅                    | #41            |
| 5    | **Release v0.2.0**                                                                                    | ✅                    | release/0.2.0  |
| 6    | Acceso a la base de la empresa (usuario de solo lectura y SQL Editor)                                 | ✅                    | #42, #45       |
| 6    | Inspección solo lectura: esquema real, familias y rol de n8n                                          | ✅                    | #42            |
| 6    | Migraciones adaptadas a la tabla `familias` que ya existe                                             | ✅                    | #46            |
| 6    | Respaldo, migraciones, verificación y deshacer para el SQL Editor                                     | ✅                    | #47            |
| 6    | Migraciones en producción con OK del dueño (todas menos la 0024, que va con el respaldo)              | ✅                    | —              |
| 6    | Primer admin                                                                                          | ✅                    | —              |
| 6    | Proyecto en Vercel (permiso de GitHub o deploy por CLI)                                               | ✅ `mostrador-lois`   | #41            |
| 6    | Variables reales en Vercel, sin modo demo                                                             | ✅                    | —              |
| 6    | Fotos de Drive compartidas con "cualquiera con el link" (ya no aplica: Drive retirado, ADR-008)       | ✅                    | —              |
| 6    | Consultas con audio y foto en el chat del Mostrador ([ADR-005](docs/adr/005-audio-y-foto-por-n8n.md)) | ✅                    | #49–#53        |
| 6    | **Release v0.3.0**                                                                                    | ✅                    | release/0.3.0  |
| 6    | Búsqueda en lenguaje natural y lo más parecido                                                        | ✅                    | #55, #56       |
| 6    | **Release v0.3.1**                                                                                    | ✅                    | release/0.3.1  |
| 6    | Cada consulta de la web en las métricas                                                               | ✅                    | #58, #59       |
| 6    | **Release v0.4.0**                                                                                    | ✅                    | release/0.4.0  |
| 6    | La sección Bot pasa a llamarse Métricas                                                               | ✅                    | #61            |
| 6    | **Release v0.4.1**                                                                                    | ✅                    | release/0.4.1  |
| 6    | Agregar foto a un artículo desde la web (Drive por n8n)                                               | ✅                    | #64–#67        |
| 6    | **Release v0.5.0**                                                                                    | ✅                    | release/0.5.0  |
| 6    | Fotos en Storage: bucket, columna `foto` y asignación ([ADR-008](docs/adr/008-fotos-en-storage.md))   | ✅                    | #69, #70       |
| 6    | Pasar las fotos de Drive a Storage (442 de 443)                                                       | ✅                    | #71            |
| 6    | Búsqueda más rápida: usa el índice y busca una sola vez (prueba de carga local)                       | ✅                    | #72, #73       |
| 6    | **Release v0.6.0**                                                                                    | ✅                    | release/0.6.0  |
| 6    | La web muestra y carga las fotos solo en Storage, sin Drive; el bot también                           | ✅                    | #75, #77–#80   |
| 6    | Textos largos que se salían de las tarjetas                                                           | ✅                    | #76            |
| 6    | **Release v0.7.0**                                                                                    | ✅                    | release/0.7.0  |
| 6    | Aviso de espacio para fotos en la pantalla Fotos (70 % y 85 %)                                        | ✅                    | #82            |
| 6    | La búsqueda por foto busca solo el código leído (pastillas)                                           | ✅                    | #84            |
| 6    | **Release v0.8.0**                                                                                    | ✅                    | release/0.8.0  |
| 6    | Si el código de la foto no está en el catálogo, busca la pieza que se ve (filtro FRAM)                | ✅                    | #86            |
| 6    | Apagar Drive en n8n (Lois Fotos, Lois Subir foto) y cambiar el bot por "Lois SQL (sin Drive)"         | ✅                    | —              |
| 6    | Borrar lo que quedaba de Drive en la base (migración 0022, aplicada)                                  | ✅                    | #83            |
| 6    | **Release v0.8.1**                                                                                    | ✅                    | release/0.8.1  |
| 6    | Pegar en n8n la consigna y el código nuevos de "Leer foto" y "Respuesta foto"                         | ✅                    | #84, #86       |
| 6    | Borrar la credencial "LoisDrive" y los flujos viejos de n8n                                           | ✅                    | —              |
| 6    | Códigos con o sin espacios, guiones o barras (migración 0023, aplicada)                               | ✅                    | #88, #89       |
| 6    | **Release v0.9.0**                                                                                    | ✅                    | release/0.9.0  |
| 6    | Sin login, el vendedor busca por texto, audio y foto y ve el contador (ADR-011, 0025–0027 y n8n)      | ✅                    | #94–#99        |
| 6    | **Release v0.10.0**                                                                                   | ✅                    | release/0.10.0 |
| 6    | "Onix" por audio: la IA escucha "onyx" y la web lo corrige antes de buscar                            | ✅                    | #102           |
| 6    | **Release v0.10.1**                                                                                   | ✅                    | release/0.10.1 |
| 6    | Respaldo en Vercel Blob (ADR-012), en marcha: 0024, secrets y prueba de restauración en verde         | ✅                    | #104–#106      |
| 6    | **Release v0.11.0**                                                                                   | ✅                    | release/0.11.0 |
| 6    | Productos: el admin carga productos nuevos (datos, familia y foto; migración 0028)                    | ✅                    | #110–#113      |
| 6    | **Release v0.12.0**                                                                                   | ✅                    | release/0.12.0 |
| 6    | Webhook "Lois Consulta web" en n8n ([n8n.md](docs/n8n.md))                                            | ✅                    | #98            |
| 6    | Probar en el local audio, foto y alta de productos (el bot ya se probó)                               | ✅                    | —              |
| 6    | Pendientes del catálogo (FRAM, HU612, 3PK848A): fuera de la v1.0, en el sistema del dueño             | ✅ decisión del dueño | —              |
| 6    | Cuentas de vendedor viejas: borrarlas o sacarles los permisos en la base (ADR-011)                    | ✅                    | —              |
| 6    | Confirmar si el bot hace `SELECT *` sobre `articulos` (no: nombra las columnas)                       | ✅                    | —              |
| 6    | Auth: Site URL y Redirect URLs a la web; "olvidé mi contraseña" probado de punta a punta              | ✅                    | —              |
| 6    | Respaldo nocturno de la base y las fotos, con prueba mensual (ADR-009)                                | ✅                    | #91–#93        |
| 6    | Prueba de carga en producción: 15 y 30 vendedores, 0 errores, mediana 0,2 s                           | ✅                    | —              |
| 6    | Plan de Vercel: la web y el respaldo pasaron al equipo Pro (AtomLabs-completo)                        | ✅                    | —              |
| 6    | El bot deja de entrar como `postgres`: usa `n8n_bot`, solo lectura ([n8n.md](docs/n8n.md))            | ✅                    | #108           |
| 6    | Cierre de seguridad: rotar `postgres`, borrar "Lois" de n8n y `lois_inspeccion` (produccion.md §8)    | ✅                    | —              |
| 6    | **Release v1.0.0**                                                                                    | ✅                    | release/1.0.0  |
| 7    | Repo público (historial revisado con gitleaks: sin secretos)                                          | ✅                    | —              |
| 7    | Protección de `develop` y `main` (verify e integration obligatorios, sin push directo)                | ✅                    | —              |
| 7    | Prueba: una PR en rojo no se puede mergear (ni como admin)                                            | ✅                    | #116           |
| 8    | Alta de usuarios de la web desde la app (función en el servidor)                                      | 💡                    | —              |
| 8    | Logo e ícono para instalar la app en el celular                                                       | 💡                    | —              |
| 8    | Tests end-to-end en el navegador                                                                      | 💡                    | —              |
| 8    | Que la web abra solo desde la red del local (cuida el gasto de la IA)                                 | 💡                    | —              |
| 8    | "Lo más parecido" más rápido (hoy ~350 ms con 20 mil artículos)                                       | 💡                    | —              |
| 8    | Bot: responder solo a los vendedores habilitados (`usuarios_telegram`) y anotar sus consultas         | 💡                    | —              |
| 8    | Confirmación propia al borrar en el demo publicado                                                    | ✅                    | #43            |
