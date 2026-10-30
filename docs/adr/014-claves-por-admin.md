# ADR-014: el admin les cambia la contraseña a los vendedores, sin mail de recuperación

- **Estado:** aceptado
- **Fecha:** 2026-10-30

## Contexto

Con el login obligatorio ([ADR-013](013-login-obligatorio.md)) hay 15 cuentas de vendedor. El mail
de recuperación de Supabase solo les llega a los miembros del equipo de Supabase: para que le
llegue a un vendedor hace falta un SMTP propio y que cada vendedor tenga una casilla real. El
dueño prefirió no depender de eso: si alguien se olvida la contraseña, que un encargado se la
cambie desde el mostrador.

## Decisión

- **Sección Vendedores, solo admin:** lista los vendedores y les pone una contraseña nueva. El
  vendedor entra con esa y la cambia por una propia con el ícono de la llave.
- **En la base, dos funciones security definer** (migración 0031): `vendedores_web()` y
  `cambiar_clave_vendedor()`. Las dos chequean `es_admin()` y solo tocan cuentas con perfil de
  vendedor: la contraseña de un admin no se cambia desde la web. La nueva se guarda con bcrypt,
  igual que Supabase Auth, y pide al menos 8 caracteres.
- **Se va "Olvidé mi contraseña"** del login. En su lugar: "Pedile a un encargado que te ponga una
  nueva".

## Alternativas descartadas

- **SMTP propio (Gmail o un dominio):** hay que mantener la casilla y los registros DNS, y los
  vendedores necesitan un mail real. Se puede sumar más adelante sin tocar esto.
- **Admin API de Supabase desde una edge function:** pide la `service_role` en el servidor y una
  pieza más para desplegar, para hacer lo mismo que una función de la base.
- **Que el dueño lo haga desde el SQL Editor:** anda, pero todo depende de una sola persona.

## Consecuencias

- Los mails de los vendedores pueden ser nombres de usuario (por ejemplo `juan@loisybogao.com`)
  aunque la casilla no exista: nunca se les manda nada.
- Un admin conoce la contraseña que puso hasta que el vendedor la cambia.
- Las sesiones abiertas del vendedor no se cierran al cambiarle la contraseña.
- Las cuentas se siguen creando en Supabase. Darlas de alta desde la misma sección queda para
  más adelante.
