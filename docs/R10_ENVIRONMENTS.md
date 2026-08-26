# R10 — separación de entornos

Fecha de revisión: 26 de agosto de 2026.

## Estado real

| Capa | Producción | Trabajo R10 | STAGING objetivo |
|---|---|---|---|
| Git | `main`, intacta en `ccdd2909e646381a9326d600651b8aa912f4b731` | `r10/phase9-cicd-rollback`, apilada sobre Fase 8 | artefacto efímero de CI, sin fusión |
| Supabase | `sjraugywirjohrqmacvb`, 42 migraciones y dos Edge Functions desplegadas | sólo lectura remota | Supabase local efímero en GitHub Actions |
| Web | publicación actual desde `main` | sin despliegue | paquete sellado servido dentro del runner y sin acceso a producción |

Aunque el nombre visible actual del proyecto Supabase contiene `STAGING`, la aplicación publicada lo utiliza. Por tanto, R10 lo clasifica como **PRODUCCIÓN** hasta que la aplicación apunte a un entorno distinto.

Supabase remoto conserva únicamente su rama `main`. La Fase 9 no necesita crear una rama de pago: utiliza la pila local efímera de la CLI y elimina sus contenedores al terminar.

## Flujo obligatorio

1. Todo cambio nace en una rama distinta de `main`.
2. Las pruebas unitarias y de estructura se ejecutan en GitHub sin credenciales de producción.
3. Las migraciones se prueban en local o en STAGING.
4. Producción no recibe `db push`, cambios manuales del Dashboard ni fusiones durante la auditoría.
5. La promoción a `main` requiere evidencia de pruebas y una decisión explícita de despliegue.

## Decisión económica

R10 mantiene coste adicional cero en Fase 9. No se crea una rama Supabase remota. Si una fase futura necesitara STAGING persistente, se confirmarán previamente organización, coste y recurrencia.

Referencias oficiales:

- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/deployment/managing-environments
