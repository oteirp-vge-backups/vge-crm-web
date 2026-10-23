# R10 — migración mínima de permisos de presencia

## Alcance y estado de preparación — 23/10/2026

Continuación autorizada por Fernando para preparar y probar, con intervención mínima. PR #22 en borrador. **No aplicar en producción, fusionar, publicar ni activar auto-merge sin autorización específica.** Base operativa `472158964acaf4908837d3edb1584b095a435ac6`; el proyecto `sjraugywirjohrqmacvb`, aunque se llame STAGING, es producción.

La consulta de catálogos READ ONLY del 23/10/2026, 14:42 UTC, confirma PostgreSQL 17.6, 50 migraciones (última `20261013112310`), RLS activo y propietario postgres. ACL original: `{postgres=arwdDxtm/postgres,authenticated=rDxtm/postgres,service_role=Dxtm/postgres}`. No se consultaron datos comerciales ni se ejecutaron funciones de la aplicación en producción.

## Archivo formal, generado y sellado

`supabase/migrations/20261023144210_reduce_operator_presence_admin_privileges.sql`

Nombre generado por CLI 2.115.0 mediante `supabase migration new reduce_operator_presence_admin_privileges`, en un directorio desechable SIN conexión a bases. Ejecución `39971862391`, job `120476347295`. No se inventó el identificador.

SHA-256: `145d8e1d22903b87c6e26503cf9edb0d75eca39d078a5a6392a14cdb99b161b3`.

El inventario aplicado permanece en 50. La candidata aparece solo en `pending-migrations.json` como `pending_authorization`, y en `data-api-contracts.json` con SELECT para authenticated, ningún permiso directo para anon/service_role y las 39 pruebas específicas ya existentes. La fixture preliminar se elimina para no confundirla con la migración real.

## Cambio único y barreras

Una sentencia DO atómica retira TRUNCATE, REFERENCES, TRIGGER y MAINTAIN de authenticated y service_role únicamente sobre `public.operator_presence`, usando RESTRICT, no CASCADE. Conserva SELECT autenticado, propietario, RLS, políticas, funciones, filas y defaults. No cambia archivos de la aplicación ni SQL histórico.

Se comprueba el ejecutor postgres, la estructura/RLS esperada, la ACL exacta original o la mínima ya aplicada, y los permisos/propietario de las tres RPC de presencia. Se comprueba la ACL mínima y los privilegios efectivos después del REVOKE. Un estado desconocido produce error en lugar de ampliar permisos. La repetición de la migración es idempotente. Se limita a 2 segundos la espera de bloqueos y se restaura ese ajuste de sesión al terminar; no equivale a garantizar cero interrupciones.

## Pruebas sobre los archivos definitivos

El control estándar de Data API descubre, verifica hash y aplica la migración formal a localhost; comprueba el contrato de acceso y repite regresiones y suite específica. La revisión adicional de presencia ejecuta exactamente el mismo archivo y el rollback guardado, no copias de sus instrucciones.

Antes de la aplicación normal de candidatas, el ciclo adicional compara catálogos (ACL, RLS, funciones, políticas, defaults, columnas, restricciones y triggers), prueba repetición, reversión exacta, fallo forzado con rollback transaccional, rechazo de grants inesperados/parciales, RLS desactivado, permisos de RPC alterados, ejecutor indebido y reversión no confirmada. Incluye una fila de presencia ficticia no vacía para verificar que no cambia. Al terminar devuelve la base local al estado original y la vía normal del planificador aplica la candidata otra vez, con sus pruebas. El entorno se destruye al finalizar.

Estado de este documento al preparar el commit: CI pendiente. La evidencia final debe estar en el PR y corresponder a su SHA exacto; no reutilizar resultados de la fixture anterior. Las 39 pruebas específicas son SQL con identidades ficticias. Las 18 HTTP existentes cubren permisos generales, carteras y edición de centros, no login real con contraseña.

## Comprobación previa y posterior (solo lectura)

`supabase/verification/r10_presence_pre_post.sql` entrega ORIGINAL, HARDENED o DRIFT junto con ACL, permisos efectivos, definiciones/permisos de las cuatro funciones relacionadas, políticas y migraciones. No consulta filas comerciales ni llama a RPC funcionales. Un estado DRIFT, una tabla ausente o diferencias inesperadas obligan a detenerse.

### Secuencia futura, solo con autorización

1. Verificar SHA aprobado, destino exacto y estado ORIGINAL (o tratar HARDENED como intervención ya efectuada, sin duplicar historial). Conservar evidencia previa; confirmar 50 migraciones y ninguna modificación concurrente que cambie el alcance.
2. Aplicar exclusivamente el contenido SQL sellado con nombre `reduce_operator_presence_admin_privileges` y registro de migración. **No usar db push, db reset ni restaurar el esquema histórico.**
3. Repetir la lectura: esperar HARDENED, SELECT autenticado conservado, ocho concesiones retiradas, funciones/políticas/RLS sin cambios, y registrar la versión real asignada por Supabase. No inventar una versión aplicada a partir del nombre del archivo.
4. Reconciliar el inventario aplicado y la candidata pendiente solo después de verificar la operación real. Al pasar de 50 a 51, también habrá que actualizar la expectativa exacta del inventario en la barrera de calidad, con pruebas; no hacerlo anticipadamente en esta preparación.
5. Cualquier fusión y publicación de Pages posterior requiere el alcance autorizado correspondiente. La aplicación JavaScript debe continuar intacta.

## Reversión preparada, NO ejecutada en producción

`supabase/rollback/r10_presence_restore_audited_acl.sql`, fuera del directorio de migraciones automáticas. SHA-256 `4b6e196f07ca4fb999939c53703e26dcbc23c91d31952ebee64c01e052bd0239`.

Solo permite volver desde la ACL mínima exacta, con ejecutor postgres y confirmación de sesión `r10.presence_rollback=RESTORE_AUDITED_ACL`. Restaura únicamente los ocho permisos que existían, no GRANT ALL. Esa vuelta reintroduce el exceso de permisos, por lo que es una contingencia, no el estado deseado. Exige autorización de reversión en producción; no se ejecuta por una alarma genérica ni elimina registros del historial. Si fuese necesaria, documentar una operación compensatoria y reconciliar el historial en vez de falsearlo.

## Límites y asuntos separados

La lectura del asesor remoto ha devuelto 3 avisos informativos de RLS sin políticas en tablas internas y 37 avisos de SECURITY DEFINER ejecutables por authenticated. No se han cambiado esas funciones ni se afirma que esos avisos sean todos vulnerabilidades. El alcance de este PR es la ACL de presencia, no una auditoría integral.

PHP se mantiene como frente independiente de las webs gestionadas por proveedores. Este trabajo no instala ni configura PHP, no actualiza DNS ni cuentas de hosting y no certifica sus parches. El CRM revisado usa JavaScript/Pages/Supabase. También quedan separados el simulacro completo de copia real y la conversión del control Data API en requisito obligatorio de fusión.

Fuentes: https://www.postgresql.org/docs/17/sql-revoke.html ; https://supabase.com/docs/guides/deployment/database-migrations ; https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically .
