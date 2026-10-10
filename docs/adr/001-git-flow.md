# ADR-001: Git flow con develop, PRs chicas y squash

- **Estado:** aceptado
- **Fecha:** 2026-10-09

## Contexto

Un solo desarrollador más agentes, con una base compartida con n8n en producción. Hace falta
que cada cambio se pueda revisar rápido y revertir sin arrastrar otros.

## Decisión

`develop` es la rama default y de integración; `main` es producción. Las ramas se llaman
`feat|fix|refactor|docs|chore|ci/LOIS-##-descripcion`. Cada PR tiene menos de 400 líneas, va
contra `develop`, necesita la CI en verde y se mergea **solo con squash**, borrando la rama.
`release/x.y` → `main` con tag y back-merge a `develop`; `hotfix/*` igual. `develop` y `main`
están protegidas: sin push directo, `strict`, con el check `verify` requerido y 0 aprobaciones
mientras haya un solo desarrollador.

## Alternativas descartadas

- Trunk-based sobre `main`: no deja separar lo integrado de lo que está en producción.
- Merge commits: ensucian el historial y complican los reverts.

## Consecuencias

Historial lineal, con un commit por PR. Las PRs que dependen de otras se apilan y se
retargetean a `develop` cuando se mergea la de abajo.
