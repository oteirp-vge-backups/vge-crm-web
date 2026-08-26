# R10 — Fase 7: matriz de funciones privilegiadas

Fecha de revisión: 26 de agosto de 2026.

Esta matriz es la lista permitida que valida `r10_phase7_security_definer.test.sql`. Una función `SECURITY DEFINER` que no figure aquí hace fallar la barrera. Todas las funciones conservadas tienen `search_path` fijo (`""` o, para el event trigger, `pg_catalog`). `PUBLIC` y `anon` no pueden ejecutar ninguna de ellas.

## Superficie resultante

| Superficie | Cantidad | Ejecutor directo | Justificación |
| --- | ---: | --- | --- |
| Helpers privados de identidad y alcance | 5 | `authenticated` | Las políticas RLS y RPC necesitan resolver al operador desde `auth.uid()` sin conceder lectura directa de `operators`. |
| Triggers y helpers privados | 8 | Ningún rol cliente | Mantienen auditoría, sincronización y filas derivadas en tablas que el cliente no puede escribir directamente. |
| RPC interactivas vigentes | 36 | `authenticated` | Son la API mínima del navegador; cada RPC aplica autenticación, alcance por centro o capacidad funcional antes de operar sobre tablas protegidas. |
| RPC técnicas de agenda | 4 | `service_role` | Son la API cerrada de la Edge Function de cola; no se conceden a usuarios interactivos. |
| Event trigger de RLS | 1 | Ningún rol cliente | Activa RLS en nuevas tablas públicas y sólo se invoca como infraestructura de base de datos. |
| **Total `SECURITY DEFINER`** | **54** | — | Reducción de 68 a 54 sin retirar contratos vigentes. |

## Lista permitida exacta

### `private` ejecutable por `authenticated`

- `can_access_center`
- `current_operator_code`
- `current_operator_name`
- `is_admin`
- `is_owner`

### `private` sin ejecución directa de clientes

- `audit_center_state`
- `audit_operator`
- `audit_travel_opportunity`
- `ensure_center_state`
- `has_permission`
- `queue_overdue_agenda`
- `sync_center_state_to_v15`
- `sync_operator_access_role`

### `public` ejecutable por `authenticated`

- `admin_assign_center`
- `archive_center`
- `archive_center_contact_v1`
- `archive_travel_opportunity_v1`
- `bulk_assign_zone`
- `create_center_contact_v1`
- `create_manual_center`
- `create_travel_opportunity_v1`
- `get_access_fingerprint_v2`
- `get_agenda_items_v2`
- `get_center_history_v2`
- `get_center_workspace_v1`
- `get_current_campaign_v1`
- `get_my_operator`
- `get_my_permissions_v2`
- `get_statistics_dashboard_v2`
- `get_team_presence_v2`
- `get_visible_operators`
- `get_visible_travel_summaries_v1`
- `list_archived_centers`
- `list_center_lifecycle_audit`
- `log_export`
- `mark_operator_offline`
- `owner_export_full_backup_v3`
- `owner_list_operators`
- `owner_list_role_audit`
- `owner_permanently_delete_center`
- `owner_set_operator_access_role`
- `register_contact_multi_v1`
- `restore_center`
- `restore_travel_opportunity_v1`
- `search_center_duplicates`
- `touch_operator_presence`
- `update_center_contact_v1`
- `update_center_profile_v2`
- `update_travel_opportunity_v1`

### `public` ejecutable por `service_role`

- `claim_vge_agenda_email_batch`
- `complete_vge_agenda_email`
- `run_vge_agenda_queue_worker`
- `verify_vge_agenda_worker_token`

### Infraestructura sin ejecución directa de clientes

- `public.rls_auto_enable`

## Funciones reducidas

Tres triggers pasan a `SECURITY INVOKER` porque sólo validan o transforman `NEW`: `private.touch_updated_at`, `private.prevent_center_lifecycle_audit_mutation` y `private.validate_travel_opportunity_source_v15`.

Once entradas públicas pasan a `SECURITY INVOKER` y pierden `EXECUTE` para `PUBLIC`, `anon`, `authenticated` y `service_role`: `admin_create_operator`, `admin_deactivate_operator`, `admin_link_operator`, `get_access_fingerprint`, `get_my_permissions`, `get_statistics_dashboard_v1`, `get_team_presence`, `owner_export_full_backup_v2`, `register_contact`, `register_contact_v2` y `update_center_profile`.

`get_statistics_dashboard_v1` y `owner_export_full_backup_v2` continúan disponibles para sus wrappers propietarios v2/v3, respectivamente. El propietario de las funciones conserva la llamada interna, pero ya no son puntos de entrada externos.

## Avisos y excepciones justificadas

El Security Advisor identifica mecánicamente como advertencia cualquier función `SECURITY DEFINER` ejecutable por `authenticated`. Las 41 restantes (36 RPC públicas y cinco helpers privados) están enumeradas arriba, tienen alcance comprobado y constituyen excepciones justificadas. Por tanto, el resultado de revisión es **cero avisos sin justificar**.

Los avisos informativos `rls_enabled_no_policy` de `admin_migration_runs`, `agenda_email_outbox` y `operator_invitation_audit` también son intencionados: son tablas internas cerradas, sin `SELECT` para `anon` ni `authenticated`. La prueba SQL fija este contrato.

## Firma de la matriz

- Fuente auditada: catálogo de producción en modo de sólo lectura y línea base reproducible.
- Cambio: `20260826061114_reduce_security_definer_surface.sql`.
- Validación automática: 13 aserciones estructurales de Fase 7 más las 22 pruebas de roles existentes.
- Estado técnico: pendiente de la barrera de GitHub Actions.
- Alcance: rama de Fase 7; no implica despliegue, publicación ni fusión.
