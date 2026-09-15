-- One-time reconciliation for the contact already recorded against the
-- Bachillerato trip of CYL-0029. Run only after the agenda-scope migration.
--
-- The guards deliberately stop if any operator has updated the center, the
-- event or its trip link since the incident was diagnosed.

do $repair$
declare
  v_event public.contact_events%rowtype;
  v_state public.center_state%rowtype;
  v_linked_opportunities text[];
begin
  select e.* into v_event
  from public.contact_events e
  where e.id = '5d5cd95a-a956-4df2-854d-226101def6fb'::uuid
  for update;

  if not found
     or v_event.center_id <> 'CYL-0029'
     or v_event.result <> 'Pide presupuesto'
     or v_event.contacted_at <> '2026-09-14 10:00:00+00'::timestamptz
     or v_event.next_contact_at is not null then
    raise exception 'CYL_0029_EVENT_PRECONDITION_FAILED';
  end if;

  select coalesce(array_agg(l.opportunity_id order by l.opportunity_id), '{}'::text[])
  into v_linked_opportunities
  from public.contact_event_opportunities l
  where l.event_id = v_event.id;

  if v_linked_opportunities <> array['VGE-O000019']::text[] then
    raise exception 'CYL_0029_TRIP_LINK_PRECONDITION_FAILED';
  end if;

  select s.* into v_state
  from public.center_state s
  where s.center_id = 'CYL-0029'
  for update;

  if not found
     or v_state.status <> 'Pendiente'
     or v_state.next_contact_at <> '2026-09-14 09:00:00+00'::timestamptz
     or v_state.last_contact_at <> v_event.contacted_at
     or v_state.last_result <> v_event.result
     or v_state.state_version <> 6 then
    raise exception 'CYL_0029_STATE_PRECONDITION_FAILED';
  end if;

  update public.contact_events
  set also_resolved_general_followup = true
  where id = v_event.id;

  update public.center_state
  set status = 'Trasladado a cotización',
      next_contact_at = null,
      state_version = state_version + 1,
      updated_at = now(),
      updated_by = v_event.created_by
  where center_id = v_state.center_id;
end;
$repair$;
