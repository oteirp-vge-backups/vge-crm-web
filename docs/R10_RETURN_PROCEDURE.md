# Procedimiento de retorno R10

## Retorno por artefacto desde Fase 9

1. Detener la promoción y conservar la evidencia del fallo.
2. Identificar el último `artifact_sha256` estable.
3. Recuperar el paquete sellado, sin reconstruirlo.
4. Ejecutar `node scripts/r10-release.mjs verify --input <directorio>`.
5. Confirmar una copia nueva del entorno afectado y autorización expresa.
6. Restaurar el mismo paquete verificado.
7. Comprobar versión, acceso, permisos y recorridos críticos.
8. Registrar la huella activa y el resultado.

El punto de retorno de Fase 9 es `67949891bf93387cde377d1dea6e9f0df392e7be`, versión `r10-phase8.0.0`. La simulación automatizada se detalla en `R10_PHASE9_ROLLBACK.md`.

## Retorno histórico al corte V15 · R9.8

1. Recuperar la referencia `v15-r9.8-r10-phase0-2026-08-25`.
2. Restaurar primero el backup cifrado en un proyecto Supabase aislado.
3. Aplicar sólo migraciones ausentes y respetar el orden registrado.
4. Desplegar las Edge Functions conservando su autenticación interna.
5. Configurar secretos fuera del repositorio.
6. Publicar `index.html`.
7. Ejecutar las siete pruebas JavaScript.
8. Habilitar cron únicamente tras validar agenda y correo en aislamiento.
9. Comparar el esquema con la huella `6389db0723eecdabd1299f230852e1e4`.

Nunca se restaura directamente sobre el origen sin una copia nueva y confirmación explícita.
