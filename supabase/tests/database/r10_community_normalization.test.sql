begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select is(private.canonical_community('Andalucia'), 'Andalucía',
  'normaliza Andalucia con su tilde oficial');
select is(private.canonical_community('Castilla La Mancha'), 'Castilla-La Mancha',
  'normaliza Castilla-La Mancha con su guion oficial');
select is(private.canonical_community('Pais Vasco'), 'País Vasco',
  'normaliza País Vasco con su tilde oficial');
select is(private.canonical_community('Comunitat Valenciana'), 'Comunidad Valenciana',
  'admite la denominación valenciana y conserva un único valor CRM');
select is(private.canonical_community('zona inventada'), null,
  'rechaza comunidades desconocidas');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.centers'::regclass
      and conname = 'centers_community_canonical_check'
      and contype = 'c'
  ),
  'centers tiene una restricción de comunidad canónica'
);
select ok(
  (select convalidated from pg_constraint
   where conrelid = 'public.centers'::regclass
     and conname = 'centers_community_canonical_check'),
  'la restricción está validada sobre todos los centros'
);

-- Cada archivo pgTAP se ejecuta en una transacción independiente. Reponemos
-- el operador técnico mínimo que necesita el trigger heredado de center_state.
insert into public.operators
  (code, display_name, email, auth_user_id, role, access_role, active)
values
  ('Sin asignar', 'Sin asignar', null, null, 'system', 'system', true);

insert into public.centers(id, school, city, province, community)
values ('R10-COMMUNITY-001', 'Centro prueba Andalucía', 'Almería', 'Almeria', 'Andalucia');

select is(
  (select community from public.centers where id = 'R10-COMMUNITY-001'),
  'Andalucía',
  'una provincia válida prevalece y genera la comunidad oficial'
);

insert into public.centers(id, school, city, province, community)
values ('R10-COMMUNITY-002', 'Centro histórico País Vasco', 'Bilbao', null, 'Pais Vasco');

select is(
  (select community from public.centers where id = 'R10-COMMUNITY-002'),
  'País Vasco',
  'un centro histórico sin provincia normaliza su comunidad'
);

update public.centers
set community = 'Andalucia'
where id = 'R10-COMMUNITY-002';

select is(
  (select community from public.centers where id = 'R10-COMMUNITY-002'),
  'Andalucía',
  'una actualización directa tampoco puede reintroducir una variante'
);

select throws_ok(
  $$insert into public.centers(id, school, city, province, community)
    values ('R10-COMMUNITY-003', 'Centro comunidad inválida', 'Prueba', null, 'Zona inventada')$$,
  'P0001', 'INVALID_COMMUNITY',
  'rechaza una comunidad desconocida cuando no hay provincia'
);

select throws_ok(
  $$insert into public.centers(id, school, city, province, community)
    values ('R10-COMMUNITY-004', 'Centro provincia inválida', 'Prueba', 'Provincia inventada', 'Andalucía')$$,
  'P0001', 'INVALID_PROVINCE',
  'rechaza una provincia desconocida aunque la comunidad parezca válida'
);

select is(
  (select count(*) from public.centers
   where private.canonical_community(community) is null
      or community is distinct from private.canonical_community(community)
      or (
        nullif(btrim(coalesce(province, '')), '') is not null
        and community is distinct from private.community_for_province(province)
      )),
  0::bigint,
  'no queda ninguna comunidad no canónica o incoherente'
);

select ok(
  not has_function_privilege('anon', 'private.canonical_community(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.canonical_community(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.normalize_center_community()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.normalize_center_community()', 'EXECUTE'),
  'los helpers privados no quedan expuestos al cliente'
);

select * from finish();
rollback;
