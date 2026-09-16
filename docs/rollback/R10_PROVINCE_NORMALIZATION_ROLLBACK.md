# Rollback R10 · normalización de provincias

## Alcance

El hotfix añade dos defensas: normaliza la provincia antes de guardar y valida que toda provincia informada use la grafía canónica del CRM.

Si fuera necesario retornar estructuralmente el cambio, el objetivo es:

1. eliminar la restricción `centers_province_canonical_check`;
2. restaurar `private.normalize_center_community()` a la definición anterior, que valida la provincia y deriva la comunidad pero no sustituye `new.province` por su forma canónica;
3. mantener revocados los permisos públicos de ejecución de la función privada.

## Decisión de datos

No se deben reintroducir grafías históricas como `LEON`, `VALENCIA`, `Almeria` o `PALENCIA` después de haberlas normalizado. El rollback estructural conserva deliberadamente los valores canónicos ya reparados (`León`, `Valencia`, `Almería`, `Palencia`, etc.) porque volver a una grafía incorrecta degradaría datos válidos.

## Verificación posterior

Tras cualquier retorno deben comprobarse, como mínimo:

- que el selector de provincia siga mostrando una opción válida para las fichas ya normalizadas;
- que provincia y comunidad autónoma continúen siendo coherentes;
- que no se hayan modificado asignaciones, estados, contactos, oportunidades ni agenda;
- que la barrera R10 de regresión heredada siga en verde.

La definición SQL anterior puede recuperarse de la migración `20260828072643_normalize_center_communities.sql`; se evita duplicarla como archivo `.sql` dentro de `docs/rollback` porque la política de release R10 interpreta cualquier función SQL fuera de `supabase/migrations` como una función no migrada.
