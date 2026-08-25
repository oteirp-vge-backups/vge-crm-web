# R10 — Fase 6: módulos funcionales

Fecha de ejecución: 26 de agosto de 2026.

## Objetivo y límites

Esta fase divide la funcionalidad de negocio que permanecía agrupada en `app.js`, sin reescribirla ni cambiar su comportamiento visible. Se trabaja en `r10/phase6-functional-modules`, apilada sobre la Fase 5. No modifica `main`, no publica el frontend y no escribe ni despliega en Supabase.

## Arquitectura resultante

| Orden | Módulo | Responsabilidad |
| --- | --- | --- |
| 1 | `config.js` | Configuración publicable y sustitución aislada en STAGING. |
| 2 | `core.js` | Estado compartido, formatos, validación y errores. |
| 3 | `supabase-service.js` | Cliente, tablas, RPC, Edge Functions y carga compartida. |
| 4 | `centers.js` | Carteras, listados, altas, archivo, restauración y ficha de centro. |
| 5 | `contacts.js` | Personas de contacto y actividad comercial. |
| 6 | `travel-agenda.js` | Viajes, oportunidades, ciclos, seguimientos, recordatorios y agenda. |
| 7 | `management.js` | Estadísticas, presencia, asignación masiva y exportaciones operativas. |
| 8 | `owner.js` | Usuarios, permisos, borrado permanente y copia completa. |
| 9 | `app.js` | Composición, navegación, panel y renderizado común. |
| 10 | `auth-permissions.js` | Sesión, autenticación, permisos y arranque. |

Los módulos continúan siendo scripts clásicos y comparten el mismo ámbito heredado. Se cargan una sola vez y en el orden anterior, antes de iniciar la sesión, para conservar el contrato de ejecución existente.

## Equivalencia y contratos

- Las 129 declaraciones que pertenecían a `app.js` en Fase 5 se compararon por nombre y cuerpo: las 129 son literalmente idénticas tras la redistribución.
- `app.js` pasa de 149.349 bytes a 7.828 bytes y conserva únicamente 11 declaraciones de composición común.
- Los cinco dominios extraídos contienen 118 declaraciones: centros 37, contactos 6, viajes/agenda 21, dirección 41 y propietario 13.
- El control de arquitectura impide funciones duplicadas, comprueba el propietario de los puntos críticos y bloquea que `app.js` recupere responsabilidades extraídas.
- El HTML continúa sin JavaScript concatenado y el espejo `publish/` contiene copias byte a byte de los once artefactos publicables.
- Las siete regresiones heredadas siguen leyendo la aplicación modular como una única fuente lógica; no se ha modificado ninguna de esas pruebas.

## Impacto en Supabase

No existen cambios de esquema, migraciones, RLS, datos, Auth, claves ni Edge Functions. La versión de navegador sigue fijada en `@supabase/supabase-js@2.111.0` y Node.js continúa fijado en la versión 22 dentro de CI. Por ello no se crea una rama remota de Supabase, no se generan datos temporales y no hay coste adicional.

## Verificación local

- Espejo publicable de once artefactos: correcto.
- Diez módulos, orden, sintaxis y separación del servicio Supabase: correctos.
- Seis contratos de propiedad funcional y 129 declaraciones únicas: correctos.
- Equivalencia literal de las 129 declaraciones respecto a Fase 5: correcta.
- Aislamiento STAGING y cinco controles antiobsolescencia: correctos.
- Siete regresiones heredadas: correctas.
- Playwright simulado sin acceso a producción: 4 de 4 recorridos correctos.
- Edge Functions: compilación y tipos Deno correctos en GitHub Actions.
- Supabase local efímero: 22 pruebas SQL para `owner`, `manager`, `seller`, `anon` y `service_role`, correctas.
- Barrera conjunta `Barrera R10 / publicación autorizable`: correcta.

## Evidencia de GitHub y cierre

- Rama técnica: `r10/phase6-functional-modules`.
- PR apilado en borrador: `#6`, con base `r10/phase5-core-modularization`.
- Commit técnico verificado: `f5a5342a359c937f6e1a4c8d2d2c21e5e79ec217`.
- GitHub Actions: ejecución `32907050225`, completada con éxito.
- No se creó ninguna rama remota de Supabase: la consulta final devuelve únicamente `main`; no hubo datos temporales, despliegues ni coste adicional.
- `main` permanece protegida y en `ccdd2909e646381a9326d600651b8aa912f4b731`; producción no recibió cambios.

La Fase 6 queda técnicamente cerrada. Este cierre no autoriza fusionar ramas, modificar `main`, publicar el frontend ni desplegar sobre producción.
