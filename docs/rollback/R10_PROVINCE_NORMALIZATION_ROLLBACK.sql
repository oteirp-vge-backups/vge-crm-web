-- R10 · Rollback estructural del hotfix de normalización de provincias
--
-- Este retorno elimina la defensa nueva y restaura el comportamiento anterior
-- del trigger. NO reintroduce grafías históricas como LEON, VALENCIA o Almeria:
-- la reparación de datos canónicos se conserva deliberadamente para no degradar
-- información ya corregida.

begin;

alter table public.centers
  drop constraint if exists centers_province_canonical_check;

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

comment on function private.normalize_center_community() is
  'Impide comunidades duplicadas: deriva la comunidad desde la provincia o normaliza el valor histórico cuando no hay provincia.';

commit;
