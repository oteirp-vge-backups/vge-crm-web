-- R10: edit the existing center without changing its identity or access scope.
-- No business rows are modified by this migration.
begin;

CREATE OR REPLACE FUNCTION public.update_center_profile_v2(p_center_id text, p_patch jsonb, p_expected_version bigint)
 RETURNS public.center_state
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result public.center_state%rowtype;
  v_center public.centers%rowtype;
  v_allowed text[] := array[
    'status','contact_name','contact_role','contact_mobile','contact_email',
    'contact_blocked','contact_block_reason','city','province','school','school_phone','school_email'
  ];
  v_key text;
  v_status text;
  v_current_version bigint;
  v_assigned_to text;
  v_city text;
  v_province text;
  v_community text;
  v_location_changed boolean := false;
  v_old_location jsonb;
  v_new_location jsonb;
  v_school text;
  v_school_phone text;
  v_school_email text;
  v_details_changed boolean := false;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'INVALID_PATCH'; end if;

  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed)) then raise exception 'FIELD_NOT_ALLOWED: %', v_key; end if;
  end loop;

  if p_patch ? 'status' then
    v_status:=p_patch->>'status';
    if v_status not in ('Pendiente','Interesado','Trasladado a cotización','No interesado') then
      raise exception 'INVALID_STATUS';
    end if;
  end if;

  -- Keep the existing location restriction; general details use the same
  -- center access check as the contact profile (own portfolio or admin).
  if (p_patch ? 'city' or p_patch ? 'province') and not private.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  -- Match the centers -> center_state lock order used by archive/restore.
  select c.* into v_center from public.centers c
   where c.id=p_center_id and c.active=true for update;
  if not found then raise exception 'CENTER_NOT_FOUND'; end if;

  select s.state_version, s.assigned_to
    into v_current_version, v_assigned_to
    from public.center_state s where s.center_id=p_center_id for update;
  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if p_expected_version is null or v_current_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;
  if v_assigned_to<>private.current_operator_code() and not private.is_admin() then
    raise exception 'ASSIGNMENT_CHANGED';
  end if;

  v_city := v_center.city;
  v_province := v_center.province;
  v_community := v_center.community;
  if p_patch ? 'city' or p_patch ? 'province' then
    v_city := case when p_patch ? 'city' then nullif(btrim(p_patch->>'city'),'') else v_center.city end;
    if v_city is null or char_length(v_city)>160 then raise exception 'CITY_REQUIRED'; end if;
    v_province := private.canonical_province(
      case when p_patch ? 'province' then p_patch->>'province' else v_center.province end);
    if v_province is null then raise exception 'INVALID_PROVINCE'; end if;
    v_community := private.community_for_province(v_province);
    if v_community is null then raise exception 'INVALID_PROVINCE'; end if;
  end if;
  v_location_changed := v_city is distinct from v_center.city
    or v_province is distinct from v_center.province
    or v_community is distinct from v_center.community;

  v_school := v_center.school;
  v_school_phone := v_center.school_phone;
  v_school_email := v_center.school_email;
  if p_patch ? 'school' then
    if jsonb_typeof(p_patch->'school') <> 'string' then raise exception 'SCHOOL_REQUIRED'; end if;
    v_school := nullif(btrim(p_patch->>'school'),'');
    if v_school is null or char_length(v_school)<3 or char_length(v_school)>240 then
      raise exception 'SCHOOL_REQUIRED';
    end if;
  end if;
  if p_patch ? 'school_phone' then
    if jsonb_typeof(p_patch->'school_phone') not in ('string','null') then
      raise exception 'INVALID_SCHOOL_PHONE';
    end if;
    v_school_phone := nullif(btrim(p_patch->>'school_phone'),'');
    if v_school_phone is distinct from v_center.school_phone and v_school_phone is not null
       and (char_length(v_school_phone)>60
         or v_school_phone !~ '^[+0-9().[:space:]/-]+$'
         or char_length(private.norm_phone(v_school_phone)) not between 6 and 15) then
      raise exception 'INVALID_SCHOOL_PHONE';
    end if;
  end if;
  if p_patch ? 'school_email' then
    if jsonb_typeof(p_patch->'school_email') not in ('string','null') then
      raise exception 'INVALID_SCHOOL_EMAIL';
    end if;
    v_school_email := nullif(lower(btrim(p_patch->>'school_email')),'');
    if v_school_email is distinct from v_center.school_email and v_school_email is not null
       and (char_length(v_school_email)>254
         or v_school_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
      raise exception 'INVALID_SCHOOL_EMAIL';
    end if;
  end if;
  v_details_changed := v_school is distinct from v_center.school
    or v_school_phone is distinct from v_center.school_phone
    or v_school_email is distinct from v_center.school_email;

  -- Share the exact identity lock with create_manual_center. Case/accent
  -- corrections to an existing identity do not invalidate retained homonyms.
  if (private.norm_center_text(v_school),private.norm_center_text(coalesce(v_city,'')),v_province)
     is distinct from
     (private.norm_center_text(v_center.school),private.norm_center_text(coalesce(v_center.city,'')),v_center.province) then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      private.norm_center_text(v_school)||'|'||private.norm_center_text(coalesce(v_city,''))||'|'||coalesce(v_province,''),0));
    if exists(select 1 from public.centers c where c.id<>p_center_id
      and c.province is not distinct from v_province
      and private.norm_center_text(c.school)=private.norm_center_text(v_school)
      and private.norm_center_text(coalesce(c.city,''))=private.norm_center_text(coalesce(v_city,''))) then
      raise exception 'CENTER_DETAILS_DUPLICATE';
    end if;
  end if;

  if v_location_changed or v_details_changed then
    update public.centers c
       set school=v_school,school_phone=v_school_phone,school_email=v_school_email,
           city=v_city,province=v_province,community=v_community
     where c.id=p_center_id;
  end if;
  if v_location_changed then
    v_old_location := jsonb_build_object('_scope','center_location',
      'city',v_center.city,'province',v_center.province,'community',v_center.community);
    v_new_location := jsonb_build_object('_scope','center_location',
      'city',v_city,'province',v_province,'community',v_community);
    insert into public.center_state_audit(center_id,action,changed_by,changed_by_operator,old_data,new_data)
    values(p_center_id,'UPDATE',(select auth.uid()),private.current_operator_code(),v_old_location,v_new_location);
  end if;
  if v_details_changed then
    insert into public.center_state_audit(center_id,action,changed_by,changed_by_operator,old_data,new_data)
    values(p_center_id,'UPDATE',(select auth.uid()),private.current_operator_code(),
      jsonb_build_object('_scope','center_details','school',v_center.school,
        'school_phone',v_center.school_phone,'school_email',v_center.school_email),
      jsonb_build_object('_scope','center_details','school',v_school,
        'school_phone',v_school_phone,'school_email',v_school_email));
  end if;

  update public.center_state s set
    status = case when p_patch ? 'status' then v_status else s.status end,
    contact_name = case when p_patch ? 'contact_name' then nullif(btrim(p_patch->>'contact_name'),'') else s.contact_name end,
    contact_role = case when p_patch ? 'contact_role' then nullif(btrim(p_patch->>'contact_role'),'') else s.contact_role end,
    contact_mobile = case when p_patch ? 'contact_mobile' then nullif(btrim(p_patch->>'contact_mobile'),'') else s.contact_mobile end,
    contact_email = case when p_patch ? 'contact_email' then nullif(lower(btrim(p_patch->>'contact_email')),'') else s.contact_email end,
    contact_blocked = case when p_patch ? 'contact_blocked' then coalesce((p_patch->>'contact_blocked')::boolean,false) else s.contact_blocked end,
    contact_block_reason = case
      when p_patch ? 'contact_blocked' and coalesce((p_patch->>'contact_blocked')::boolean,false)=false then null
      when p_patch ? 'contact_block_reason' then nullif(btrim(p_patch->>'contact_block_reason'),'')
      else s.contact_block_reason end,
    contact_blocked_at = case
      when p_patch ? 'contact_blocked' and coalesce((p_patch->>'contact_blocked')::boolean,false)=true then coalesce(s.contact_blocked_at,now())
      when p_patch ? 'contact_blocked' and coalesce((p_patch->>'contact_blocked')::boolean,false)=false then null
      else s.contact_blocked_at end,
    next_contact_at = case
      when p_patch ? 'contact_blocked' and coalesce((p_patch->>'contact_blocked')::boolean,false)=true then null
      when p_patch ? 'status' and v_status in ('Trasladado a cotización','No interesado') then null
      else s.next_contact_at end,
    state_version = s.state_version + 1,
    updated_at=now(),
    updated_by=(select auth.uid())
  where s.center_id=p_center_id
  returning * into v_result;

  return v_result;
end;
$function$;

REVOKE ALL ON FUNCTION public.update_center_profile_v2(text,jsonb,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_center_profile_v2(text,jsonb,bigint) TO authenticated;

commit;
