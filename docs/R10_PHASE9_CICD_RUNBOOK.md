# R10 — Runbook de CI/CD

## Fuente autorizable

La única fuente autorizable es el artefacto descargado del trabajo `Artefacto único e inmutable`. No se reconstruye el frontend, una migración o una Edge Function entre STAGING y producción. La configuración específica del entorno se trata como configuración externa validada y nunca permite alterar el paquete sellado.

## Comprobación previa

1. Confirmar que el PR sigue en borrador o dispone de autorización expresa para avanzar.
2. Confirmar que `Barrera R10 / publicación autorizable` está verde.
3. Abrir `release-manifest.json` y registrar `release_version`, `source_ref` y `artifact_sha256`.
4. Verificar el paquete con `node scripts/r10-release.mjs verify --input <directorio>`.
5. Confirmar que la referencia de retorno y su artefacto siguen disponibles.
6. Confirmar backup reciente, separación de entornos y ausencia de secretos dentro del paquete.

Si una comprobación falla, se detiene la promoción. Nunca se reconstruye un paquete manualmente para eludir una huella distinta.

## Flujo autorizado futuro

1. Rama técnica y PR.
2. Revisión, compilación y pruebas completas.
3. Construcción única y sellado del artefacto.
4. Promoción del mismo artefacto a STAGING aislado.
5. Pruebas reales y humo sobre STAGING.
6. Autorización expresa de producción.
7. Promoción de la misma huella validada.
8. Comprobación posterior por versión, salud, acceso y recorridos críticos.
9. Retorno inmediato al artefacto anterior si falla cualquier control.

La Fase 9 ejecuta los pasos 1 a 5 de forma técnica con Supabase local y una promoción efímera dentro del runner. Los pasos 6 a 9 sobre infraestructura real permanecen bloqueados.

## Fallos que bloquean publicación

- Cualquier prueba heredada, SQL, Deno o Playwright fallida.
- Huella distinta entre el paquete construido y el descargado.
- Archivo extra o ausente respecto al manifiesto.
- Secreto incrustado.
- SQL fuera de migración o Edge Function no declarada.
- Configuración que permita conectar las pruebas a producción.
- Ausencia de un artefacto de retorno verificable.

## Evidencia mínima

- URL e identificador de la ejecución de GitHub Actions.
- SHA del commit candidato.
- `release_version` y `artifact_sha256`.
- Resultado de los trabajos de calidad, artefacto y retorno.
- JSON de simulación con `production_touched: false` y `exact_previous_artifact_restored: true`.
