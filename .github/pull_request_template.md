## Qué hace esta PR

<!-- Ticket LOIS-## y qué cambia, en dos o tres líneas. -->

## Cómo probarlo

<!-- Comandos exactos y qué tiene que pasar. -->

## Definition of Done

- [ ] Cumple el ticket y nada más.
- [ ] Menos de 400 líneas (sin contar el lockfile ni los tipos generados).
- [ ] Commits atómicos: cada uno compila y pasa los tests.
- [ ] TDD en el dominio: el spec nació primero y en rojo.
- [ ] CI verde.
- [ ] Migración incluida si tocó el esquema, y tipos regenerados (`pnpm db:generate`).
- [ ] No rompe el contrato con n8n (`docs/n8n.md`).
- [ ] Textos revisados contra el glosario (`docs/glosario.md`).
- [ ] Si tocó UI, respeta `DESIGN.md`.
- [ ] ADR incluido si hubo una decisión de arquitectura.
