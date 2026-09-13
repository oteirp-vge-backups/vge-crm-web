begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('91000000-0000-4000-8000-000000000001', 'stats-owner@example.invalid'),
  ('91000000-0000-4000-8000-000000000002', 'stats-seller-a@example.invalid'),
  ('91000000-0000-4000-8000-000000000003', 'stats-seller-b@example.invalid');

insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('Sin asignar', 'Sin asignar', null, null, 'system', 'system', true),
  ('R10-STAT-OWNER', 'Propietario estadísticas', 'stats-owner@example.invalid',
    '91000000-0000-4000-8000-000000000001', 'admin', 'owner', true),
  ('R10-STAT-A', 'Comercial A', 'stats-seller-a@example.invalid',
    '91000000-0000-4000-8000-000000000002', 'seller', 'seller', true),
  ('R10-STAT-B', 'Comercial B', 'stats-seller-b@example.invalid',
    '91000000-0000-4000-8000-000000000003', 'seller', 'seller', true);

insert into public.campaigns
  (code, label, starts_on, ends_on, active, is_default)
values
  ('R10STAT26', 'Campaña pruebas estadísticas', '2026-09-01', '2027-08-31', true, true);

insert into public.centers (id, school, city, province, community) values
  ('R10-STAT-A1', 'Centro con estado general', 'Madrid', 'Madrid', 'Madrid'),
  ('R10-STAT-A2', 'Centro con un viaje', 'Madrid', 'Madrid', 'Madrid'),
  ('R10-STAT-A3', 'Centro con varios viajes', 'Madrid', 'Madrid', 'Madrid'),
  ('R10-STAT-A4', 'Centro con viaje pendiente', 'Madrid', 'Madrid', 'Madrid'),
  ('R10-STAT-A5', 'Centro interesado sin viaje', 'León', 'León', 'Castilla y León'),
  ('R10-STAT-B1', 'Centro de otro responsable', 'León', 'León', 'Castilla y León');

update public.center_state
set assigned_to = 'R10-STAT-A',
    status = case center_id
      when 'R10-STAT-A1' then 'Trasladado a cotización'
      when 'R10-STAT-A4' then 'Interesado'
      when 'R10-STAT-A5' then 'Interesado'
      else 'Pendiente'
    end
where center_id in (
  'R10-STAT-A1','R10-STAT-A2','R10-STAT-A3','R10-STAT-A4','R10-STAT-A5'
);

update public.center_state
set assigned_to = 'R10-STAT-B', status = 'Pendiente'
where center_id = 'R10-STAT-B1';

insert into public.center_campaigns (center_id, campaign_id)
select center_id, (select campaign_id from public.campaigns where code = 'R10STAT26')
from (values
  ('R10-STAT-A2'),('R10-STAT-A3'),('R10-STAT-A4'),('R10-STAT-B1')
) as fixture(center_id);

insert into public.travel_opportunities
  (opportunity_id, center_campaign_id, center_id, cycle, status)
values
  ('VGE-O900001', (select center_campaign_id from public.center_campaigns where center_id = 'R10-STAT-A2'), 'R10-STAT-A2', '4.º ESO', 'Trasladado a cotización'),
  ('VGE-O900002', (select center_campaign_id from public.center_campaigns where center_id = 'R10-STAT-A3'), 'R10-STAT-A3', '4.º ESO', 'Trasladado a cotización'),
  ('VGE-O900003', (select center_campaign_id from public.center_campaigns where center_id = 'R10-STAT-A3'), 'R10-STAT-A3', 'Bachillerato', 'Trasladado a cotización'),
  ('VGE-O900004', (select center_campaign_id from public.center_campaigns where center_id = 'R10-STAT-A3'), 'R10-STAT-A3', '6.º Primaria', 'Trasladado a cotización'),
  ('VGE-O900005', (select center_campaign_id from public.center_campaigns where center_id = 'R10-STAT-A4'), 'R10-STAT-A4', '4.º ESO', 'Pendiente'),
  ('VGE-O900006', (select center_campaign_id from public.center_campaigns where center_id = 'R10-STAT-B1'), 'R10-STAT-B1', '4.º ESO', 'Trasladado a cotización');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') ->> 'schema_version')::integer,
  2,
  'mantiene el contrato de estadísticas v2'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'kpis' ->> 'portfolio_total')::bigint,
  5::bigint,
  'el filtro de responsable limita la cartera a sus cinco centros'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'kpis' ->> 'worked_centers')::bigint,
  4::bigint,
  'la cartera trabajada incluye estados efectivos generales y de viaje'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'kpis' ->> 'interested_centers')::bigint,
  1::bigint,
  'un viaje pendiente prevalece sobre un estado general interesado obsoleto'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'kpis' ->> 'quoted_centers')::bigint,
  3::bigint,
  'cuenta centros a cotización por estado general o por viaje activo'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'kpis' ->> 'quote_conversion_pct')::numeric,
  75.0::numeric,
  'la conversión usa centros efectivos a cotización sobre centros trabajados'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'kpis' ->> 'unattended_opportunities')::bigint,
  4::bigint,
  'las oportunidades sin atender usan el estado efectivo del centro'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'travel_metrics' ->> 'opportunities_total')::bigint,
  5::bigint,
  'los viajes siguen contándose de forma independiente'
);

select is(
  (public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'travel_metrics' ->> 'opportunities_quoted')::bigint,
  4::bigint,
  'varios viajes a cotización del mismo centro permanecen separados'
);

select is(
  (
    select (row_value ->> 'quoted_centers')::bigint
    from jsonb_array_elements(
      public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'operators'
    ) as rows(row_value)
    where row_value ->> 'operator_code' = 'R10-STAT-A'
  ),
  3::bigint,
  'la tabla de equipo usa el mismo total efectivo de centros'
);

select is(
  (
    select (row_value ->> 'quoted_centers')::bigint
    from jsonb_array_elements(
      public.get_statistics_dashboard_v2(30, 'R10-STAT-A', 'Madrid', 'R10STAT26') -> 'zones'
    ) as rows(row_value)
    where row_value ->> 'community' = 'Madrid'
  ),
  3::bigint,
  'la tabla por zona conserva el mismo total efectivo'
);

select is(
  (
    select count(*)
    from jsonb_array_elements(
      public.get_statistics_dashboard_v2(30, 'R10-STAT-A', null, 'R10STAT26') -> 'opportunities'
    ) as rows(row_value)
    where row_value ->> 'status' = 'Trasladado a cotización'
  ),
  3::bigint,
  'el detalle devuelve cada centro a cotización una sola vez'
);

select is(
  (public.get_statistics_dashboard_v2(30, null, null, 'R10STAT26') -> 'kpis' ->> 'quoted_centers')::bigint,
  4::bigint,
  'la vista global incluye además el centro del otro responsable'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (public.get_statistics_dashboard_v2(30, null, null, 'R10STAT26') -> 'kpis' ->> 'quoted_centers')::bigint,
  3::bigint,
  'un comercial recibe exclusivamente el total efectivo de su cartera'
);

select throws_ok(
  $$select public.get_statistics_dashboard_v2(30, 'R10-STAT-B', null, 'R10STAT26')$$,
  'P0001',
  'STATS_SCOPE_DENIED',
  'un comercial no puede consultar las estadísticas de otro responsable'
);

reset role;

select ok(
  has_function_privilege('authenticated', 'public.get_statistics_dashboard_v2(integer,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_statistics_dashboard_v2(integer,text,text,text)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.get_statistics_dashboard_v2(integer,text,text,text)', 'EXECUTE'),
  'el RPC conserva acceso exclusivo para usuarios autenticados'
);

select ok(
  (
    select p.prosecdef
      and p.provolatile = 's'
      and p.proconfig = array['search_path=""']::text[]
    from pg_proc p
    where p.oid = 'public.get_statistics_dashboard_v2(integer,text,text,text)'::regprocedure
  ),
  'el RPC conserva SECURITY DEFINER, estabilidad y search_path vacío'
);

select * from finish();
rollback;
