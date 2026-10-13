# R10 — retorno de edición de centros

La candidata es `r10-phase10.0.5`. Producción continúa en `r10-phase10.0.4` hasta autorización separada de migración y publicación.

## Retorno web

Volver al artefacto construido y verificado desde `d0ff651e716bcbd3cb5416b1bf0f1132f89a3a3c` (`r10-phase10.0.4`). La ampliación de campos del RPC es compatible con ese cliente anterior; el retorno web no exige retirar datos ni modificar permisos.

## Retorno del RPC, sólo si es necesario

Crear una migración nueva con la CLI, copiar la definición observada que se conserva debajo y mantener exactamente los privilegios anteriores: sin EXECUTE para PUBLIC/anon y con EXECUTE para authenticated. Probarla fuera de producción y obtener autorización explícita. No editar ni eliminar la migración aplicada. Las correcciones de centros y sus auditorías se conservan.

La definición siguiente se leyó en producción el 13 de octubre de 2026; no contiene filas de negocio.

```sql
CREATE OR REPLACE FUNCTION public.update_center_profile_v2(p_center_id text, p_patch jsonb, p_expected_version bigint)
 RETURNS center_state
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result public.center_state%rowtype;
  v_center public.centers%rowtype;
  v_allowed text[] := array[
    'status','contact_name','contact_role','contact_mobile','contact_email',
    'contact_blocked','contact_block_reason','city','province'
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

  -- El propietario y la administración operativa comparten role='admin'.
  -- Un comercial puede ver la ubicación, pero no alterarla desde el cliente
  -- ni llamando directamente al RPC.
  if p_patch ? 'city' or p_patch ? 'province' then
    if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

    select c.*
      into v_center
      from public.centers c
     where c.id=p_center_id
       and c.active=true
     for update;

    if not found then raise exception 'CENTER_NOT_FOUND'; end if;

    v_city := case
      when p_patch ? 'city' then nullif(btrim(p_patch->>'city'),'')
      else v_center.city
    end;
    if v_city is null then raise exception 'CITY_REQUIRED'; end if;
    if char_length(v_city)>160 then raise exception 'CITY_REQUIRED'; end if;

    v_province := case
      when p_patch ? 'province' then private.canonical_province(p_patch->>'province')
      else private.canonical_province(v_center.province)
    end;
    if v_province is null then raise exception 'INVALID_PROVINCE'; end if;

    v_community := private.community_for_province(v_province);
    if v_community is null then raise exception 'INVALID_PROVINCE'; end if;

    v_location_changed :=
      v_city is distinct from v_center.city
      or v_province is distinct from v_center.province
      or v_community is distinct from v_center.community;

    if v_location_changed then
      v_old_location := jsonb_build_object(
        '_scope','center_location',
        'city',v_center.city,
        'province',v_center.province,
        'community',v_center.community
      );

      update public.centers c
         set city=v_city,
             province=v_province,
             community=v_community
       where c.id=p_center_id;

      v_new_location := jsonb_build_object(
        '_scope','center_location',
        'city',v_city,
        'province',v_province,
        'community',v_community
      );

      insert into public.center_state_audit(
        center_id,action,changed_by,changed_by_operator,old_data,new_data
      ) values (
        p_center_id,'UPDATE',(select auth.uid()),private.current_operator_code(),
        v_old_location,v_new_location
      );
    end if;
  end if;

  select s.state_version, s.assigned_to
    into v_current_version, v_assigned_to
    from public.center_state s
   where s.center_id=p_center_id
   for update;

  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if p_expected_version is null or v_current_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;
  if v_assigned_to<>private.current_operator_code() and not private.is_admin() then
    raise exception 'ASSIGNMENT_CHANGED';
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
$function$
```
