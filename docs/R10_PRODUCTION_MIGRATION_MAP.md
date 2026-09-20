# R10 — correspondencia Git y migraciones de producción

Fecha de observación: 20 de septiembre de 2026.

## Resultado

Producción registra 49 migraciones. El repositorio conserva diez fuentes SQL y mantiene 39 fuentes históricas ausentes, ya identificadas desde la construcción de la línea base. No se ha recreado ni renombrado ninguna migración histórica.

Las siete migraciones desplegadas después del 25 de agosto recibieron un timestamp gestionado distinto al nombre del archivo local. La identidad funcional se conserva por nombre, contenido revisado, despliegue documentado y SHA-256 del archivo fuente.

| Fuente en Git | Versión en producción | Nombre | SHA-256 |
|---|---|---|---|
| `20260824144908_owner_invite_operator.sql` | `20260824144908` | `owner_invite_operator` | `90194c685f4c57de79172b546d4e08e2cd66d6b4f29c1cef0edfc23a4937472e` |
| `20260824145216_harden_owner_invites.sql` | `20260824145216` | `harden_owner_invites` | `09bfe80c323ff320f03b9bc96030b15ccfd7fbc5bb1e5f20a7d6bd15233f926b` |
| `20260824153658_grant_service_role_operator_invites.sql` | `20260824153658` | `grant_service_role_operator_invites` | `d21e50c5132a1418d2a953fcaf6529930ebde4d144bacd5cfcacabd10f82514e` |
| `20260826061114_reduce_security_definer_surface.sql` | `20260826121829` | `reduce_security_definer_surface` | `7449a0bbfead38af6553aa6ce0127dd72642e69aff4f0683daa0597911b2e9aa` |
| `20260828072643_normalize_center_communities.sql` | `20260828080827` | `normalize_center_communities` | `53b5f21ae6f705f326523674619ba127f396b6bbc6c888d662d07623303f7e70` |
| `20260913071737_align_statistics_with_portfolio_status.sql` | `20260913080127` | `align_statistics_with_portfolio_status` | `60f7e586f621a02063ce29b84f6fe00e8ae0bdd6f087f754390416f3ec7bd8f5` |
| `20260915103838_disable_agenda_email_notifications.sql` | `20260915104505` | `disable_agenda_email_notifications` | `3977200294a125ffc57232feaa8f6a7a00d721a5ff5467561a25b000d7d14731` |
| `20260915113006_resolve_general_followup_from_linked_contact.sql` | `20260915121056` | `resolve_general_followup_from_linked_contact` | `66ce5d6d996ac9205cf8da771f4cb4bdea4d347ebaa0fe8b347694bd7a3fd8e6` |
| `20260916101500_normalize_center_provinces.sql` | `20260916102053` | `normalize_center_provinces` | `701173e8b98328709acedbaf0ac782bbf666980b1f2d70ac58fb3c8e7d4abec3` |
| `20260916193916_add_internal_notes_history.sql` | `20260916220041` | `add_internal_notes_history` | `b678b1091ea810d96c2b67fb7c798ad376533252fcb8254793347081ab32c796` |

## Regla futura

Después de cada despliegue se actualiza `supabase/baseline/production-ledger-current.json`. La barrera comprueba automáticamente que cada archivo mapeado existe, que su SHA-256 coincide y que la versión productiva figura en el inventario.

Este mapa documenta la correspondencia; no autoriza renombrar archivos aplicados, reescribir el ledger remoto ni fabricar las 39 fuentes históricas ausentes.
