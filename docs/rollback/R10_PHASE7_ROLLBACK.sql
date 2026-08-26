-- R10 Phase 7 rollback. REVIEW ONLY: never run automatically.
-- Restores the exact SECURITY DEFINER and EXECUTE state observed before Phase 7.

alter function private.touch_updated_at() security definer;
alter function private.prevent_center_lifecycle_audit_mutation() security definer;
alter function private.validate_travel_opportunity_source_v15() security definer;

alter function public.admin_create_operator(text, text, text, text) security definer;
alter function public.admin_deactivate_operator(text) security definer;
alter function public.admin_link_operator(text, uuid) security definer;
alter function public.get_access_fingerprint() security definer;
alter function public.get_my_permissions() security definer;
alter function public.get_statistics_dashboard_v1(integer, text, text) security definer;
alter function public.get_team_presence() security definer;
alter function public.owner_export_full_backup_v2() security definer;
alter function public.register_contact(
  text, timestamptz, text, text, text, timestamptz, timestamptz
) security definer;
alter function public.register_contact_v2(
  text, timestamptz, text, text, text, timestamptz, bigint
) security definer;
alter function public.update_center_profile(text, jsonb, timestamptz) security definer;

grant execute on function public.admin_create_operator(text, text, text, text) to authenticated;
grant execute on function public.admin_deactivate_operator(text) to authenticated;
grant execute on function public.admin_link_operator(text, uuid) to authenticated;
grant execute on function public.get_access_fingerprint() to authenticated;
grant execute on function public.get_my_permissions() to authenticated;
grant execute on function public.get_statistics_dashboard_v1(integer, text, text) to authenticated;
grant execute on function public.get_team_presence() to authenticated;
grant execute on function public.owner_export_full_backup_v2() to authenticated;
grant execute on function public.register_contact_v2(
  text, timestamptz, text, text, text, timestamptz, bigint
) to authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to public;
