# R10 — fuentes canónicas

## Aplicación web

- Fuentes editables: `/index.html` y `/assets/js/`.
- Módulos canónicos, en orden de carga: `config.js`, `observability.js`, `core.js`, `supabase-service.js`, `centers.js`, `contacts.js`, `travel-agenda.js`, `management.js`, `owner.js`, `app.js` y `auth-permissions.js`.
- Espejo generado: `/publish/index.html` y `/publish/assets/js/`; no se editan de forma independiente.
- `npm run build:publish` regenera el espejo y `npm run check:publish` bloquea cualquier divergencia.
- El workflow `R10 - barrera de calidad` compila por separado los once módulos, prohíbe JavaScript concatenado dentro del HTML, comprueba el orden de carga y valida la propiedad única de las funciones por dominio.
- La versión técnica candidata es `r10-phase10.0.0`.

## Base de datos

- Estado aplicado: `supabase/baseline/applied-migrations.json`.
- Fuentes históricas disponibles: cuatro SQL en `supabase/migrations/`; las migraciones posteriores se conservan como candidatas independientes hasta su despliegue autorizado.
- Fuentes históricas ausentes: 39; no se recrean ni se renombran de manera especulativa.
- Futuro: cada cambio es una migración nueva, probada fuera de producción y acompañada por un rollback revisable. Si la CLI no puede escribir en el entorno gestionado, se utiliza un timestamp UTC real y se documenta la excepción, sin alterar migraciones previas.

## Edge Functions

Las fuentes bajo `supabase/functions/` son canónicas. Las dos funciones heredadas coinciden con sus versiones desplegadas; `vge-technical-incident` es una candidata de Fase 8 aún no desplegada. Las tres disponen de declaración explícita en `supabase/config.toml`. Los cambios futuros deben nacer en Git y desplegarse primero a STAGING.

## Artefacto de publicación

- Constructor y verificador canónico: `scripts/r10-release.mjs`.
- Política: `release/r10-phase10-policy.json`.
- Contenido: `publish/`, `supabase/config.toml`, `supabase/functions/` y `supabase/migrations/`.
- Identidad: `release-manifest.json`, con SHA-256 individual y conjunto.
- El workflow construye una vez, transfiere el paquete entre trabajos, lo vuelve a verificar, prueba el frontend directamente desde él y simula el retorno al artefacto anterior.
- Ninguna barrera verde equivale a autorización de producción.

## Prohibiciones de Fase 2A

- No editar `main`.
- No escribir en la base de producción.
- No desplegar Edge Functions.
- No borrar índices, funciones, CSS o JavaScript candidatos hasta disponer de pruebas de comportamiento.
