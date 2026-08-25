# Línea base de base de datos R10

Este directorio distingue dos evidencias diferentes:

- `applied-migrations.json` es el registro verificable de las 42 migraciones que Supabase marca como aplicadas el 25 de agosto de 2026.
- La línea base SQL de estructura se incorporará como un único archivo generado con `supabase db dump`, sin datos, usuarios ni secretos, cuando exista autorización explícita para extraerla y publicarla en este repositorio.

No se inventarán las 39 fuentes históricas que no están en Git. Los tres archivos existentes en `supabase/migrations/` se conservan con su identidad original. El futuro histórico comienza con migraciones nuevas, creadas por Supabase CLI, revisadas en una rama y comprobadas fuera de producción.

## Reglas

1. El registro JSON es evidencia, no una migración ejecutable.
2. Una línea base generada nunca debe aplicarse directamente sobre producción.
3. Ningún archivo de este directorio puede contener filas de negocio, usuarios, contraseñas, tokens, claves o valores de Vault.
4. Cualquier cambio futuro de esquema debe añadirse como una migración nueva; nunca debe editarse retroactivamente una migración ya aplicada.
