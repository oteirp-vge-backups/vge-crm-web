# R10 — revisión aislada de permisos de presencia y aplicabilidad PHP

## Alcance — 23 de octubre de 2026

Continuación de la revisión acotada autorizada por Fernando, tras PR #21. Base main observada: `472158964acaf4908837d3edb1584b095a435ac6`. NO autoriza fusionar, publicar, cambiar permisos de Supabase remoto o ejecutar migraciones remotas. El proyecto con nombre STAGING se trata como producción. Ninguna fila comercial ha sido consultada para esta revisión.

## Diagnóstico de solo lectura

Consulta de catálogos, con BEGIN TRANSACTION READ ONLY, statement_timeout 10s y lock_timeout 1s. A las 14:18 UTC del 23/10/2026: 50 migraciones, última 20261013112310; operator_presence conserva RLS y propietario postgres. authenticated tiene SELECT y TRUNCATE/REFERENCES/TRIGGER/MAINTAIN; service_role conserva estos cuatro permisos administrativos, sin CRUD. anon no tiene permisos. La lectura directa se filtra mediante la política administrativa. Heartbeat/logout y vista del equipo usan las RPC existentes con controles internos; la RPC heredada no es ejecutable por authenticated.

La presencia de permisos no demuestra un endpoint explotable ni un incidente. TRUNCATE y REFERENCES no están sujetos a RLS. El objetivo es minimizar privilegios, no resolver una vulnerabilidad PHP.

## Candidata estudiada, NO migración de producción

La fixture protegida retira solo TRUNCATE, REFERENCES, TRIGGER y MAINTAIN de authenticated y service_role en UNA tabla: public.operator_presence. Conserva SELECT autenticado, RLS, políticas, funciones, permisos de otras tablas y defaults. Captura metadatos antes y comprueba su invariancia después. No altera datos de negocio, usuarios remotos ni las reglas de reparto comercial.

El nuevo workflow pasa R10_PRESENCE_REVIEW=YES al ejecutor local ya existente. Solo esa ejecución aplica la fixture a la reconstrucción vacía antes de repetir los controles. La ejecución estándar del PR #21 NO aplica la fixture. No existe archivo nuevo en supabase/migrations, ni se cambia pending-migrations o el inventario aplicado. No debe confundirse una fixture de prueba con una migración aplicable.

La nueva suite usa cuatro identidades ficticias y verifica permisos, login/heartbeat, logout, reconexión, aislamiento entre comerciales, visibilidad de propietario/administración, denegación sin identidad y a identidades no vinculadas. Los tests revierten sus datos; el stack local se destruye al terminar. La ejecución repite además la reconstrucción histórica y las comprobaciones HTTP existentes después de retirar permisos localmente.

Estado inicial: resultados de CI pendientes. El resultado final debe consultarse en el PR para su SHA exacto. Ningún éxito previo se considera evidencia de esta revisión.

## PHP — alcance separado

El árbol de main revisado no contiene archivos PHP. La aplicación usa cliente JavaScript con Supabase; GitHub Pages sirve contenido estático y Edge Functions usa TypeScript/Deno. No se ha identificado un runtime PHP propio que actualizar en el CRM. Esto NO certifica la seguridad de toda la infraestructura de terceros ni la de otras webs.

PHP publicó el 21/10/2026 correcciones para CVE-2026-109618 y CVE-2026-109619: 8.2.35, 8.3.36, 8.4.27 y 8.5.12; también pueden existir backports del distribuidor. El aviso adicional del 23/10 menciona CVE-2026-115560 y una combinación concreta de configuración/cambio de serializador de sesión en ejecución; recomienda session.upload_progress.enabled=0 hasta la siguiente corrección cuando corresponda. No basta inferir de un email genérico que cada dominio y configuración están verificados.

Pedir al responsable de las webs PHP confirmación del dominio/servicio cubierto, versión o paquete parcheado efectivo, reinicio de trabajadores y revisión de aplicabilidad del aviso adicional del 23/10. No modificar configuración PHP, límites de memoria, DNS, credenciales ni cuentas compartidas sin diagnóstico y autorización. Si se descubre una integración PHP, se evalúa ese componente y sus accesos por separado.

Fuentes primarias consultadas:
- https://www.php.net/archive/2026.php (avisos 21 y 23 de octubre)
- https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://supabase.com/docs/guides/functions

Pendientes independientes: preparación y validación de una migración formal si se decide aplicar esta retirada; autorización posterior antes de producción; restauración completa de una copia real; reglas obligatorias de fusión del control Data API. No se han dado por resueltos.
