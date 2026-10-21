# ADR-009: respaldo nocturno de la base y las fotos en Cloudflare R2, fuera de Supabase

- **Estado:** aceptado
- **Fecha:** 2026-10-21

## Contexto

La empresa usa el plan gratis de Supabase, que **no hace copias** de la base, y los respaldos de
Supabase (en cualquier plan) **no incluyen los archivos de Storage**: solo qué foto va con qué
artículo. Drive ya no se usa para nada (ADR-008). Hoy un borrado por error o un problema con la
cuenta no tiene vuelta atrás. Hay poco para guardar: ~32 MB de base y ~20 MB de fotos.

## Decisión

- Un workflow de GitHub Actions (`respaldo.yml`) copia **todas las noches** la base y las fotos
  a un bucket de **Cloudflare R2** a nombre de Lois. El día 1 de cada mes **restaura** el último
  respaldo en una base descartable y compara las filas: si no cuadra, falla y GitHub avisa.
- La base se lee con **`lois_respaldo`**, un usuario que lee todo (también las filas con RLS) y
  no puede escribir nada. Viaja **cifrada con age**: el workflow solo tiene la clave pública
  para respaldar; la privada la guarda el dueño (y un secret, para la prueba mensual).
- Quedan los respaldos de los **últimos 30 días** y el primero de cada mes durante **12 meses**.
  Las fotos se copian una sola vez y nunca se borran de la caja.
- Los scripts (`supabase/respaldo/`) corren en un Alpine con las mismas herramientas en GitHub
  y en la máquina de cada uno, y la CI los ensaya de punta a punta contra el Supabase local.

## Alternativas descartadas

- **Supabase Pro (US$ 25/mes):** guarda 7 días de la base dentro de la misma cuenta y no copia
  las fotos. Se puede sumar más adelante si se quiere restaurar con un clic.
- **Artifacts de GitHub:** el repo va a ser público y duran como mucho 90 días.
- **Drive:** descartado por el dueño (ADR-008).

## Consecuencias

- Costo cero: R2 regala 10 GB y el workflow usa unos minutos por mes de GitHub Actions.
- Si se pierde la clave privada de age, los respaldos de la base no se pueden abrir: el dueño
  la guarda en dos lugares (docs/respaldo.md).
- Restaurar cierra las sesiones abiertas (hay que volver a entrar) y se pierde lo del día.
- Hay que vigilar que el workflow siga corriendo: si GitHub lo apaga o falla, avisa por mail.
