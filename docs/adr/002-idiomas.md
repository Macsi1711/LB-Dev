# ADR-002: Código en inglés, todo lo demás en español rioplatense

- **Estado:** aceptado
- **Fecha:** 2026-10-09

## Contexto

El negocio habla en español y el ecosistema técnico, en inglés. Además, la base ya tiene
nombres en español con espacios y tildes (`"Nombre artículo"`, `"codigo  familia"`) que usan
los flujos de n8n.

## Decisión

Identificadores, nombres de archivo y tipos de TypeScript van en inglés. La UI, los docs, los
comentarios, los commits y las PRs van en español rioplatense, con voseo. **Excepción:** los
objetos de la base (tablas, columnas, vistas y RPC) van en español, porque los fija el contrato
con n8n y el pedido original. `docs/glosario.md` es el puente entre los dos idiomas.

## Alternativas descartadas

- Todo en español: choca con librerías, convenciones y tipos generados.
- Renombrar la base al inglés: rompe los flujos de n8n en producción.

## Consecuencias

Cada término nuevo entra al glosario en la misma PR. La capa `data` traduce de los nombres de
la base a los del dominio.
