# R10 — separación de entornos

Fecha de decisión: 25 de agosto de 2026.

## Estado real

| Capa | Producción | Trabajo R10 | STAGING objetivo |
|---|---|---|---|
| Git | `main`, congelado funcionalmente en `e9f2d72c9375270ff84b38c39d5f6bf93433dead` | `r10/phase2a-foundations` | `develop`, después de validar la línea base |
| Supabase | `sjraugywirjohrqmacvb` | acceso de auditoría, sin escrituras | rama o proyecto separado, todavía no creado |
| Web | publicación actual desde `main` | sin despliegue | URL y credenciales separadas antes de pruebas integradas |

Aunque el nombre visible actual del proyecto Supabase contiene `STAGING`, la aplicación publicada lo utiliza. Por tanto, R10 lo clasifica como **PRODUCCIÓN** hasta que la aplicación apunte a un entorno distinto.

Supabase no tenía ramas de desarrollo al realizar esta comprobación.

## Flujo obligatorio

1. Todo cambio nace en una rama distinta de `main`.
2. Las pruebas unitarias y de estructura se ejecutan en GitHub sin credenciales de producción.
3. Las migraciones se prueban en local o en STAGING.
4. Producción no recibe `db push`, cambios manuales del Dashboard ni fusiones durante la auditoría.
5. La promoción a `main` requiere evidencia de pruebas y una decisión explícita de despliegue.

## Decisión económica pendiente

La documentación vigente de Supabase indica que una rama aislada genera consumo y comienza en USD 0,01344 por hora con cómputo Micro; ese consumo no queda cubierto por el Spend Cap. Por ello R10 no crea automáticamente la rama pagada sin confirmar antes organización, importe y recurrencia.

Referencias oficiales:

- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
- https://supabase.com/docs/guides/deployment/managing-environments
