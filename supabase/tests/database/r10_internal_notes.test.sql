begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('93000000-0000-4000-8000-000000000001', 'notes-owner@example.invalid'),
  ('93000000-0000-4000-8000-000000000002', 'notes-seller@example.invalid'),
  ('93000000-0000-4000-8000-000000000003', 'notes-seller-b@example.invalid');

insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('Sin asignar', 'Sin asignar', null, null, 'system', 'system', true)
on conflict (code) do nothing;

insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('R10-NOTES-OWNER', 'Propietario notas', 'notes-owner@example.invalid',
   '93000000-0000-4000-8000-000000000001', 'admin', 'owner', true),
  ('R10-NOTES-A', 'Comercial notas', 'notes-seller@example.invalid',
   '93000000-0000-4000-8000-000000000002', 'seller', 'seller', true),
  ('R10-NOTES-B', 'Segundo comercial notas', 'notes-seller-b@example.invalid',
   '93000000-0000-4000-8000-000000000003', 'seller', 'seller', true);

insert into public.centers(id, school, city, province, community)
values ('R10-NOTES-001', 'Centro notas internas', 'León', 'León', 'Castilla y León');

update public.center_state
set assigned_to = 'R10-NOTES-A',
    status = 'Pendiente',
    next_contact_at = '2099-06-01 09:30:00+00'::timestamptz
where center_id = 'R10-NOTES-001';

create temporary table r10_note_state_snapshot(payload jsonb) on commit drop;
insert into r10_note_state_snapshot(payload)
select to_jsonb(s)
from public.center_state s
where s.center_id = 'R10-NOTES-001';
grant select on r10_note_state_snapshot to authenticated;

select has_table(
  'public', 'center_internal_notes',
  'las anotaciones usan una tabla independiente de los contactos comerciales'
);

select ok(
  (select c.relrowsecurity
   from pg_class c
   where c.oid = 'public.center_internal_notes'::regclass),
  'la tabla de anotaciones tiene RLS activado'
);

select ok(
  exists (
    select 1 from pg_policy p
    where p.polrelid = 'public.center_internal_notes'::regclass
      and p.polname = 'center_internal_notes_select_visible'
  ),
  'la lectura futura queda limitada al alcance visible del centro'
);

select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.center_internal_notes'::regclass
      and c.confrelid = 'public.centers'::regclass
      and c.contype = 'f'
      and c.confdeltype = 'c'
  ),
  'el borrado autorizado de un centro elimina también sus anotaciones'
);

select ok(
  (select count(*) >= 3
   from pg_indexes i
   where i.schemaname = 'public'
     and i.tablename = 'center_internal_notes'),
  'las claves de búsqueda y relaciones de anotaciones están indexadas'
);

select ok(
  not has_table_privilege('anon', 'public.center_internal_notes', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.center_internal_notes', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('service_role', 'public.center_internal_notes', 'SELECT,INSERT,UPDATE,DELETE'),
  'ningún cliente dispone de acceso directo a la tabla'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.register_internal_note_v1(text,text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.register_internal_note_v1(text,text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'service_role', 'public.register_internal_note_v1(text,text)', 'EXECUTE'
  ),
  'la escritura se limita a la RPC para usuarios autenticados'
);

select ok(
  (
    select p.prosecdef
      and p.provolatile = 'v'
      and p.proconfig = array['search_path=""']::text[]
    from pg_proc p
    where p.oid = 'public.register_internal_note_v1(text,text)'::regprocedure
  ),
  'la RPC de escritura protege identidad, permisos y search_path'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.get_center_history_v2(text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.get_center_history_v2(text)', 'EXECUTE'
  ),
  'el historial unificado continúa siendo exclusivo de usuarios autenticados'
);

select throws_ok(
  $$select public.register_internal_note_v1('R10-NOTES-001', 'Sin sesión')$$,
  'P0001', 'AUTH_REQUIRED',
  'una petición sin sesión no puede crear anotaciones'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.register_internal_note_v1(
      'R10-NOTES-001', '  Pendiente de revisar internamente con dirección.  '
    )$$,
  'el comercial asignado puede guardar una anotación usando solo el texto'
);

select is(
  (select to_jsonb(s) from public.center_state s where s.center_id = 'R10-NOTES-001'),
  (select payload from r10_note_state_snapshot),
  'la anotación no modifica estado, agenda, último contacto, contador ni versión'
);

select is(
  (public.get_statistics_dashboard_v2(30, null, null, null)
    -> 'kpis' ->> 'contacts_period')::bigint,
  0::bigint,
  'la anotación no suma en los contactos del periodo'
);

select is(
  (select count(*)
   from jsonb_array_elements(public.get_center_history_v2('R10-NOTES-001')) h(item)
   where item ->> 'entry_type' = 'internal_note'),
  1::bigint,
  'la anotación sí aparece en el mismo historial cronológico'
);

select results_eq(
  $$select
      item ->> 'notes',
      item ->> 'channel',
      item ->> 'result'
    from jsonb_array_elements(public.get_center_history_v2('R10-NOTES-001')) h(item)
    where item ->> 'entry_type' = 'internal_note'$$,
  $$values (
      'Pendiente de revisar internamente con dirección.'::text,
      null::text,
      null::text
    )$$,
  'el historial identifica la nota y no inventa canal ni resultado'
);

select is(
  (select count(*) from public.contact_events where center_id = 'R10-NOTES-001'),
  0::bigint,
  'guardar una anotación no crea ningún evento de contacto'
);

select lives_ok(
  $$select public.register_contact_multi_v1(
      p_center_id => 'R10-NOTES-001',
      p_contacted_at => now(),
      p_channel => 'Email',
      p_result => 'Información enviada',
      p_notes => 'Contacto comercial real posterior a la anotación.',
      p_next_contact_at => null,
      p_expected_state_version => (
        select state_version from public.center_state
        where center_id = 'R10-NOTES-001'
      ),
      p_contact_id => null,
      p_opportunity_ids => '{}'::text[],
      p_expected_opportunity_versions => '{}'::jsonb,
      p_also_resolve_general_followup => false
    )$$,
  'el registro de contacto completo conserva su funcionamiento anterior'
);

select is(
  (select contact_count from public.center_state where center_id = 'R10-NOTES-001'),
  1,
  'solo el contacto comercial incrementa el contador del centro'
);

select is(
  (public.get_statistics_dashboard_v2(30, null, null, null)
    -> 'kpis' ->> 'contacts_period')::bigint,
  1::bigint,
  'las estadísticas contabilizan el contacto real y excluyen la anotación'
);

select results_eq(
  $$select item ->> 'entry_type', count(*)
    from jsonb_array_elements(public.get_center_history_v2('R10-NOTES-001')) h(item)
    group by item ->> 'entry_type'
    order by item ->> 'entry_type'$$,
  $$values ('contact'::text, 1::bigint), ('internal_note'::text, 1::bigint)$$,
  'el historial conserva una entrada de cada tipo sin confundir sus recuentos'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.register_internal_note_v1(
      'R10-NOTES-001', 'Intento desde otra cartera'
    )$$,
  'P0001', 'ACCESS_DENIED',
  'un comercial no puede anotar centros de otra cartera'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.register_internal_note_v1('R10-NOTES-001', '   ')$$,
  'P0001', 'NOTES_REQUIRED',
  'una anotación vacía se rechaza en el servidor'
);

select throws_ok(
  $$select public.register_internal_note_v1('R10-NOTES-001', repeat('x', 4001))$$,
  'P0001', 'INTERNAL_NOTE_TOO_LONG',
  'una anotación excesiva se rechaza antes de insertar'
);

reset role;

select results_eq(
  $$select operator_code, operator_name, notes
    from public.center_internal_notes
    where center_id = 'R10-NOTES-001'$$,
  $$values (
      'R10-NOTES-A'::text,
      'Comercial notas'::text,
      'Pendiente de revisar internamente con dirección.'::text
    )$$,
  'la base conserva autor y texto normalizado para auditoría'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select results_eq(
  $$select
      (backup ->> 'schema_version')::integer,
      jsonb_array_length(backup -> 'center_internal_notes'),
      backup -> 'center_internal_notes' -> 0 ->> 'notes'
    from (select public.owner_export_full_backup_v3() as backup) q$$,
  $$values (
      16,
      1,
      'Pendiente de revisar internamente con dirección.'::text
    )$$,
  'la copia completa V16 incluye las anotaciones internas'
);

select * from finish();
rollback;
