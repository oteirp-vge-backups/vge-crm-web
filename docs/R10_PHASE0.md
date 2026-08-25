# R10 Cimientos — Fase 0

Corte técnico: V15 · R9.8.

Este commit incorpora el código exacto de las Edge Functions activas, las migraciones de invitaciones con las versiones aplicadas en Supabase y la batería de regresión usada para congelar el corte.

## Identidad

- Frontend Git blob: `cb5333ea83fc0e4f332a7fb2749553e8469a309c`.
- Edge Function `vge-admin-invite-operator`: versión desplegada 4.
- Edge Function `vge-agenda-email-worker`: versión desplegada 3.
- Esquema auditado: 20 tablas públicas, 17 políticas RLS, 52 funciones públicas y 21 privadas.
- Huella de esquema del corte: `6389db0723eecdabd1299f230852e1e4`.
- Pruebas JavaScript: 7/7 superadas.

## Migraciones del corte

1. `20260824144908_owner_invite_operator.sql`
2. `20260824145216_harden_owner_invites.sql`
3. `20260824153658_grant_service_role_operator_invites.sql`

## Congelación

Hasta comenzar la Fase 1 no se modifican el frontend, las Edge Functions ni el esquema salvo incidente crítico, con copia previa, prueba de regresión y nueva huella.

## Cierre formal

- Etiqueta: `v15-r9.8-r10-phase0-2026-08-25`.
- Commit congelado: `e9f2d72c9375270ff84b38c39d5f6bf93433dead`.
- Backup cifrado posterior a R9.8: ejecutado y verificado el 25 de agosto de 2026.
- Evidencia detallada: repositorio privado de backup, `audit/R10_PHASE0_BACKUP_2026-08-25.md`.
- Estado: Fase 0 cerrada.
