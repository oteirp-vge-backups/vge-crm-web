begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'manager@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'seller@example.invalid');

insert into public.operators (code, display_name, email, auth_user_id, role, access_role, active) values
  ('Sin asignar', 'Sin asignar', null, null, 'system', 'system', true),
  ('OP-OWNER', 'Propietario de prueba', 'owner@example.invalid', '10000000-0000-4000-8000-000000000001', 'admin', 'owner', true),
  ('OP-MANAGER', 'Responsable de prueba', 'manager@example.invalid', '10000000-0000-4000-8000-000000000002', 'admin', 'manager', true),
  ('OP-SELLER', 'Comercial de prueba', 'seller@example.invalid', '10000000-0000-4000-8000-000000000003', 'seller', 'seller', true);

insert into public.centers (id, school, city, province, community) values
  ('R10-CENTER-OWNER', 'Centro global de prueba', 'Madrid', 'Madrid', 'Madrid'),
  ('R10-CENTER-SELLER', 'Centro comercial de prueba', 'Valladolid', 'Valladolid', 'Castilla y León');

update public.center_state set assigned_to = 'OP-OWNER' where center_id = 'R10-CENTER-OWNER';
update public.center_state set assigned_to = 'OP-SELLER' where center_id = 'R10-CENTER-SELLER';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$select access_role, can_view_global, can_assign_centers, can_manage_roles, can_export_backup from public.get_my_permissions_v2()$$,
  $$values ('owner'::text, true, true, true, true)$$,
  'owner recibe exclusivamente la matriz funcional de propietario'
);
select results_eq($$select count(*) from public.crm_centers$$, array[2::bigint], 'owner ve todo el CRM activo');
select lives_ok($$select * from public.owner_list_operators()$$, 'owner puede consultar la administración de usuarios');
select ok((select private.is_owner()), 'owner satisface el control interno de propietario');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select results_eq(
  $$select access_role, can_view_global, can_assign_centers, can_manage_roles, can_export_backup from public.get_my_permissions_v2()$$,
  $$values ('manager'::text, true, true, false, false)$$,
  'manager obtiene acceso global operativo sin facultades de propietario'
);
select results_eq($$select count(*) from public.crm_centers$$, array[2::bigint], 'manager ve todo el CRM activo');
select throws_ok($$select * from public.owner_list_operators()$$, 'P0001', 'OWNER_REQUIRED', 'manager no puede administrar usuarios de propietario');
select lives_ok($$select public.admin_assign_center('R10-CENTER-SELLER', 'OP-SELLER')$$, 'manager puede asignar centros');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select results_eq(
  $$select access_role, can_view_global, can_assign_centers, can_manage_roles, can_export_backup from public.get_my_permissions_v2()$$,
  $$values ('seller'::text, false, false, false, false)$$,
  'seller recibe únicamente permisos comerciales'
);
select results_eq($$select count(*) from public.crm_centers$$, array[1::bigint], 'seller sólo ve su centro asignado');
select results_eq($$select id from public.crm_centers$$, array['R10-CENTER-SELLER'::text], 'seller no puede leer el centro de otro operador');
select throws_ok($$select public.admin_assign_center('R10-CENTER-OWNER', 'OP-SELLER')$$, 'P0001', 'ADMIN_REQUIRED', 'seller no puede reasignar centros');
select throws_ok($$select * from public.owner_list_operators()$$, 'P0001', 'OWNER_REQUIRED', 'seller no puede administrar usuarios');
select ok(not (select private.is_owner()), 'seller no satisface el control interno de propietario');

reset role;
select ok(not has_table_privilege('anon', 'public.centers', 'SELECT'), 'anon no tiene lectura directa de centros');
select ok(not has_function_privilege('anon', 'public.get_my_permissions_v2()', 'EXECUTE'), 'anon no puede ejecutar RPC autenticadas');
select ok(not has_function_privilege('anon', 'public.owner_export_full_backup_v3()', 'EXECUTE'), 'anon no puede ejecutar copias de propietario');

select ok(has_function_privilege('service_role', 'public.claim_vge_agenda_email_batch(integer)', 'EXECUTE'), 'service_role puede reclamar la cola técnica autorizada');
select ok(has_function_privilege('service_role', 'public.complete_vge_agenda_email(bigint,boolean,text,text)', 'EXECUTE'), 'service_role puede completar la cola técnica autorizada');
select ok(not has_function_privilege('service_role', 'public.owner_export_full_backup_v3()', 'EXECUTE'), 'service_role no hereda la superficie interactiva del propietario');
select ok(not has_table_privilege('service_role', 'public.centers', 'SELECT'), 'service_role no recibe lectura directa fuera de sus RPC técnicas');
select ok(not has_table_privilege('service_role', 'public.operators', 'INSERT'), 'service_role no puede crear operadores directamente');

select * from finish();
rollback;
