# DESIGN.md — Mostrador Lois

Manda en todo lo visual. Si algo no está acá, está **Pendiente**: no se inventa, se propone en una
PR que actualice este archivo.

## Principios

1. **Herramienta de trabajo, no landing.** Densa, rápida y legible con poca luz, en una pantalla
   chica y parado en el mostrador.
2. **El código del artículo es lo más importante.** En cada tarjeta es lo más grande y lo más
   contrastado, en monoespaciada y con un botón para copiarlo.
3. **Mobile-first.** Se diseña para 360 px de ancho y después se agranda. Los objetivos táctiles
   tienen 44 px como mínimo.
4. **Claro y oscuro** con el mismo peso. El tema sigue al sistema, salvo que el usuario elija otro.

## Tokens de color

Los valores viven en `apps/web/src/styles/tokens.css` y es el único archivo del repo con valores de
color. En el código se usan como clases de Tailwind (`bg-background`, `text-codigo`, `border-border`…).
**Ningún hex ni color suelto fuera de ese archivo.**

| Token                                    | Uso                                                        |
| ---------------------------------------- | ---------------------------------------------------------- |
| `background` / `foreground`              | Fondo de la app y texto principal                          |
| `card` / `card-foreground`               | Tarjetas de artículo y paneles                             |
| `popover` / `popover-foreground`         | Menús desplegables, combobox y avisos (toasts)             |
| `accent` / `accent-foreground`           | Hover y selección dentro de menús y listas                 |
| `muted` / `muted-foreground`             | Superficies secundarias y texto de apoyo (familia, fechas) |
| `border`, `input`, `ring`                | Bordes, campos y foco visible                              |
| `primary` / `primary-foreground`         | Acción principal (ámbar: se ve bien con poca luz)          |
| `secondary` / `secondary-foreground`     | Acciones secundarias y badges de familia                   |
| `destructive` / `destructive-foreground` | Descartar, errores                                         |
| `aviso` / `aviso-foreground`             | Observaciones del artículo (ícono de alerta y caja)        |
| `exito`                                  | Confirmaciones (código copiado, foto asignada)             |
| `codigo`                                 | Texto del código de artículo: contraste máximo             |
| `sin-foto`                               | Placeholder gris de "Sin foto"                             |

## Tipografía

- Texto: la fuente del sistema (`system-ui`). Base de 16 px en el celular, para que iOS no haga
  zoom en el buscador.
- Código de artículo: `font-mono`, `text-xl` y `font-semibold` en la tarjeta, `text-3xl` en el
  detalle.
- Números en tablas y KPIs: `tabular-nums`.

## Layout

- Celular: barra inferior de navegación y grilla de 1 columna. El detalle se abre como drawer
  desde abajo.
- Desktop (`lg` en adelante): barra lateral y grilla de 3 o 4 columnas. El detalle se abre como
  panel lateral.
- Margen lateral de 16 px en el celular. Nunca hay scroll horizontal de la página.

## Componentes

- Base: shadcn/ui en `apps/web/src/shared/ui`, generados con el CLI y adaptados a estos tokens
  (sin `text-white` ni otros colores de Tailwind).
- Miniatura: proporción 4:3 y `loading="lazy"`. Si la miniatura de Drive falla, se prueba
  googleusercontent, y si también falla, el placeholder `sin-foto` con el texto "Sin foto".

## Pendiente

- Logo e ícono de la app.
- Tipografía propia (por ahora, la del sistema).
