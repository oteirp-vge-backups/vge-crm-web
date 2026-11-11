# R10 — separación de entornos

Fecha de revisión: 20 de septiembre de 2026.

> **Actualización operativa — 11 de noviembre de 2026:** la tabla inferior conserva el estado histórico del 20/09/2026; **no es un inventario actualizado**.
> Actualmente la web publicada es `r10-phase10.0.5` (último despliegue GitHub Pages del commit `b311212729d19ff84a001eea2228cd274f217377`, 23/10/2026).
> El backend operativo de **producción** es `sjraugywirjohrqmacvb` (51 migraciones, 3 Edge Functions, 21 tablas públicas con RLS), aunque en Supabase sigue mostrando el nombre heredado **`VGE CRM STAGING`**. **No debe tratarse como entorno de ensayo.**
> No hay una rama de STAGING permanente independiente. El proyecto aislado de restauración `wmxvvjeyfkzingjogaln` estaba `INACTIVE` el 11/11/2026 y no corresponde a producción. Las pruebas habituales deben ser locales o aisladas, con autorización para cualquier entorno remoto nuevo.
> Fuente vigente: [`R10_SOURCE_OF_TRUTH.md`](R10_SOURCE_OF_TRUTH.md). No se ha renombrado, movido ni reconfigurado ningún proyecto.

## Fotografía histórica del 20 de septiembre de 2026

| Capa | Producción | Preparación de cierre | STAGING |
|---|---|---|---|
| Git | `main`, aplicación funcional en `d241df59be6f5ae3177babdc7afd22ea4ee2e84d` | rama documental `docs/r10-closeout-preparation` | no existe rama temporal de aplicación |
| Supabase | `sjraugywirjohrqmacvb`, 49 migraciones y tres Edge Functions activas | sólo lectura durante el cierre | no existe rama Supabase temporal |
| Web | `r10-phase10.0.4` publicada desde `main` | sin candidato funcional nuevo | no hay frontend temporal activo |

Aunque el nombre visible actual del proyecto Supabase contiene `STAGING`, la aplicación publicada lo utiliza. Por tanto, R10 lo clasifica como **PRODUCCIÓN** hasta que la aplicación apunte a un entorno distinto.

La rama Supabase temporal de Fase 10 se eliminó al terminar la UAT. Existió aproximadamente 1 hora y 9 minutos, no recibió datos de producción y tuvo un coste estimado de 0,0155 USD. No se ha creado ninguna rama facturable para el cierre.

## Flujo obligatorio

1. Todo cambio nace en una rama distinta de `main`.
2. Las pruebas unitarias y de estructura se ejecutan en GitHub sin credenciales de producción.
3. Las migraciones se prueban en local o en STAGING.
4. Producción no recibe `db push`, cambios manuales del Dashboard ni fusiones durante una auditoría o estabilización sin autorización.
5. La promoción a `main` requiere evidencia de pruebas y una autorización explícita de despliegue.
6. Se publicará exactamente el artefacto cuyo hash haya superado la barrera final.
7. Si falla la comprobación posterior, se ejecutará el retorno sellado a la versión estable anterior.

## Decisión económica

No queda ninguna rama Supabase facturable. Una futura rama STAGING requerirá una nueva confirmación de coste antes de crearla.

## Estado de estabilización

El cierre se prepara sin cambios funcionales. La decisión final permanece fijada para el 22 de septiembre de 2026 y exige cumplir `R10_CLOSEOUT_GATE.md`.

Referencias oficiales:

- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/deployment/managing-environments
