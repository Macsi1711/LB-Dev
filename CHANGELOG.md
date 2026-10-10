# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado
semántico.

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

[0.1.0]: https://github.com/Macsi1711/LB-Dev/releases/tag/v0.1.0
