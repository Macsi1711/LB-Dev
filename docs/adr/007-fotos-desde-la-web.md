# ADR-007: subir fotos desde la web a una subcarpeta de Drive, a través de n8n

- **Estado:** reemplazado por [ADR-008](008-fotos-en-storage.md)
- **Fecha:** 2026-10-15

## Contexto

Hasta ahora las fotos se cargaban subiendo un archivo a la carpeta de Drive _Lois base de datos_
con el código como nombre; el flujo "Lois Fotos" la mira cada minuto y escribe el link en
`articulos."Imagen"`. Se pide poder elegir un artículo en la web y sacarle una foto ahí mismo.
El bot de Telegram manda las fotos a partir del link de Drive, así que la foto tiene que quedar
en Drive y el link con el formato del contrato.

## Decisión

- La web manda la foto a un webhook de n8n ("Lois Subir foto"), que valida la sesión igual que el
  de audio y foto ([ADR-006](006-validacion-sesion-webhook.md)), la sube con la cuenta _LoisDrive_
  a la subcarpeta **"Fotos desde la web"** dentro de _Lois base de datos_, la comparte como
  "cualquiera con el link" y devuelve el id del archivo.
- La web asigna la foto con `asignar_imagen_drive()`, que escribe el link con el formato de n8n y
  guarda en `fotos_subidas` quién la subió y cuál era la foto anterior.
- **Subcarpeta aparte:** "Lois Fotos" solo mira la carpeta principal y toma cada palabra del nombre
  del archivo como código posible. Si la web subiera ahí, la foto se procesaría dos veces y podría
  terminar en otro artículo.

## Alternativas descartadas

- **Supabase Storage:** más simple para la web, pero el link no sería de Drive y el bot no podría
  mandar la foto.
- **Subir a la carpeta principal con el código como nombre y dejar que "Lois Fotos" la asigne:**
  tarda hasta un minuto, no avisa si falla y con códigos de varias palabras puede asignar mal.

## Consecuencias

- El contrato con n8n suma un webhook. Si n8n no responde, la web avisa y no cambia nada.
- Si alguien corre _Repasar carpeta (manual)_ en "Lois Fotos", puede volver a poner en un artículo
  la foto vieja de la carpeta principal: ese repaso no ve la subcarpeta.
- Para volver atrás una foto, `fotos_subidas.imagen_anterior` tiene el link de antes.
