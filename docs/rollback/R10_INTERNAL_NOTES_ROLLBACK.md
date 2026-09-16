# Retorno · R10 anotaciones internas

Ejecutar únicamente si la migración `20260916193916_add_internal_notes_history.sql` fue aplicada, existe una copia previa y se ha autorizado expresamente perder las anotaciones creadas desde entonces.

```sql

begin;

drop function if exists public.register_internal_note_v1(text, text);

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
      to_jsonb(e) || jsonb_build_object(
        'contact_name', ct.full_name,
        'contact_role', ct.role,
        'opportunities', coalesce(links.items, '[]'::jsonb)
      )
      order by e.contacted_at desc, e.created_at desc, e.id
    )
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
      join public.travel_opportunities o on o.opportunity_id = l.opportunity_id
      where l.event_id = e.id
    ) links on true
    where e.center_id = p_center_id
  ), '[]'::jsonb);
end;
$function$;

alter function public.get_center_history_v2(text) owner to postgres;
comment on function public.get_center_history_v2(text) is
  'Devuelve el historial de contactos comerciales de un centro visible.';
revoke all on function public.get_center_history_v2(text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_center_history_v2(text)
  to authenticated;

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
    'schema_version', 15,
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
    'opportunity_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id)
      from public.opportunity_audit a
    ), '[]'::jsonb)
  );
end;
$function$;

alter function public.owner_export_full_backup_v3() owner to postgres;
comment on function public.owner_export_full_backup_v3() is
  'Copia lógica completa V15: incluye campañas, personas, viajes y contactos comerciales.';
revoke all on function public.owner_export_full_backup_v3()
  from public, anon, authenticated, service_role;
grant execute on function public.owner_export_full_backup_v3()
  to authenticated;

drop table public.center_internal_notes;

notify pgrst, 'reload schema';

commit;
```
