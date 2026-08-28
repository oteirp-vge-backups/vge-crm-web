create or replace function private.canonical_community(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_value text := private.norm_center_text(coalesce(p_value, ''));
begin
  return case v_value
    when 'andalucia' then 'Andalucía'
    when 'aragon' then 'Aragón'
    when 'asturias' then 'Asturias'
    when 'principado de asturias' then 'Asturias'
    when 'islas baleares' then 'Islas Baleares'
    when 'illes balears' then 'Islas Baleares'
    when 'baleares' then 'Islas Baleares'
    when 'canarias' then 'Canarias'
    when 'cantabria' then 'Cantabria'
    when 'castilla la mancha' then 'Castilla-La Mancha'
    when 'castilla y leon' then 'Castilla y León'
    when 'castilla leon' then 'Castilla y León'
    when 'cataluna' then 'Cataluña'
    when 'catalunya' then 'Cataluña'
    when 'comunidad valenciana' then 'Comunidad Valenciana'
    when 'comunitat valenciana' then 'Comunidad Valenciana'
    when 'extremadura' then 'Extremadura'
    when 'galicia' then 'Galicia'
    when 'madrid' then 'Madrid'
    when 'comunidad de madrid' then 'Madrid'
    when 'region de murcia' then 'Región de Murcia'
    when 'murcia' then 'Región de Murcia'
    when 'navarra' then 'Navarra'
    when 'comunidad foral de navarra' then 'Navarra'
    when 'pais vasco' then 'País Vasco'
    when 'euskadi' then 'País Vasco'
    when 'la rioja' then 'La Rioja'
    when 'rioja' then 'La Rioja'
    when 'ceuta' then 'Ceuta'
    when 'ciudad autonoma de ceuta' then 'Ceuta'
    when 'melilla' then 'Melilla'
    when 'ciudad autonoma de melilla' then 'Melilla'
    else null
  end;
end;
$$;

revoke all on function private.canonical_community(text) from public;

create or replace function private.normalize_center_community()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_expected text;
begin
  if nullif(btrim(coalesce(new.province, '')), '') is not null then
    v_expected := private.community_for_province(new.province);
    if v_expected is null then
      raise exception 'INVALID_PROVINCE';
    end if;
  else
    v_expected := private.canonical_community(new.community);
    if v_expected is null then
      raise exception 'INVALID_COMMUNITY';
    end if;
  end if;

  new.community := v_expected;
  return new;
end;
$$;

revoke all on function private.normalize_center_community() from public;

drop trigger if exists trg_centers_normalize_community on public.centers;
create trigger trg_centers_normalize_community
before insert or update of province, community on public.centers
for each row execute function private.normalize_center_community();

-- Repara las variantes heredadas sin alterar asignaciones, estados, contactos
-- ni oportunidades. El trigger calcula el mismo valor oficial que la RPC R10.
update public.centers
set community = case
  when nullif(btrim(coalesce(province, '')), '') is not null
    then private.community_for_province(province)
  else private.canonical_community(community)
end
where community is distinct from case
  when nullif(btrim(coalesce(province, '')), '') is not null
    then private.community_for_province(province)
  else private.canonical_community(community)
end;

alter table public.centers
  add constraint centers_community_canonical_check
  check (
    private.canonical_community(community) is not null
    and community = private.canonical_community(community)
    and (
      nullif(btrim(coalesce(province, '')), '') is null
      or (
        private.community_for_province(province) is not null
        and community = private.community_for_province(province)
      )
    )
  ) not valid;

alter table public.centers
  validate constraint centers_community_canonical_check;

comment on function private.canonical_community(text) is
  'Convierte variantes ortográficas de comunidades autónomas a los nombres oficiales usados por el CRM.';

comment on function private.normalize_center_community() is
  'Impide comunidades duplicadas: deriva la comunidad desde la provincia o normaliza el valor histórico cuando no hay provincia.';

comment on constraint centers_community_canonical_check on public.centers is
  'Garantiza una única grafía oficial y la coherencia entre provincia y comunidad autónoma.';
