# ADR-006: el webhook de audio y foto valida la sesión con /auth/v1/user

- **Estado:** aceptado
- **Fecha:** 2026-10-14

## Contexto

El [ADR-005](005-audio-y-foto-por-n8n.md) dice que el webhook "Lois Consulta web" valida la sesión
llamando a `rpc/tiene_perfil` con el token del usuario. Esa función devuelve un booleano suelto, y
el nodo HTTP de n8n no lo deja fácil de chequear de forma confiable.

## Decisión

El webhook valida con `GET /auth/v1/user` de Supabase, con la clave publishable y el token del
usuario. Si la respuesta trae el `id`, es un usuario logueado; si no, responde 401. Esto precisa el
ADR-005 en ese punto; el resto sigue igual.

## Alternativas descartadas

- **`rpc/tiene_perfil`:** además del token, chequea el perfil, pero su respuesta (`true` suelto)
  es frágil de evaluar en n8n.

## Consecuencias

Hoy da lo mismo: el registro público está apagado y todo usuario de Auth tiene perfil (lo crea un
trigger). **Si algún día se abre el registro, hay que volver a chequear el perfil** en el webhook.
