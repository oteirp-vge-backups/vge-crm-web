-- R10: anotaciones internas independientes de los contactos comerciales.
-- Las notas aparecen en el mismo historial, pero no modifican estado, agenda,
-- último contacto, contadores de centro/viaje ni estadísticas de actividad.

create table public.center_internal_notes (
  note_id uuid primary key default gen_random_uuid(),
  center_id text not null
    references public.centers(id) on delete cascade,
  operator_code text not null
    references public.operators(code),
  operator_name text not null,
  notes text not null,
  created_at timestamptz not null default now(),
  created_by uuid
    references auth.users(id) on delete set null,
  constraint center_internal_notes_body_check check (
    char_length(btrim(notes)) between 1 and 4000
  )
);

comment on table public.center_internal_notes is
  'Anotaciones internas visibles en el historial del centro. No representan contactos comerciales ni alteran sus métricas.';
comment on column public.center_internal_notes.created_at is
  'Fecha real de registro de la anotación; no es una fecha de contacto comercial.';

create index center_internal_notes_center_created_idx
  on public.center_internal_notes(center_id, created_at desc, note_id);
create index center_internal_notes_operator_created_idx
  on public.center_internal_notes(operator_code, created_at desc);
create index center_internal_notes_created_by_idx
  on public.center_internal_notes(created_by)
  where created_by is not null;

alter table public.center_internal_notes enable row level security;

create policy center_internal_notes_select_visible
on public.center_internal_notes
for select
to authenticated
using ((select private.can_access_center(public.center_internal_notes.center_id)));

-- Ningún cliente escribe o lee directamente la tabla. La superficie pública
-- queda limitada a las dos RPC revisadas que siguen a continuación.
revoke all on table public.center_internal_notes
  from public, anon, authenticated, service_role;

create or replace function public.register_internal_note_v1(
  p_center_id text,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_name text;
  v_notes text := btrim(coalesce(p_notes, ''));
  v_note public.center_internal_notes%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then
    raise exception 'ACCESS_DENIED';
  end if;

  v_code := private.current_operator_code();
  v_name := private.current_operator_name();
  if v_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;
  if v_notes = '' then raise exception 'NOTES_REQUIRED'; end if;
  if char_length(v_notes) > 4000 then
    raise exception 'INTERNAL_NOTE_TOO_LONG';
  end if;

  insert into public.center_internal_notes(
    center_id, operator_code, operator_name, notes, created_by
  ) values (
    p_center_id, v_code, coalesce(v_name, v_code), v_notes, v_uid
  )
  returning * into v_note;

  return (to_jsonb(v_note) - 'note_id') || jsonb_build_object(
    'id', v_note.note_id,
    'entry_type', 'internal_note'
  );
end;
$function$;

alter function public.register_internal_note_v1(text, text) owner to postgres;
comment on function public.register_internal_note_v1(text, text) is
  'Guarda una anotación interna del centro sin crear contacto, cambiar agenda ni incrementar métricas comerciales.';
revoke all on function public.register_internal_note_v1(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_internal_note_v1(text, text)
  to authenticated;

create or replace function public.get_center_history_v2(
  p_center_id text
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.can_access_center(p_center_id) then
    raise exception 'ACCESS_DENIED';
  end if;

  return coalesce((
    select jsonb_agg(
      item.payload
      order by item.timeline_at desc, item.created_at desc, item.sort_id
    )
    from (
      select
        e.contacted_at as timeline_at,
        e.created_at,
        e.id::text as sort_id,
        to_jsonb(e) || jsonb_build_object(
          'entry_type', 'contact',
          'contact_name', ct.full_name,
          'contact_role', ct.role,
          'opportunities', coalesce(links.items, '[]'::jsonb)
        ) as payload
      from public.contact_events e
      left join public.center_contacts ct on ct.contact_id = e.contact_id
      left join lateral (
        select jsonb_agg(jsonb_build_object(
          'opportunity_id', o.opportunity_id,
          'cycle', o.cycle,
          'destination', o.destination,
          'status', o.status
        ) order by o.opportunity_id) as items
        from public.contact_event_opportunities l
        join public.travel_opportunities o
          on o.opportunity_id = l.opportunity_id
        where l.event_id = e.id
      ) links on true
      where e.center_id = p_center_id

      union all

      select
        n.created_at as timeline_at,
        n.created_at,
        n.note_id::text as sort_id,
        (to_jsonb(n) - 'note_id') || jsonb_build_object(
          'id', n.note_id,
          'entry_type', 'internal_note',
          'contacted_at', n.created_at,
          'channel', null,
          'result', null,
          'next_contact_at', null,
          'contact_name', null,
          'contact_role', null,
          'opportunities', '[]'::jsonb,
          'also_resolved_general_followup', false
        ) as payload
      from public.center_internal_notes n
      where n.center_id = p_center_id
    ) item
  ), '[]'::jsonb);
end;
$function$;

alter function public.get_center_history_v2(text) owner to postgres;
comment on function public.get_center_history_v2(text) is
  'Devuelve contactos comerciales y anotaciones internas en un único historial cronológico, identificados por entry_type.';
revoke all on function public.get_center_history_v2(text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_center_history_v2(text)
  to authenticated;

-- La copia lógica del propietario incorpora también las anotaciones internas.
create or replace function public.owner_export_full_backup_v3() returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_base jsonb;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.is_owner() then raise exception 'OWNER_REQUIRED'; end if;

  v_base := public.owner_export_full_backup_v2();
  return v_base || jsonb_build_object(
    'schema_version', 16,
    'campaigns', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.campaign_id)
      from public.campaigns c
    ), '[]'::jsonb),
    'center_campaigns', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.center_campaign_id)
      from public.center_campaigns c
    ), '[]'::jsonb),
    'center_contacts', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.contact_id)
      from public.center_contacts c
    ), '[]'::jsonb),
    'travel_opportunities', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.opportunity_id)
      from public.travel_opportunities o
    ), '[]'::jsonb),
    'contact_event_opportunities', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.event_id, l.opportunity_id)
      from public.contact_event_opportunities l
    ), '[]'::jsonb),
    'center_internal_notes', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at, n.note_id)
      from public.center_internal_notes n
    ), '[]'::jsonb),
    'opportunity_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id)
      from public.opportunity_audit a
    ), '[]'::jsonb)
  );
end;
$function$;

alter function public.owner_export_full_backup_v3() owner to postgres;
comment on function public.owner_export_full_backup_v3() is
  'Copia lógica completa V16: incluye campañas, personas, viajes, contactos y anotaciones internas.';
revoke all on function public.owner_export_full_backup_v3()
  from public, anon, authenticated, service_role;
grant execute on function public.owner_export_full_backup_v3()
  to authenticated;

notify pgrst, 'reload schema';
