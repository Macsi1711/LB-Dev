# ADR-012: el respaldo nocturno va a Vercel Blob, no a Cloudflare R2

- **Estado:** aceptado
- **Fecha:** 2026-10-23
- **Reemplaza a:** [ADR-009](009-respaldo-fuera-de-supabase.md)

## Contexto

El respaldo de ADR-009 está armado y probado, pero para ponerlo en marcha el dueño tenía que
abrir una cuenta de Cloudflare, crear un bucket y un token de R2, sacar claves S3 de Supabase y
cargar once secrets y variables en GitHub. Lois ya paga **Vercel Pro**, que trae **Vercel Blob**
(almacenamiento de archivos con stores privados), y el dueño pidió que el respaldo sea lo más
simple posible. Guardarlo dentro del mismo Supabase no sirve: si se pierde la cuenta o el
proyecto, se pierde el respaldo con él.

## Decisión

- La caja del respaldo es un **store privado de Vercel Blob** en el equipo de Vercel de Lois,
  sin conectar a ningún proyecto. GitHub Actions entra con su `BLOB_READ_WRITE_TOKEN` por el SDK
  oficial (`@vercel/blob`, versión fija en el lockfile).
- Las fotos se bajan por su **link público** de Supabase Storage y la lista sale de la misma
  foto fija de la base (`storage.objects`): ya no hacen falta claves S3 para respaldar. Solo
  `restaurar.sh` las pide, en una emergencia, para volver a subir fotos a un proyecto nuevo.
- Todo lo demás de ADR-009 sigue igual: GitHub Actions todas las noches, la base cifrada con
  age y leída con `lois_respaldo`, 30 días más un respaldo por mes durante 12 meses, las fotos
  que nunca se borran de la caja y la prueba de restauración el día 1 de cada mes.
- El ensayo local y la CI usan una carpeta como caja, porque Vercel Blob no se puede levantar en
  local. La parte de Vercel la prueba la primera corrida a mano y, después, la prueba mensual.

## Alternativas descartadas

- **Cloudflare R2 (ADR-009):** gratis, pero suma una cuenta y claves que hay que cuidar.
- **Un bucket en el mismo Supabase:** no protege si se pierde la cuenta o el proyecto.
- **Supabase Pro:** guarda 7 días de la base dentro de la misma cuenta y no copia las fotos.

## Consecuencias

- Para ponerlo en marcha alcanza con tres secrets (`RESPALDO_DB_URL`, `BLOB_READ_WRITE_TOKEN` y
  `AGE_IDENTIDAD`) y dos variables (`AGE_DESTINATARIO` y `FOTOS_URL`).
- Son unos 50 MB: el costo en Vercel Pro es mínimo. Listar y subir cuenta como operación de
  Blob; el primer respaldo sube todas las fotos de una vez y después solo las nuevas.
- El respaldo depende de la cuenta de Vercel de Lois: si se deja de pagar Pro o se borra el
  equipo, hay que bajar la caja antes.
- Si se pierde la clave privada de age, los respaldos de la base no se pueden abrir: el dueño
  la guarda en dos lugares (docs/respaldo.md).
