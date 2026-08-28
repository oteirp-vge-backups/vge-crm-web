begin;

alter table public.centers
  drop constraint if exists centers_community_canonical_check;

drop trigger if exists trg_centers_normalize_community on public.centers;
drop function if exists private.normalize_center_community();
drop function if exists private.canonical_community(text);

-- Los nombres oficiales ya normalizados se conservan: volver a introducir
-- grafías incorrectas recrearía la duplicidad que motivó esta corrección.

commit;
