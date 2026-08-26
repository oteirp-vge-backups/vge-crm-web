# R10 — Fase 7: reducción de `SECURITY DEFINER`

Fecha de ejecución: 26 de agosto de 2026.

## Objetivo y límites

La fase reduce privilegios elevados, cierra RPC heredadas y fija por prueba la matriz de ejecución por rol. Se desarrolla en `r10/phase7-security-definer`, apilada sobre la Fase 6. No modifica `main`, no escribe en producción, no despliega migraciones ni publica el frontend.

## Auditoría previa

- La línea base contiene 68 funciones `SECURITY DEFINER` en `public` y `private`.
- Todas utilizan un `search_path` fijo; no se encontró una función privilegiada con búsqueda mutable.
- `anon` no ejecuta ninguna función privilegiada.
- El navegador y las Edge Functions se contrastaron con todas las llamadas `.rpc()` del repositorio.
- Nueve entradas concedidas a `authenticated` ya no forman parte de ningún contrato actual; otras dos entradas heredadas ya estaban cerradas.
- Tres triggers elevados sólo validan o transforman la fila nueva y no requieren permisos del propietario.
- Las alertas restantes del Security Advisor corresponden a RPC activas o helpers RLS inventariados en la matriz; no se elimina elevación necesaria de forma automática.

## Cambio candidato

La migración `20260826061114_reduce_security_definer_surface.sql`:

1. Convierte tres triggers puros a `SECURITY INVOKER`.
2. Convierte once funciones públicas heredadas o internas a `SECURITY INVOKER`.
3. Revoca su ejecución a `PUBLIC`, `anon`, `authenticated` y `service_role`.
4. Revoca el permiso `EXECUTE` predeterminado para futuras funciones públicas, obligando a conceder cada RPC expresamente.
5. Conserva definiciones y dependencias para que el cambio sea reversible y no destruya objetos.

La CLI 2.115.0 no pudo crear el archivo porque el entorno gestionado impide escribir su directorio interno bajo `/root`. No se alteraron permisos ni se eludió esa restricción: el nombre usa el timestamp UTC real `20260826061114` y el SQL se añadió mediante el editor controlado del repositorio.

## Controles

- La matriz firmada está en `R10_PHASE7_SECURITY_MATRIX.md`.
- Una prueba pgTAP nueva contiene 13 aserciones sobre cantidad, `search_path`, listas permitidas, roles y tablas internas.
- Se conservan las 22 pruebas funcionales de `owner`, `manager`, `seller`, `anon` y `service_role`.
- CI aplica una línea base sanitizada en Supabase local efímero y, después, sólo la migración candidata de Fase 7.
- El rollback revisable está en `docs/rollback/R10_PHASE7_ROLLBACK.sql`; nunca se ejecuta automáticamente.
- Las regresiones Node.js, la compilación frontend/Edge y los cuatro recorridos Playwright siguen formando parte de la barrera conjunta.

## Criterio de cierre

La fase quedará técnicamente cerrada cuando la migración y sus 35 pruebas SQL superen la barrera de GitHub, la matriz pase a estado validado y se confirme nuevamente que `main` y producción no cambiaron. El PR permanecerá en borrador; cualquier despliegue o fusión requiere una autorización posterior y específica.

## Evidencia de GitHub

- Rama técnica: `r10/phase7-security-definer`.
- PR apilado: pendiente de creación, con base `r10/phase6-functional-modules`.
- Commit técnico: pendiente.
- GitHub Actions: pendiente.
- Estado: en validación; sin despliegue.
