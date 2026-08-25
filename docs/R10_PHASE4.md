# R10 — Fase 4: retirada certificada de componentes obsoletos

Fecha de ejecución: 25 de agosto de 2026.

## Objetivo y límites

Esta fase cierra el primer lote de cinco componentes obsoletos identificado en la auditoría R10. Se trabaja en `r10/phase4-obsolete-cleanup`, apilada sobre la Fase 2C. No modifica `main`, no publica el frontend y no escribe ni despliega en Supabase.

## Inventario verificado

| Componente | Ruta antigua | Adaptador antiguo | Resultado |
| --- | --- | --- | --- |
| Cotizaciones | `ruta_cotizaciones.html` | `supabase_cotizaciones.js` | Ausentes y sin referencias activas |
| Facturas | `ruta_facturas.html` | `supabase_facturas.js` | Ausentes y sin referencias activas |
| Ingresos | `ruta_ingresos.html` | `supabase_ingresos.js` | Ausentes y sin referencias activas |
| Gastos | `ruta_gastos.html` | `supabase_gastos.js` | Ausentes y sin referencias activas |
| Productos | `ruta_productos.html` | `supabase_productos.js` | Ausentes y sin referencias activas |

## Clasificación y trazabilidad

La comprobación se realizó sobre la rama 2C, `main`, todas las ramas R10 remotas y la versión congelada `freeze/v15-r9.8-r10-phase0-2026-08-25`. Ninguno de los diez archivos aparece en el historial disponible desde la congelación de R10, y tampoco existen enlaces o importaciones activos que los nombren.

Por tanto, no se simulan eliminaciones ni se reescribe la historia. Los cinco pares se clasifican como **obsoletos confirmados, retirados antes de la línea base congelada y con ausencia certificada**.

Los cuatro símbolos antiguos que todavía existen dentro de `index.html` (`INITIAL_CENTERS`, `replaceAll()`, `importJSON()` y `resetData()`) no pertenecen a este lote y permanecen intactos para una retirada posterior con su propia caracterización.

## Barrera contra reintroducciones

`tests/quality/check-obsolete-components.mjs` comprueba por separado cada componente y falla si:

1. reaparece cualquiera de sus dos archivos en cualquier directorio del repositorio; o
2. cualquier artefacto activo vuelve a enlazar, importar o nombrar esos archivos.

La comprobación se ejecuta en el trabajo `Sintaxis y compilación` de la barrera conjunta R10. Los documentos de evidencia quedan fuera del análisis de referencias para poder conservar la trazabilidad histórica.

## Verificación

- Cinco comprobaciones individuales de ausencia: pendientes de registrar al cierre.
- Siete regresiones heredadas: pendientes de registrar al cierre.
- Frontend y espejo publicable: pendientes de registrar al cierre.
- Aislamiento STAGING: pendiente de registrar al cierre.
- Edge Functions: pendientes de registrar al cierre.
- Supabase local y permisos por rol: pendientes de registrar al cierre.
- Playwright simulado: pendiente de registrar al cierre.
- GitHub Actions y barrera conjunta: pendientes de registrar al cierre.

La Fase 4 no quedará cerrada hasta que toda la barrera esté verde. Este documento no autoriza fusionar ramas, modificar `main`, publicar el frontend ni desplegar sobre producción.
