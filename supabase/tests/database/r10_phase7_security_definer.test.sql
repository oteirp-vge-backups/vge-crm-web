begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef),
  54::bigint,
  'la superficie SECURITY DEFINER baja de 68 a 54 funciones'
);

select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosecdef
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting
       where setting = 'search_path=""' or setting = 'search_path=pg_catalog'
     )),
  0::bigint,
  'toda función SECURITY DEFINER conserva un search_path fijo'
);

select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosecdef
     and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0::bigint,
  'anon no puede ejecutar ninguna función SECURITY DEFINER de la aplicación'
);

select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
   where n.nspname in ('public', 'private')
     and p.prosecdef
     and acl.grantee = 0
     and acl.privilege_type = 'EXECUTE'),
  0::bigint,
  'PUBLIC no conserva EXECUTE sobre SECURITY DEFINER de la aplicación'
);

select is(
  (select array_agg(p.proname order by p.proname)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.prosecdef
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  array[
    'can_access_center', 'current_operator_code', 'current_operator_name',
    'is_admin', 'is_owner'
  ]::name[],
  'authenticated sólo ejecuta los cinco helpers privados justificados'
);

select is(
  (select array_agg(p.proname order by p.proname)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and has_function_privilege('service_role', p.oid, 'EXECUTE')),
  array[
    'claim_vge_agenda_email_batch', 'complete_vge_agenda_email',
    'run_vge_agenda_queue_worker', 'verify_vge_agenda_worker_token'
  ]::name[],
  'service_role sólo ejecuta las cuatro RPC técnicas de agenda'
);

select is(
  (select array_agg(p.proname order by p.proname)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  array[
    'admin_assign_center', 'archive_center', 'archive_center_contact_v1',
    'archive_travel_opportunity_v1', 'bulk_assign_zone',
    'create_center_contact_v1', 'create_manual_center',
    'create_travel_opportunity_v1', 'get_access_fingerprint_v2',
    'get_agenda_items_v2', 'get_center_history_v2',
    'get_center_workspace_v1', 'get_current_campaign_v1', 'get_my_operator',
    'get_my_permissions_v2', 'get_statistics_dashboard_v2',
    'get_team_presence_v2', 'get_visible_operators',
    'get_visible_travel_summaries_v1', 'list_archived_centers',
    'list_center_lifecycle_audit', 'log_export', 'mark_operator_offline',
    'owner_export_full_backup_v3', 'owner_list_operators',
    'owner_list_role_audit', 'owner_permanently_delete_center',
    'owner_set_operator_access_role', 'register_contact_multi_v1',
    'restore_center', 'restore_travel_opportunity_v1',
    'search_center_duplicates', 'touch_operator_presence',
    'update_center_contact_v1', 'update_center_profile_v2',
    'update_travel_opportunity_v1'
  ]::name[],
  'authenticated sólo ejecuta las 36 RPC privilegiadas vigentes y justificadas'
);

select is(
  (select array_agg(p.proname order by p.proname)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and not p.prosecdef
     and p.proname = any(array[
       'touch_updated_at', 'prevent_center_lifecycle_audit_mutation',
       'validate_travel_opportunity_source_v15', 'admin_create_operator',
       'admin_deactivate_operator', 'admin_link_operator',
       'get_access_fingerprint', 'get_my_permissions',
       'get_statistics_dashboard_v1', 'get_team_presence',
       'owner_export_full_backup_v2', 'register_contact',
       'register_contact_v2', 'update_center_profile'
     ])),
  array[
    'admin_create_operator', 'admin_deactivate_operator', 'admin_link_operator',
    'get_access_fingerprint', 'get_my_permissions',
    'get_statistics_dashboard_v1', 'get_team_presence',
    'owner_export_full_backup_v2', 'prevent_center_lifecycle_audit_mutation',
    'register_contact', 'register_contact_v2', 'touch_updated_at',
    'update_center_profile', 'validate_travel_opportunity_source_v15'
  ]::name[],
  'las 14 funciones seleccionadas son SECURITY INVOKER'
);

select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = any(array[
       'admin_create_operator', 'admin_deactivate_operator', 'admin_link_operator',
       'get_access_fingerprint', 'get_my_permissions',
       'get_statistics_dashboard_v1', 'get_team_presence',
       'owner_export_full_backup_v2', 'register_contact',
       'register_contact_v2', 'update_center_profile'
     ])
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  0::bigint,
  'authenticated no puede ejecutar las once entradas cerradas'
);

select ok(
  not has_table_privilege('anon', 'public.admin_migration_runs', 'SELECT')
  and not has_table_privilege('authenticated', 'public.admin_migration_runs', 'SELECT'),
  'admin_migration_runs permanece cerrada para clientes'
);

select ok(
  not has_table_privilege('anon', 'public.agenda_email_outbox', 'SELECT')
  and not has_table_privilege('authenticated', 'public.agenda_email_outbox', 'SELECT'),
  'agenda_email_outbox permanece cerrada para clientes'
);

select ok(
  not has_table_privilege('anon', 'public.operator_invitation_audit', 'SELECT')
  and not has_table_privilege('authenticated', 'public.operator_invitation_audit', 'SELECT'),
  'operator_invitation_audit permanece cerrada para clientes'
);

select is(
  (select count(*)
   from pg_default_acl d
   join pg_namespace n on n.oid = d.defaclnamespace
   cross join lateral aclexplode(d.defaclacl) acl
   where n.nspname = 'public'
     and d.defaclobjtype = 'f'
     and acl.grantee = 0
     and acl.privilege_type = 'EXECUTE'),
  0::bigint,
  'las funciones futuras del esquema public nacen sin EXECUTE para PUBLIC'
);

select * from finish();
rollback;
