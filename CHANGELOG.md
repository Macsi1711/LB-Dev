# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado
semántico.

## [0.10.1] - 2026-10-22

### Arreglado

- **"Onix" por audio:** la IA lo transcribe como "onyx", que no está en el catálogo, y la búsqueda
  traía cientos de pastillas parecidas. Ahora la web corrige esa palabra antes de buscar; la
  burbuja sigue mostrando lo que se escuchó. La lista de correcciones (`MISHEARD`) se puede
  ampliar con otras palabras que se escuchen mal.

## [0.10.0] - 2026-10-22

### Agregado

- **Respaldo nocturno fuera de Supabase (ADR-009):** todas las noches GitHub Actions copia la
  base (cifrada con age) y las fotos a Cloudflare R2. Quedan 30 días y un respaldo por mes
  durante un año, y el día 1 de cada mes se prueba que se puede restaurar. La base se lee con
  `lois_respaldo`, un usuario que no puede escribir nada (migración
  `20261021000024_rol_respaldo.sql`). La CI ensaya el respaldo y la restauración en cada PR. Cómo
  ponerlo en marcha y qué hacer en una emergencia: `docs/respaldo.md`.

### Cambiado

- **El Mostrador se usa sin login (ADR-011):** la web es interna y los vendedores la usan sin
  entrar. Abre directo en el Mostrador, donde se busca **por texto, audio y foto**, y en **Fotos**
  se ve cuántos artículos tienen foto. El ingreso es el ícono de entrar, sin texto, donde antes
  estaba el de salir (abajo del menú en la compu, arriba a la derecha en el celular); el login
  tiene "Volver al Mostrador". **Con login, el admin tiene todo:** cargar fotos, la lista de las
  que faltan y Métricas. Las búsquedas sin sesión quedan en Métricas como "sin sesión" (como
  mucho 30 por minuto). En la base, sin sesión se busca solo por las funciones de búsqueda y se
  lee el contador (migraciones `20261022000025_busqueda_publica.sql`,
  `20261022000026_consultas_sin_sesion.sql` y `20261022000027_medios_sin_sesion.sql`). El webhook
  de audio y foto de n8n ya no pide sesión.

## [0.9.0] - 2026-10-21

### Arreglado

- **Códigos con o sin espacios, guiones o barras:** `PH4386` encuentra el artículo que en el
  catálogo dice `PH 4386`, `ADB2533` encuentra `ADB-2533`, `PD363` encuentra `PD/363` y `36.060`
  encuentra `36060`. El artículo cuyo código es el buscado va primero. Los números sueltos no se
  juntan (`1234` no encuentra "1/2 34"). Usa un índice nuevo, así que la búsqueda sigue rápida
  (migración `20261021000023_codigos_sin_separadores.sql`). El modo demo busca igual.

## [0.8.1] - 2026-10-20

### Arreglado

- **Foto con un código que no está en el catálogo:** si el código leído es de otra marca (por
  ejemplo FRAM `CH10246`, cargado en Lois como `HU612`), la web ya no se queda en "no hay nada":
  busca qué pieza se ve ("filtro aceite cartucho") y avisa que no encontró el código. La consigna
  de "Leer foto" en n8n devuelve también la pieza (`pieza`).

### Quitado

- **Lo que quedaba de Drive en la base (ADR-008):** se borran la tabla `fotos_sin_match`, las
  funciones `asignar_foto()`, `sugerir_codigos()` y `asignar_imagen_drive()`, y el permiso de
  `n8n_app` para escribir `"Imagen"` (migración `20261019000022_limpieza_drive.sql`). Ni la web ni
  el bot las usaban y "Lois Fotos" ya está apagado en n8n.

## [0.8.0] - 2026-10-20

### Arreglado

- **La búsqueda por foto encuentra la pieza exacta:** si en la foto se lee un código (por ejemplo
  `SYL2095` grabado en una pastilla), la web busca solo ese código, aunque la IA lo haya dejado en
  lo que leyó o lo haya mezclado con palabras. Antes buscaba "pastilla freno" y salían las 269
  pastillas. Si la foto no tiene ningún código, busca igual y avisa cómo sacarla para encontrar la
  pieza exacta. La consigna de "Leer foto" en n8n pide también los códigos grabados en la pieza.

### Agregado

- **Aviso de espacio para fotos:** la pantalla Fotos muestra cuánto del 1 GB gratis de Supabase
  Storage se usa y cuántas fotos más entran. Avisa en amarillo desde el 70 % y en rojo desde el
  85 % (`uso_fotos()`, migración `20261019000021_uso_fotos.sql`).

## [0.7.0] - 2026-10-16

### Cambiado

- **Las fotos son solo de Supabase Storage y Drive ya no se usa (ADR-008, pasos 4 y 5):**
  - La web muestra las fotos desde Storage: las tarjetas usan la miniatura y el detalle la foto
    grande. Un artículo sin foto en Storage muestra "Sin foto". El botón del detalle pasa a
    llamarse "Abrir foto".
  - **"Agregar foto" sube directo a Storage:** la web achica la foto (800 px y una miniatura de
    320 px), la sube al bucket `fotos` y la asigna con `asignar_foto_subida()`, sin n8n ni Drive.
    La pestaña aparece siempre y la ayuda ya no manda a la carpeta de Drive.
  - Se van la pestaña "Fotos que no matchearon" (la llenaba "Lois Fotos" desde la carpeta de
    Drive), `VITE_N8N_FOTOS_URL` y el código que subía por n8n.
  - **"Tiene foto" = foto en Storage:** un link de Drive solo ya no cuenta, así la cobertura, "Sin
    foto" y "Solo con foto" coinciden con lo que se ve (migración
    `20261016000020_tiene_foto_storage.sql`, ya aplicada).
  - El bot de Telegram manda las fotos desde Storage, sin Drive (`n8n/lois-sql.json`). El contrato
    con n8n (`docs/n8n.md`) y `CLAUDE.md` lo dicen; "Lois Fotos" y "Lois Subir foto" quedan
    retirados.

### Arreglado

- **Textos largos dentro de los cuadros:** un código, nombre o familia muy largos (sobre todo sin
  espacios) estiraban las tarjetas de la respuesta y el detalle hasta salirse de la pantalla. Ahora
  se cortan dentro del cuadro: el código y la familia con "…" y el nombre en dos líneas.

## [0.6.0] - 2026-10-16

### Arreglado

- **Búsqueda mucho más rápida para los vendedores:** con los permisos por fila, Postgres no podía
  usar el índice y recorría todos los artículos en cada búsqueda (0,5–2 s con 1 CPU). Ahora
  `filtrar_articulos()` y `puntuar_parecidos()` corren como dueño y chequean el perfil a mano: de
  ~550 ms a ~20 ms la exacta y de ~1,3 s a ~1 ms sin resultados (migración
  `20261016000018_busqueda_usa_indice.sql`, ya aplicada). Lo encontró la prueba de carga local.
- **Cada consulta busca una sola vez:** `buscar_articulos()` trae directo la página de exactos
  (antes armaba la lista entera para saber si había) y `registrar_consulta()` usa la cantidad que
  la web ya mostró (antes volvía a buscar para contar). Con 20 vendedores simulados y 1 CPU, los
  errores bajan del 6,5 % al 0,1 % (migración `20261016000019_busqueda_una_vez.sql`, ya aplicada).

### Agregado

- **Fotos en Supabase Storage, primer paso (ADR-008):** bucket público `fotos`, columna
  `articulos.foto` y `asignar_foto_subida()` para asignar una foto ya subida. Un artículo tiene
  foto si está en Storage o tiene link de Drive. `"Imagen"` y el bot no cambian todavía
  (migración `20261015000017_fotos_storage.sql`, ya aplicada).
- **Fotos de Drive a Storage:** `apps/web/scripts/migrar-fotos-drive.mjs` las pasa una sola vez,
  en memoria y con la sesión de un usuario de la web (`docs/produccion.md`, sección 7). Ya se
  corrió: 442 de 443 fotos están en Storage.

## [0.5.0] - 2026-10-15

### Agregado

- **Agregar foto desde la web:** Fotos → _Agregar foto_ para buscar un artículo, sacarle o elegir
  una foto y guardarla. n8n la sube a Drive (subcarpeta _Fotos desde la web_, flujo "Lois Subir
  foto") y la web la asigna con el link del formato de siempre, así el bot también la manda. Si el
  artículo ya tenía foto, pide confirmar el reemplazo. En "Sin foto", cada artículo tiene un botón
  _Agregar foto_. Queda un historial (`fotos_subidas`) con quién subió cada foto y cuál había
  antes (ADR-007, migración `20261015000016_fotos_web.sql`, ya aplicada).
- **Flujos de n8n en el repo:** `n8n/lois-consulta-web.json` y `n8n/lois-subir-foto.json`, con su
  documentación en `docs/n8n.md` (ADR-006: cómo validan la sesión).

## [0.4.1] - 2026-10-14

### Cambiado

- **La sección Bot pasa a llamarse Métricas** (`/metricas`, con ícono de gráfico): muestra las
  consultas de la web y de Telegram. Los links viejos a `/bot` siguen andando. La pestaña
  "Usuarios" pasa a "Usuarios de Telegram".

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
