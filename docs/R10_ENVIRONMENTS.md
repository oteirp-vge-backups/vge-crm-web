# R10 — separación de entornos

Fecha de revisión: 26 de agosto de 2026.

## Estado real

| Capa | Producción | Trabajo R10 | STAGING objetivo |
|---|---|---|---|
| Git | `main`, intacta en `ccdd2909e646381a9326d600651b8aa912f4b731` | `r10/phase10-real-user-stabilization`, apilada sobre Fase 9 | PR borrador, sin fusión |
| Supabase | `sjraugywirjohrqmacvb`, 42 migraciones y dos Edge Functions desplegadas | sólo lectura remota | `etclakslqsoylyymjljz`, sin datos de producción |
| Web | publicación actual desde `main` | sin despliegue | paquete candidato servido únicamente en el arnés aislado |

Aunque el nombre visible actual del proyecto Supabase contiene `STAGING`, la aplicación publicada lo utiliza. Por tanto, R10 lo clasifica como **PRODUCCIÓN** hasta que la aplicación apunte a un entorno distinto.

La Fase 10 utiliza una rama Supabase temporal a 0,01344 USD/h para la UAT de cuatro usuarios. Debe eliminarse al terminar o, como máximo, el 1 de septiembre de 2026.

## Flujo obligatorio

1. Todo cambio nace en una rama distinta de `main`.
2. Las pruebas unitarias y de estructura se ejecutan en GitHub sin credenciales de producción.
3. Las migraciones se prueban en local o en STAGING.
4. Producción no recibe `db push`, cambios manuales del Dashboard ni fusiones durante la auditoría.
5. La promoción a `main` requiere evidencia de pruebas y una decisión explícita de despliegue.

## Decisión económica

La tarifa de la rama temporal fue consultada y confirmada antes de crearla. No se ha convertido en rama persistente ni contiene datos de producción.

Referencias oficiales:

- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/deployment/managing-environments
