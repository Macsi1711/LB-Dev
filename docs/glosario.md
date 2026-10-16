# Glosario: negocio ↔ código

Un término nuevo entra en la misma PR que lo introduce.

| Negocio (UI)              | Base de datos                                                          | Código (TS)                   |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| Artículo                  | `articulos` / `v_articulos`                                            | `Article`                     |
| Código (del artículo)     | `"Codigo"` / `codigo`                                                  | `code`                        |
| Familia                   | `familias` (`"Código"`, `"Nombre"`), `v_familias`, `"codigo  familia"` | `family`                      |
| Familia de producto       | `familias.es_producto`                                                 | `isProduct`                   |
| Foto                      | `articulos.foto` (bucket `fotos` de Storage)                           | `storagePhoto.full`           |
| Miniatura                 | `<foto>.mini.jpg` en el bucket `fotos`                                 | `storagePhoto.mini`           |
| Agregar foto              | `asignar_foto_subida()`                                                | `savePhoto`                   |
| Observaciones             | `observaciones`                                                        | `notes`                       |
| Perfil                    | `perfiles`                                                             | `Profile`                     |
| Vendedor / Admin          | `perfiles.rol` = `vendedor` / `admin`                                  | `role: 'vendedor' \| 'admin'` |
| Usuario habilitado (bot)  | `usuarios_telegram`                                                    | `TelegramUser`                |
| Consulta al bot           | `consultas_bot`                                                        | `BotQuery`                    |
| Fuente (texto/foto/audio) | `consultas_bot.fuente`                                                 | `source`                      |
| Sin resultados            | `consultas_bot.cantidad = 0`                                           | `noResults`                   |
| Mostrador                 | —                                                                      | feature `counter`             |
