# ADR-008: las fotos de los artículos pasan a Supabase Storage y se deja de usar Drive

- **Estado:** aceptado
- **Fecha:** 2026-10-15
- **Reemplaza a:** [ADR-007](007-fotos-desde-la-web.md)

## Contexto

Las fotos viven en el Drive de Lois. La web las muestra desde Drive (lento y sin control de
tamaño), el bot las baja de Drive para mandarlas y la carga depende de dos flujos de n8n ("Lois
Fotos" y "Lois Subir foto") con una credencial de Google que vence. El dueño decidió que **el Drive
de Lois se deja de usar para todo** y que las fotos se cargan **solo desde la web**. La empresa
usa el plan gratis de Supabase (1 GB de Storage) y no espera pasar de 3000 fotos; el uso se revisa
todos los meses y, si se acerca al límite, se ofrece el plan Pro.

## Decisión

- Bucket público **`fotos`** en Supabase Storage. Cada foto son dos JPEG que achica la web antes
  de subir: `<id del artículo>/<token>.jpg` (lado mayor 800 px) y `<id>/<token>.mini.jpg`
  (miniatura). Un nombre nuevo por foto: así la caché del CDN nunca muestra una foto vieja.
- Columna nueva **`articulos.foto`** con la ruta de la foto dentro del bucket. `"Imagen"` no se
  toca (contrato con n8n) mientras el bot la siga usando.
- Suben los usuarios con perfil, solo JPEG de hasta 1 MB y con rutas de esa forma. Leer es
  público por URL, igual que hoy el "cualquiera con el link" de Drive. Nadie borra desde la web.
- `asignar_foto_subida()` pone la ruta en el artículo solo si el archivo ya está en el bucket y lo deja
  en `fotos_subidas` con la foto anterior, para poder volver atrás.
- Un artículo **tiene foto** si tiene `foto` o un link en `"Imagen"`, mientras dure la transición.

## Orden de la transición (sin cortar el bot)

1. Base: bucket, columna, permisos y `asignar_foto_subida()` (este ADR).
2. Pasar las fotos de Drive a Storage, una sola vez.
3. El bot manda la foto por la URL de Storage (si no hay, la de Drive, hasta que estén todas).
4. La web muestra las fotos de Storage y "Agregar foto" sube directo, sin n8n.
5. Se apagan "Lois Fotos" y "Lois Subir foto" y se borra la credencial de Drive de n8n.

## Alternativas descartadas

- **Seguir en Drive:** depende de una credencial que vence, no hay miniaturas y suma dos flujos.
- **Nombrar la foto por código:** los códigos tienen `/` y espacios, y reemplazar una foto en la
  misma ruta deja la vieja en la caché del CDN.
- **Escribir la URL de Storage en `"Imagen"`:** obliga a cambiar el bot y los datos en el mismo
  momento. Con la columna aparte el bot cambia cuando está listo.

## Consecuencias

- Las fotos cargan más rápido y la web controla su tamaño (unos 120 KB por artículo: 3000 fotos
  son ~360 MB del 1 GB gratis).
- El plan gratis **no tiene backups**. El respaldo de las fotos no puede ir a Drive: queda por
  definir (paso aparte).
- Las fotos reemplazadas quedan en el bucket. Limpiarlas es una tarea aparte si hace falta lugar.
