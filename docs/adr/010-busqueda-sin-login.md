# ADR-010: en el Mostrador se busca sin login; el login queda para el admin

- **Estado:** reemplazado por [ADR-011](011-mostrador-del-vendedor-sin-login.md)
- **Fecha:** 2026-10-22

## Contexto

Hoy todo pide login: cada vendedor tiene que entrar para buscar un repuesto. El dueño quiere que
en el mostrador se pueda buscar **sin entrar**, y que el login quede solo para el administrador,
que sigue pudiendo hacer todo (fotos, métricas, audio y foto). El ingreso tiene que estar a mano
pero sin llamar la atención: los clientes no son de tecnología. El catálogo no tiene precios.

## Decisión

- **Sin sesión** se entra directo al Mostrador y se busca **por texto**. La base lo permite solo
  por `buscar_articulos()` y `resumen_busqueda()` (máximo 200 por página) y la lista de familias:
  sin sesión no se leen las tablas ni las funciones internas.
- Las búsquedas sin sesión **quedan en Métricas** como "sin sesión", con un tope de 30 por
  minuto para que nadie llene la tabla a propósito.
- **Audio y foto, Fotos y Métricas** quedan para el **admin**: la IA de n8n cuesta por consulta y
  el webhook sigue pidiendo sesión (ADR-006). Un vendedor que entra ve lo mismo que sin sesión.
- El ingreso es el **ícono de entrar** en el lugar del de salir (abajo del menú en la compu,
  arriba a la derecha en el celular), **sin texto**.

## Alternativas descartadas

- **Abrir las tablas a anon:** cualquiera se lleva el catálogo entero en un pedido.
- **Audio y foto sin sesión:** cualquiera con la dirección gasta la IA.
- **Esconder el ingreso** (una dirección secreta o tocar el logo): el dueño quiere algo simple
  de encontrar. La seguridad la pone el login, no el lugar del botón.

## Consecuencias

- Cualquiera que tenga la dirección puede consultar el catálogo (códigos, nombres y fotos).
- En la base los vendedores conservan sus permisos de antes (cargar fotos, ver métricas) aunque
  la web ya no se los muestre: ajustarlos es una tarea aparte.
- Hay que aplicar las migraciones 0025 y 0026 en producción antes de publicar la web.
