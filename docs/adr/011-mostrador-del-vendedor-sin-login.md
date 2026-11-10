# ADR-011: sin login, el Mostrador es el del vendedor; con login, el admin tiene todo

- **Estado:** reemplazado por [ADR-013](013-login-obligatorio.md)
- **Fecha:** 2026-10-22
- **Reemplaza a:** [ADR-010](010-busqueda-sin-login.md) y [ADR-006](006-validacion-sesion-webhook.md)

## Contexto

El [ADR-010](010-busqueda-sin-login.md) dejó sin login solo la búsqueda por texto y reservó audio,
foto y Fotos para el admin. El dueño lo aclaró: la web es **interna** y los vendedores la usan
**sin login**. Sin login tienen que buscar por texto, audio y foto, y ver cuántos artículos tienen
foto. El login es para el admin, que tiene todas las funciones (las de hoy y las que vengan).

El webhook de audio y foto de n8n pedía una sesión ([ADR-006](006-validacion-sesion-webhook.md)).
Probamos darle a la web una sesión anónima de Supabase para no tocar n8n, pero Supabase solo la da
con el registro público abierto, y hoy todo usuario nuevo recibe perfil de vendedor (un trigger):
abrirlo deja a cualquiera leer las tablas.

## Decisión

- **Sin login** (el vendedor): Mostrador con texto, audio y foto, y la pantalla **Fotos solo con
  el contador** de artículos con foto. La base sigue igual que en el ADR-010: sin sesión se busca
  solo por `buscar_articulos()` y `resumen_busqueda()`, y ahora también se lee `stats_fotos()`
  (solo totales). Las consultas por audio y foto quedan en Métricas como tales, con el mismo tope
  de 30 por minuto.
- **Con login** (el admin): todo, como hasta ahora.
- **El webhook "Lois Consulta web" ya no pide sesión.** La web manda el token si hay uno, pero n8n
  no lo valida. El registro público sigue cerrado.
- El ingreso sigue siendo el ícono de entrar, sin texto (ADR-010).

## Alternativas descartadas

- **Sesión anónima de Supabase:** obliga a abrir el registro y a blindar perfiles y políticas para
  que nadie que se registre tenga permisos. Más piezas, y no protege la IA: cualquiera que abre la
  web obtiene una sesión.
- **Audio y foto solo con login:** el vendedor no entra, así que se quedaría sin audio ni foto.

## Consecuencias

- Cualquiera que tenga la dirección de la web o del webhook puede mandar audios y fotos: cada uno
  cuesta centavos de OpenAI. Si hace falta, se cierra la web a la red del local (tarea aparte).
- Hay que aplicar la migración 0027 y cambiar el flujo de n8n antes de publicar la web: sin el
  cambio en n8n, el audio y la foto sin login responden "no autorizado".
- En la base los vendedores con usuario conservan sus permisos de antes; ajustarlos sigue siendo
  una tarea aparte.
