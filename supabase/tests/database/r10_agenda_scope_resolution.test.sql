begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('92000000-0000-4000-8000-000000000001', 'agenda-seller@example.invalid');

insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('Sin asignar', 'Sin asignar', null, null, 'system', 'system', true)
on conflict (code) do nothing;

insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('R10-AGENDA', 'Comercial agenda', 'agenda-seller@example.invalid',
   '92000000-0000-4000-8000-000000000001', 'seller', 'seller', true);

insert into public.campaigns
  (code, label, starts_on, ends_on, active, is_default)
select 'R10AGENDA', 'Campaña pruebas agenda', '2026-09-01', '2027-08-31', true, true
where not exists (select 1 from public.campaigns where is_default = true);

insert into public.centers (id, school, city, province, community) values
  ('R10-AGENDA-PRESERVE', 'Centro conserva general', 'León', 'León', 'Castilla y León'),
  ('R10-AGENDA-CLOSE', 'Centro cierra ambos', 'León', 'León', 'Castilla y León'),
  ('R10-AGENDA-RESCHEDULE', 'Centro reprograma ambos', 'León', 'León', 'Castilla y León'),
  ('R10-AGENDA-FUTURE', 'Centro con agenda futura', 'León', 'León', 'Castilla y León');

update public.center_state
set assigned_to = 'R10-AGENDA',
    status = 'Pendiente',
    next_contact_at = case center_id
      when 'R10-AGENDA-FUTURE' then '2099-01-15 09:00:00+00'::timestamptz
      else '2000-01-15 09:00:00+00'::timestamptz
    end
where center_id like 'R10-AGENDA-%';

insert into public.travel_opportunities
  (opportunity_id, center_campaign_id, center_id, cycle, status)
values
  ('VGE-O920001', (select center_campaign_id from public.center_campaigns where center_id = 'R10-AGENDA-PRESERVE'), 'R10-AGENDA-PRESERVE', '4.º ESO', 'Pendiente'),
  ('VGE-O920002', (select center_campaign_id from public.center_campaigns where center_id = 'R10-AGENDA-CLOSE'), 'R10-AGENDA-CLOSE', 'Bachillerato', 'Pendiente'),
  ('VGE-O920003', (select center_campaign_id from public.center_campaigns where center_id = 'R10-AGENDA-RESCHEDULE'), 'R10-AGENDA-RESCHEDULE', '6.º Primaria', 'Pendiente'),
  ('VGE-O920004', (select center_campaign_id from public.center_campaigns where center_id = 'R10-AGENDA-FUTURE'), 'R10-AGENDA-FUTURE', '4.º ESO', 'Pendiente');

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contact_events'
      and column_name = 'also_resolved_general_followup'
      and is_nullable = 'NO'
      and column_default = 'false'
  ),
  'el historial incorpora una marca obligatoria y con valor seguro por defecto'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.register_contact_multi_v1(
      'R10-AGENDA-PRESERVE', now(), 'Llamada', 'Información enviada',
      'La gestión corresponde solo al viaje.', '2099-02-01 10:00:00+00',
      (select state_version from public.center_state where center_id = 'R10-AGENDA-PRESERVE'),
      null, array['VGE-O920001'],
      jsonb_build_object('VGE-O920001', (select opportunity_version from public.travel_opportunities where opportunity_id = 'VGE-O920001'))
    )$$,
  'los clientes anteriores pueden omitir el nuevo argumento y conservar el contrato'
);

select is(
  (select next_contact_at from public.center_state where center_id = 'R10-AGENDA-PRESERVE'),
  '2000-01-15 09:00:00+00'::timestamptz,
  'un contacto vinculado solo al viaje conserva el seguimiento general independiente'
);

select is(
  (select also_resolved_general_followup from public.contact_events where center_id = 'R10-AGENDA-PRESERVE'),
  false,
  'el historial no atribuye alcance general cuando no se solicitó'
);

select is(
  (select next_contact_at from public.travel_opportunities where opportunity_id = 'VGE-O920001'),
  '2099-02-01 10:00:00+00'::timestamptz,
  'la próxima fecha sí se aplica al viaje seleccionado'
);

select lives_ok(
  $$select public.register_contact_multi_v1(
      p_center_id => 'R10-AGENDA-CLOSE',
      p_contacted_at => now(),
      p_channel => 'WhatsApp',
      p_result => 'Pide presupuesto',
      p_notes => 'La misma gestión atiende viaje y recordatorio general.',
      p_next_contact_at => '2099-03-01 11:00:00+00',
      p_expected_state_version => (select state_version from public.center_state where center_id = 'R10-AGENDA-CLOSE'),
      p_contact_id => null,
      p_opportunity_ids => array['VGE-O920002'],
      p_expected_opportunity_versions => jsonb_build_object('VGE-O920002', (select opportunity_version from public.travel_opportunities where opportunity_id = 'VGE-O920002')),
      p_also_resolve_general_followup => true
    )$$,
  'una sola gestión puede atender explícitamente viaje y seguimiento general vencido'
);

select results_eq(
  $$select status, next_contact_at from public.center_state where center_id = 'R10-AGENDA-CLOSE'$$,
  $$values ('Trasladado a cotización'::text, null::timestamptz)$$,
  'Pide presupuesto cierra el seguimiento general y actualiza su estado'
);

select results_eq(
  $$select also_resolved_general_followup, next_contact_at from public.contact_events where center_id = 'R10-AGENDA-CLOSE'$$,
  $$values (true, null::timestamptz)$$,
  'el evento conserva que también atendió la agenda general y no guarda una fecha descartada'
);

select results_eq(
  $$select status, next_contact_at from public.travel_opportunities where opportunity_id = 'VGE-O920002'$$,
  $$values ('Trasladado a cotización'::text, null::timestamptz)$$,
  'Pide presupuesto cierra igualmente el seguimiento del viaje'
);

select is(
  (select count(*)
   from jsonb_array_elements(public.get_agenda_items_v2(null) -> 'items') as rows(item)
   where item ->> 'center_id' = 'R10-AGENDA-CLOSE'),
  0::bigint,
  'el centro atendido desaparece de la agenda sin crear un contacto duplicado'
);

select is(
  (select count(*) from public.contact_events where center_id = 'R10-AGENDA-CLOSE'),
  1::bigint,
  'la resolución de ambos ámbitos genera un único evento de contacto'
);

select lives_ok(
  $$select public.register_contact_multi_v1(
      p_center_id => 'R10-AGENDA-RESCHEDULE',
      p_contacted_at => now(),
      p_channel => 'Email',
      p_result => 'Volver a contactar',
      p_notes => 'Se acuerda una nueva fecha para ambos seguimientos.',
      p_next_contact_at => '2099-04-01 12:00:00+00',
      p_expected_state_version => (select state_version from public.center_state where center_id = 'R10-AGENDA-RESCHEDULE'),
      p_contact_id => null,
      p_opportunity_ids => array['VGE-O920003'],
      p_expected_opportunity_versions => jsonb_build_object('VGE-O920003', (select opportunity_version from public.travel_opportunities where opportunity_id = 'VGE-O920003')),
      p_also_resolve_general_followup => true
    )$$,
  'Volver a contactar sustituye la fecha vencida por una futura en ambos ámbitos'
);

select results_eq(
  $$select s.next_contact_at, o.next_contact_at
    from public.center_state s
    join public.travel_opportunities o on o.center_id = s.center_id
    where s.center_id = 'R10-AGENDA-RESCHEDULE'$$,
  $$values ('2099-04-01 12:00:00+00'::timestamptz, '2099-04-01 12:00:00+00'::timestamptz)$$,
  'la nueva fecha queda sincronizada en el seguimiento general y el viaje seleccionado'
);

select is(
  (public.get_center_history_v2('R10-AGENDA-RESCHEDULE') -> 0 ->> 'also_resolved_general_followup')::boolean,
  true,
  'el historial visible expone de forma auditable el doble alcance'
);

select throws_ok(
  $$select public.register_contact_multi_v1(
      p_center_id => 'R10-AGENDA-FUTURE',
      p_contacted_at => now(), p_channel => 'Llamada', p_result => 'Información enviada',
      p_notes => 'No debe modificar una tarea general futura.', p_next_contact_at => null,
      p_expected_state_version => (select state_version from public.center_state where center_id = 'R10-AGENDA-FUTURE'),
      p_contact_id => null, p_opportunity_ids => array['VGE-O920004'],
      p_expected_opportunity_versions => jsonb_build_object('VGE-O920004', (select opportunity_version from public.travel_opportunities where opportunity_id = 'VGE-O920004')),
      p_also_resolve_general_followup => true
    )$$,
  'P0001',
  'GENERAL_FOLLOWUP_NOT_OVERDUE',
  'el servidor impide borrar o sustituir una tarea general que aún no ha vencido'
);

select throws_ok(
  $$select public.register_contact_multi_v1(
      p_center_id => 'R10-AGENDA-PRESERVE',
      p_contacted_at => now(), p_channel => 'Llamada', p_result => 'Información enviada',
      p_notes => 'La opción doble exige al menos un viaje.', p_next_contact_at => null,
      p_expected_state_version => (select state_version from public.center_state where center_id = 'R10-AGENDA-PRESERVE'),
      p_contact_id => null, p_opportunity_ids => '{}'::text[],
      p_expected_opportunity_versions => '{}'::jsonb,
      p_also_resolve_general_followup => true
    )$$,
  'P0001',
  'GENERAL_FOLLOWUP_SCOPE_REQUIRES_TRIP',
  'el servidor rechaza la doble resolución sin un viaje seleccionado'
);

select is(
  (select count(*) from public.contact_events where center_id = 'R10-AGENDA-FUTURE'),
  0::bigint,
  'una petición rechazada no deja eventos parciales'
);

reset role;

select ok(
  has_function_privilege(
    'authenticated',
    'public.register_contact_multi_v1(text,timestamptz,text,text,text,timestamptz,bigint,bigint,text[],jsonb,boolean)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.register_contact_multi_v1(text,timestamptz,text,text,text,timestamptz,bigint,bigint,text[],jsonb,boolean)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.register_contact_multi_v1(text,timestamptz,text,text,text,timestamptz,bigint,bigint,text[],jsonb,boolean)',
    'EXECUTE'
  ),
  'la RPC mantiene ejecución exclusiva para usuarios autenticados'
);

select ok(
  (
    select p.prosecdef
      and p.provolatile = 'v'
      and p.proconfig = array['search_path=""']::text[]
    from pg_proc p
    where p.oid = 'public.register_contact_multi_v1(text,timestamptz,text,text,text,timestamptz,bigint,bigint,text[],jsonb,boolean)'::regprocedure
  ),
  'la RPC conserva SECURITY DEFINER, volatilidad y search_path protegido'
);

select ok(
  to_regprocedure('public.register_contact_multi_v1(text,timestamptz,text,text,text,timestamptz,bigint,bigint,text[],jsonb)') is null,
  'no queda una sobrecarga antigua que pueda hacer ambiguo el RPC de PostgREST'
);

select * from finish();
rollback;
