# R10 — fuente de verdad operativa

Fecha de revisión operativa: 11 de noviembre de 2026. Corte anterior: 13 de octubre de 2026.

Este documento describe el estado operativo actual. Los documentos `R10_PHASE*.md` y `R10_CONSOLIDATION.md` conservan la evidencia histórica de cada fase y no se reescriben retroactivamente.

Actualización exclusivamente documental, contrastada con GitHub y Supabase el 11/11/2026. No modifica versiones, código, datos ni permisos.

## Aplicación web

- Fuentes editables: `/index.html` y `/assets/js/`.
- Módulos canónicos, en orden de carga: `config.js`, `observability.js`, `core.js`, `supabase-service.js`, `centers.js`, `contacts.js`, `travel-agenda.js`, `management.js`, `owner.js`, `app.js` y `auth-permissions.js`.
- Espejo generado: `/publish/index.html` y `/publish/assets/js/`; no se editan de forma independiente.
- `npm run build:publish` regenera el espejo y `npm run check:publish` bloquea cualquier divergencia.
- El workflow `R10 - barrera de calidad` compila por separado los once módulos, prohíbe JavaScript concatenado dentro del HTML, comprueba el orden de carga y valida la propiedad única de las funciones por dominio.
- Versión web publicada: **`r10-phase10.0.5`**. Consta en `assets/js/config.js` de `main` y se observó en el HTML servido, mediante Chrome DevTools, el 11/11/2026.
- Cambio funcional de `10.0.5`: [PR #20](https://github.com/oteirp-vge-backups/vge-crm-web/pull/20) (head revisado `8ef4a1d0de04f22bba6c67376711b60d57b136ee`; fusión `871051cdf68178c349b3b490ed2727f38ad540e2`).
- Último commit de `main` publicado: `b311212729d19ff84a001eea2228cd274f217377` ([GitHub Pages, ejecución `39984292264`](https://github.com/oteirp-vge-backups/vge-crm-web/actions/runs/39984292264), completada correctamente el 23/10/2026). La fusión documental/técnica del PR #22 no modificó archivos de la aplicación.
- La comprobación de Chrome acredita la versión visible; no equivale a una comparación íntegra de bytes servidos desde una conexión HTTP independiente.
- Las ejecuciones `35155593333` y `35154128939` corresponden al cierre histórico de `r10-phase10.0.4`, no al último despliegue.

## Base de datos

- Inventario aplicado actual: `supabase/baseline/production-ledger-current.json`.
- Evidencia histórica del 25 de agosto: `supabase/baseline/applied-migrations.json`; permanece inmutable con 42 registros.
- Producción registra **51 migraciones** y Git conserva **doce** fuentes SQL mapeadas y verificadas; última versión aplicada `20261023152117` (`reduce_operator_presence_admin_privileges`).
- Las 39 fuentes históricas anteriores al control de Git siguen ausentes y no se recrean ni se renombran de forma especulativa.
- Nueve despliegues gestionados recibieron en producción un timestamp distinto al nombre local. La equivalencia explícita, el nombre y el SHA-256 están en `R10_PRODUCTION_MIGRATION_MAP.md` y en el inventario JSON actual.
- Cada cambio futuro debe ser una migración nueva, probada fuera de producción y acompañada por un retorno revisable. Nunca se modifica retroactivamente una migración aplicada.
- La migración `enable_center_details_editing` se aplicó y verificó el 13/10/2026 como `20261013112310`. El PR #20 fue fusionado con autorización y la versión `r10-phase10.0.5` quedó publicada.
- La migración `reduce_operator_presence_admin_privileges` se aplicó el 23/10/2026 como `20261023152117` (archivo fuente `20261023144210_reduce_operator_presence_admin_privileges.sql`). **No debe volver a ejecutarse**; su correspondencia figura en el ledger actual.
- Evidencia de integridad y alcance autorizado: `docs/audit/R10_CENTER_DETAILS_DEPLOYMENT_2026-10-13.json`.

## Identificación de entornos

- **Producción**: proyecto Supabase `sjraugywirjohrqmacvb` (`eu-west-1`), estado observado `ACTIVE_HEALTHY` a 11/11/2026. Su nombre visible heredado es `VGE CRM STAGING`, pero **es el backend de producción** porque `assets/js/config.js` apunta a este identificador.
- **Pruebas**: no hay un proyecto STAGING persistente independiente identificado en el inventario actual. Las pruebas de CI emplean Supabase local efímero y cualquier entorno remoto aislado requiere autorización previa.
- **Restauración aislada**: proyecto temporal `wmxvvjeyfkzingjogaln`, observado `INACTIVE` a 11/11/2026; no es producción ni debe utilizarse como STAGING cotidiano.
- Para distinguir destinos debe utilizarse siempre el **ID del proyecto**, nunca sólo el nombre visible. Esta actualización no solicita renombrar ningún proyecto ni cambiar conexiones.
- Contexto histórico de separación: [`R10_ENVIRONMENTS.md`](R10_ENVIRONMENTS.md), corte de 20/09/2026.

## Edge Functions

Las fuentes bajo `supabase/functions/` son canónicas. Producción mantiene tres funciones activas y declaradas en `supabase/config.toml`:

- `vge-agenda-email-worker`, versión 3, con autenticación interna heredada.
- `vge-admin-invite-operator`, versión 4, con autenticación interna heredada.
- `vge-technical-incident`, versión 1, con verificación JWT.

Los cambios futuros deben nacer en Git, validarse fuera de producción y desplegarse con autorización expresa.

## Artefacto de publicación

- Constructor y verificador canónico: `scripts/r10-release.mjs`.
- Política: `release/r10-phase10-policy.json`.
- Contenido: `publish/`, `supabase/config.toml`, `supabase/functions/` y `supabase/migrations/`.
- Identidad: `release-manifest.json`, con SHA-256 individual y conjunto.
- El workflow construye una vez, transfiere el paquete entre trabajos, lo vuelve a verificar, prueba el frontend directamente desde él y simula el retorno al artefacto anterior.
- Ninguna barrera verde equivale a autorización de producción.

Como **referencia histórica y punto de retorno**, el paquete sellado de `r10-phase10.0.4` se generó con `artifact_sha256` `feb7d899026fb4ca79f40815edd1ae34413f752cf9210a86c0d8540b2006b8bc`. El punto web de retorno es `r10-phase10.0.3`, referencia `fc688f5c29434309000f69afdaeab31390b4485f`, con `artifact_sha256` `d0bfaab986b51c1ef1be5f01488e275189b0568de97ab2fb674579135d838c0c`.

## Inventario estructural observado

- 21 tablas públicas; RLS habilitado en 21 de 21.
- 2 vistas públicas, 53 funciones públicas y 23 privadas.
- 55 funciones `SECURITY DEFINER` en `public` y `private`.
- 37 RPC `SECURITY DEFINER` ejecutables por `authenticated`, todas dentro de la superficie revisada.
- 0 funciones privilegiadas ejecutables por `anon`.
- 18 políticas RLS y 16 triggers de usuario.

## Regla de cambio

Todo cambio parte de una rama distinta de `main`, supera la barrera completa y se detiene antes de modificar producción, permisos, seguridad, `main` o comportamiento existente hasta recibir autorización expresa.
