-- Drive retirado (ADR-008): se borra lo que quedaba de cuando las fotos venían de Drive.
-- Correrla recién con "Lois Fotos" desactivado en n8n: era el único que usaba esto.
-- "Imagen" queda en `articulos` (contrato con n8n, ADR-002) aunque ya nadie la escriba.

-- Asignación manual de fotos que no matchearon y sus sugerencias (pantalla Fotos vieja).
drop function if exists public.asignar_foto(bigint, bigint);
drop function if exists public.sugerir_codigos(text[], int);
-- "Agregar foto" cuando subía por n8n a Drive (ADR-007, reemplazado por asignar_foto_subida).
drop function if exists public.asignar_imagen_drive(bigint, text);
-- Las fotos de la carpeta de Drive que "Lois Fotos" no pudo asignar. Sus políticas se van con ella.
drop table if exists public.fotos_sin_match;

-- n8n_app escribía "Imagen" para "Lois Fotos"; ningún flujo activo la escribe.
drop policy if exists n8n_app_escribe_foto on public.articulos;
revoke update ("Imagen") on public.articulos from n8n_app;
