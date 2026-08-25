# R10 — Fase 2B: barrera de calidad

Fecha: 25 de agosto de 2026.

## Objetivo y límites

Esta fase convierte el estado auditado de 2A en una base verificable antes de cualquier publicación. No cambia el comportamiento visible del CRM, no modifica la línea base SQL, no accede a producción y no despliega la aplicación.

La barrera usa Node.js 22, Deno 2.5.6, Supabase CLI 2.115.0, PostgreSQL local efímero y Playwright 1.62.1. Ningún job recibe secretos de Supabase, AWS o GitHub distintos del token de lectura implícito de Actions.

## Controles obligatorios

| Job | Evidencia exigida |
|---|---|
| `Regresión heredada (7 pruebas)` | Ejecuta exactamente las siete pruebas R9 existentes y conserva el registro de 42 migraciones de 2A. |
| `Sintaxis y compilación` | Comprueba el espejo web, compila los scripts del HTML, valida los archivos Node.js y ejecuta `deno check` sobre las dos Edge Functions. |
| `Supabase local y permisos por rol` | Verifica el hash de la línea base, la aplica en Supabase local vacío y ejecuta 22 aserciones pgTAP para `owner`, `manager`, `seller`, `anon` y `service_role`. Cada fichero de prueba se revierte al terminar. |
| `Playwright sin acceso a producción` | Recorre acceso rechazado, recuperación, invitación y sesión comercial. Sustituye Supabase por un simulador y aborta toda red externa no autorizada; además falla si detecta una petición a `supabase.co`. |
| `Barrera R10 / publicación autorizable` | Solo queda verde cuando los cuatro jobs anteriores concluyen con éxito. No despliega ni publica. |

## Matriz mínima de permisos probada

| Identidad | Lectura esperada | Operaciones esperadas | Denegaciones permanentes |
|---|---|---|---|
| `owner` | Todo el CRM activo | Administración de usuarios y facultades de propietario | — |
| `manager` | Todo el CRM activo | Asignación operativa | Administración de usuarios, copia completa y seguridad de propietario |
| `seller` | Solo cartera asignada | Operación comercial propia | Reasignación y administración de usuarios |
| `anon` | Ninguna tabla CRM | Ninguna RPC autenticada | Datos, permisos y copia completa |
| `service_role` | Sin lectura directa general | Solo RPC técnicas de la cola de agenda expresamente concedidas | Superficie interactiva del propietario y alta directa de operadores |

## Aislamiento y coste

- La base de datos se crea dentro del runner de GitHub y se destruye al finalizar.
- Las tres migraciones históricas parciales se apartan únicamente dentro del runner para aplicar la línea base completa de 2A sobre una base vacía; el repositorio no se altera durante el job.
- Playwright no utiliza el URL ni la clave publicable configurados en el frontend.
- No se crea una rama Supabase remota, por lo que esta parte de 2B no añade coste de STAGING.
- Los artefactos de Playwright solo se generan al fallar y se conservan durante un día.

## Regla de publicación

El check requerido para cualquier futura promoción a `main` es `Barrera R10 / publicación autorizable`. Una ejecución verde autoriza únicamente la revisión técnica; no sustituye la autorización explícita de despliegue a producción ni fusiona ninguna rama.

## Evidencia técnica final

- Rama técnica: `r10/phase2b-quality-gate`.
- PR apilado en borrador: `#2`, con base `r10/phase2a-foundations`.
- Commit técnico verificado: `88bb7bd2365a9149acd6305049f59cf9b99550be`.
- GitHub Actions: ejecución `32848261297`, completada con éxito.
- Los cinco jobs, incluida `Barrera R10 / publicación autorizable`, quedaron verdes.
- La base efímera aplicó la línea base y superó las 22 aserciones pgTAP.
- Los cuatro recorridos Playwright pasaron sin peticiones a producción.

## Protección de `main`: control administrativo completado

El 25 de agosto de 2026 se creó y verificó el ruleset de repositorio `R10 - protección de main` (ID `21485889`).

GitHub confirmó:

- estado `active`;
- aplicación exclusiva a la rama predeterminada `main`;
- lista de bypass vacía y `current_user_can_bypass: never`;
- pull request obligatorio antes de fusionar, con 0 aprobaciones requeridas;
- check obligatorio `Barrera R10 / publicación autorizable`;
- política estricta de rama actualizada antes de fusionar;
- bloqueo de force-push;
- bloqueo de eliminación de `main`;
- rama `main` marcada como `protected: true`.

## Cierre de fase

La Fase 2B queda cerrada técnicamente y administrativamente. Este cierre no autoriza fusionar el PR, modificar `main`, desplegar la aplicación ni escribir en producción.

En el momento del cierre:

- el PR `#2` permanece abierto y en borrador;
- `main` permanece en `ccdd2909e646381a9326d600651b8aa912f4b731`;
- producción no ha recibido cambios.
