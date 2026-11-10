# ADR-013: login obligatorio para todos; el vendedor ve lo mismo que antes

- **Estado:** aceptado
- **Fecha:** 2026-10-30
- **Reemplaza a:** [ADR-011](011-mostrador-del-vendedor-sin-login.md)

## Contexto

El [ADR-011](011-mostrador-del-vendedor-sin-login.md) dejó la web abierta: sin login, el vendedor
buscaba por texto, audio y foto y veía el contador de Fotos. El cliente pidió que **todos entren
con login**, cada vendedor con su cuenta (son 15), sin cambiar lo que ve cada uno.

Al revisar la base aparece otra cosa: un usuario con rol `vendedor` puede, por la API, más de lo
que le muestra la web. Viene de la migración 0013, cuando los vendedores usaban todas las
secciones: lee Métricas y la lista de Telegram, sube y asigna fotos y toca `"Imagen"`. Mientras
nadie tenía cuenta de vendedor no importaba. Con 15 cuentas, sí.

## Decisión

- **Toda la web pide login.** Sin sesión, cualquier dirección lleva a la pantalla de ingreso y,
  después de entrar, vuelve a donde iba.
- **La base no responde sin sesión** (migración 0030). `anon` ya no busca, no ve las familias, no
  ve el contador ni registra consultas. `puede_buscar()` pasa a ser lo mismo que
  `tiene_perfil()`.
- **El vendedor puede en la base lo mismo que en la web:** buscar, ver las familias, ver el
  contador de fotos y registrar sus consultas. Métricas, la lista de Telegram, subir y asignar
  fotos, el uso del espacio y `"Imagen"` quedan para el admin.
- Las cuentas las crea el admin en Supabase (_Authentication → Users → Add user_, con _Auto
  Confirm_). El trigger de siempre les da perfil de vendedor. El registro público sigue cerrado.

## Alternativas descartadas

- **Una cuenta compartida:** es más simple, pero no se puede dar de baja a uno solo y Métricas no
  distingue quién buscó.
- **Cerrar solo la web:** cualquiera que tuviera la dirección de la base seguía buscando sin login.
  El login quedaba de fachada.

## Consecuencias

- Hay que crear las 15 cuentas **antes** de publicar la web, y aplicar la migración 0030
  **después**: la web con login anda con la base vieja y con la nueva, al revés no.
- Métricas pasa a mostrar qué vendedor hizo cada consulta.
- Si un vendedor se olvida la contraseña, el mail de recuperación todavía no le llega: el correo
  de prueba de Supabase solo va al equipo de Supabase. Hasta configurar un SMTP propio, la
  resetea el admin.
- El webhook "Lois Consulta web" sigue sin validar la sesión. Ahora siempre llega con token, así
  que se puede volver a validar como en el [ADR-006](006-validacion-sesion-webhook.md). Es un
  cambio en n8n y queda aparte.
