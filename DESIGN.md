# DESIGN.md — Mostrador Lois

Manda en todo lo visual. Si algo no está acá, está **Pendiente**: no se inventa, se propone en una
PR que actualice este archivo.

## Identidad

Sigue la web de la empresa, [loisybogao.com](https://loisybogao.com):

- **Azul marino `#012967`** como color de marca: barra lateral, header del celular, botones
  principales y códigos de artículo.
- **Naranja `#F85000`** como acento, con moderación: el "&" de la marca, el ítem activo de la
  navegación y el foco de los controles.
- **Montserrat** (variable, 400 a 800) para todo el texto. Los títulos van en 700 u 800, como en
  la web.
- Botones y campos casi rectos (radio de 4 px). La excepción es el chat del Mostrador: burbujas,
  chips y caja de texto redondeados, como en Telegram o WhatsApp.
- La marca se escribe "LOIS & BOGAO" en Montserrat 800, con "MOSTRADOR" debajo
  (`shared/ui/wordmark.tsx`).

## Principios

1. **Herramienta de trabajo, no landing.** Densa, rápida y legible con poca luz, en una pantalla
   chica y parado en el mostrador.
2. **El código del artículo es lo más importante.** En cada resultado es lo más grande y lo más
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
| `card` / `card-foreground`               | Burbujas de respuesta del chat y paneles                   |
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
| `marca` / `marca-foreground`             | Barra lateral y header del celular                         |
| `marca-muted`                            | Texto secundario sobre la marca                            |
| `naranja`                                | Acento: ítem activo, el "&" de la marca, foco (`ring`)     |

## Tipografía

- Texto: Montserrat variable, autoalojada con `@fontsource-variable/montserrat` (no depende de
  Google Fonts). Base de 16 px en el celular, para que iOS no haga zoom en la caja del chat.
- Código de artículo: `font-mono`, `text-xl` y `font-semibold` en la fila del resultado,
  `text-3xl` en el detalle.
- Números en tablas y KPIs: `tabular-nums`.

## Layout

- Celular: header fijo arriba y barra inferior de navegación. El detalle se abre como drawer desde
  abajo.
- Desktop (`lg` en adelante): barra lateral. El detalle se abre como panel lateral.
- **El Mostrador es un chat**, como el bot de Telegram que ya usan en el mostrador, y no un
  buscador tipo Google. La caja para escribir queda fija abajo, con los chips de filtro (familia y
  "solo con foto") arriba de ella. Cada consulta se ve como una burbuja propia a la derecha
  (`primary`), y la respuesta como una burbuja a la izquierda (`card`): cuántos encontró, los
  primeros 5 resultados y "Ver los N" para el resto. Lo nuevo aparece abajo y la pantalla lo sigue,
  salvo que hayas subido a leer. La conversación dura lo que la pestaña.
- Margen lateral de 16 px en el celular. Nunca hay scroll horizontal de la página.

## Componentes

- Base: shadcn/ui en `apps/web/src/shared/ui`, generados con el CLI y adaptados a estos tokens
  (sin `text-white` ni otros colores de Tailwind).
- Miniatura: proporción 4:3 y `loading="lazy"`. Si la miniatura de Drive falla, se prueba
  googleusercontent, y si también falla, el placeholder `sin-foto` con el texto "Sin foto".

## Pendiente

- Logo en imagen e ícono de la app (por ahora, la marca va en texto).
