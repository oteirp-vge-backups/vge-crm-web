# vge-crm-web

CRM web de Viajes de Grupos Escolares.

## Estado operativo (verificado el 11 de noviembre de 2026)

- Versión de la web publicada: `r10-phase10.0.5` (configuración de `main` y comprobación visual en Chrome DevTools del 11/11/2026).
- Último commit de `main` desplegado mediante GitHub Pages: `b311212729d19ff84a001eea2228cd274f217377` ([ejecución 39984292264](https://github.com/oteirp-vge-backups/vge-crm-web/actions/runs/39984292264), correcta el 23/10/2026).
- Cambio funcional de la versión `10.0.5`: [PR #20](https://github.com/oteirp-vge-backups/vge-crm-web/pull/20), ya fusionado. Los PR #21 y #22 posteriores no modificaron archivos de la aplicación.
- Base de datos de **producción**: Supabase `sjraugywirjohrqmacvb` (nombre visible heredado `VGE CRM STAGING`; **no es un entorno de pruebas**).
- Inventario de producción: **51 migraciones** (última `20261023152117`, presencia de operadores), **21/21 tablas públicas con RLS** y **3 Edge Functions activas**.
- No existe un STAGING permanente independiente: las pruebas se realizan de forma local/aislada o en entornos temporales expresamente autorizados. No utilizar el proyecto de producción como espacio de pruebas.
- Fuente operativa actual: [`docs/R10_SOURCE_OF_TRUTH.md`](docs/R10_SOURCE_OF_TRUTH.md).
- Separación y nomenclatura de entornos: [`docs/R10_ENVIRONMENTS.md`](docs/R10_ENVIRONMENTS.md).
- Correspondencia de migraciones: [`docs/R10_PRODUCTION_MIGRATION_MAP.md`](docs/R10_PRODUCTION_MIGRATION_MAP.md).
- Puerta de cierre de estabilización: [`docs/R10_CLOSEOUT_GATE.md`](docs/R10_CLOSEOUT_GATE.md).
- Retorno: [`docs/R10_RETURN_PROCEDURE.md`](docs/R10_RETURN_PROCEDURE.md).

Los documentos de fases anteriores se conservan como evidencia histórica. No deben utilizarse como inventario actual de producción cuando contradigan la fuente operativa indicada arriba.
