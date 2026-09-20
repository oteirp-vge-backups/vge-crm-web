# Línea base de base de datos R10

Este directorio conserva dos evidencias complementarias:

- `applied-migrations.json` registra las 42 migraciones que Supabase marcaba como aplicadas el 25 de agosto de 2026. Es una evidencia histórica inmutable.
- `production-ledger-current.json` registra el inventario productivo observado más reciente, la correspondencia con las fuentes SQL disponibles y sus SHA-256.
- `current-schema.sql` es la línea base estructural observada ese día, generada con Supabase CLI 2.115.0 y sanitizada para su publicación. No contiene filas de negocio, cuentas de usuario, definiciones de roles personalizadas ni secretos.
- `current-schema.sql.sha256` permite verificar la integridad del SQL.
- `EVIDENCE.md` documenta la extracción, las comprobaciones y el inventario resultante.

La copia pública tiene 236.998 bytes y SHA-256 `6dc0ca0103fcba8cfe8a880af0fcd4c5a5b06ec55b9e078e1b31db29f5c1f27a`. Su inventario coincide con la auditoría de producción: 20 tablas públicas, 2 vistas públicas, 52 funciones públicas, 21 funciones privadas, 17 políticas RLS y 15 triggers.

La auditoría preventiva encontró un único correo operativo, repetido dos veces como valor estructural por defecto. La copia pública sustituye exclusivamente ese literal por `r10-staging-recipient@example.invalid`; el original exacto quedó limitado al artefacto privado efímero. Antes de probar envíos en STAGING debe configurarse un destinatario no productivo mediante una migración específica.

No se inventan las 39 fuentes históricas que no están en Git. Las diez fuentes existentes en `supabase/migrations/` conservan su identidad original. Las siete posteriores al inventario inicial fueron aplicadas por el servicio gestionado con otro timestamp; la equivalencia se conserva en el inventario productivo actual y en `docs/R10_PRODUCTION_MIGRATION_MAP.md`.

## Reglas

1. El registro JSON es evidencia, no una migración ejecutable.
2. La línea base solo puede comprobarse en una base vacía y aislada; nunca debe aplicarse directamente sobre producción.
3. Ningún archivo de este directorio puede contener filas de negocio, usuarios, contraseñas, tokens, claves o valores de Vault.
4. Cualquier cambio futuro de esquema debe añadirse como una migración nueva; nunca debe editarse retroactivamente una migración ya aplicada.
5. Antes de utilizar el SQL debe ejecutarse `sha256sum --check current-schema.sql.sha256`.
6. `production-ledger-current.json` debe actualizarse tras cada despliegue de base de datos y su correspondencia de archivos debe superar la barrera de calidad.
