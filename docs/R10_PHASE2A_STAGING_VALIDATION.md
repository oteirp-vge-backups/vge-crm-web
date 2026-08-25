# R10 Fase 2A — validación de la línea base en STAGING

Fecha: 25 de agosto de 2026.

## Alcance y aislamiento

- Rama temporal: `r10-phase2a-staging-temp`.
- Project ref temporal: `cpwzwjfzbvuozclfyzts`.
- Branch ID: `dde0e5aa-e511-4ffc-837d-600f03e56b78`.
- Proyecto padre de producción: `sjraugywirjohrqmacvb`.
- La operación se ejecutó únicamente sobre STAGING y no escribió en producción.
- No se importaron datos, usuarios, identidades, sesiones, objetos de Storage, secretos de Vault ni trabajos Cron.

## Procedimiento

1. Se verificó la línea base pública con SHA-256 `6dc0ca0103fcba8cfe8a880af0fcd4c5a5b06ec55b9e078e1b31db29f5c1f27a`.
2. Se comprobó la firma del estado parcial esperado: 9 tablas públicas, 3 migraciones, una fila técnica y cero usuarios Auth.
3. Se comprobó que ninguna extensión instalada dependía del esquema `public`.
4. Se eliminaron exclusivamente los esquemas de aplicación `public` y `private` en STAGING.
5. Se recreó `public` con su propietario, comentario y ACL originales de Supabase.
6. Se aplicó una única vez la línea base sanitizada.
7. Se ejecutaron recuentos, pruebas de permisos y asesores de Supabase.

## Resultado estructural

| Comprobación | Resultado |
|---|---:|
| Tablas públicas | 20 |
| Tablas públicas con RLS | 20 |
| Tablas públicas sin RLS | 0 |
| Vistas públicas | 2 |
| Vistas con `security_invoker` | 2 |
| Funciones públicas | 52 |
| Funciones privadas | 21 |
| Políticas RLS | 17 |
| Triggers de aplicación | 15 |
| Claves primarias | 20 |
| Claves foráneas | 40 |
| Restricciones únicas | 4 |
| Restricciones `CHECK` | 40 |
| Extensiones requeridas `pg_cron` y `pg_net` | 2 |

Los recuentos principales coinciden exactamente con la línea base extraída de producción.

## Datos y sanitización

| Comprobación | Resultado |
|---|---:|
| Filas en tablas públicas | 0 |
| Usuarios Auth | 0 |
| Identidades Auth | 0 |
| Sesiones Auth | 0 |
| Buckets de Storage | 0 |
| Objetos de Storage | 0 |
| Secretos de Vault | 0 |
| Trabajos Cron | 0 |

El único correo estructural aparece dos veces y ambas apariciones contienen exclusivamente `r10-staging-recipient@example.invalid`.

## RLS y permisos

- `anon`: cero permisos directos de `SELECT`, `INSERT`, `UPDATE` o `DELETE` sobre las 20 tablas.
- `authenticated`: lectura directa sobre 14 tablas; cero escritura directa. Las escrituras se canalizan por RPC controladas.
- Las dos vistas permiten lectura autenticada, bloquean a `anon` y usan `security_invoker=true`.
- Las 17 políticas son de lectura y están dirigidas a `authenticated`; 16 usan auxiliares privados de autorización y la política restante permite consultar el catálogo no sensible de campañas a cualquier usuario autenticado.
- Hay 68 funciones `SECURITY DEFINER`; ninguna es ejecutable por `PUBLIC` o `anon` y todas fijan `search_path`.
- Las 45 RPC públicas `SECURITY DEFINER` ejecutables por `authenticated` contienen una comprobación directa de identidad o una llamada a auxiliares privados de autorización.
- No se detectó ninguna política que utilice el obsoleto `auth.role()`.

## Asesores de Supabase

Seguridad devolvió 48 avisos, sin nivel de error:

- 3 `INFO`: tablas internas con RLS y sin política, lo que produce denegación total intencionada.
- 45 `WARN`: RPC `SECURITY DEFINER` ejecutables por usuarios autenticados. Se conservaron porque forman parte de la API del CRM; la revisión adicional confirmó controles internos, `search_path` fijo y ausencia de acceso anónimo.

Rendimiento devolvió 53 avisos `INFO`, sin errores:

- 50 índices sin uso, resultado esperado en una base recién creada y vacía.
- 2 claves foráneas sin índice que deben evaluarse con carga real antes de decidir cambios.
- 1 recomendación sobre la estrategia de conexiones de Auth.

No se eliminó ni modificó ningún índice durante esta fase.

## Limitaciones registradas

- El historial temporal contiene las 3 migraciones parciales originales, la reinicialización controlada y la aplicación de la línea base: 5 registros en total. Esta prueba valida el estado estructural final, no la reproducción secuencial de las 42 migraciones históricas ausentes.
- Supabase conserva el estado administrativo `MIGRATIONS_FAILED` del intento automático inicial, aunque el proyecto temporal está `ACTIVE_HEALTHY` y todas las comprobaciones SQL posteriores son correctas.
- La rama es desechable y no debe fusionarse con producción.

## Eliminación del entorno temporal

- STAGING se eliminó correctamente el 25 de agosto de 2026 a las 11:52:34 UTC.
- La consulta posterior de ramas confirmó que `r10-phase2a-staging-temp` y `cpwzwjfzbvuozclfyzts` ya no existen.
- Solo permanece la rama principal `sjraugywirjohrqmacvb` y no recibió cambios.
- La rama temporal existió menos de una hora; su consumo estimado es inferior a USD 0,01344 antes de impuestos.

## Conclusión

La línea base sanitizada es suficiente para reconstruir en una base vacía la estructura actual auditada del CRM, con RLS, vistas, funciones, triggers y permisos coherentes. La validación temporal ha terminado y el entorno ya está eliminado.
