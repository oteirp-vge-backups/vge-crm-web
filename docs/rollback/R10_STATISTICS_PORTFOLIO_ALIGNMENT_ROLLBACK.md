# Rollback de estadísticas de cartera R10

Revisión manual obligatoria. Este bloque restaura la implementación exacta anterior de `get_statistics_dashboard_v2` y no debe ejecutarse automáticamente.

```sql
-- Emergency rollback for 20260913071737_align_statistics_with_portfolio_status.sql.
-- Restores the exact pre-hotfix get_statistics_dashboard_v2 implementation.

create or replace function public.get_statistics_dashboard_v2(
  p_period_days integer default 30,
  p_operator_code text default null,
  p_community text default null,
  p_campaign_code text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_base jsonb;
  v_uid uuid := (select auth.uid());
  v_caller_code text;
  v_access_role text;
  v_operator_filter text := nullif(btrim(coalesce(p_operator_code,'')),'');
  v_community_filter text := nullif(btrim(coalesce(p_community,'')),'');
  v_campaign_id bigint;
  v_campaign_code text;
  v_period_start timestamptz;
  v_travel_metrics jsonb;
  v_by_status jsonb;
  v_by_cycle jsonb;
  v_by_operator jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  v_base := public.get_statistics_dashboard_v1(
    p_period_days, p_operator_code, p_community
  );

  select o.code, o.access_role into v_caller_code, v_access_role
  from public.operators o
  where o.auth_user_id = v_uid and o.active = true
  limit 1;
  if v_caller_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;

  if v_access_role = 'seller' then
    v_operator_filter := v_caller_code;
  end if;
  v_period_start := case
    when p_period_days = 0 then null
    else now() - make_interval(days => p_period_days)
  end;

  select c.campaign_id, c.code into v_campaign_id, v_campaign_code
  from public.campaigns c
  where c.active = true
    and (
      (nullif(btrim(coalesce(p_campaign_code,'')),'') is null and c.is_default = true)
      or c.code = nullif(btrim(coalesce(p_campaign_code,'')),'')
    )
  order by c.is_default desc, c.starts_on desc
  limit 1;
  if v_campaign_id is null then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  with scoped as materialized (
    select o.*, s.assigned_to, c.community
    from public.travel_opportunities o
    join public.center_campaigns cc on cc.center_campaign_id = o.center_campaign_id
    join public.centers c on c.id = o.center_id
    join public.center_state s on s.center_id = o.center_id
    where cc.campaign_id = v_campaign_id
      and c.active = true
      and o.active = true
      and (
        (v_access_role = 'seller' and s.assigned_to = v_caller_code)
        or
        (v_access_role in ('owner','manager')
          and (v_operator_filter is null or s.assigned_to = v_operator_filter))
      )
      and (v_community_filter is null or c.community = v_community_filter)
  )
  select jsonb_build_object(
    'opportunities_total', count(*)::bigint,
    'opportunities_worked', count(*) filter (
      where contact_count > 0 or status <> 'Pendiente'
    )::bigint,
    'opportunities_pending', count(*) filter (where status = 'Pendiente')::bigint,
    'opportunities_interested', count(*) filter (where status = 'Interesado')::bigint,
    'opportunities_quoted', count(*) filter (where status = 'Trasladado a cotización')::bigint,
    'opportunities_not_interested', count(*) filter (where status = 'No interesado')::bigint,
    'opportunity_conversion_pct', case
      when count(*) filter (where contact_count > 0 or status <> 'Pendiente') = 0 then 0
      else round(
        100.0 * count(*) filter (where status = 'Trasladado a cotización')
        / count(*) filter (where contact_count > 0 or status <> 'Pendiente'), 1
      )
    end,
    'opportunity_followups_overdue', count(*) filter (
      where next_contact_at < now()
        and status not in ('Trasladado a cotización','No interesado')
    )::bigint,
    'opportunities_without_future_followup', count(*) filter (
      where status in ('Interesado','Trasladado a cotización')
        and (next_contact_at is null or next_contact_at <= now())
    )::bigint,
    'new_opportunities_period', count(*) filter (
      where v_period_start is null or created_at >= v_period_start
    )::bigint
  ) into v_travel_metrics
  from scoped;

  with scoped as materialized (
    select o.*, s.assigned_to, c.community
    from public.travel_opportunities o
    join public.center_campaigns cc on cc.center_campaign_id = o.center_campaign_id
    join public.centers c on c.id = o.center_id
    join public.center_state s on s.center_id = o.center_id
    where cc.campaign_id = v_campaign_id and c.active = true and o.active = true
      and (
        (v_access_role = 'seller' and s.assigned_to = v_caller_code)
        or (v_access_role in ('owner','manager')
          and (v_operator_filter is null or s.assigned_to = v_operator_filter))
      )
      and (v_community_filter is null or c.community = v_community_filter)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('status',status,'count',total) order by status
  ),'[]'::jsonb)
  into v_by_status
  from (select status, count(*)::bigint total from scoped group by status) q;

  with scoped as materialized (
    select o.*, s.assigned_to, c.community
    from public.travel_opportunities o
    join public.center_campaigns cc on cc.center_campaign_id = o.center_campaign_id
    join public.centers c on c.id = o.center_id
    join public.center_state s on s.center_id = o.center_id
    where cc.campaign_id = v_campaign_id and c.active = true and o.active = true
      and (
        (v_access_role = 'seller' and s.assigned_to = v_caller_code)
        or (v_access_role in ('owner','manager')
          and (v_operator_filter is null or s.assigned_to = v_operator_filter))
      )
      and (v_community_filter is null or c.community = v_community_filter)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('cycle',cycle,'count',total) order by cycle
  ),'[]'::jsonb)
  into v_by_cycle
  from (select cycle, count(*)::bigint total from scoped group by cycle) q;

  with scoped as materialized (
    select o.*, s.assigned_to, c.community
    from public.travel_opportunities o
    join public.center_campaigns cc on cc.center_campaign_id = o.center_campaign_id
    join public.centers c on c.id = o.center_id
    join public.center_state s on s.center_id = o.center_id
    where cc.campaign_id = v_campaign_id and c.active = true and o.active = true
      and (
        (v_access_role = 'seller' and s.assigned_to = v_caller_code)
        or (v_access_role in ('owner','manager')
          and (v_operator_filter is null or s.assigned_to = v_operator_filter))
      )
      and (v_community_filter is null or c.community = v_community_filter)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'operator_code', assigned_to,
    'total', total,
    'interested', interested,
    'quoted', quoted,
    'overdue', overdue
  ) order by assigned_to),'[]'::jsonb)
  into v_by_operator
  from (
    select assigned_to,
           count(*)::bigint total,
           count(*) filter (where status='Interesado')::bigint interested,
           count(*) filter (where status='Trasladado a cotización')::bigint quoted,
           count(*) filter (
             where next_contact_at < now()
               and status not in ('Trasladado a cotización','No interesado')
           )::bigint overdue
    from scoped group by assigned_to
  ) q;

  return v_base || jsonb_build_object(
    'schema_version', 2,
    'campaign', jsonb_build_object('code',v_campaign_code),
    'travel_metrics', coalesce(v_travel_metrics,'{}'::jsonb),
    'opportunities_by_status', coalesce(v_by_status,'[]'::jsonb),
    'opportunities_by_cycle', coalesce(v_by_cycle,'[]'::jsonb),
    'opportunities_by_operator', coalesce(v_by_operator,'[]'::jsonb)
  );
end;
$$;

alter function public.get_statistics_dashboard_v2(integer,text,text,text)
  owner to postgres;

revoke all on function public.get_statistics_dashboard_v2(integer,text,text,text)
  from public, anon, service_role;
grant execute on function public.get_statistics_dashboard_v2(integer,text,text,text)
  to authenticated;

comment on function public.get_statistics_dashboard_v2(integer,text,text,text) is
  'Estadísticas operativas V15 con viajes múltiples, campaña activa y alcance forzado por rol.';
```
