# R10 rollback: restaurar el contrato anterior de registro de contactos

```sql
-- R10 rollback: restore the previous contact registration contract.
--
-- Coordinate this database rollback with restoration of frontend
-- r10-phase10.0.1. The additive audit column is intentionally preserved so
-- that no historical evidence is destroyed.

drop function public.register_contact_multi_v1(
  text, timestamptz, text, text, text, timestamptz, bigint, bigint, text[], jsonb, boolean
);

create function public.register_contact_multi_v1(
  p_center_id text,
  p_contacted_at timestamptz,
  p_channel text,
  p_result text,
  p_notes text,
  p_next_contact_at timestamptz,
  p_expected_state_version bigint,
  p_contact_id bigint default null,
  p_opportunity_ids text[] default '{}'::text[],
  p_expected_opportunity_versions jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_state public.center_state%rowtype;
  v_event public.contact_events%rowtype;
  v_opp public.travel_opportunities%rowtype;
  v_code text;
  v_name text;
  v_ids text[];
  v_opp_id text;
  v_expected bigint;
  v_status text;
  v_next timestamptz;
  v_linked boolean;
  v_contact_blocked boolean;
  v_updated_state public.center_state%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;

  v_code := private.current_operator_code();
  v_name := private.current_operator_name();
  if v_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;
  if p_contacted_at is null then raise exception 'CONTACT_DATE_REQUIRED'; end if;
  if p_channel not in ('Llamada','Email','WhatsApp','Reunión','Otro') then raise exception 'INVALID_CHANNEL'; end if;
  if p_result not in ('No localizado','Información enviada','Pide presupuesto','No interesado','Volver a contactar') then
    raise exception 'INVALID_RESULT';
  end if;
  if nullif(btrim(coalesce(p_notes,'')),'') is null then raise exception 'NOTES_REQUIRED'; end if;

  select coalesce(array_agg(x order by x),'{}'::text[]) into v_ids
  from (
    select distinct nullif(btrim(u),'') as x
    from unnest(coalesce(p_opportunity_ids,'{}'::text[])) u
    where nullif(btrim(u),'') is not null
  ) q;
  v_linked := cardinality(v_ids) > 0;

  select s.* into v_state
  from public.center_state s
  where s.center_id = p_center_id
  for update;
  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if p_expected_state_version is null or v_state.state_version is distinct from p_expected_state_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;
  if v_state.assigned_to <> v_code and not private.is_admin() then raise exception 'ASSIGNMENT_CHANGED'; end if;
  if v_state.contact_blocked then raise exception 'CONTACT_BLOCKED'; end if;

  if p_contact_id is not null then
    select c.do_not_contact into v_contact_blocked
    from public.center_contacts c
    where c.contact_id = p_contact_id
      and c.center_id = p_center_id
      and c.active = true;
    if not found then raise exception 'INVALID_CENTER_CONTACT'; end if;
    if v_contact_blocked then raise exception 'CONTACT_BLOCKED'; end if;
  end if;

  foreach v_opp_id in array v_ids loop
    select o.* into v_opp
    from public.travel_opportunities o
    where o.opportunity_id = v_opp_id
    for update;
    if not found or v_opp.center_id <> p_center_id or not v_opp.active then
      raise exception 'INVALID_OPPORTUNITY: %', v_opp_id;
    end if;
    v_expected := nullif(p_expected_opportunity_versions->>v_opp_id,'')::bigint;
    if v_expected is null or v_opp.opportunity_version is distinct from v_expected then
      raise exception 'CONCURRENT_OPPORTUNITY_UPDATE: %', v_opp_id;
    end if;
  end loop;

  v_status := case p_result
    when 'Información enviada' then 'Interesado'
    when 'Pide presupuesto' then 'Trasladado a cotización'
    when 'No interesado' then 'No interesado'
    else v_state.status
  end;
  v_next := case when p_result in ('Pide presupuesto','No interesado') then null else p_next_contact_at end;

  insert into public.contact_events(
    center_id, operator_code, operator_name, contacted_at, channel,
    result, notes, next_contact_at, created_by, contact_id
  ) values (
    p_center_id, v_code, v_name, p_contacted_at, p_channel,
    p_result, btrim(p_notes), v_next, (select auth.uid()), p_contact_id
  ) returning * into v_event;

  foreach v_opp_id in array v_ids loop
    insert into public.contact_event_opportunities(event_id, opportunity_id)
    values (v_event.id, v_opp_id);

    update public.travel_opportunities o
    set status = case p_result
          when 'Información enviada' then 'Interesado'
          when 'Pide presupuesto' then 'Trasladado a cotización'
          when 'No interesado' then 'No interesado'
          else o.status
        end,
        next_contact_at = case
          when p_result in ('Pide presupuesto','No interesado') then null
          else p_next_contact_at
        end,
        last_contact_at = p_contacted_at,
        last_result = p_result,
        last_operator_code = v_code,
        contact_count = o.contact_count + 1,
        opportunity_version = o.opportunity_version + 1,
        updated_at = now(),
        updated_by = (select auth.uid())
    where o.opportunity_id = v_opp_id;
  end loop;

  update public.center_state s
  set status = case when v_linked then s.status else v_status end,
      next_contact_at = case when v_linked then s.next_contact_at else v_next end,
      last_contact_at = p_contacted_at,
      last_result = p_result,
      last_operator_code = v_code,
      contact_count = s.contact_count + 1,
      state_version = s.state_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where s.center_id = p_center_id
  returning * into v_updated_state;

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'center_state', to_jsonb(v_updated_state),
    'opportunities', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.opportunity_id)
      from public.travel_opportunities o
      where o.opportunity_id = any(v_ids)
    ), '[]'::jsonb)
  );
end;
$function$;

alter function public.register_contact_multi_v1(
  text, timestamptz, text, text, text, timestamptz, bigint, bigint, text[], jsonb
) owner to postgres;

comment on function public.register_contact_multi_v1(
  text, timestamptz, text, text, text, timestamptz, bigint, bigint, text[], jsonb
) is 'Registra una conversación y la vincula atómicamente a ninguno, uno o varios viajes.';

revoke all on function public.register_contact_multi_v1(
  text, timestamptz, text, text, text, timestamptz, bigint, bigint, text[], jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.register_contact_multi_v1(
  text, timestamptz, text, text, text, timestamptz, bigint, bigint, text[], jsonb
) to authenticated;

notify pgrst, 'reload schema';
```
