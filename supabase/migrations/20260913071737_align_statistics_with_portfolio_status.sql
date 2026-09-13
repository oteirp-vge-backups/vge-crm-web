-- R10 hotfix: make centre-level statistics use the same effective portfolio
-- status as the operational centre list. A centre is counted once even when
-- it has several active travel opportunities in the selected campaign.

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
  v_portfolio_metrics jsonb;
  v_operator_metrics jsonb;
  v_zone_metrics jsonb;
  v_effective_opportunities jsonb;
  v_updated_operators jsonb;
  v_updated_zones jsonb;
  v_travel_metrics jsonb;
  v_by_status jsonb;
  v_by_cycle jsonb;
  v_by_operator jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Keep the period/activity calculations and the role validation of v1.
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

  -- Canonical centre snapshot. This mirrors portfolioStatus() in the frontend:
  -- no active trip => stored general status; otherwise quote > interested >
  -- all rejected > pending. Every centre therefore belongs to one bucket only.
  with scoped_centers as materialized (
    select
      c.id,
      c.school,
      c.community,
      c.created_at,
      s.assigned_to,
      s.status as stored_status,
      s.next_contact_at as center_next_contact_at,
      s.last_contact_at as center_last_contact_at,
      s.contact_count as center_contact_count,
      coalesce(t.opportunity_total, 0)::bigint as opportunity_total,
      coalesce(t.opportunity_interested, 0)::bigint as opportunity_interested,
      coalesce(t.opportunity_quoted, 0)::bigint as opportunity_quoted,
      coalesce(t.opportunity_not_interested, 0)::bigint as opportunity_not_interested,
      coalesce(t.opportunity_contact_count, 0)::bigint as opportunity_contact_count,
      t.opportunity_next_contact_at,
      t.opportunity_last_contact_at
    from public.centers c
    join public.center_state s on s.center_id = c.id
    left join lateral (
      select
        count(*) filter (where o.active)::bigint as opportunity_total,
        count(*) filter (
          where o.active and o.status = 'Interesado'
        )::bigint as opportunity_interested,
        count(*) filter (
          where o.active and o.status = 'Trasladado a cotización'
        )::bigint as opportunity_quoted,
        count(*) filter (
          where o.active and o.status = 'No interesado'
        )::bigint as opportunity_not_interested,
        coalesce(sum(o.contact_count) filter (where o.active), 0)::bigint
          as opportunity_contact_count,
        min(o.next_contact_at) filter (
          where o.active
            and o.next_contact_at is not null
            and o.status not in ('Trasladado a cotización','No interesado')
        ) as opportunity_next_contact_at,
        max(o.last_contact_at) filter (where o.active)
          as opportunity_last_contact_at
      from public.center_campaigns cc
      join public.travel_opportunities o
        on o.center_campaign_id = cc.center_campaign_id
      where cc.center_id = c.id
        and cc.campaign_id = v_campaign_id
    ) t on true
    where c.active = true
      and (
        (v_access_role = 'seller' and s.assigned_to = v_caller_code)
        or
        (v_access_role in ('owner','manager')
          and (v_operator_filter is null or s.assigned_to = v_operator_filter))
      )
      and (v_community_filter is null or c.community = v_community_filter)
  ),
  status_centers as materialized (
    select
      sc.*,
      case
        when sc.opportunity_total = 0 then sc.stored_status
        when sc.opportunity_quoted > 0 then 'Trasladado a cotización'
        when sc.opportunity_interested > 0 then 'Interesado'
        when sc.opportunity_not_interested >= sc.opportunity_total then 'No interesado'
        else 'Pendiente'
      end as effective_status
    from scoped_centers sc
  ),
  effective_centers as materialized (
    select
      sc.*,
      (
        sc.center_contact_count > 0
        or sc.opportunity_contact_count > 0
        or sc.effective_status <> 'Pendiente'
      ) as worked,
      (
        (sc.center_next_contact_at is not null and sc.center_next_contact_at > now())
        or
        (sc.opportunity_next_contact_at is not null and sc.opportunity_next_contact_at > now())
      ) as has_future_followup,
      greatest(sc.center_last_contact_at, sc.opportunity_last_contact_at)
        as effective_last_contact_at,
      case
        when sc.center_next_contact_at is null then sc.opportunity_next_contact_at
        when sc.opportunity_next_contact_at is null then sc.center_next_contact_at
        else least(sc.center_next_contact_at, sc.opportunity_next_contact_at)
      end as effective_next_contact_at
    from status_centers sc
  ),
  operator_counts as (
    select
      ec.assigned_to as operator_code,
      count(*) filter (where ec.worked)::bigint as worked_centers,
      count(*) filter (
        where ec.effective_status = 'Interesado'
      )::bigint as interested_centers,
      count(*) filter (
        where ec.effective_status = 'Trasladado a cotización'
      )::bigint as quoted_centers
    from effective_centers ec
    group by ec.assigned_to
  ),
  zone_counts as (
    select
      coalesce(nullif(btrim(ec.community), ''), 'Sin indicar') as community,
      count(*) filter (where ec.worked)::bigint as worked_centers,
      count(*) filter (
        where ec.effective_status = 'Interesado'
      )::bigint as interested_centers,
      count(*) filter (
        where ec.effective_status = 'Trasladado a cotización'
      )::bigint as quoted_centers
    from effective_centers ec
    group by coalesce(nullif(btrim(ec.community), ''), 'Sin indicar')
  ),
  opportunity_rows as (
    select
      ec.id as center_id,
      ec.school,
      ec.community,
      ec.assigned_to,
      coalesce(o.display_name, ec.assigned_to) as operator_name,
      ec.effective_status as status,
      ec.effective_last_contact_at as last_contact_at,
      ec.effective_next_contact_at as next_contact_at,
      greatest(
        0,
        floor(extract(epoch from (
          now() - coalesce(ec.effective_last_contact_at, ec.created_at)
        )) / 86400)
      )::integer as days_without_contact
    from effective_centers ec
    left join public.operators o on o.code = ec.assigned_to
    where ec.effective_status in ('Interesado','Trasladado a cotización')
      and not ec.has_future_followup
    order by
      case ec.effective_status when 'Trasladado a cotización' then 1 else 2 end,
      coalesce(ec.effective_next_contact_at, ec.effective_last_contact_at, ec.created_at),
      ec.id
    limit 50
  )
  select
    (
      select jsonb_build_object(
        'worked_centers', count(*) filter (where ec.worked)::bigint,
        'worked_pct', case when count(*) = 0 then 0
          else round(
            count(*) filter (where ec.worked)::numeric * 100 / count(*), 1
          ) end,
        'interested_centers', count(*) filter (
          where ec.effective_status = 'Interesado'
        )::bigint,
        'quoted_centers', count(*) filter (
          where ec.effective_status = 'Trasladado a cotización'
        )::bigint,
        'quote_conversion_pct', case
          when count(*) filter (where ec.worked) = 0 then 0
          else round(
            count(*) filter (
              where ec.effective_status = 'Trasladado a cotización'
            )::numeric * 100 / count(*) filter (where ec.worked), 1
          ) end,
        'unattended_opportunities', count(*) filter (
          where ec.effective_status in ('Interesado','Trasladado a cotización')
            and not ec.has_future_followup
        )::bigint
      )
      from effective_centers ec
    ),
    coalesce((
      select jsonb_object_agg(
        oc.operator_code,
        jsonb_build_object(
          'worked_centers', oc.worked_centers,
          'interested_centers', oc.interested_centers,
          'quoted_centers', oc.quoted_centers
        )
      )
      from operator_counts oc
    ), '{}'::jsonb),
    coalesce((
      select jsonb_object_agg(
        zc.community,
        jsonb_build_object(
          'worked_centers', zc.worked_centers,
          'interested_centers', zc.interested_centers,
          'quoted_centers', zc.quoted_centers
        )
      )
      from zone_counts zc
    ), '{}'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(x) order by
        case x.status when 'Trasladado a cotización' then 1 else 2 end,
        x.days_without_contact desc,
        x.center_id)
      from opportunity_rows x
    ), '[]'::jsonb)
  into
    v_portfolio_metrics,
    v_operator_metrics,
    v_zone_metrics,
    v_effective_opportunities;

  v_base := jsonb_set(
    v_base,
    '{kpis}',
    coalesce(v_base -> 'kpis', '{}'::jsonb) || v_portfolio_metrics,
    true
  );

  select coalesce(jsonb_agg(
    row_value || coalesce(v_operator_metrics -> (row_value ->> 'operator_code'), '{}'::jsonb)
    order by ordinal
  ), '[]'::jsonb)
  into v_updated_operators
  from jsonb_array_elements(coalesce(v_base -> 'operators', '[]'::jsonb))
    with ordinality as rows(row_value, ordinal);

  select coalesce(jsonb_agg(
    row_value || coalesce(v_zone_metrics -> (row_value ->> 'community'), '{}'::jsonb)
    order by ordinal
  ), '[]'::jsonb)
  into v_updated_zones
  from jsonb_array_elements(coalesce(v_base -> 'zones', '[]'::jsonb))
    with ordinality as rows(row_value, ordinal);

  v_base := jsonb_set(v_base, '{operators}', v_updated_operators, true);
  v_base := jsonb_set(v_base, '{zones}', v_updated_zones, true);
  v_base := jsonb_set(v_base, '{opportunities}', v_effective_opportunities, true);
  v_base := jsonb_set(
    v_base,
    '{definitions}',
    coalesce(v_base -> 'definitions', '{}'::jsonb) || jsonb_build_object(
      'portfolio_status', 'Si hay viajes activos, el estado del centro prioriza A cotización, después Interesado, todos No interesado y, en último lugar, Pendiente.',
      'worked', 'Centro con al menos un contacto general o de viaje, o con estado efectivo distinto de Pendiente.',
      'quote_conversion', 'Centros con estado efectivo A cotización divididos entre centros trabajados.',
      'unattended', 'Centros efectivos Interesados o A cotización sin un seguimiento general o de viaje futuro.'
    ),
    true
  );

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
  'Estadísticas R10: centros por estado efectivo de cartera y viajes independientes por campaña, con alcance forzado por rol y sin PII.';
