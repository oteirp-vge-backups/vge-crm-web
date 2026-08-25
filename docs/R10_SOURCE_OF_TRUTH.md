# R10 — fuentes canónicas

## Aplicación web

- Fuentes editables: `/index.html` y `/assets/js/`.
- Módulos canónicos: `config.js`, `core.js`, `supabase-service.js`, `app.js` y `auth-permissions.js`.
- Espejo generado: `/publish/index.html` y `/publish/assets/js/`; no se editan de forma independiente.
- `npm run build:publish` regenera el espejo y `npm run check:publish` bloquea cualquier divergencia.
- El workflow `R10 - barrera de calidad` compila por separado los cinco módulos, prohíbe JavaScript concatenado dentro del HTML y comprueba el orden de carga.

## Base de datos

- Estado aplicado: `supabase/baseline/applied-migrations.json`.
- Fuentes históricas disponibles: los tres SQL existentes en `supabase/migrations/`.
- Fuentes históricas ausentes: 39; no se recrean ni se renombran de manera especulativa.
- Futuro: cada cambio es una migración nueva creada con Supabase CLI y probada fuera de producción.

## Edge Functions

Las fuentes bajo `supabase/functions/` son canónicas porque la auditoría de Fase 1 comprobó que coinciden con las versiones desplegadas. Los cambios futuros deben nacer en Git y desplegarse primero a STAGING.

## Prohibiciones de Fase 2A

- No editar `main`.
- No escribir en la base de producción.
- No desplegar Edge Functions.
- No borrar índices, funciones, CSS o JavaScript candidatos hasta disponer de pruebas de comportamiento.
