# R10 — Retorno de Fase 9

## Punto sellado

- Referencia remota: `67949891bf93387cde377d1dea6e9f0df392e7be`.
- Versión: `r10-phase8.0.0`.
- Ámbito: frontend publicable, configuración Supabase, migraciones candidatas y Edge Functions conservadas en Git.

## Simulación automática

La simulación crea tres ubicaciones efímeras dentro del runner:

1. candidato de Fase 9 verificado;
2. paquete anterior reconstruido desde la referencia sellada;
3. ubicación activa temporal.

El candidato se copia sin alterar a la ubicación activa. A continuación se registra el fallo deliberado `POST_DEPLOY_HEALTHCHECK_FAILED_AS_PLANNED`, se sustituye la ubicación activa por el paquete anterior y se vuelve a verificar íntegramente. El trabajo sólo termina correctamente cuando la huella activa coincide con la huella previa.

La evidencia resultante contiene `production_touched: false`, las dos versiones y huellas, y `exact_previous_artifact_restored: true`. No utiliza credenciales ni conexiones remotas.

## Retorno real futuro

Un retorno real requiere autorización expresa y deberá:

1. detener nuevas promociones;
2. conservar evidencia del fallo y la correlación técnica sin PII;
3. confirmar una copia nueva de producción;
4. verificar la huella del artefacto anterior;
5. promover ese mismo artefacto, sin reconstruirlo;
6. aplicar únicamente operaciones de base de datos previamente revisadas y reversibles;
7. verificar acceso, permisos, agenda, operaciones críticas y versión activa;
8. dejar constancia del resultado.

Nunca se restaura directamente sobre producción sin copia nueva, comprobación del alcance y autorización explícita. Esta fase no ejecuta un retorno real.
