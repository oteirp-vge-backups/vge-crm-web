# R10 — Fase 2C: STAGING integrado y recorridos reales

Ventana de ejecución: 25 de agosto de 2026, de `21:10:30Z` a `21:26:58Z` (16 minutos y 28 segundos).

## Objetivo y límites

Esta fase valida el CRM en navegador contra una rama remota y desechable de Supabase, sin datos de producción. No modifica `main`, no publica el frontend y no escribe en el proyecto de producción `sjraugywirjohrqmacvb`.

## Diseno de aislamiento

- La rama Supabase se crea solo cuando el arnés ya está preparado y se elimina al terminar.
- El servidor local de pruebas sustituye `VGE_CONFIG` en memoria; `index.html` y `publish/index.html` permanecen identicos y con su configuracion publicable intacta.
- El servidor rechaza expresamente el project ref de producción y cualquier clave identificada como `service_role`.
- Playwright bloquea cualquier peticion a un host Supabase distinto del STAGING autorizado.
- Correos, contraseñas y claves se suministran por variables de entorno y nunca se versionan.
- Los usuarios, centros y viajes sinteticos solo existen en la rama desechable.

## Recorridos obligatorios

1. `seller`: inicio de sesión real, restricciones de interfaz, alta manual sin doble creación, contacto, viaje, búsqueda y CSV.
2. `manager`: alcance global, ausencia de controles de propietario, archivo reversible y restauración.
3. `owner`: administración de usuarios y copia JSON exclusivas.
4. Red: ninguna solicitud al proyecto Supabase de producción.

## Evidencia ejecutada

- Rama temporal: `r10-phase2c-staging-temp`.
- Branch ID: `80482497-dd90-47c4-a4d0-798f04a3de18`.
- Project ref aislado: `ifizehjxghfzqopowyln`.
- Datos de producción copiados: ninguno (`with_data: false`).
- La creación inicial reveló que Supabase reconstruía solo 3 migraciones históricas y 9 tablas públicas. Antes de probar se sustituyó exclusivamente el esquema vacío del STAGING por la línea base sanitizada de 2A: 20 tablas con RLS y las 6 RPC críticas verificadas.
- Fixture desechable final: 3 usuarios Auth sintéticos, 3 operadores funcionales (`owner`, `manager`, `seller`), el operador técnico `Sin asignar` y una campaña predeterminada.
- Playwright integrado: 3 de 3 recorridos correctos en 57,4 segundos.
- Resultado funcional: 2 altas sintéticas acumuladas durante la depuración controlada, 2 contactos, 2 oportunidades y una secuencia real `archive`/`restore`; todas quedaron dentro de la rama eliminada.
- Control local repetido al cierre: 7 regresiones heredadas, validación del frontend, aislamiento STAGING, sintaxis Node.js y 4 de 4 recorridos Playwright simulados, todo correcto.
- `index.html` y `publish/index.html` permanecen idénticos; no contienen credenciales de STAGING.

## Cierre y eliminación

Supabase confirmó `success: true` al eliminar la rama a las `21:26:58Z`. La consulta posterior devolvió únicamente `main`, por lo que usuarios, sesiones, centros, contactos, oportunidades y claves del STAGING dejaron de existir con la rama. Esta eliminación es definitiva, intencionada y no afecta a producción.

## Coste y cierre

La tarifa confirmada fue de 0,01344 USD por hora mientras existiera la rama. La ventana facturable fue de 16 minutos y 28 segundos y ya no queda coste recurrente. La facturación efectiva depende del criterio de prorrateo de Supabase.

La Fase 2C queda técnicamente cerrada. Este cierre no autoriza fusionar ramas, modificar `main`, publicar el frontend ni desplegar sobre producción.
