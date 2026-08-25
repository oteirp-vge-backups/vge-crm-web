# R10 — Fase 5: modularización del núcleo técnico

Fecha de ejecución: 26 de agosto de 2026.

## Objetivo y límites

Esta fase separa los cimientos técnicos del CRM sin reescribirlo ni cambiar su comportamiento visible. Se trabaja en `r10/phase5-core-modularization`, apilada sobre la Fase 4. No modifica `main`, no publica el frontend y no escribe ni despliega en Supabase.

La regla aplicada es: **primero se separa; después se mejora**. Los módulos funcionales de centros, contactos, viajes, dirección y propietario permanecen juntos en `app.js` y se dividirán en la fase posterior.

## Arquitectura resultante

| Orden | Módulo | Responsabilidad |
| --- | --- | --- |
| 1 | `assets/js/config.js` | URL y clave publicable de navegador; admite sustitución aislada en STAGING. |
| 2 | `assets/js/core.js` | Constantes, estado compartido, formatos, validadores y mensajes de error. |
| 3 | `assets/js/supabase-service.js` | Creación del cliente, acceso a tablas, RPC, Edge Functions y carga de datos compartida. |
| 4 | `assets/js/app.js` | Funcionalidad de negocio y presentación todavía pendiente de subdividir. |
| 5 | `assets/js/auth-permissions.js` | Sesión, acceso, roles, recuperación y cambio de contraseña, refresco de permisos y arranque. |

`index.html` ya no contiene JavaScript concatenado. Carga los cinco módulos clásicos en ese orden para conservar el ámbito compartido y el comportamiento exacto del CRM heredado.

## Contratos de separación

- Solo `supabase-service.js` puede crear el cliente o utilizar directamente `sb.rpc`, `sb.from` y `sb.functions`.
- `auth-permissions.js` conserva únicamente las operaciones de `sb.auth` y solicita la conexión al servicio.
- La versión de navegador continúa fijada en `@supabase/supabase-js@2.111.0`.
- El frontend no contiene ni admite `service_role`.
- La configuración de STAGING se inyecta exclusivamente al servir `config.js`; el HTML no contiene credenciales de pruebas.
- `publish/` se genera con `npm run build:publish` y se valida byte a byte con `npm run check:publish`.
- Las siete regresiones heredadas leen ahora el HTML y los cinco módulos como una única fuente lógica, por lo que siguen protegiendo las mismas funciones.

## Impacto en Supabase

No existen cambios de esquema, migraciones, RLS, datos, Auth, claves ni Edge Functions. La revisión de documentación y cambios vigentes no exige modificar las llamadas utilizadas en este cliente de navegador. Por ello no se crea una rama remota Supabase, no se generan datos temporales y no hay coste adicional.

## Verificación

- Espejo publicable de seis artefactos: correcto.
- Cinco módulos, orden y sintaxis: correctos.
- Aislamiento STAGING en `config.js`: correcto.
- Cinco controles antiobsolescencia: correctos.
- Siete regresiones heredadas: correctas.
- Playwright simulado sin acceso a producción: 4 de 4 recorridos correctos.
- Edge Functions: compilación y tipos Deno correctos.
- Supabase local efímero: 22 pruebas SQL para `owner`, `manager`, `seller`, `anon` y `service_role`, correctas.
- Barrera conjunta `Barrera R10 / publicación autorizable`: correcta.

## Evidencia de GitHub y cierre

- Rama técnica: `r10/phase5-core-modularization`.
- PR apilado en borrador: `#5`, con base `r10/phase4-obsolete-cleanup`.
- Commit técnico verificado: `6e6774d4a8a517b023915385ce4192f059d4d8db`.
- GitHub Actions: ejecución `32905250674`, completada con éxito.
- No se creó ninguna rama remota de Supabase: no hubo datos temporales, despliegues ni coste adicional.
- `main` permanece en `ccdd2909e646381a9326d600651b8aa912f4b731` y producción no recibió cambios.

La Fase 5 queda técnicamente cerrada. Este cierre no autoriza fusionar ramas, modificar `main`, publicar el frontend ni desplegar sobre producción.
