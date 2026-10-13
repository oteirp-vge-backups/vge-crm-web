begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

insert into auth.users(id,email) values
 ('94000000-0000-4000-8000-000000000001','details-owner@example.invalid'),
 ('94000000-0000-4000-8000-000000000002','details-manager@example.invalid'),
 ('94000000-0000-4000-8000-000000000003','details-a@example.invalid'),
 ('94000000-0000-4000-8000-000000000004','details-b@example.invalid');
insert into public.operators(code,display_name,email,auth_user_id,role,access_role,active) values
 ('Sin asignar','Sin asignar',null,null,'system','system',true) on conflict(code) do nothing;
insert into public.operators(code,display_name,email,auth_user_id,role,access_role,active) values
 ('R10-DETAILS-OWNER','Propietario prueba','details-owner@example.invalid','94000000-0000-4000-8000-000000000001','admin','owner',true),
 ('R10-DETAILS-MANAGER','Administración prueba','details-manager@example.invalid','94000000-0000-4000-8000-000000000002','admin','manager',true),
 ('R10-DETAILS-A','Comercial A','details-a@example.invalid','94000000-0000-4000-8000-000000000003','seller','seller',true),
 ('R10-DETAILS-B','Comercial B','details-b@example.invalid','94000000-0000-4000-8000-000000000004','seller','seller',true);
insert into public.campaigns(code,label,starts_on,ends_on,active,is_default)
 values('R10DETAILS26','Prueba edición centros','2026-09-01','2027-08-31',true,true);
insert into public.centers(id,school,city,province,community,school_phone,school_email) values
 ('R10-DETAILS-001','Centro original','León','León','Castilla y León','987000000','original@example.invalid'),
 ('R10-DETAILS-002','Centro existente','León','León','Castilla y León','987000001','existente@example.invalid'),
 ('R10-DETAILS-H1','Centro homónimo','León','León','Castilla y León',null,null),
 ('R10-DETAILS-H2','Centro homónimo','León','León','Castilla y León',null,null),
 ('R10-DETAILS-OLD','Centro con datos antiguos','León','León','Castilla y León','987000000 ext antigua','email historico sin formato'),
 ('R10-DETAILS-ARCH','Centro archivado','León','León','Castilla y León',null,null);
update public.center_state set assigned_to='R10-DETAILS-A' where center_id like 'R10-DETAILS-%';
update public.center_state set assigned_to='R10-DETAILS-B' where center_id='R10-DETAILS-002';
update public.center_state set contact_name='Persona intacta',contact_mobile='600111222',
 contact_email='directo@example.invalid',next_contact_at='2099-06-01 09:30:00+00',state_version=7
 where center_id='R10-DETAILS-001';
insert into public.travel_opportunities(opportunity_id,center_campaign_id,center_id,cycle,status,destination)
 values('VGE-O940001',(select center_campaign_id from public.center_campaigns where center_id='R10-DETAILS-001'),
 'R10-DETAILS-001','4.º ESO','Interesado','Italia');
update public.centers set active=false,archived_at=now(),
 archived_by='94000000-0000-4000-8000-000000000001',archived_by_operator='R10-DETAILS-OWNER',archive_reason='Archivo de prueba'
 where id='R10-DETAILS-ARCH';

create temporary table r10_details_snapshot as select
 (select to_jsonb(s)-array['state_version','updated_at','updated_by'] from public.center_state s where center_id='R10-DETAILS-001') as state_data,
 (select jsonb_agg(to_jsonb(c) order by contact_id) from public.center_contacts c where center_id='R10-DETAILS-001') as contacts,
 (select jsonb_agg(to_jsonb(o) order by opportunity_id) from public.travel_opportunities o where center_id='R10-DETAILS-001') as trips,
 (select jsonb_agg(to_jsonb(c) order by center_campaign_id) from public.center_campaigns c where center_id='R10-DETAILS-001') as campaigns;
grant select on r10_details_snapshot to authenticated;

select ok(not has_function_privilege('anon','public.update_center_profile_v2(text,jsonb,bigint)','EXECUTE'),'el acceso anónimo permanece cerrado');
select ok(has_function_privilege('authenticated','public.update_center_profile_v2(text,jsonb,bigint)','EXECUTE'),'el cliente usa el RPC autenticado existente');
select ok(not has_table_privilege('authenticated','public.centers','UPDATE'),'no se abre escritura directa sobre el catálogo');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.centers'::regclass,'public.center_state'::regclass,'public.center_state_audit'::regclass)),'se conserva RLS en las tres tablas');

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"No autorizado"}',7)$$,'P0001','AUTH_REQUIRED','se exige una sesión vinculada');
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"  Colegio corregido  ","school_phone":"+34 987 123 456","school_email":"  NUEVO@EXAMPLE.INVALID  "}',7)$$,'el comercial puede corregir su centro de forma atómica');
select results_eq($$select id,school,school_phone,school_email from public.centers where id='R10-DETAILS-001'$$,
 $$values('R10-DETAILS-001'::text,'Colegio corregido'::text,'+34 987 123 456'::text,'nuevo@example.invalid'::text)$$,'los tres datos se guardan normalizados conservando el ID');
select is((select state_version from public.center_state where center_id='R10-DETAILS-001'),8::bigint,'la versión avanza una sola vez');
select is((select to_jsonb(s)-array['state_version','updated_at','updated_by'] from public.center_state s where center_id='R10-DETAILS-001'),(select state_data from r10_details_snapshot),'estado, contacto directo, agenda y asignación permanecen intactos');
select is((select jsonb_agg(to_jsonb(c) order by contact_id) from public.center_contacts c where center_id='R10-DETAILS-001'),(select contacts from r10_details_snapshot),'se conservan las personas y sus versiones');
select is((select jsonb_agg(to_jsonb(o) order by opportunity_id) from public.travel_opportunities o where center_id='R10-DETAILS-001'),(select trips from r10_details_snapshot),'se conservan los viajes y sus versiones');
select is((select jsonb_agg(to_jsonb(c) order by center_campaign_id) from public.center_campaigns c where center_id='R10-DETAILS-001'),(select campaigns from r10_details_snapshot),'la campaña no se modifica por corregir el catálogo');
select is((select count(*) from public.center_state_audit where center_id='R10-DETAILS-001'),0::bigint,'la auditoría administrativa no se revela al comercial');
reset role;
select is((select count(*) from public.center_state_audit where center_id='R10-DETAILS-001' and new_data->>'_scope'='center_details'),1::bigint,'se escribe una auditoría de los datos generales');
select results_eq($$select changed_by_operator,old_data->>'school',new_data->>'school' from public.center_state_audit where center_id='R10-DETAILS-001' and new_data->>'_scope'='center_details'$$,
 $$values('R10-DETAILS-A'::text,'Centro original'::text,'Colegio corregido'::text)$$,'la auditoría identifica al operador y los valores anterior y nuevo');
set local role authenticated;
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"Nombre obsoleto","school_phone":"987999999"}',7)$$,'P0001','CONCURRENT_UPDATE','una versión antigua no sobreescribe el catálogo');
select is((select school from public.centers where id='R10-DETAILS-001'),'Colegio corregido','el rechazo concurrente conserva el nombre');
select is((select school_phone from public.centers where id='R10-DETAILS-001'),'+34 987 123 456','el rechazo concurrente conserva el teléfono');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"Sin versión"}',null)$$,'P0001','CONCURRENT_UPDATE','la versión esperada es obligatoria');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"Centro existente","school_phone":"987999999"}',8)$$,'P0001','CENTER_DETAILS_DUPLICATE','se rechaza una identidad exacta de otro centro');
reset role;
select is((select count(*) from public.center_state_audit where center_id='R10-DETAILS-001' and new_data->>'_scope'='center_details'),1::bigint,'los rechazos no crean auditorías parciales');
set local role authenticated;
select is((select state_version from public.center_state where center_id='R10-DETAILS-001'),8::bigint,'los rechazos no consumen una versión');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"   "}',8)$$,'P0001','SCHOOL_REQUIRED','el nombre no puede quedar vacío');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":null}',8)$$,'P0001','SCHOOL_REQUIRED','el nombre no admite null');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":{"value":"Inventado"}}',8)$$,'P0001','SCHOOL_REQUIRED','el nombre exige texto');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001',jsonb_build_object('school',repeat('x',241)),8)$$,'P0001','SCHOOL_REQUIRED','se limita la longitud del nombre');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_phone":"123"}',8)$$,'P0001','INVALID_SCHOOL_PHONE','se rechaza un teléfono demasiado corto');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_phone":"abcdef"}',8)$$,'P0001','INVALID_SCHOOL_PHONE','se rechaza texto sin número');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_phone":true}',8)$$,'P0001','INVALID_SCHOOL_PHONE','el teléfono exige texto o null');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_email":"correo incorrecto"}',8)$$,'P0001','INVALID_SCHOOL_EMAIL','se rechaza un email inválido');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_email":false}',8)$$,'P0001','INVALID_SCHOOL_EMAIL','el email exige texto o null');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"Cambio mezclado","city":"Otra localidad"}',8)$$,'P0001','ADMIN_REQUIRED','el comercial no obtiene edición de ubicación');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"active":false}',8)$$,'P0001','FIELD_NOT_ALLOWED: active','la lista de campos sigue cerrada');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"assigned_to":"R10-DETAILS-B"}',8)$$,'P0001','FIELD_NOT_ALLOWED: assigned_to','no se amplía la asignación desde este RPC');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-002','{"school":"Cartera ajena"}',1)$$,'P0001','ACCESS_DENIED','el comercial no puede modificar una cartera ajena');
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-ARCH','{"school":"Archivado"}',1)$$,'P0001','ACCESS_DENIED','no se modifica un centro archivado');
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_phone":null,"school_email":"  "}',8)$$,'se pueden retirar datos generales incorrectos');
select is((select jsonb_build_array(c.school_phone,c.school_email,s.contact_mobile,s.contact_email) from public.centers c join public.center_state s on s.center_id=c.id where c.id='R10-DETAILS-001'),
 jsonb_build_array(null::text,null::text,'600111222'::text,'directo@example.invalid'::text),'vaciar datos generales conserva los del contacto');
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-OLD','{"contact_name":"Contacto nuevo"}',(select state_version from public.center_state where center_id='R10-DETAILS-OLD'))$$,'los datos históricos sin formato no bloquean otros cambios');
select is((select school_email from public.centers where id='R10-DETAILS-OLD'),'email historico sin formato','el email histórico no se transforma si no se modifica');
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-H1','{"school":"CENTRO HOMÓNIMO"}',(select state_version from public.center_state where center_id='R10-DETAILS-H1'))$$,'se conserva un homónimo al corregir sólo mayúsculas');

select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school":"Centro revisado por administración"}',(select state_version from public.center_state where center_id='R10-DETAILS-001'))$$,'administración puede corregir el catálogo de otra cartera');
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_phone":"987222333","city":"Ponferrada","province":"LEON"}',(select state_version from public.center_state where center_id='R10-DETAILS-001'))$$,'el propietario conserva la edición conjunta con ubicación');
select results_eq($$select city,province,community from public.centers where id='R10-DETAILS-001'$$,
 $$values('Ponferrada'::text,'León'::text,'Castilla y León'::text)$$,'la ubicación conserva la normalización vigente');
select set_config('request.jwt.claims','{"sub":"94000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.update_center_profile_v2('R10-DETAILS-001','{"school_phone":"987999999"}',1)$$,'P0001','ACCESS_DENIED','el segundo comercial tampoco cruza carteras');
select lives_ok($$select public.update_center_profile_v2('R10-DETAILS-002','{"school_email":"propio@example.invalid"}',(select state_version from public.center_state where center_id='R10-DETAILS-002'))$$,'el segundo comercial puede corregir su propio centro');
reset role;
select * from finish();
rollback;
