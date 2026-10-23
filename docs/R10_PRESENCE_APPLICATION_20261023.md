# R10 — aplicación autorizada de permisos de presencia, 23/10/2026

## Estado y límites

La migración del PR #22 ya está aplicada y verificada en producción. El PR permanece en borrador: NO se ha autorizado fusionar, publicar ni modificar archivos de la aplicación. Este registro posterior complementa el documento de preparación R10_PRESENCE_REVIEW_20261023.md; su estado previo no describe la situación posterior a esta aplicación.

Fernando autorizó únicamente aplicar el SQL de la revisión `6565898da0dcb2cdaa90b52f4f7282f67d3aa48e`, verificarlo y actualizar su registro técnico; autorizó la reversión exacta solo ante una incidencia atribuible al cambio. No se ha ejecutado la reversión porque las comprobaciones efectuadas no han identificado una diferencia inesperada.

Proyecto: `sjraugywirjohrqmacvb`. Aunque se denomina STAGING, es producción. Se comprobó ACTIVE_HEALTHY antes de intervenir. Main permanecía en `472158964acaf4908837d3edb1584b095a435ac6`.

## Identidad del SQL aplicado

Archivo inalterado: `supabase/migrations/20261023144210_reduce_operator_presence_admin_privileges.sql`.

SHA-256: `145d8e1d22903b87c6e26503cf9edb0d75eca39d078a5a6392a14cdb99b161b3`.

La llamada apply_migration devolvió success. La consulta posterior al registro real de Supabase confirma una sola entrada y una sola sentencia guardada, con SHA-256 idéntico al archivo autorizado. Versión asignada realmente: **20261023152117**. Nombre: `reduce_operator_presence_admin_privileges`. El inventario pasa de 50 a **51**; el identificador del archivo fuente se conserva y se vincula con la versión real, sin inventar ni reescribir el historial.

## Evidencia de solo lectura antes y después

- Antes: 2026-10-23T15:20:09.464006Z, estado ORIGINAL, 50 migraciones, última 20261013112310. Sin entrada previa para esta migración.
- Después: 2026-10-23T15:21:43.885564Z, estado HARDENED, 51 migraciones, última 20261023152117.
- Ambas consultas: transacción READ ONLY, statement_timeout 10s, lock_timeout 1s, sin filas comerciales ni llamadas a funciones de aplicación.

ACL anterior: `{postgres=arwdDxtm/postgres,authenticated=rDxtm/postgres,service_role=Dxtm/postgres}`.

ACL posterior: `{postgres=arwdDxtm/postgres,authenticated=r/postgres}`.

Permisos efectivos posteriores: anon ninguno; authenticated solo SELECT; service_role ninguno sobre ESTA tabla. Se han retirado TRUNCATE, REFERENCES, TRIGGER y MAINTAIN de los dos roles, ocho concesiones en total. Propietario postgres, RLS=true y force_rls=false sin cambios.

Las cuatro funciones relacionadas conservan sus definiciones, propietarios, modo y permisos. La política operator_presence_admin_select mantiene SELECT para authenticated con private.is_admin(). Las huellas de comparación de los catálogos siguientes son idénticas antes y después:

| Catálogo comprobado | Huella MD5 de comparación, idéntica antes/después |
|---|---|
| Otras relaciones de public/private: ACL, propietario, RLS, opciones | 0eeaff3f0129a9d6d4fdab844f7f34d7 |
| Funciones de public/private: definición, ACL y propietario | a8ed5faf857bd73884662b7ece3530ac |
| Políticas de public/private | e783e1efc8538e759fce438a7280df2f |
| Privilegios predeterminados | 51b3faa83c3ea906f8fd42ca2572ccfc |
| Columnas de public/private | 9a0c2d331a88f20b3dec3510641bed38 |
| Restricciones de public/private | 724cdd374739f1cb14141980455e1b3d |
| Triggers de public/private | aa70671b01007f8ab7ce3b8467f39bc8 |

Estas huellas comparan metadatos; no certifican ausencia de incidentes ni representan hashes de datos comerciales. No se han efectuado INSERT/UPDATE/DELETE/TRUNCATE de registros de negocio. La única escritura operativa fue la migración aprobada y su registro automático.

## Registro técnico reconciliado, solo en la rama

Se añade la versión real al inventario aplicado y su relación con el archivo; se retira de pendientes. Se actualiza de 50 a 51 la expectativa exacta del inventario en la barrera R10, sin relajar los controles ni cambiar su lógica. La base histórica sellada y las migraciones SQL conservan sus bytes. Los contratos de prueba permanecen intactos y siguen reconstruyendo y probando el SQL posterior al ancla histórica, aunque ahora conste como aplicado en remoto.

Las tres ejecuciones satisfactorias de la revisión autorizada se volvieron a consultar antes de aplicar: 39974401120 (presencia/reversión), 39974401116 (Data API) y 39974401095 (barrera R10). El artefacto final de presencia se verificó por SHA-256 y contiene 14 pruebas de ciclo, 217 aserciones posteriores y 18 comprobaciones HTTP locales satisfactorias.

El estado de las pruebas de este commit administrativo debe consultarse por su nuevo SHA; no se presenta la evidencia previa como una ejecución nueva. Esta actualización de registro no vuelve a ejecutar la migración remota.

## Pendiente y alcance no cubierto

No hay fusión, publicación de Pages, despliegue de funciones, db push, db reset, restauración, modificación de copias, cambios PHP/DNS/claves ni reactivación del proyecto pausado. Los otros avisos del asesor de seguridad y el simulacro completo de recuperación permanecen separados.

La comprobación posterior certifica los permisos y metadatos descritos. No se ha iniciado una sesión real de usuario ni efectuado operaciones funcionales de escritura en producción. Cualquier reversión exige confirmar una incidencia atribuible y usar exclusivamente el procedimiento autorizado; no se concede GRANT ALL ni se elimina historial.
