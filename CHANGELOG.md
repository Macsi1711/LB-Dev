# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado
semántico.

## [0.4.0] - 2026-10-14

### Agregado

- **Métricas de la web:** cada mensaje del chat del Mostrador se guarda en las métricas con quién
  lo hizo, el texto, los filtros (familia, solo con foto), si vino de un audio o una foto y lo
  que se entendió, cuántos resultados hubo y si fue "lo más parecido". Los audios y fotos que no
  se entendieron también, con el error. La web pasa a ser el canal principal y Telegram queda de
  respaldo.
- **Sección Bot:** cada consulta muestra el canal (web o Telegram), lo escuchado, los filtros y la
  etiqueta "Lo más parecido", con un filtro nuevo por canal.

### Cambiado

- **Usuarios activos** cuenta a quienes consultaron en los últimos 7 días, por la web o por
  Telegram (antes eran los usuarios habilitados del bot).
- Migración `20261014000015_consultas_web.sql`, ya aplicada en la base de la empresa. La `0011`
  ahora borra y crea la vista de consultas, para que todas las migraciones se puedan volver a
  correr.

## [0.3.1] - 2026-10-14

### Cambiado

- **Búsqueda en lenguaje natural:** "pastilla de freno para onix" o "¿tenés pastillas de
  freno?" encuentran lo que corresponde. La búsqueda ignora signos y palabras de relleno ("de",
  "para", "tenés"…), pasa a singular y entiende las abreviaturas del catálogo (trasera → TRAS.,
  delantera → DEL., izquierda → IZQ.). Nunca deja afuera un artículo que antes aparecía.
- **Lo más parecido:** si no hay nada con todas las palabras, el chat muestra los artículos que
  más se acercan (con tolerancia a errores de tipeo) y lo avisa: "No encontré «…» tal cual. Esto
  es lo más parecido". Migración `20261014000014_busqueda_natural.sql`, ya aplicada en la base de
  la empresa.

## [0.3.0] - 2026-10-13

### Agregado

- **Mostrador con audio y foto**, como en el bot de Telegram. Con la caja vacía, el botón de
  enviar pasa a ser el micrófono (hasta 1 minuto, con Cancelar); a la izquierda, la cámara saca
  o elige la foto de una etiqueta, que se achica a 1600 px antes de mandarla. La web se la manda
  al webhook "Lois Consulta web" de n8n, que devuelve el texto a buscar, y la búsqueda sigue en
  la web, con RLS (ADR-005). La burbuja muestra lo que se escuchó o se leyó, y los errores
  (sin permiso, no se entendió, sesión vencida) salen como aviso en el chat. Los botones
  aparecen solo con `VITE_N8N_CONSULTA_URL` configurada; en el modo demo, siempre.
- **Producción:** archivos para el SQL Editor de Supabase: respaldo de `articulos` y `familias`,
  las 13 migraciones en un solo archivo, verificación con 16 chequeos y deshacer. También un
  asistente que arma la conexión sin pegar la contraseña en el link.

### Cambiado

- **Familias:** las migraciones usan la tabla `familias` que ya existe en producción
  (`"Código"`, `"Nombre"`) sin renombrarla y solo le suman `es_producto`. La web la lee por la
  vista `v_familias`.
- **"Solo con foto"** usa el ícono de imagen, para no confundirse con la cámara.
- **Roadmap** actualizado con el estado de la base de la empresa.

## [0.2.0] - 2026-10-13

### Cambiado

- **Permisos:** los vendedores ven y usan todas las secciones (Mostrador, Fotos y Bot). Lo único
  que queda solo para el admin es agregar, cambiar o sacar usuarios del bot. La migración
  `20261009000013_vendedor_ve_todo.sql` ajusta RLS y no toca el contrato con n8n.

### Arreglado

- **Bot → Usuarios:** "Borrar" pide confirmación con un diálogo propio. Antes usaba la del
  navegador, que algunos visores bloquean, y el botón no hacía nada.

### Agregado

- **Producción:** guía paso a paso (`docs/produccion.md`) y scripts para inspeccionar la base de
  la empresa en solo lectura, simular las migraciones y aplicarlas con respaldo previo.
- **Deploy:** proyecto `mostrador-lois` en Vercel conectado al repo, `.vercelignore` y la guía para
  crearlo desde la terminal.
- **Roadmap:** fases y estado de cada entregable hasta la 1.0.

## [0.1.0] - 2026-10-10

Primera versión de Mostrador Lois.

### Agregado

- **Mostrador como chat**, al estilo del bot de Telegram: cada consulta (código, pieza o modelo;
  todas las palabras, sin tildes) se manda como un mensaje y la respuesta dice cuántos artículos
  encontró, con los primeros resultados y "Ver los N". Filtros de familia y "Solo con foto" como
  chips, conversación que sobrevive a recargar, última consulta compartible por URL, foto de
  Drive y código para copiar, y detalle del artículo con las observaciones destacadas.
- **Fotos (admin):** cobertura de fotos por familia, lista de artículos sin foto con exportación
  a CSV, y asignación o descarte de las fotos de Drive que no matchearon, con sugerencias que
  comparan por código y por nombre.
- **Bot de Telegram (admin):** usuarios habilitados, consultas recientes con el SQL generado,
  ranking de lo que se busca y no se encuentra, y mini-KPIs.
- **Acceso:** login, recuperación de contraseña, roles vendedor y admin, modo claro y oscuro.
- **Identidad de Lois & Bogao:** azul marino, naranja y Montserrat, como en loisybogao.com.
- **Modo demo** (`VITE_DEMO=1`): la web completa con datos e ilustraciones de ejemplo, sin
  Supabase.
- **Base de datos:** migraciones aditivas sobre `articulos`, tablas nuevas, RPC de búsqueda y
  stats, RLS por rol y roles `n8n_bot` (solo lectura) y `n8n_app` para los flujos de n8n.
- **Calidad:** CI con lint, tipos, tests, cobertura del dominio y tests de integración del
  contrato con n8n.
- **Deploy:** configuración de Vercel y guía de puesta en producción.

[0.2.0]: https://github.com/Macsi1711/LB-Dev/releases/tag/v0.2.0
[0.1.0]: https://github.com/Macsi1711/LB-Dev/releases/tag/v0.1.0
