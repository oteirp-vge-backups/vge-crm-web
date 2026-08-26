# R10 — Fase 8: observabilidad técnica sin PII

Fecha de ejecución: 26 de agosto de 2026.

## Objetivo y límites

La fase añade versión, correlación, registro central y clasificación de alertas para que una incidencia pueda diagnosticarse sin solicitar un pantallazo. Se desarrolla en `r10/phase8-observability`, apilada sobre la Fase 7. No modifica `main`, no despliega Edge Functions y no publica el frontend.

## Arquitectura

1. `config.js` identifica el artefacto con `r10-phase8.0.0`.
2. `observability.js` genera una correlación UUID prefijada por `r10-`, clasifica el componente, la operación, el código y la severidad, y añade la referencia al mensaje técnico mostrado al usuario.
3. Los adaptadores de Supabase marcan automáticamente los fallos de RPC y Edge Functions, sin inspeccionar ni enviar sus argumentos.
4. Los errores no controlados del navegador se convierten en incidencias `fatal`, sin copiar mensaje, pila, URL ni estado de la aplicación.
5. `vge-technical-incident` valida la sesión y un contrato cerrado antes de escribir el evento estructurado en los logs centrales de Edge Functions.
6. `warning`, `error` y `fatal` se traducen a `vge_technical_warning`, `vge_technical_error` y `vge_technical_fatal`, respectivamente, para permitir filtros y alertas sin contenido libre.

La solución utiliza los registros incluidos en Supabase y no crea tablas, migraciones, filas, usuarios, secretos ni dependencias externas. No añade coste por sí misma; la conservación efectiva de logs seguirá dependiendo del plan contratado cuando se autorice el despliegue.

## Contrato sin datos personales

La Edge Function acepta exactamente estos ocho campos:

- `schema_version`
- `correlation_id`
- `occurred_at`
- `app_version`
- `severity`
- `component`
- `operation`
- `error_code`

Cualquier campo adicional invalida el evento. Por diseño no existen campos para nombres, emails, teléfonos, identificadores de centros u operadores, formularios, mensajes de error, pilas, URLs, JWT, IP o datos de sesión.

## Diagnóstico simulado

La prueba crea deliberadamente un error cuyo mensaje y pila contienen un nombre, un email, un teléfono y una ficha ficticia. El resultado centralizable conserva únicamente:

```json
{
  "schema_version": 1,
  "correlation_id": "r10-<uuid>",
  "occurred_at": "<UTC>",
  "app_version": "r10-phase8.0.0",
  "severity": "error",
  "component": "database",
  "operation": "simulated_failure",
  "error_code": "PGRST301"
}
```

La referencia devuelta al usuario coincide con la registrada y ninguno de los valores personales ficticios aparece en el transporte ni en la consola segura. Esto satisface el criterio «incidencia simulada diagnosticable sin pantallazo».

## Controles

- Prueba Node.js del contrato del navegador, deduplicación, referencia y ausencia de PII.
- Tres pruebas Deno del validador de la Edge Function.
- Quinto recorrido Playwright que simula el error y correlaciona la referencia con el evento, sin acceso a producción.
- Control estático que prohíbe `console.error` y `console.warn` con objetos libres fuera del módulo seguro.
- Siete regresiones heredadas, arquitectura modular, aislamiento STAGING, compilación Edge y 35 pruebas SQL acumuladas.
- Procedimiento de diagnóstico en `R10_PHASE8_INCIDENT_RUNBOOK.md`.
- Retorno revisable en `R10_PHASE8_ROLLBACK.md`.

## Criterio de cierre

La fase quedará técnicamente cerrada cuando la incidencia simulada sea correlacionable sin PII en Node.js y navegador, la Edge Function rechace campos libres y la barrera conjunta de GitHub quede verde. El PR permanecerá en borrador y el sistema no comenzará a enviar eventos centrales hasta un despliegue posterior expresamente autorizado.

## Evidencia de GitHub

- Rama técnica: `r10/phase8-observability`.
- PR apilado en borrador: `#8`, con base `r10/phase7-security-definer`.
- Commit técnico verificado: `4c4a3b352a59d7071bff7f74279cb5b23f87310d`.
- GitHub Actions: ejecución `32940043153`, completada con éxito.
- Contrato Edge: compilación correcta y tres de tres pruebas Deno correctas.
- Incidencia simulada: correlación exacta y ausencia de PII verificadas en Node.js y navegador.
- Regresión heredada: siete de siete pruebas correctas.
- Playwright simulado sin producción: cinco de cinco recorridos correctos.
- Supabase local efímero: 35 de 35 pruebas SQL acumuladas correctas.
- Barrera conjunta `Barrera R10 / publicación autorizable`: correcta.
- Supabase remoto conserva únicamente su rama `main`, 42 migraciones y las dos Edge Functions anteriores; `vge-technical-incident` no fue desplegada y no generó coste adicional.
- `main` continúa intacta en `ccdd2909e646381a9326d600651b8aa912f4b731`; producción no recibió cambios.

La Fase 8 queda técnicamente cerrada. Este cierre no autoriza fusionar ramas, modificar `main`, desplegar la Edge Function ni publicar el frontend.
