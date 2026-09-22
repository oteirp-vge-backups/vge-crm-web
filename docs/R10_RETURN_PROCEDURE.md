# Procedimiento de retorno R10

Fecha de revisión: 20 de septiembre de 2026.

## Punto operativo actual

- Versión web publicada: `r10-phase10.0.4`.
- Commit funcional de `main`: `d241df59be6f5ae3177babdc7afd22ea4ee2e84d`.
- Artefacto candidato verificado: `feb7d899026fb4ca79f40815edd1ae34413f752cf9210a86c0d8540b2006b8bc`.
- Punto web de retorno: `r10-phase10.0.3`.
- Referencia Git de retorno: `fc688f5c29434309000f69afdaeab31390b4485f`.
- Artefacto de retorno verificado: `d0bfaab986b51c1ef1be5f01488e275189b0568de97ab2fb674579135d838c0c`.

La ejecución `35154128939` verificó el candidato y simuló el retorno exacto. Sus artefactos tuvieron inicialmente una retención de un día y ya han caducado. La barrera de cierre amplía a 90 días la conservación de nuevos paquetes y mantiene las referencias y huellas necesarias para reconstruirlos y rechazarlos si no coinciden exactamente.

## Decisión de alcance

Antes de actuar se clasifica el fallo:

| Tipo de fallo | Acción |
|---|---|
| Visual o frontend | Retorno únicamente del frontend a `10.0.3`; se conserva la migración aditiva. |
| RPC no disponible, error sostenido o degradación grave | Detener uso afectado, conservar evidencia y evaluar retorno de backend. |
| Acceso cruzado, exposición anónima o corrupción | Retorno inmediato y controlado de frontend y backend. |
| Error de una función no relacionada con anotaciones | Aplicar el procedimiento específico de su migración; no eliminar datos de anotaciones. |

## Retorno web a `10.0.3`

1. Detener nuevas promociones y registrar el fallo.
2. Recuperar el paquete conservado o reconstruirlo exclusivamente desde `fc688f5c29434309000f69afdaeab31390b4485f`.
3. Ejecutar `node scripts/r10-release.mjs verify --input <directorio>`.
4. Exigir `artifact_sha256` `d0bfaab986b51c1ef1be5f01488e275189b0568de97ab2fb674579135d838c0c`.
5. Publicar el contenido verificado sin modificar la base de datos.
6. Comprobar versión, acceso, permisos y recorridos críticos.
7. Registrar la huella activa y el resultado.

## Retorno de la migración de anotaciones

La tabla `center_internal_notes` puede contener información real. El retorno SQL descrito en `rollback/R10_INTERNAL_NOTES_ROLLBACK.md` elimina esa tabla y no debe ejecutarse como SQL improvisado.

1. Bloquear temporalmente nuevas anotaciones mediante retorno web si es necesario.
2. Exportar y verificar todas las anotaciones existentes.
3. Confirmar la causa y que el fallo exige retirar el esquema, no sólo el frontend.
4. Obtener autorización expresa de Fernando.
5. Crear una migración nueva de retorno; nunca borrar o alterar el ledger remoto.
6. Aplicarla de forma atómica y verificar funciones, permisos, RLS y backup.
7. Confirmar que contactos, agenda, estadísticas, centros y viajes no han cambiado.

## Fallos que obligan a detenerse

- La huella reconstruida no coincide con la esperada.
- No existe copia verificada de las anotaciones antes de un retorno destructivo.
- La causa no está identificada.
- La base se encuentra en un estado parcial o el ledger no refleja el resultado.
- Cualquier comprobación de acceso anónimo o cruce de carteras falla.

## Retorno histórico al corte V15 / R9.8

La referencia `v15-r9.8-r10-phase0-2026-08-25` se conserva únicamente para recuperación extraordinaria. Requiere restaurar primero el backup cifrado en un proyecto aislado, aplicar sólo migraciones ausentes, configurar secretos fuera de Git, validar los cuatro perfiles y obtener autorización expresa antes de sustituir cualquier entorno.

Nunca se restaura directamente sobre producción sin una copia reciente, evidencia conservada y confirmación explícita.
