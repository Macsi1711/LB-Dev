# Glosario: negocio ↔ código

Un término nuevo entra en la misma PR que lo introduce.

| Negocio (UI)              | Base de datos                         | Código (TS)                   |
| ------------------------- | ------------------------------------- | ----------------------------- |
| Artículo                  | `articulos` / `v_articulos`           | `Article`                     |
| Código (del artículo)     | `"Codigo"` / `codigo`                 | `code`                        |
| Familia                   | `familias`, `"codigo  familia"`       | `family`                      |
| Familia de producto       | `familias.es_producto`                | `isProduct`                   |
| Foto                      | `"Imagen"` / `imagen_url`             | `photoUrl`                    |
| ID de Drive               | `imagen_drive_id`, `drive_id`         | `driveId`                     |
| Miniatura                 | —                                     | `thumbnail`                   |
| Observaciones             | `observaciones`                       | `notes`                       |
| Foto que no matcheó       | `fotos_sin_match`                     | `UnmatchedPhoto`              |
| Candidatos (de n8n)       | `fotos_sin_match.candidatos`          | `candidates`                  |
| Asignar foto              | `asignar_foto()`                      | `assignPhoto`                 |
| Descartar foto            | `fotos_sin_match.resuelto = true`     | `dismissPhoto`                |
| Perfil                    | `perfiles`                            | `Profile`                     |
| Vendedor / Admin          | `perfiles.rol` = `vendedor` / `admin` | `role: 'vendedor' \| 'admin'` |
| Usuario habilitado (bot)  | `usuarios_telegram`                   | `TelegramUser`                |
| Consulta al bot           | `consultas_bot`                       | `BotQuery`                    |
| Fuente (texto/foto/audio) | `consultas_bot.fuente`                | `source`                      |
| Sin resultados            | `consultas_bot.cantidad = 0`          | `noResults`                   |
| Mostrador                 | —                                     | feature `counter`             |
