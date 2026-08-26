-- R10 Phase 7: reduce the privileged function surface without changing the
-- current browser or Edge Function contracts.

-- These trigger functions only transform NEW or reject a mutation. They do
-- not read or write protected relations and therefore do not need elevation.
alter function private.touch_updated_at() security invoker;
alter function private.prevent_center_lifecycle_audit_mutation() security invoker;
alter function private.validate_travel_opportunity_source_v15() security invoker;

-- These RPCs are superseded public entry points, or implementation helpers
-- retained only for compatibility with a newer privileged wrapper. No current
-- browser or Edge Function calls them directly. Keep their definitions for a
-- reversible rollout, but remove external execution and owner elevation.
revoke execute on function public.admin_create_operator(text, text, text, text)
  from public, anon, authenticated, service_role;
alter function public.admin_create_operator(text, text, text, text) security invoker;

revoke execute on function public.admin_deactivate_operator(text)
  from public, anon, authenticated, service_role;
alter function public.admin_deactivate_operator(text) security invoker;

revoke execute on function public.admin_link_operator(text, uuid)
  from public, anon, authenticated, service_role;
alter function public.admin_link_operator(text, uuid) security invoker;

revoke execute on function public.get_access_fingerprint()
  from public, anon, authenticated, service_role;
alter function public.get_access_fingerprint() security invoker;

revoke execute on function public.get_my_permissions()
  from public, anon, authenticated, service_role;
alter function public.get_my_permissions() security invoker;

revoke execute on function public.get_statistics_dashboard_v1(integer, text, text)
  from public, anon, authenticated, service_role;
alter function public.get_statistics_dashboard_v1(integer, text, text) security invoker;

revoke execute on function public.get_team_presence()
  from public, anon, authenticated, service_role;
alter function public.get_team_presence() security invoker;

revoke execute on function public.owner_export_full_backup_v2()
  from public, anon, authenticated, service_role;
alter function public.owner_export_full_backup_v2() security invoker;

revoke execute on function public.register_contact(
  text, timestamptz, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
alter function public.register_contact(
  text, timestamptz, text, text, text, timestamptz, timestamptz
) security invoker;

revoke execute on function public.register_contact_v2(
  text, timestamptz, text, text, text, timestamptz, bigint
) from public, anon, authenticated, service_role;
alter function public.register_contact_v2(
  text, timestamptz, text, text, text, timestamptz, bigint
) security invoker;

revoke execute on function public.update_center_profile(text, jsonb, timestamptz)
  from public, anon, authenticated, service_role;
alter function public.update_center_profile(text, jsonb, timestamptz) security invoker;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Make future public-schema
-- functions closed by default; every callable RPC must be granted explicitly.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

comment on function public.admin_create_operator(text, text, text, text)
  is 'R10 Fase 7: RPC heredada cerrada; invitaciones gestionadas por la Edge Function vigente.';
comment on function public.admin_deactivate_operator(text)
  is 'R10 Fase 7: RPC heredada cerrada; gestión vigente mediante el flujo de propietario.';
comment on function public.admin_link_operator(text, uuid)
  is 'R10 Fase 7: RPC heredada cerrada; vinculación gestionada por la Edge Function vigente.';
comment on function public.get_access_fingerprint()
  is 'R10 Fase 7: versión heredada cerrada; usar get_access_fingerprint_v2.';
comment on function public.get_my_permissions()
  is 'R10 Fase 7: versión heredada cerrada; usar get_my_permissions_v2.';
comment on function public.get_statistics_dashboard_v1(integer, text, text)
  is 'R10 Fase 7: implementación interna de get_statistics_dashboard_v2; sin acceso externo.';
comment on function public.get_team_presence()
  is 'R10 Fase 7: versión heredada cerrada; usar get_team_presence_v2.';
comment on function public.owner_export_full_backup_v2()
  is 'R10 Fase 7: implementación interna de owner_export_full_backup_v3; sin acceso externo.';
comment on function public.register_contact(
  text, timestamptz, text, text, text, timestamptz, timestamptz
) is 'R10 Fase 7: versión heredada cerrada; usar register_contact_multi_v1.';
comment on function public.register_contact_v2(
  text, timestamptz, text, text, text, timestamptz, bigint
) is 'R10 Fase 7: versión heredada cerrada; usar register_contact_multi_v1.';
comment on function public.update_center_profile(text, jsonb, timestamptz)
  is 'R10 Fase 7: versión heredada cerrada; usar update_center_profile_v2.';
