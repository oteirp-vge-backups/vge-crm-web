begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select is(private.canonical_province('LEON'), 'León',
  'LEON se reconoce como León');
select is(private.canonical_province('Almeria'), 'Almería',
  'Almeria se reconoce como Almería');
select is(private.canonical_province('CASTELLON'), 'Castellón',
  'CASTELLON se reconoce como Castellón');
select is(private.canonical_province('PALENCIA'), 'Palencia',
  'PALENCIA se reconoce como Palencia');

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.centers'::regclass
      and conname = 'centers_province_canonical_check'
      and contype = 'c'
  ),
  'centers tiene una restricción de provincia canónica'
);

select ok(
  (select convalidated from pg_constraint
   where conrelid = 'public.centers'::regclass
     and conname = 'centers_province_canonical_check'),
  'la restricción de provincia está validada'
);

insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('Sin asignar', 'Sin asignar', null, null, 'system', 'system', true)
on conflict (code) do nothing;

insert into public.centers(id, school, city, province, community)
values ('R10-PROVINCE-001', 'Centro prueba León', 'León', 'LEON', 'Castilla y León');

select is(
  (select province from public.centers where id = 'R10-PROVINCE-001'),
  'León',
  'un alta con LEON se almacena directamente como León'
);

select is(
  (select community from public.centers where id = 'R10-PROVINCE-001'),
  'Castilla y León',
  'la comunidad permanece coherente después de normalizar la provincia'
);

insert into public.centers(id, school, city, province, community)
values ('R10-PROVINCE-002', 'Centro prueba Almería', 'Almería', 'Almeria', 'Madrid');

select results_eq(
  $$select province, community from public.centers where id = 'R10-PROVINCE-002'$$,
  $$values ('Almería'::text, 'Andalucía'::text)$$,
  'provincia y comunidad se corrigen juntas aunque la comunidad recibida sea incoherente'
);

update public.centers
set province = 'VALENCIA'
where id = 'R10-PROVINCE-001';

select results_eq(
  $$select province, community from public.centers where id = 'R10-PROVINCE-001'$$,
  $$values ('Valencia'::text, 'Comunidad Valenciana'::text)$$,
  'una actualización futura tampoco puede reintroducir mayúsculas históricas'
);

select throws_ok(
  $$insert into public.centers(id, school, city, province, community)
    values ('R10-PROVINCE-003', 'Centro provincia inválida', 'Prueba', 'Provincia inventada', 'Andalucía')$$,
  'P0001', 'INVALID_PROVINCE',
  'una provincia desconocida sigue siendo rechazada'
);

select is(
  (select count(*) from public.centers
   where nullif(btrim(coalesce(province, '')), '') is not null
     and (
       private.canonical_province(province) is null
       or province is distinct from private.canonical_province(province)
       or community is distinct from private.community_for_province(province)
     )),
  0::bigint,
  'no queda ninguna provincia informada fuera del catálogo canónico o incoherente con su comunidad'
);

select * from finish();
rollback;
