# ADR-005: consultas con audio y foto en el Mostrador, a través de n8n

- **Estado:** aceptado
- **Fecha:** 2026-10-13

## Contexto

En Telegram los vendedores consultan con texto, con audio y con fotos de etiquetas o cajas, y el
bot (n8n) ya convierte el audio y la foto en una consulta. La web solo aceptaba texto. El
[ADR-004](004-supabase-sin-api.md) dice que la web no tiene API propia.

## Decisión

- La web graba el audio o saca la foto y la manda a un **webhook de n8n** ("Lois Consulta web")
  que reusa la transcripción y la lectura de imágenes del bot. El webhook devuelve **solo el
  texto a buscar**; la búsqueda la sigue haciendo la web con `buscar_articulos` y RLS, igual que
  un mensaje escrito.
- El webhook valida la sesión: recibe el token de Supabase del usuario y llama a
  `rpc/tiene_perfil` con ese token. Sin perfil, responde 401.
- La URL va en `VITE_N8N_CONSULTA_URL`. No es secreta (la protege la sesión). Si falta, los
  botones de audio y foto no aparecen y el chat sigue andando con texto.
- El contrato del webhook está en [n8n.md](../n8n.md).

## Alternativas descartadas

- **Edge Function con una IA propia:** suma una clave de API y un costo por consulta, y duplica
  lo que ya hace el bot con resultados que pueden no coincidir.
- **Todo en el navegador** (reconocimiento de voz y OCR): Firefox no tiene reconocimiento de
  voz y el OCR falla con fotos movidas o con poca luz.
- **Que n8n devuelva los artículos:** saltearía RLS y la búsqueda de la web, y habría dos
  formatos de resultado.

## Consecuencias

- El contrato con n8n suma un webhook. Si n8n no responde, el audio y la foto fallan con un
  aviso, pero el texto sigue andando.
- El audio y la foto viajan a n8n y al proveedor de IA que usa el bot. La web no los guarda.
- Límites: audio de hasta 60 segundos; la foto se achica a 1600 px en JPEG antes de mandarla.
- El modo demo simula el webhook con respuestas de ejemplo.
