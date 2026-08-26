# R10 — Fase 9: CI/CD reproducible y retorno simulado

Fecha de ejecución: 26 de agosto de 2026.

## Objetivo y límites

La fase convierte la barrera R10 en una cadena de publicación reproducible: genera un único artefacto, lo sella, comprueba que la siguiente etapa recibe exactamente los mismos bytes, ejecuta los recorridos críticos sobre ese paquete y simula un fallo posterior con retorno exacto a la Fase 8.

Se desarrolla en `r10/phase9-cicd-rollback`, apilada sobre la Fase 8. No modifica `main`, no crea una rama Supabase de pago, no escribe en producción, no despliega Edge Functions y no publica el frontend.

## Contrato del artefacto

`scripts/r10-release.mjs` construye un paquete que contiene exclusivamente:

- `publish/`, como frontend publicable generado desde las fuentes canónicas;
- `supabase/config.toml`;
- `supabase/functions/`;
- `supabase/migrations/`.

El manifiesto `release-manifest.json` registra versión, referencia fuente, tamaño y SHA-256 de cada archivo, huella conjunta del contenido y huella del propio manifiesto. La verificación rechaza cualquier archivo añadido, ausente, renombrado o modificado después del sellado.

La versión candidata es `r10-phase9.0.0`. El retorno sellado se fija en el commit remoto de Fase 8 `67949891bf93387cde377d1dea6e9f0df392e7be`, versión `r10-phase8.0.0`.

## Preflight obligatorio

Antes de construir el paquete, la cadena bloquea:

- secretos o claves privadas incrustados;
- cambios del esquema base o SQL fuera de `supabase/migrations/` y `supabase/tests/`;
- funciones SQL creadas fuera de una migración;
- Edge Functions sin declaración explícita en `supabase/config.toml`;
- divergencia entre fuentes y espejo publicable;
- versión distinta de la política de Fase 9;
- HTML con JavaScript concatenado, componentes obsoletos o pérdida del aislamiento STAGING, mediante los controles heredados.

Las tres Edge Functions quedan declaradas explícitamente. Las dos heredadas conservan `verify_jwt = false` porque realizan su autenticación interna existente; `vge-technical-incident` conserva `verify_jwt = true`. Esta fase no las despliega.

## Cadena de CI

1. Ejecuta las siete regresiones históricas.
2. Valida frontend, módulos, observabilidad, aislamiento, Deno y contrato de publicación.
3. Levanta Supabase local efímero, aplica la línea base y la migración candidata de Fase 7, y ejecuta las 35 pruebas SQL por rol.
4. Ejecuta los cinco recorridos Playwright sin acceso a producción.
5. Construye una sola vez el artefacto candidato y lo publica temporalmente entre trabajos de GitHub Actions.
6. Descarga y verifica el mismo artefacto, instala Chromium y repite sobre él los cinco recorridos críticos.
7. Reconstruye el paquete anterior desde la referencia sellada de Fase 8.
8. Simula la promoción del candidato, inyecta un fallo de salud posterior y restaura el paquete anterior.
9. Verifica que la huella activa coincide exactamente con la huella previa y conserva la evidencia JSON durante un día.
10. La barrera conjunta sólo queda verde si todos los trabajos anteriores terminan correctamente.

## Prueba permanente de la incidencia de esta fase

`tests/quality/check-release-pipeline.mjs` demuestra de forma permanente que:

- un artefacto correcto puede construirse y verificarse;
- una mutación posterior al sellado queda bloqueada;
- un secreto simulado impide construir el paquete;
- candidato y retorno son versiones y huellas distintas;
- el retorno restaura exactamente la huella anterior;
- la simulación no toca producción.

## Criterio de cierre

La Fase 9 queda técnicamente cerrada cuando el workflow comprueba el mismo artefacto en trabajos separados, ejecuta los recorridos críticos sobre ese paquete, restaura exactamente la Fase 8 tras el fallo simulado y deja verde `Barrera R10 / publicación autorizable`.

## Evidencia de GitHub

Pendiente de completar tras la primera ejecución de la rama y el PR borrador de Fase 9.

Este documento no autoriza fusionar ramas, modificar `main`, desplegar en Supabase ni publicar el frontend.
