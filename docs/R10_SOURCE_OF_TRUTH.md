# R10 — fuente de verdad operativa

Fecha de revisión: 20 de septiembre de 2026.

Este documento describe el estado operativo actual. Los documentos `R10_PHASE*.md` y `R10_CONSOLIDATION.md` conservan la evidencia histórica de cada fase y no se reescriben retroactivamente.

## Aplicación web

- Fuentes editables: `/index.html` y `/assets/js/`.
- Módulos canónicos, en orden de carga: `config.js`, `observability.js`, `core.js`, `supabase-service.js`, `centers.js`, `contacts.js`, `travel-agenda.js`, `management.js`, `owner.js`, `app.js` y `auth-permissions.js`.
- Espejo generado: `/publish/index.html` y `/publish/assets/js/`; no se editan de forma independiente.
- `npm run build:publish` regenera el espejo y `npm run check:publish` bloquea cualquier divergencia.
- El workflow `R10 - barrera de calidad` compila por separado los once módulos, prohíbe JavaScript concatenado dentro del HTML, comprueba el orden de carga y valida la propiedad única de las funciones por dominio.
- Versión publicada y estable en observación: `r10-phase10.0.4`.
- Commit funcional publicado: `d241df59be6f5ae3177babdc7afd22ea4ee2e84d`.
- Publicación GitHub Pages verificada: ejecución `35155593333`.
- El árbol publicado coincide con el artefacto aprobado de la ejecución de calidad `35154128939`.

## Base de datos

- Inventario aplicado actual: `supabase/baseline/production-ledger-current.json`.
- Evidencia histórica del 25 de agosto: `supabase/baseline/applied-migrations.json`; permanece inmutable con 42 registros.
- Producción registra 49 migraciones y Git conserva diez fuentes SQL verificadas.
- Las 39 fuentes históricas anteriores al control de Git siguen ausentes y no se recrean ni se renombran de forma especulativa.
- Siete despliegues gestionados recibieron en producción un timestamp distinto al nombre local. La equivalencia explícita, el nombre y el SHA-256 están en `R10_PRODUCTION_MIGRATION_MAP.md` y en el inventario JSON actual.
- Cada cambio futuro debe ser una migración nueva, probada fuera de producción y acompañada por un retorno revisable. Nunca se modifica retroactivamente una migración aplicada.

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

El paquete sellado de `r10-phase10.0.4` se generó con `artifact_sha256` `feb7d899026fb4ca79f40815edd1ae34413f752cf9210a86c0d8540b2006b8bc`. El punto web de retorno es `r10-phase10.0.3`, referencia `fc688f5c29434309000f69afdaeab31390b4485f`, con `artifact_sha256` `d0bfaab986b51c1ef1be5f01488e275189b0568de97ab2fb674579135d838c0c`.

## Inventario estructural observado

- 21 tablas públicas; RLS habilitado en 21 de 21.
- 2 vistas públicas, 53 funciones públicas y 23 privadas.
- 55 funciones `SECURITY DEFINER` en `public` y `private`.
- 37 RPC `SECURITY DEFINER` ejecutables por `authenticated`, todas dentro de la superficie revisada.
- 0 funciones privilegiadas ejecutables por `anon`.
- 18 políticas RLS y 16 triggers de usuario.

## Regla de cambio

Todo cambio parte de una rama distinta de `main`, supera la barrera completa y se detiene antes de modificar producción, permisos, seguridad, `main` o comportamiento existente hasta recibir autorización expresa.
