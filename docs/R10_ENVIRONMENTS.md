# R10 — separación de entornos

Fecha de revisión: 26 de agosto de 2026.

## Estado real

| Capa | Producción | Candidato R10 consolidado | STAGING |
|---|---|---|---|
| Git | `main`, intacta en `ccdd2909e646381a9326d600651b8aa912f4b731` | `r10/consolidated-release`, derivada exactamente del cierre de Fase 10 | no existe ninguna rama temporal |
| Supabase | `sjraugywirjohrqmacvb`, 42 migraciones y dos Edge Functions desplegadas | sólo lectura remota hasta autorización | la rama `etclakslqsoylyymjljz` fue eliminada tras la UAT |
| Web | publicación actual desde `main` | artefacto R10 sellado, probado y aún no publicado | no hay frontend temporal activo |

Aunque el nombre visible actual del proyecto Supabase contiene `STAGING`, la aplicación publicada lo utiliza. Por tanto, R10 lo clasifica como **PRODUCCIÓN** hasta que la aplicación apunte a un entorno distinto.

La rama Supabase temporal de Fase 10 se eliminó al terminar la UAT. Existió aproximadamente 1 hora y 9 minutos, no recibió datos de producción y tuvo un coste estimado de 0,0155 USD.

## Flujo obligatorio

1. Todo cambio nace en una rama distinta de `main`.
2. Las pruebas unitarias y de estructura se ejecutan en GitHub sin credenciales de producción.
3. Las migraciones se prueban en local o en STAGING.
4. Producción no recibe `db push`, cambios manuales del Dashboard ni fusiones durante la auditoría.
5. La promoción a `main` requiere evidencia de pruebas y una autorización explícita de despliegue.
6. Se publicará exactamente el artefacto consolidado cuyo hash haya superado la barrera final.
7. Si falla la comprobación posterior, se ejecutará el retorno sellado a la versión estable anterior.

## Decisión económica

No queda ninguna rama Supabase facturable. Una futura rama STAGING requerirá una nueva confirmación de coste antes de crearla.

Referencias oficiales:

- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/deployment/managing-environments
