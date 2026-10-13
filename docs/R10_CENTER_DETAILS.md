# R10 — edición de datos generales del centro

Fecha: 13 de octubre de 2026. Candidata: `r10-phase10.0.5`.
Base estable observada: `d0ff651e716bcbd3cb5416b1bf0f1132f89a3a3c`, `r10-phase10.0.4`.

## Resultado

El frontend preparado permite corregir nombre, teléfono general y email general con «Guardar ficha». El comercial sólo puede modificar centros de su cartera; propietario y administración conservan su acceso global. Localidad y provincia continúan reservadas a administración. El identificador, origen, asignación y vínculos no se modifican mediante los nuevos campos.

Sólo se envían los datos generales que han cambiado. Así, un teléfono o email histórico con formato imperfecto no bloquea un guardado ajeno a esos campos. El nombre corregido exige entre 3 y 240 caracteres. Los teléfonos nuevos admiten formato internacional y entre 6 y 15 cifras; los emails nuevos se validan y normalizan a minúsculas. Teléfono y email son opcionales y pueden vaciarse. Los datos del profesor se mantienen separados.

## Guardado y concurrencia

La migración nueva amplía el RPC existente `update_center_profile_v2`, sin nuevas tablas ni accesos directos. Comprueba autenticación, alcance del centro, actividad y versión esperada antes de modificar datos. Catálogo, versión y auditoría se guardan en la misma transacción. Un rechazo conserva los datos anteriores; el cliente trabaja sobre un borrador y no sustituye prematuramente el registro de la cartera.

Se rechaza una nueva identidad exacta —nombre normalizado, localidad y provincia— que ya corresponda a otro centro, incluidos los archivados. El bloqueo de identidad utiliza la misma clave que el alta manual para coordinar operaciones simultáneas. Los homónimos históricos no se invalidan por una corrección que sólo cambia mayúsculas o acentos. Compartir teléfono o email entre centros distintos no se convierte en una restricción nueva.

La auditoría conserva operador, fecha y valores anterior/nuevo bajo `_scope: center_details`, dentro de la tabla administrativa existente. No añade un contacto comercial ni altera las estadísticas de contactos. La política que limita la lectura de auditoría a administración se mantiene.

## Validación

- Barreras existentes: espejo publicable, sintaxis, contratos de módulos, regresiones heredadas, aislamiento, componentes obsoletos y artefacto/retorno.
- 46 comprobaciones pgTAP en `r10_center_details.test.sql`: permisos, escritura propia y global, rechazo entre carteras, centros archivados, valores inválidos, versiones obsoletas, duplicados, auditoría y conservación de contactos/viajes/agenda.
- 9 recorridos Playwright nuevos, con toda conexión a producción bloqueada: corrección y reapertura, rol propietario, datos históricos, vaciado, tres validaciones y dos rechazos de servidor.
- La barrera CI aplica la candidata únicamente en su Supabase local efímero. El resultado de esa ejecución es requisito para promocionar el cambio.

## Despliegue de base de datos completado

Fernando autorizó únicamente «autorizo aplicar la migracion» el 13 de octubre de 2026. Se aplicó exactamente la fuente probada, SHA-256 `3a94ec77209c7924703a834286eb8bf560fce1f2389132ae7f4556935bc0b595`, con versión productiva `20261013112310`. El inventario remoto pasa de 49 a 50 registros y la candidata se retira del inventario pendiente.

Se verificó la coincidencia exacta del cuerpo instalado y la conservación de huellas/recuentos en ocho conjuntos de datos: centros, estados, personas, viajes, campañas, contactos comerciales, anotaciones y auditoría. RLS, políticas, privilegios y avisos de seguridad permanecen iguales. Tres pruebas de la RPC en una transacción de sólo lectura confirmaron rechazo anónimo, exigencia de sesión y rechazo de identidad sin operador.

La web permanece en `r10-phase10.0.4`. La fusión de `main` y la publicación de `r10-phase10.0.5` no están autorizadas todavía. Evidencia: `docs/audit/R10_CENTER_DETAILS_DEPLOYMENT_2026-10-13.json`.

## Promoción autorizable

1. Exigir la barrera completa verde sobre el SHA concreto del PR.
2. La migración ya está autorizada y aplicada. Obtener únicamente la autorización pendiente para fusionar el PR #20 y publicar el frontend.
3. Verificar una copia reciente y conservar la referencia/artefacto web anterior.
4. La migración `enable_center_details_editing` está aplicada; no repetirla ni aplicar la línea base o migraciones históricas.
5. Verificar función, privilegios, RLS y recuentos sin alterar filas reales como prueba.
6. El inventario productivo ya se ha reconciliado con la versión observada y la entrada aplicada se ha retirado de `pending-migrations.json`. Mantener esa evidencia durante la promoción web.
7. Publicar el frontend probado y verificar la versión, el acceso y los nuevos campos.

El inventario histórico permanece inmutable. Las fuentes pendientes se declaran por separado, con SHA-256 y estado `pending_authorization`, para que la barrera cubra exactamente las fuentes aplicadas y candidatas sin fingir un despliegue productivo.

Retorno: `docs/rollback/R10_CENTER_DETAILS_ROLLBACK.md`. El cliente anterior es compatible con la ampliación del RPC y puede recuperarse conservando todas las correcciones y auditorías.
