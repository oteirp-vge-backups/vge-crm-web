# R10 — fuentes canónicas

## Aplicación web

- Fuente editable: `/index.html`.
- Espejo de publicación: `/publish/index.html`.
- Ambos archivos deben conservar exactamente el mismo contenido mientras continúe la publicación heredada.
- El workflow `R10 - controles de cimientos` bloquea divergencias entre ambos.
- En una fase posterior, el espejo se generará automáticamente; hasta entonces no se edita de forma independiente.

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
