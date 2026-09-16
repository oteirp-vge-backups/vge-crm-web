-- R10 · Hotfix de provincias históricas
-- Objetivo: convertir grafías válidas heredadas (LEON, Almeria, VALENCIA, etc.)
-- al único valor canónico que usa el selector del CRM y evitar su reaparición.

create or replace function private.normalize_center_community()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_province text;
  v_expected text;
begin
  if nullif(btrim(coalesce(new.province, '')), '') is not null then
    v_province := private.canonical_province(new.province);
    if v_province is null then
      raise exception 'INVALID_PROVINCE';
    end if;

    -- La provincia se guarda siempre con la grafía oficial del CRM.
    new.province := v_province;
    v_expected := private.community_for_province(v_province);
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

-- Repara únicamente provincias reconocidas por el catálogo canónico.
-- No toca centros sin provincia ni modifica asignaciones, estados, contactos,
-- oportunidades, agenda o datos comerciales.
update public.centers
set province = private.canonical_province(province)
where nullif(btrim(coalesce(province, '')), '') is not null
  and private.canonical_province(province) is not null
  and province is distinct from private.canonical_province(province);

-- Defensa adicional: una provincia informada puede ser nula/vacía por legado,
-- pero si existe debe almacenarse ya en la única grafía oficial.
alter table public.centers
  drop constraint if exists centers_province_canonical_check;

alter table public.centers
  add constraint centers_province_canonical_check
  check (
    nullif(btrim(coalesce(province, '')), '') is null
    or (
      private.canonical_province(province) is not null
      and province = private.canonical_province(province)
    )
  ) not valid;

alter table public.centers
  validate constraint centers_province_canonical_check;

comment on constraint centers_province_canonical_check on public.centers is
  'Si la provincia está informada, exige la grafía canónica usada por el selector del CRM.';

comment on function private.normalize_center_community() is
  'Normaliza provincia y comunidad: convierte variantes históricas reconocidas a la grafía canónica y mantiene su coherencia.';
