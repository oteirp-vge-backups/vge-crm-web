


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."audit_center_state"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_operator text;
begin
  v_operator:=private.current_operator_code();
  if tg_op='INSERT' then
    insert into public.center_state_audit(center_id,action,changed_by,changed_by_operator,old_data,new_data)
    values(new.center_id,'INSERT',(select auth.uid()),v_operator,null,to_jsonb(new)); return new;
  elsif tg_op='UPDATE' then
    insert into public.center_state_audit(center_id,action,changed_by,changed_by_operator,old_data,new_data)
    values(new.center_id,'UPDATE',(select auth.uid()),v_operator,to_jsonb(old),to_jsonb(new)); return new;
  else
    insert into public.center_state_audit(center_id,action,changed_by,changed_by_operator,old_data,new_data)
    values(old.center_id,'DELETE',(select auth.uid()),v_operator,to_jsonb(old),null); return old;
  end if;
end; $$;


ALTER FUNCTION "private"."audit_center_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."audit_operator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_code text; v_actor text;
begin
  v_actor:=private.current_operator_code();
  if tg_op='DELETE' then v_code:=old.code; else v_code:=new.code; end if;
  if tg_op='INSERT' then
    insert into public.operator_audit(operator_code,action,changed_by,changed_by_operator,old_data,new_data)
    values(v_code,'INSERT',(select auth.uid()),v_actor,null,to_jsonb(new)); return new;
  elsif tg_op='UPDATE' then
    insert into public.operator_audit(operator_code,action,changed_by,changed_by_operator,old_data,new_data)
    values(v_code,'UPDATE',(select auth.uid()),v_actor,to_jsonb(old),to_jsonb(new)); return new;
  else
    insert into public.operator_audit(operator_code,action,changed_by,changed_by_operator,old_data,new_data)
    values(v_code,'DELETE',(select auth.uid()),v_actor,to_jsonb(old),null); return old;
  end if;
end; $$;


ALTER FUNCTION "private"."audit_operator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."audit_travel_opportunity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.opportunity_audit(
    center_id, opportunity_id, action, before_data, after_data,
    acted_by, acted_by_operator, acted_at
  ) values (
    new.center_id,
    new.opportunity_id,
    case when tg_op = 'INSERT' then 'insert' else 'update' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new),
    (select auth.uid()),
    private.current_operator_code(),
    now()
  );
  return new;
end;
$$;


ALTER FUNCTION "private"."audit_travel_opportunity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_access_center"("p_center_id" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(exists(
    select 1
    from public.centers c
    join public.center_state s on s.center_id = c.id
    where c.id = p_center_id
      and c.active = true
      and (
        private.is_admin()
        or s.assigned_to = private.current_operator_code()
      )
  ), false);
$$;


ALTER FUNCTION "private"."can_access_center"("p_center_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."canonical_province"("p_value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare v text := private.norm_center_text(coalesce(p_value,''));
begin
  return case v
    when 'alava' then 'Álava'
    when 'araba' then 'Álava'
    when 'araba alava' then 'Álava'
    when 'albacete' then 'Albacete'
    when 'alicante' then 'Alicante'
    when 'alacant' then 'Alicante'
    when 'alicante alacant' then 'Alicante'
    when 'almeria' then 'Almería'
    when 'asturias' then 'Asturias'
    when 'avila' then 'Ávila'
    when 'badajoz' then 'Badajoz'
    when 'barcelona' then 'Barcelona'
    when 'burgos' then 'Burgos'
    when 'caceres' then 'Cáceres'
    when 'cadiz' then 'Cádiz'
    when 'cantabria' then 'Cantabria'
    when 'castellon' then 'Castellón'
    when 'castello' then 'Castellón'
    when 'castellon castello' then 'Castellón'
    when 'ciudad real' then 'Ciudad Real'
    when 'cordoba' then 'Córdoba'
    when 'a coruna' then 'A Coruña'
    when 'la coruna' then 'A Coruña'
    when 'coruna' then 'A Coruña'
    when 'cuenca' then 'Cuenca'
    when 'girona' then 'Girona'
    when 'gerona' then 'Girona'
    when 'granada' then 'Granada'
    when 'guadalajara' then 'Guadalajara'
    when 'gipuzkoa' then 'Gipuzkoa'
    when 'guipuzcoa' then 'Gipuzkoa'
    when 'huelva' then 'Huelva'
    when 'huesca' then 'Huesca'
    when 'islas baleares' then 'Islas Baleares'
    when 'illes balears' then 'Islas Baleares'
    when 'baleares' then 'Islas Baleares'
    when 'jaen' then 'Jaén'
    when 'leon' then 'León'
    when 'lleida' then 'Lleida'
    when 'lerida' then 'Lleida'
    when 'lugo' then 'Lugo'
    when 'madrid' then 'Madrid'
    when 'malaga' then 'Málaga'
    when 'murcia' then 'Murcia'
    when 'navarra' then 'Navarra'
    when 'ourense' then 'Ourense'
    when 'orense' then 'Ourense'
    when 'palencia' then 'Palencia'
    when 'las palmas' then 'Las Palmas'
    when 'palmas las' then 'Las Palmas'
    when 'pontevedra' then 'Pontevedra'
    when 'la rioja' then 'La Rioja'
    when 'rioja' then 'La Rioja'
    when 'salamanca' then 'Salamanca'
    when 'santa cruz de tenerife' then 'Santa Cruz de Tenerife'
    when 'segovia' then 'Segovia'
    when 'sevilla' then 'Sevilla'
    when 'soria' then 'Soria'
    when 'tarragona' then 'Tarragona'
    when 'teruel' then 'Teruel'
    when 'toledo' then 'Toledo'
    when 'valencia' then 'Valencia'
    when 'valencia valencia' then 'Valencia'
    when 'valladolid' then 'Valladolid'
    when 'bizkaia' then 'Bizkaia'
    when 'vizcaya' then 'Bizkaia'
    when 'zamora' then 'Zamora'
    when 'zaragoza' then 'Zaragoza'
    when 'ceuta' then 'Ceuta'
    when 'melilla' then 'Melilla'
    else null
  end;
end;
$$;


ALTER FUNCTION "private"."canonical_province"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."community_for_province"("p_value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare v text := private.canonical_province(p_value);
begin
  return case v
    when 'Álava' then 'País Vasco'
    when 'Albacete' then 'Castilla-La Mancha'
    when 'Alicante' then 'Comunidad Valenciana'
    when 'Almería' then 'Andalucía'
    when 'Asturias' then 'Asturias'
    when 'Ávila' then 'Castilla y León'
    when 'Badajoz' then 'Extremadura'
    when 'Barcelona' then 'Cataluña'
    when 'Burgos' then 'Castilla y León'
    when 'Cáceres' then 'Extremadura'
    when 'Cádiz' then 'Andalucía'
    when 'Cantabria' then 'Cantabria'
    when 'Castellón' then 'Comunidad Valenciana'
    when 'Ciudad Real' then 'Castilla-La Mancha'
    when 'Córdoba' then 'Andalucía'
    when 'A Coruña' then 'Galicia'
    when 'Cuenca' then 'Castilla-La Mancha'
    when 'Girona' then 'Cataluña'
    when 'Granada' then 'Andalucía'
    when 'Guadalajara' then 'Castilla-La Mancha'
    when 'Gipuzkoa' then 'País Vasco'
    when 'Huelva' then 'Andalucía'
    when 'Huesca' then 'Aragón'
    when 'Islas Baleares' then 'Islas Baleares'
    when 'Jaén' then 'Andalucía'
    when 'León' then 'Castilla y León'
    when 'Lleida' then 'Cataluña'
    when 'Lugo' then 'Galicia'
    when 'Madrid' then 'Madrid'
    when 'Málaga' then 'Andalucía'
    when 'Murcia' then 'Región de Murcia'
    when 'Navarra' then 'Navarra'
    when 'Ourense' then 'Galicia'
    when 'Palencia' then 'Castilla y León'
    when 'Las Palmas' then 'Canarias'
    when 'Pontevedra' then 'Galicia'
    when 'La Rioja' then 'La Rioja'
    when 'Salamanca' then 'Castilla y León'
    when 'Santa Cruz de Tenerife' then 'Canarias'
    when 'Segovia' then 'Castilla y León'
    when 'Sevilla' then 'Andalucía'
    when 'Soria' then 'Castilla y León'
    when 'Tarragona' then 'Cataluña'
    when 'Teruel' then 'Aragón'
    when 'Toledo' then 'Castilla-La Mancha'
    when 'Valencia' then 'Comunidad Valenciana'
    when 'Valladolid' then 'Castilla y León'
    when 'Bizkaia' then 'País Vasco'
    when 'Zamora' then 'Castilla y León'
    when 'Zaragoza' then 'Aragón'
    when 'Ceuta' then 'Ceuta'
    when 'Melilla' then 'Melilla'
    else null
  end;
end;
$$;


ALTER FUNCTION "private"."community_for_province"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_operator_code"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select o.code from public.operators o
  where o.auth_user_id=(select auth.uid()) and o.active=true and o.role in ('admin','seller')
  limit 1;
$$;


ALTER FUNCTION "private"."current_operator_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."current_operator_name"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select o.display_name from public.operators o
  where o.auth_user_id=(select auth.uid()) and o.active=true and o.role in ('admin','seller')
  limit 1;
$$;


ALTER FUNCTION "private"."current_operator_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."ensure_center_state"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.center_state(center_id,assigned_to,status)
  values(new.id,'Sin asignar','Pendiente') on conflict(center_id) do nothing;
  return new;
end; $$;


ALTER FUNCTION "private"."ensure_center_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_permission"("p_permission" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with me as (
    select o.access_role
    from public.operators o
    where o.auth_user_id = (select auth.uid())
      and o.active = true
    limit 1
  )
  select coalesce(case p_permission
    when 'centers.view_global' then access_role in ('owner','manager')
    when 'centers.assign' then access_role in ('owner','manager')
    when 'centers.archive' then access_role in ('owner','manager')
    when 'centers.restore' then access_role in ('owner','manager')
    when 'team.view' then access_role in ('owner','manager')
    when 'exports.global' then access_role in ('owner','manager')
    when 'users.manage_roles' then access_role = 'owner'
    when 'backups.export_full' then access_role = 'owner'
    when 'centers.delete_permanently' then access_role = 'owner'
    when 'system.manage_security' then access_role = 'owner'
    else false
  end, false)
  from me;
$$;


ALTER FUNCTION "private"."has_permission"("p_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce((select o.role='admin' from public.operators o
    where o.auth_user_id=(select auth.uid()) and o.active=true limit 1),false);
$$;


ALTER FUNCTION "private"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_owner"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce((
    select o.access_role = 'owner'
    from public.operators o
    where o.auth_user_id = (select auth.uid())
      and o.active = true
    limit 1
  ), false);
$$;


ALTER FUNCTION "private"."is_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."norm_center_text"("p_value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    SET "search_path" TO ''
    AS $$
  select regexp_replace(
    lower(translate(btrim(p_value),
      'áéíóúüñçÁÉÍÓÚÜÑÇ',
      'aeiouuncAEIOUUNC')),
    '[^a-z0-9]+', ' ', 'g'
  );
$$;


ALTER FUNCTION "private"."norm_center_text"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."norm_phone"("p_value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select regexp_replace(coalesce(p_value,''), '[^0-9]+', '', 'g');
$$;


ALTER FUNCTION "private"."norm_phone"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."prevent_center_lifecycle_audit_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'CENTER_LIFECYCLE_AUDIT_IMMUTABLE';
end;
$$;


ALTER FUNCTION "private"."prevent_center_lifecycle_audit_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."queue_overdue_agenda"() RETURNS TABLE("queued" integer, "cancelled" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_queued integer := 0;
  v_cancelled integer := 0;
begin
  update public.agenda_email_outbox q
  set status = 'cancelled',
      claimed_at = null,
      last_error = 'Agenda modificada o contacto ya no pendiente'
  where q.status in ('pending','processing','failed')
    and not (
      (
        q.task_key = 'center'
        and exists (
          select 1
          from public.center_state s
          join public.centers c on c.id = s.center_id
          where s.center_id = q.center_id
            and c.active = true
            and s.assigned_to = q.assigned_to
            and s.next_contact_at = q.scheduled_for
            and s.next_contact_at < now()
            and s.status not in ('Trasladado a cotización','No interesado')
            and s.contact_blocked = false
        )
      )
      or
      (
        q.task_key like 'opportunity:%'
        and exists (
          select 1
          from public.travel_opportunities o
          join public.centers c on c.id = o.center_id
          join public.center_state s on s.center_id = o.center_id
          left join public.center_contacts ct on ct.contact_id = o.contact_id
          where o.opportunity_id = substring(q.task_key from 13)
            and o.center_id = q.center_id
            and c.active = true
            and o.active = true
            and s.assigned_to = q.assigned_to
            and o.next_contact_at = q.scheduled_for
            and o.next_contact_at < now()
            and o.status not in ('Trasladado a cotización','No interesado')
            and s.contact_blocked = false
            and coalesce(ct.do_not_contact,false) = false
        )
      )
    );
  get diagnostics v_cancelled = row_count;

  insert into public.agenda_email_outbox as target(
    center_id, assigned_to, scheduled_for, recipient, payload, status, task_key
  )
  select t.center_id, t.assigned_to, t.scheduled_for,
         'r10-staging-recipient@example.invalid', t.payload, 'pending', t.task_key
  from (
    select
      s.center_id,
      s.assigned_to,
      s.next_contact_at as scheduled_for,
      'center'::text as task_key,
      jsonb_build_object(
        'task_type','center',
        'center_id',s.center_id,
        'school',c.school,
        'city',c.city,
        'province',c.province,
        'assigned_to',s.assigned_to,
        'operator_name',op.display_name,
        'scheduled_for',s.next_contact_at,
        'message','Contacto general pendiente de actualizar en CRM VGE'
      ) as payload
    from public.center_state s
    join public.centers c on c.id = s.center_id
    join public.operators op
      on op.code = s.assigned_to and op.active = true and op.role in ('admin','seller')
    where c.active = true
      and s.next_contact_at is not null
      and s.next_contact_at < now()
      and s.status not in ('Trasladado a cotización','No interesado')
      and s.contact_blocked = false

    union all

    select
      o.center_id,
      s.assigned_to,
      o.next_contact_at,
      'opportunity:' || o.opportunity_id,
      jsonb_build_object(
        'task_type','opportunity',
        'center_id',o.center_id,
        'opportunity_id',o.opportunity_id,
        'school',c.school,
        'city',c.city,
        'province',c.province,
        'assigned_to',s.assigned_to,
        'operator_name',op.display_name,
        'cycle',o.cycle,
        'destination',o.destination,
        'scheduled_for',o.next_contact_at,
        'message','Seguimiento de viaje pendiente de actualizar en CRM VGE'
      )
    from public.travel_opportunities o
    join public.centers c on c.id = o.center_id
    join public.center_state s on s.center_id = o.center_id
    join public.operators op
      on op.code = s.assigned_to and op.active = true and op.role in ('admin','seller')
    left join public.center_contacts ct on ct.contact_id = o.contact_id
    where c.active = true
      and o.active = true
      and o.next_contact_at is not null
      and o.next_contact_at < now()
      and o.status not in ('Trasladado a cotización','No interesado')
      and s.contact_blocked = false
      and coalesce(ct.do_not_contact,false) = false
  ) t
  on conflict (center_id, task_key, scheduled_for) do update
  set assigned_to = excluded.assigned_to,
      recipient = excluded.recipient,
      payload = excluded.payload,
      status = 'pending',
      attempts = 0,
      claimed_at = null,
      last_error = null
  where target.status = 'cancelled';
  get diagnostics v_queued = row_count;

  return query select v_queued, v_cancelled;
end;
$$;


ALTER FUNCTION "private"."queue_overdue_agenda"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."sync_center_state_to_v15"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_campaign_id bigint;
  v_primary_id bigint;
  v_sync_block boolean;
begin
  if tg_op = 'INSERT' then
    v_sync_block := true;
  else
    v_sync_block := new.contact_blocked is distinct from old.contact_blocked
      or new.contact_block_reason is distinct from old.contact_block_reason
      or new.contact_blocked_at is distinct from old.contact_blocked_at;
  end if;

  select c.campaign_id into v_campaign_id
  from public.campaigns c
  where c.is_default = true
  limit 1;

  if v_campaign_id is not null then
    insert into public.center_campaigns(
      center_id, campaign_id, general_status, general_next_contact_at,
      created_at, created_by, updated_at, updated_by
    ) values (
      new.center_id, v_campaign_id, new.status, new.next_contact_at,
      now(), new.updated_by, now(), new.updated_by
    )
    on conflict (center_id, campaign_id) do update
    set general_status = excluded.general_status,
        general_next_contact_at = excluded.general_next_contact_at,
        campaign_version = public.center_campaigns.campaign_version + 1,
        updated_at = now(),
        updated_by = excluded.updated_by
    where public.center_campaigns.general_status is distinct from excluded.general_status
       or public.center_campaigns.general_next_contact_at is distinct from excluded.general_next_contact_at;
  end if;

  if nullif(btrim(coalesce(new.contact_name,'')),'') is not null
     or nullif(btrim(coalesce(new.contact_mobile,'')),'') is not null
     or nullif(btrim(coalesce(new.contact_email,'')),'') is not null then
    select c.contact_id into v_primary_id
    from public.center_contacts c
    where c.center_id = new.center_id
      and c.is_primary = true
      and c.active = true
    order by c.contact_id
    limit 1;

    if v_primary_id is null then
      insert into public.center_contacts(
        center_id, full_name, role, mobile, email, is_primary, active,
        do_not_contact, do_not_contact_reason, do_not_contact_at,
        created_at, created_by, updated_at, updated_by
      ) values (
        new.center_id,
        coalesce(nullif(btrim(new.contact_name),''),'Contacto principal'),
        nullif(btrim(new.contact_role),''),
        nullif(btrim(new.contact_mobile),''),
        nullif(lower(btrim(new.contact_email)),''),
        true, true,
        new.contact_blocked,
        case when new.contact_blocked then coalesce(nullif(btrim(new.contact_block_reason),''),'Bloqueado en ficha') end,
        case when new.contact_blocked then coalesce(new.contact_blocked_at,now()) end,
        now(), new.updated_by, now(), new.updated_by
      );
    else
      update public.center_contacts c
      set full_name = coalesce(nullif(btrim(new.contact_name),''),'Contacto principal'),
          role = nullif(btrim(new.contact_role),''),
          mobile = nullif(btrim(new.contact_mobile),''),
          email = nullif(lower(btrim(new.contact_email)),''),
          do_not_contact = case when v_sync_block then new.contact_blocked else c.do_not_contact end,
          do_not_contact_reason = case
            when not v_sync_block then c.do_not_contact_reason
            when new.contact_blocked then coalesce(nullif(btrim(new.contact_block_reason),''),'Bloqueado en ficha')
            else null
          end,
          do_not_contact_at = case
            when not v_sync_block then c.do_not_contact_at
            when new.contact_blocked then coalesce(new.contact_blocked_at,c.do_not_contact_at,now())
            else null
          end,
          contact_version = c.contact_version + 1,
          updated_at = now(),
          updated_by = new.updated_by
      where c.contact_id = v_primary_id
        and (
          c.full_name is distinct from coalesce(nullif(btrim(new.contact_name),''),'Contacto principal')
          or c.role is distinct from nullif(btrim(new.contact_role),'')
          or c.mobile is distinct from nullif(btrim(new.contact_mobile),'')
          or c.email is distinct from nullif(lower(btrim(new.contact_email)),'')
          or (v_sync_block and c.do_not_contact is distinct from new.contact_blocked)
          or (v_sync_block and c.do_not_contact_reason is distinct from case
                when new.contact_blocked then coalesce(nullif(btrim(new.contact_block_reason),''),'Bloqueado en ficha')
                else null
              end)
        );
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."sync_center_state_to_v15"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."sync_operator_access_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.access_role not in ('owner','manager','seller','system') then
    raise exception 'INVALID_ACCESS_ROLE';
  end if;

  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and new.access_role is not distinct from old.access_role then
    raise exception 'USE_ACCESS_ROLE_FOR_PERMISSION_CHANGES';
  end if;

  new.role := case
    when new.access_role in ('owner','manager') then 'admin'
    when new.access_role = 'seller' then 'seller'
    else 'system'
  end;

  return new;
end;
$$;


ALTER FUNCTION "private"."sync_operator_access_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ begin new.updated_at:=now(); return new; end; $$;


ALTER FUNCTION "private"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_manual_center_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_sources constant text[] := array[
    'Llamada entrante','Email recibido','Formulario web','Google Ads',
    'Recomendación','Profesor conocido','WhatsApp','Prospección comercial','Otro'
  ];
begin
  if new.catalog_source = 'manual' then
    new.lead_source := nullif(btrim(coalesce(new.lead_source,'')),'');
    new.lead_source_detail := nullif(btrim(coalesce(new.lead_source_detail,'')),'');

    if new.lead_source is null or not (new.lead_source = any(v_sources)) then
      raise exception 'INVALID_LEAD_SOURCE';
    end if;

    if new.lead_source = 'Otro' and new.lead_source_detail is null then
      raise exception 'LEAD_SOURCE_DETAIL_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_manual_center_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_travel_opportunity_source_v15"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Compatibilidad con el valor técnico que utilizaba la primera candidata
  -- cuando el centro no tenía origen informado.
  if nullif(btrim(coalesce(new.lead_source,'')),'') = 'Centro actual' then
    new.lead_source := null;
  end if;

  if new.lead_source is null then return new; end if;

  if tg_op='UPDATE' and new.lead_source is not distinct from old.lead_source then
    return new;
  end if;

  if new.lead_source not in (
    'Llamada entrante','Email recibido','Formulario web','Google Ads',
    'Recomendación','Profesor conocido','WhatsApp',
    'Prospección comercial','Otro'
  ) then
    raise exception 'INVALID_LEAD_SOURCE';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."validate_travel_opportunity_source_v15"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."center_state" (
    "center_id" "text" NOT NULL,
    "assigned_to" "text" DEFAULT 'Sin asignar'::"text" NOT NULL,
    "status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "next_contact_at" timestamp with time zone,
    "contact_name" "text",
    "contact_role" "text",
    "contact_mobile" "text",
    "contact_email" "text",
    "contact_blocked" boolean DEFAULT false NOT NULL,
    "contact_blocked_at" timestamp with time zone,
    "contact_block_reason" "text",
    "last_contact_at" timestamp with time zone,
    "last_result" "text",
    "last_operator_code" "text",
    "contact_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "state_version" bigint DEFAULT 1 NOT NULL,
    CONSTRAINT "center_state_contact_count_check" CHECK (("contact_count" >= 0)),
    CONSTRAINT "center_state_status_check" CHECK (("status" = ANY (ARRAY['Pendiente'::"text", 'Interesado'::"text", 'Trasladado a cotización'::"text", 'No interesado'::"text"])))
);


ALTER TABLE "public"."center_state" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_assign_center"("p_center_id" "text", "p_operator_code" "text") RETURNS "public"."center_state"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_state public.center_state%rowtype;
  v_active boolean;
begin
  if not private.has_permission('centers.assign') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_operator_code <> 'Sin asignar' and not exists(
    select 1
    from public.operators o
    where o.code = p_operator_code
      and o.active = true
      and o.access_role in ('owner','manager','seller')
  ) then
    raise exception 'INVALID_OPERATOR';
  end if;

  select c.active
  into v_active
  from public.centers c
  where c.id = p_center_id
  for update;

  if not found then
    raise exception 'CENTER_NOT_FOUND';
  end if;
  if not v_active then
    raise exception 'CENTER_ARCHIVED';
  end if;

  update public.center_state s
  set assigned_to = p_operator_code,
      state_version = s.state_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where s.center_id = p_center_id
  returning s.* into v_state;

  if not found then
    raise exception 'CENTER_STATE_NOT_FOUND';
  end if;

  return v_state;
end;
$$;


ALTER FUNCTION "public"."admin_assign_center"("p_center_id" "text", "p_operator_code" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operators" (
    "code" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "email" "text",
    "auth_user_id" "uuid",
    "linked_at" timestamp with time zone,
    "role" "text" DEFAULT 'seller'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "access_role" "text" DEFAULT 'seller'::"text" NOT NULL,
    CONSTRAINT "operators_access_role_check" CHECK (("access_role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'seller'::"text", 'system'::"text"]))),
    CONSTRAINT "operators_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'seller'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."operators" OWNER TO "postgres";


COMMENT ON COLUMN "public"."operators"."access_role" IS 'Rol funcional autoritativo VGE: owner, manager, seller o system. La columna role queda como clase técnica compatible.';



CREATE OR REPLACE FUNCTION "public"."admin_create_operator"("p_code" "text", "p_display_name" "text", "p_email" "text", "p_role" "text" DEFAULT 'seller'::"text") RETURNS "public"."operators"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_op public.operators%rowtype;
  v_access_role text := lower(btrim(coalesce(p_role,'seller')));
begin
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;
  if p_code is null or p_code !~ '^OP-[0-9]{3,}$' then
    raise exception 'INVALID_OPERATOR_CODE';
  end if;
  if v_access_role = 'admin' then
    v_access_role := 'manager';
  end if;
  if v_access_role not in ('manager','seller') then
    raise exception 'INVALID_ACCESS_ROLE';
  end if;
  if nullif(btrim(p_display_name),'') is null
     or nullif(btrim(p_email),'') is null then
    raise exception 'NAME_EMAIL_REQUIRED';
  end if;

  insert into public.operators(
    code, display_name, email, role, access_role,
    active, auth_user_id, linked_at
  ) values (
    p_code, btrim(p_display_name), lower(btrim(p_email)),
    case when v_access_role = 'manager' then 'admin' else 'seller' end,
    v_access_role, true, null, null
  )
  returning * into v_op;

  return v_op;
end;
$_$;


ALTER FUNCTION "public"."admin_create_operator"("p_code" "text", "p_display_name" "text", "p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_deactivate_operator"("p_code" "text") RETURNS "public"."operators"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_op public.operators%rowtype;
begin
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;
  if p_code = 'Sin asignar' then
    raise exception 'SYSTEM_OPERATOR_CANNOT_BE_DISABLED';
  end if;

  select * into v_op
  from public.operators
  where code = p_code
  for update;
  if not found then
    raise exception 'OPERATOR_NOT_FOUND';
  end if;
  if v_op.access_role = 'owner' then
    raise exception 'OWNER_ROLE_PROTECTED';
  end if;
  if exists(select 1 from public.center_state where assigned_to = p_code) then
    raise exception 'REASSIGN_PORTFOLIO_FIRST';
  end if;

  update public.operators
  set active = false,
      auth_user_id = null,
      linked_at = null,
      updated_at = now()
  where code = p_code
  returning * into v_op;

  return v_op;
end;
$$;


ALTER FUNCTION "public"."admin_deactivate_operator"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_link_operator"("p_code" "text", "p_auth_user_id" "uuid") RETURNS "public"."operators"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_op public.operators%rowtype;
  v_auth_email text;
begin
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  select lower(email) into v_auth_email
  from auth.users
  where id = p_auth_user_id;
  if v_auth_email is null then
    raise exception 'AUTH_USER_NOT_FOUND';
  end if;

  select * into v_op
  from public.operators
  where code = p_code
  for update;
  if not found or not v_op.active
     or v_op.access_role not in ('owner','manager','seller') then
    raise exception 'OPERATOR_NOT_FOUND_OR_INACTIVE';
  end if;
  if v_op.auth_user_id is not null and v_op.auth_user_id <> p_auth_user_id then
    raise exception 'OPERATOR_ALREADY_LINKED';
  end if;
  if lower(v_op.email) <> v_auth_email then
    raise exception 'EMAIL_MISMATCH';
  end if;
  if exists(
    select 1 from public.operators
    where auth_user_id = p_auth_user_id and code <> p_code
  ) then
    raise exception 'AUTH_USER_ALREADY_LINKED';
  end if;

  update public.operators
  set auth_user_id = p_auth_user_id,
      linked_at = now(),
      updated_at = now()
  where code = p_code
  returning * into v_op;

  return v_op;
end;
$$;


ALTER FUNCTION "public"."admin_link_operator"("p_code" "text", "p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_center"("p_center_id" "text", "p_reason" "text") RETURNS TABLE("result_center_id" "text", "result_archived_at" timestamp with time zone, "result_archived_by_operator" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_actor text;
  v_reason text := btrim(coalesce(p_reason,''));
  v_center public.centers%rowtype;
  v_state public.center_state%rowtype;
  v_contacts bigint;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.has_permission('centers.archive') then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if nullif(btrim(coalesce(p_center_id,'')),'') is null then
    raise exception 'CENTER_REQUIRED';
  end if;
  if char_length(v_reason) < 8 or char_length(v_reason) > 500 then
    raise exception 'CENTER_LIFECYCLE_REASON_REQUIRED';
  end if;

  v_actor := private.current_operator_code();
  if v_actor is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  select c.*
  into v_center
  from public.centers c
  where c.id = btrim(p_center_id)
  for update;

  if not found then
    raise exception 'CENTER_NOT_FOUND';
  end if;
  if not v_center.active then
    raise exception 'CENTER_ALREADY_ARCHIVED';
  end if;

  select s.*
  into v_state
  from public.center_state s
  where s.center_id = v_center.id
  for update;

  if not found then
    raise exception 'CENTER_STATE_NOT_FOUND';
  end if;

  select count(*)::bigint
  into v_contacts
  from public.contact_events e
  where e.center_id = v_center.id;

  update public.centers c
  set active = false,
      archived_at = v_now,
      archived_by = v_uid,
      archived_by_operator = v_actor,
      archive_reason = v_reason
  where c.id = v_center.id;

  -- Cancela cualquier aviso que todavía no se haya completado. Los avisos ya
  -- enviados permanecen como registro técnico hasta una posible eliminación.
  update public.agenda_email_outbox q
  set status = 'cancelled',
      claimed_at = null,
      last_error = 'Centro archivado en CRM'
  where q.center_id = v_center.id
    and q.status in ('pending','processing','failed');

  insert into public.center_lifecycle_audit(
    center_id, action, center_school, city, province, community,
    assigned_to, status, contact_events_count, reason,
    acted_by, acted_by_operator, acted_at
  ) values (
    v_center.id, 'archive', v_center.school, v_center.city,
    v_center.province, v_center.community, v_state.assigned_to,
    v_state.status, v_contacts, v_reason, v_uid, v_actor, v_now
  );

  return query select v_center.id, v_now, v_actor;
end;
$$;


ALTER FUNCTION "public"."archive_center"("p_center_id" "text", "p_reason" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."center_contacts" (
    "contact_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text",
    "mobile" "text",
    "email" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "do_not_contact" boolean DEFAULT false NOT NULL,
    "do_not_contact_reason" "text",
    "do_not_contact_at" timestamp with time zone,
    "contact_version" bigint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "center_contacts_block_check" CHECK (((("do_not_contact" = false) AND ("do_not_contact_reason" IS NULL) AND ("do_not_contact_at" IS NULL)) OR (("do_not_contact" = true) AND (("char_length"("btrim"(COALESCE("do_not_contact_reason", ''::"text"))) >= 4) AND ("char_length"("btrim"(COALESCE("do_not_contact_reason", ''::"text"))) <= 500)) AND ("do_not_contact_at" IS NOT NULL)))),
    CONSTRAINT "center_contacts_email_check" CHECK ((("email" IS NULL) OR ("email" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text"))),
    CONSTRAINT "center_contacts_name_check" CHECK ((("char_length"("btrim"("full_name")) >= 2) AND ("char_length"("btrim"("full_name")) <= 160))),
    CONSTRAINT "center_contacts_version_check" CHECK (("contact_version" > 0))
);


ALTER TABLE "public"."center_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."center_contacts" IS 'Personas de contacto del centro; una principal activa como máximo.';



CREATE OR REPLACE FUNCTION "public"."archive_center_contact_v1"("p_contact_id" bigint, "p_expected_version" bigint) RETURNS "public"."center_contacts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_current public.center_contacts%rowtype;
  v_replacement public.center_contacts%rowtype;
  v_result public.center_contacts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;

  select c.* into v_current
  from public.center_contacts c
  where c.contact_id = p_contact_id
  for update;

  if not found or not v_current.active then raise exception 'CONTACT_NOT_FOUND'; end if;
  if not private.can_access_center(v_current.center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_version is null or v_current.contact_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;

  if exists (
    select 1 from public.travel_opportunities o
    where o.contact_id = p_contact_id and o.active = true
  ) then
    raise exception 'CONTACT_LINKED_TO_ACTIVE_TRIP';
  end if;

  update public.center_contacts c
  set active = false,
      is_primary = false,
      contact_version = c.contact_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where c.contact_id = p_contact_id
  returning * into v_result;

  if v_current.is_primary then
    select c.* into v_replacement
    from public.center_contacts c
    where c.center_id = v_current.center_id
      and c.active = true
      and c.contact_id <> p_contact_id
    order by c.created_at, c.contact_id
    limit 1
    for update;

    if found then
      update public.center_contacts c
      set is_primary = true,
          contact_version = c.contact_version + 1,
          updated_at = now(),
          updated_by = (select auth.uid())
      where c.contact_id = v_replacement.contact_id
      returning * into v_replacement;

      update public.center_state s
      set contact_name = v_replacement.full_name,
          contact_role = v_replacement.role,
          contact_mobile = v_replacement.mobile,
          contact_email = v_replacement.email,
          state_version = s.state_version + 1,
          updated_at = now(),
          updated_by = (select auth.uid())
      where s.center_id = v_current.center_id;
    else
      update public.center_state s
      set contact_name = null,
          contact_role = null,
          contact_mobile = null,
          contact_email = null,
          state_version = s.state_version + 1,
          updated_at = now(),
          updated_by = (select auth.uid())
      where s.center_id = v_current.center_id;
    end if;
  end if;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."archive_center_contact_v1"("p_contact_id" bigint, "p_expected_version" bigint) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."travel_opportunities" (
    "opportunity_id" "text" NOT NULL,
    "center_campaign_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "cycle" "text" NOT NULL,
    "group_description" "text",
    "students_count" integer,
    "teachers_count" integer,
    "destination" "text",
    "travel_start_on" "date",
    "travel_end_on" "date",
    "contact_id" bigint,
    "status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "next_contact_at" timestamp with time zone,
    "lead_source" "text",
    "lead_source_detail" "text",
    "last_contact_at" timestamp with time zone,
    "last_result" "text",
    "last_operator_code" "text",
    "contact_count" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archived_by_operator" "text",
    "archive_reason" "text",
    "opportunity_version" bigint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_by_operator" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "travel_opportunities_archive_check" CHECK (((("active" = true) AND ("archived_at" IS NULL) AND ("archived_by" IS NULL) AND ("archived_by_operator" IS NULL) AND ("archive_reason" IS NULL)) OR (("active" = false) AND ("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL) AND (NULLIF("btrim"("archived_by_operator"), ''::"text") IS NOT NULL) AND (("char_length"("btrim"(COALESCE("archive_reason", ''::"text"))) >= 8) AND ("char_length"("btrim"(COALESCE("archive_reason", ''::"text"))) <= 500))))),
    CONSTRAINT "travel_opportunities_closed_next_check" CHECK ((("status" <> ALL (ARRAY['Trasladado a cotización'::"text", 'No interesado'::"text"])) OR ("next_contact_at" IS NULL))),
    CONSTRAINT "travel_opportunities_contact_count_check" CHECK (("contact_count" >= 0)),
    CONSTRAINT "travel_opportunities_cycle_check" CHECK (("cycle" = ANY (ARRAY['6.º Primaria'::"text", '1.º ESO'::"text", '2.º ESO'::"text", '3.º ESO'::"text", '4.º ESO'::"text", 'Bachillerato'::"text", 'FP'::"text", 'Varios ciclos'::"text", 'Otro'::"text"]))),
    CONSTRAINT "travel_opportunities_dates_check" CHECK ((("travel_end_on" IS NULL) OR ("travel_start_on" IS NULL) OR ("travel_end_on" >= "travel_start_on"))),
    CONSTRAINT "travel_opportunities_id_check" CHECK (("opportunity_id" ~ '^VGE-O[0-9]{6}$'::"text")),
    CONSTRAINT "travel_opportunities_status_check" CHECK (("status" = ANY (ARRAY['Pendiente'::"text", 'Interesado'::"text", 'Trasladado a cotización'::"text", 'No interesado'::"text"]))),
    CONSTRAINT "travel_opportunities_students_check" CHECK ((("students_count" IS NULL) OR (("students_count" >= 1) AND ("students_count" <= 2000)))),
    CONSTRAINT "travel_opportunities_teachers_check" CHECK ((("teachers_count" IS NULL) OR (("teachers_count" >= 0) AND ("teachers_count" <= 250)))),
    CONSTRAINT "travel_opportunities_version_check" CHECK (("opportunity_version" > 0))
);


ALTER TABLE "public"."travel_opportunities" OWNER TO "postgres";


COMMENT ON TABLE "public"."travel_opportunities" IS 'Solicitudes de viaje por centro y campaña. Un centro puede tener varias simultáneas.';



CREATE OR REPLACE FUNCTION "public"."archive_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) RETURNS "public"."travel_opportunities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_current public.travel_opportunities%rowtype;
  v_result public.travel_opportunities%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_reason is null or char_length(v_reason) not between 8 and 500 then
    raise exception 'OPPORTUNITY_LIFECYCLE_REASON_REQUIRED';
  end if;

  select o.* into v_current
  from public.travel_opportunities o
  where o.opportunity_id = p_opportunity_id
  for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not v_current.active then raise exception 'OPPORTUNITY_ALREADY_ARCHIVED'; end if;
  if not private.can_access_center(v_current.center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_version is null or v_current.opportunity_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;

  update public.travel_opportunities o
  set active = false,
      archived_at = now(),
      archived_by = (select auth.uid()),
      archived_by_operator = private.current_operator_code(),
      archive_reason = v_reason,
      opportunity_version = o.opportunity_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where o.opportunity_id = p_opportunity_id
  returning * into v_result;

  update public.agenda_email_outbox q
  set status = 'cancelled',
      claimed_at = null,
      last_error = 'Viaje archivado en CRM'
  where q.center_id = v_result.center_id
    and q.task_key = 'opportunity:' || v_result.opportunity_id
    and q.status in ('pending','processing','failed');

  return v_result;
end;
$$;


ALTER FUNCTION "public"."archive_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) IS 'Archiva un viaje sin borrar su próxima fecha; active=false lo retira de la agenda.';



CREATE OR REPLACE FUNCTION "public"."bulk_assign_zone"("p_scope_type" "text", "p_scope_value" "text", "p_shares" "jsonb") RETURNS TABLE("operator_code" "text", "assigned_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_total bigint;
  v_sum numeric;
  v_invalid bigint;
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_scope_type not in ('community','province') then raise exception 'INVALID_SCOPE_TYPE'; end if;
  if nullif(btrim(coalesce(p_scope_value,'')),'') is null then raise exception 'SCOPE_VALUE_REQUIRED'; end if;
  if p_shares is null or jsonb_typeof(p_shares)<>'object' or p_shares='{}'::jsonb then raise exception 'SHARES_REQUIRED'; end if;

  select count(*) into v_invalid
  from jsonb_each_text(p_shares) j
  left join public.operators o on o.code=j.key and o.active=true and o.role in ('admin','seller')
  where o.code is null or (j.value)::numeric < 0;
  if v_invalid>0 then raise exception 'INVALID_OPERATOR_OR_PERCENTAGE'; end if;

  select sum((value)::numeric) into v_sum from jsonb_each_text(p_shares);
  if abs(coalesce(v_sum,0)-100)>0.0001 then raise exception 'PERCENTAGES_MUST_SUM_100'; end if;

  select count(*) into v_total
  from public.centers c
  where c.active=true and (
    (p_scope_type='community' and c.community=p_scope_value) or
    (p_scope_type='province' and c.province=p_scope_value)
  );
  if v_total=0 then raise exception 'NO_CENTERS_IN_SCOPE'; end if;

  return query
  with shares as (
    select j.key as code,(j.value)::numeric as pct
    from jsonb_each_text(p_shares) j
  ), calc as (
    select s.code,s.pct,
           floor(v_total*s.pct/100.0)::bigint as base_count,
           (v_total*s.pct/100.0)-floor(v_total*s.pct/100.0) as frac
    from shares s
  ), rem as (
    select (v_total-sum(base_count))::bigint as r from calc
  ), alloc as (
    select c.code,
           c.base_count + case when row_number() over(order by c.frac desc,c.code) <= (select r from rem) then 1 else 0 end as cnt
    from calc c
  ), buckets as (
    select a.code,
           1 + coalesce(sum(a.cnt) over(order by a.code rows between unbounded preceding and 1 preceding),0) as start_rn,
           sum(a.cnt) over(order by a.code rows between unbounded preceding and current row) as end_rn,
           a.cnt
    from alloc a
  ), eligible as (
    select c.id,row_number() over(order by md5(c.id||'|'||p_scope_type||'|'||p_scope_value),c.id) as rn
    from public.centers c
    where c.active=true and (
      (p_scope_type='community' and c.community=p_scope_value) or
      (p_scope_type='province' and c.province=p_scope_value)
    )
  ), mapping as (
    select e.id,b.code
    from eligible e join buckets b on e.rn between b.start_rn and b.end_rn
  ), upd as (
    update public.center_state s
       set assigned_to=m.code,
           state_version=s.state_version+1,
           updated_at=now(),
           updated_by=(select auth.uid())
      from mapping m
     where s.center_id=m.id and s.assigned_to is distinct from m.code
    returning s.center_id,s.assigned_to
  )
  select b.code as operator_code,b.cnt as assigned_count
  from buckets b order by b.code;
end;
$$;


ALTER FUNCTION "public"."bulk_assign_zone"("p_scope_type" "text", "p_scope_value" "text", "p_shares" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_vge_agenda_email_batch"("p_limit" integer DEFAULT 10) RETURNS TABLE("id" bigint, "center_id" "text", "assigned_to" "text", "scheduled_for" timestamp with time zone, "recipient" "text", "payload" "jsonb", "attempts" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Recuperar trabajos que quedaron colgados por una ejecución interrumpida.
  update public.agenda_email_outbox
     set status='failed',
         claimed_at=null,
         last_error='Worker timeout: se reintentará'
   where status='processing'
     and claimed_at < now() - interval '15 minutes';

  return query
  with candidates as (
    select q.id
    from public.agenda_email_outbox q
    where q.status in ('pending','failed')
      and q.attempts < 5
    order by q.created_at,q.id
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,10),20))
  ), claimed as (
    update public.agenda_email_outbox q
       set status='processing',
           claimed_at=now(),
           attempts=q.attempts+1,
           last_error=null
      from candidates c
     where q.id=c.id
    returning q.id,q.center_id,q.assigned_to,q.scheduled_for,q.recipient,q.payload,q.attempts
  )
  select c.id,c.center_id,c.assigned_to,c.scheduled_for,c.recipient,c.payload,c.attempts
  from claimed c
  order by c.id;
end;
$$;


ALTER FUNCTION "public"."claim_vge_agenda_email_batch"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_vge_agenda_email"("p_id" bigint, "p_success" boolean, "p_provider_message_id" "text" DEFAULT NULL::"text", "p_error" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_updated integer;
begin
  update public.agenda_email_outbox
     set status=case when p_success then 'sent' else 'failed' end,
         provider_message_id=case when p_success then nullif(btrim(coalesce(p_provider_message_id,'')),'') else provider_message_id end,
         last_error=case when p_success then null else left(coalesce(p_error,'Error desconocido'),1000) end,
         sent_at=case when p_success then now() else null end,
         claimed_at=null
   where id=p_id
     and status='processing';
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;


ALTER FUNCTION "public"."complete_vge_agenda_email"("p_id" bigint, "p_success" boolean, "p_provider_message_id" "text", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_center_contact_v1"("p_center_id" "text", "p_full_name" "text", "p_role" "text" DEFAULT NULL::"text", "p_mobile" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text", "p_is_primary" boolean DEFAULT false, "p_do_not_contact" boolean DEFAULT false, "p_do_not_contact_reason" "text" DEFAULT NULL::"text") RETURNS "public"."center_contacts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_state public.center_state%rowtype;
  v_result public.center_contacts%rowtype;
  v_name text := nullif(btrim(coalesce(p_full_name,'')),'');
  v_email text := nullif(lower(btrim(coalesce(p_email,''))),'');
  v_mobile text := nullif(btrim(coalesce(p_mobile,'')),'');
  v_reason text := nullif(btrim(coalesce(p_do_not_contact_reason,'')),'');
  v_make_primary boolean;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;

  select s.* into v_state
  from public.center_state s
  where s.center_id = p_center_id
  for update;
  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if v_state.assigned_to <> private.current_operator_code() and not private.is_admin() then
    raise exception 'ASSIGNMENT_CHANGED';
  end if;

  if v_name is null or char_length(v_name) < 2 then raise exception 'CONTACT_NAME_REQUIRED'; end if;
  if v_email is not null and v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_CONTACT_EMAIL';
  end if;
  if nullif(private.norm_phone(v_mobile),'') is not null and char_length(private.norm_phone(v_mobile)) < 6 then
    raise exception 'INVALID_CONTACT_PHONE';
  end if;
  if coalesce(p_do_not_contact,false) and (v_reason is null or char_length(v_reason) < 4) then
    raise exception 'CONTACT_BLOCK_REASON_REQUIRED';
  end if;

  v_make_primary := coalesce(p_is_primary,false) or not exists (
    select 1 from public.center_contacts c
    where c.center_id = p_center_id and c.active = true and c.is_primary = true
  );

  if v_make_primary then
    update public.center_contacts c
    set is_primary = false,
        contact_version = c.contact_version + 1,
        updated_at = now(),
        updated_by = (select auth.uid())
    where c.center_id = p_center_id and c.active = true and c.is_primary = true;
  end if;

  insert into public.center_contacts(
    center_id, full_name, role, mobile, email, is_primary, active,
    do_not_contact, do_not_contact_reason, do_not_contact_at,
    created_at, created_by, updated_at, updated_by
  ) values (
    p_center_id, v_name, nullif(btrim(coalesce(p_role,'')),''), v_mobile, v_email,
    v_make_primary, true, coalesce(p_do_not_contact,false),
    case when coalesce(p_do_not_contact,false) then v_reason end,
    case when coalesce(p_do_not_contact,false) then now() end,
    now(), (select auth.uid()), now(), (select auth.uid())
  ) returning * into v_result;

  if v_make_primary then
    update public.center_state s
    set contact_name = v_result.full_name,
        contact_role = v_result.role,
        contact_mobile = v_result.mobile,
        contact_email = v_result.email,
        state_version = s.state_version + 1,
        updated_at = now(),
        updated_by = (select auth.uid())
    where s.center_id = p_center_id;
  end if;

  return v_result;
end;
$_$;


ALTER FUNCTION "public"."create_center_contact_v1"("p_center_id" "text", "p_full_name" "text", "p_role" "text", "p_mobile" "text", "p_email" "text", "p_is_primary" boolean, "p_do_not_contact" boolean, "p_do_not_contact_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_manual_center"("p_school" "text", "p_city" "text", "p_province" "text", "p_lead_source" "text", "p_school_phone" "text" DEFAULT NULL::"text", "p_school_email" "text" DEFAULT NULL::"text", "p_contact_name" "text" DEFAULT NULL::"text", "p_contact_role" "text" DEFAULT NULL::"text", "p_contact_mobile" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_lead_source_detail" "text" DEFAULT NULL::"text", "p_assigned_to" "text" DEFAULT NULL::"text", "p_confirm_possible_duplicate" boolean DEFAULT false) RETURNS TABLE("center_id" "text", "assigned_to" "text", "community" "text", "state_version" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_admin boolean;
  v_school text := btrim(coalesce(p_school,''));
  v_city text := btrim(coalesce(p_city,''));
  v_province text := private.canonical_province(p_province);
  v_community text;
  v_assigned text;
  v_center_id text;
  v_state_version bigint;
  v_school_norm text;
  v_city_norm text;
  v_has_possible boolean;
  v_lead_sources constant text[] := array[
    'Llamada entrante','Email recibido','Formulario web','Google Ads',
    'Recomendación','Profesor conocido','WhatsApp','Prospección comercial','Otro'
  ];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  v_code := private.current_operator_code();
  if v_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;
  v_admin := private.is_admin();

  if length(v_school)<3 then raise exception 'SCHOOL_REQUIRED'; end if;
  if length(v_city)<2 then raise exception 'CITY_REQUIRED'; end if;
  if v_province is null then raise exception 'INVALID_PROVINCE'; end if;
  v_community := private.community_for_province(v_province);
  if v_community is null then raise exception 'INVALID_PROVINCE'; end if;
  if not (p_lead_source = any(v_lead_sources)) then raise exception 'INVALID_LEAD_SOURCE'; end if;
  if p_lead_source='Otro' and nullif(btrim(coalesce(p_lead_source_detail,'')),'') is null then
    raise exception 'LEAD_SOURCE_DETAIL_REQUIRED';
  end if;

  if nullif(btrim(coalesce(p_school_email,'')),'') is not null
     and lower(btrim(p_school_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_SCHOOL_EMAIL';
  end if;
  if nullif(btrim(coalesce(p_contact_email,'')),'') is not null
     and lower(btrim(p_contact_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_CONTACT_EMAIL';
  end if;
  if nullif(private.norm_phone(p_school_phone),'') is not null and length(private.norm_phone(p_school_phone))<6 then
    raise exception 'INVALID_SCHOOL_PHONE';
  end if;
  if nullif(private.norm_phone(p_contact_mobile),'') is not null and length(private.norm_phone(p_contact_mobile))<6 then
    raise exception 'INVALID_CONTACT_PHONE';
  end if;

  if v_admin then
    v_assigned := coalesce(nullif(btrim(coalesce(p_assigned_to,'')),''),v_code);
    if v_assigned<>'Sin asignar' and not exists(
      select 1 from public.operators o where o.code=v_assigned and o.active=true and o.role in ('admin','seller')
    ) then raise exception 'INVALID_OPERATOR'; end if;
  else
    v_assigned := v_code;
  end if;

  v_school_norm := private.norm_center_text(v_school);
  v_city_norm := private.norm_center_text(v_city);
  perform pg_advisory_xact_lock(hashtextextended(v_school_norm||'|'||v_city_norm||'|'||v_province,0));

  if exists(
    select 1 from public.centers c
    where private.canonical_province(c.province)=v_province
      and private.norm_center_text(c.school)=v_school_norm
      and private.norm_center_text(coalesce(c.city,''))=v_city_norm
  ) then raise exception 'CENTER_ALREADY_EXISTS'; end if;

  select exists(
    select 1 from public.centers c
    where private.canonical_province(c.province)=v_province
      and (
        (private.norm_center_text(coalesce(c.city,''))=v_city_norm
          and extensions.similarity(private.norm_center_text(c.school),v_school_norm)>=0.72)
        or (nullif(lower(btrim(coalesce(p_school_email,''))),'') is not null
          and lower(btrim(coalesce(c.school_email,'')))=lower(btrim(p_school_email)))
        or (nullif(private.norm_phone(p_school_phone),'') is not null
          and private.norm_phone(c.school_phone)=private.norm_phone(p_school_phone))
      )
  ) into v_has_possible;

  if v_has_possible and not coalesce(p_confirm_possible_duplicate,false) then
    raise exception 'POSSIBLE_DUPLICATE_CONFIRM_REQUIRED';
  end if;

  loop
    v_center_id := 'VGE-N'||lpad(nextval('private.manual_center_id_seq')::text,6,'0');
    exit when not exists(select 1 from public.centers where id=v_center_id);
  end loop;

  insert into public.centers(
    id,school,city,province,community,school_phone,school_email,active,
    catalog_source,catalog_updated_at,created_at,updated_at,
    lead_source,lead_source_detail,created_by,created_by_operator
  ) values (
    v_center_id,v_school,v_city,v_province,v_community,
    nullif(btrim(coalesce(p_school_phone,'')),''),
    nullif(lower(btrim(coalesce(p_school_email,''))),''),
    true,'manual',now(),now(),now(),
    p_lead_source,nullif(btrim(coalesce(p_lead_source_detail,'')),''),v_uid,v_code
  );

  update public.center_state s
  set assigned_to=v_assigned,
      contact_name=nullif(btrim(coalesce(p_contact_name,'')),''),
      contact_role=nullif(btrim(coalesce(p_contact_role,'')),''),
      contact_mobile=nullif(btrim(coalesce(p_contact_mobile,'')),''),
      contact_email=nullif(lower(btrim(coalesce(p_contact_email,''))),''),
      state_version=s.state_version+1,
      updated_at=now(),
      updated_by=v_uid
  where s.center_id=v_center_id
  returning s.state_version into v_state_version;

  insert into public.center_creation_audit(
    center_id,auth_user_id,operator_code,lead_source,assigned_to,payload
  ) values (
    v_center_id,v_uid,v_code,p_lead_source,v_assigned,
    jsonb_build_object(
      'school',v_school,'city',v_city,'province',v_province,'community',v_community,
      'catalog_source','manual','lead_source_detail',nullif(btrim(coalesce(p_lead_source_detail,'')),'')
    )
  );

  return query select v_center_id,v_assigned,v_community,v_state_version;
end;
$_$;


ALTER FUNCTION "public"."create_manual_center"("p_school" "text", "p_city" "text", "p_province" "text", "p_lead_source" "text", "p_school_phone" "text", "p_school_email" "text", "p_contact_name" "text", "p_contact_role" "text", "p_contact_mobile" "text", "p_contact_email" "text", "p_lead_source_detail" "text", "p_assigned_to" "text", "p_confirm_possible_duplicate" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_manual_center"("p_school" "text", "p_city" "text", "p_province" "text", "p_lead_source" "text", "p_school_phone" "text", "p_school_email" "text", "p_contact_name" "text", "p_contact_role" "text", "p_contact_mobile" "text", "p_contact_email" "text", "p_lead_source_detail" "text", "p_assigned_to" "text", "p_confirm_possible_duplicate" boolean) IS 'Alta manual VGE: disponible para operadores vinculados; comerciales se autoasignan y administradores pueden elegir responsable.';



CREATE OR REPLACE FUNCTION "public"."create_travel_opportunity_v1"("p_center_id" "text", "p_campaign_code" "text", "p_cycle" "text", "p_group_description" "text" DEFAULT NULL::"text", "p_students_count" integer DEFAULT NULL::integer, "p_teachers_count" integer DEFAULT NULL::integer, "p_destination" "text" DEFAULT NULL::"text", "p_travel_start_on" "date" DEFAULT NULL::"date", "p_travel_end_on" "date" DEFAULT NULL::"date", "p_contact_id" bigint DEFAULT NULL::bigint, "p_status" "text" DEFAULT 'Pendiente'::"text", "p_next_contact_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_lead_source" "text" DEFAULT NULL::"text", "p_lead_source_detail" "text" DEFAULT NULL::"text") RETURNS "public"."travel_opportunities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_campaign_id bigint;
  v_center_campaign_id bigint;
  v_opportunity_id text;
  v_result public.travel_opportunities%rowtype;
  v_state public.center_state%rowtype;
  v_status text := coalesce(nullif(btrim(coalesce(p_status,'')),''),'Pendiente');
  v_next timestamptz;
  v_source text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;

  select s.* into v_state
  from public.center_state s where s.center_id = p_center_id for update;
  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if v_state.assigned_to <> private.current_operator_code() and not private.is_admin() then
    raise exception 'ASSIGNMENT_CHANGED';
  end if;

  if p_cycle is null or p_cycle not in (
    '6.º Primaria','1.º ESO','2.º ESO','3.º ESO','4.º ESO',
    'Bachillerato','FP','Varios ciclos','Otro'
  ) then raise exception 'INVALID_CYCLE'; end if;
  if v_status not in ('Pendiente','Interesado','Trasladado a cotización','No interesado') then
    raise exception 'INVALID_STATUS';
  end if;
  if p_students_count is not null and p_students_count not between 1 and 2000 then
    raise exception 'INVALID_STUDENTS_COUNT';
  end if;
  if p_teachers_count is not null and p_teachers_count not between 0 and 250 then
    raise exception 'INVALID_TEACHERS_COUNT';
  end if;
  if p_travel_start_on is not null and p_travel_end_on is not null and p_travel_end_on < p_travel_start_on then
    raise exception 'INVALID_TRAVEL_DATES';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.center_contacts c
    where c.contact_id = p_contact_id and c.center_id = p_center_id and c.active = true
  ) then raise exception 'INVALID_CENTER_CONTACT'; end if;

  select c.campaign_id into v_campaign_id
  from public.campaigns c
  where c.active = true
    and (
      (nullif(btrim(coalesce(p_campaign_code,'')),'') is null and c.is_default = true)
      or c.code = nullif(btrim(coalesce(p_campaign_code,'')),'')
    )
  order by c.is_default desc, c.starts_on desc
  limit 1;
  if v_campaign_id is null then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  insert into public.center_campaigns(
    center_id, campaign_id, general_status, general_next_contact_at,
    created_at, created_by, updated_at, updated_by
  ) values (
    p_center_id, v_campaign_id, v_state.status, v_state.next_contact_at,
    now(), (select auth.uid()), now(), (select auth.uid())
  )
  on conflict (center_id,campaign_id) do nothing;

  select cc.center_campaign_id into v_center_campaign_id
  from public.center_campaigns cc
  where cc.center_id = p_center_id and cc.campaign_id = v_campaign_id;

  loop
    v_opportunity_id := 'VGE-O' || lpad(nextval('private.travel_opportunity_id_seq')::text,6,'0');
    exit when not exists (
      select 1 from public.travel_opportunities o where o.opportunity_id = v_opportunity_id
    );
  end loop;

  select coalesce(
    nullif(btrim(coalesce(p_lead_source,'')),''),
    nullif(btrim(c.lead_source),''),
    'Centro actual'
  ) into v_source
  from public.centers c where c.id = p_center_id;

  v_next := case
    when v_status in ('Trasladado a cotización','No interesado') then null
    else p_next_contact_at
  end;

  insert into public.travel_opportunities(
    opportunity_id, center_campaign_id, center_id, cycle, group_description,
    students_count, teachers_count, destination, travel_start_on, travel_end_on,
    contact_id, status, next_contact_at, lead_source, lead_source_detail,
    created_at, created_by, created_by_operator, updated_at, updated_by
  ) values (
    v_opportunity_id, v_center_campaign_id, p_center_id, p_cycle,
    nullif(btrim(coalesce(p_group_description,'')),''),
    p_students_count, p_teachers_count,
    nullif(btrim(coalesce(p_destination,'')),''),
    p_travel_start_on, p_travel_end_on, p_contact_id, v_status, v_next,
    v_source, nullif(btrim(coalesce(p_lead_source_detail,'')),''),
    now(), (select auth.uid()), private.current_operator_code(),
    now(), (select auth.uid())
  ) returning * into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."create_travel_opportunity_v1"("p_center_id" "text", "p_campaign_code" "text", "p_cycle" "text", "p_group_description" "text", "p_students_count" integer, "p_teachers_count" integer, "p_destination" "text", "p_travel_start_on" "date", "p_travel_end_on" "date", "p_contact_id" bigint, "p_status" "text", "p_next_contact_at" timestamp with time zone, "p_lead_source" "text", "p_lead_source_detail" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_access_fingerprint"() RETURNS TABLE("row_count" bigint, "max_updated_at" timestamp with time zone, "id_hash" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select count(*)::bigint,
         max(greatest(c.updated_at,s.updated_at)),
         md5(coalesce(string_agg(c.id,'|' order by c.id),''))
  from public.centers c join public.center_state s on s.center_id=c.id
  where c.active=true and (private.is_admin() or s.assigned_to=private.current_operator_code());
$$;


ALTER FUNCTION "public"."get_access_fingerprint"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_access_fingerprint_v2"() RETURNS TABLE("row_count" bigint, "max_updated_at" timestamp with time zone, "id_hash" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    count(*)::bigint,
    max(greatest(c.updated_at, s.updated_at)),
    md5(coalesce(string_agg(
      c.id || ':' || c.active::text || ':' || coalesce(c.archived_at::text,''),
      '|' order by c.id
    ),''))
  from public.centers c
  join public.center_state s on s.center_id = c.id
  where
    (
      c.active = true
      and (
        private.is_admin()
        or s.assigned_to = private.current_operator_code()
      )
    )
    or
    (
      c.active = false
      and private.has_permission('centers.archive')
    );
$$;


ALTER FUNCTION "public"."get_access_fingerprint_v2"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agenda_items_v2"("p_campaign_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_campaign_id bigint;
  v_campaign_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if private.current_operator_code() is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  select c.campaign_id, c.code into v_campaign_id, v_campaign_code
  from public.campaigns c
  where c.active = true
    and (
      (nullif(btrim(coalesce(p_campaign_code,'')),'') is null and c.is_default = true)
      or c.code = nullif(btrim(coalesce(p_campaign_code,'')),'')
    )
  order by c.is_default desc, c.starts_on desc
  limit 1;

  if v_campaign_id is null then
    raise exception 'CAMPAIGN_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'schema_version', 2,
    'campaign_code', v_campaign_code,
    'items', coalesce((
      select jsonb_agg(to_jsonb(items) order by items.due_at, items.school, items.task_key)
      from (
        select
          'center:' || c.id as task_key,
          'Centro'::text as task_type,
          c.id as center_id,
          null::text as opportunity_id,
          c.school,
          c.city,
          c.province,
          c.community,
          s.assigned_to,
          s.status,
          'Seguimiento general'::text as title,
          s.next_contact_at as due_at,
          s.contact_name,
          s.contact_role,
          case when s.contact_blocked then null else s.contact_mobile end as contact_mobile,
          case when s.contact_blocked then null else s.contact_email end as contact_email,
          s.state_version,
          null::bigint as opportunity_version
        from public.centers c
        join public.center_state s on s.center_id = c.id
        where c.active = true
          and s.next_contact_at is not null
          and s.status not in ('Trasladado a cotización','No interesado')
          and s.contact_blocked = false
          and (private.is_admin() or s.assigned_to = private.current_operator_code())

        union all

        select
          'opportunity:' || o.opportunity_id,
          'Viaje'::text,
          c.id,
          o.opportunity_id,
          c.school,
          c.city,
          c.province,
          c.community,
          s.assigned_to,
          o.status,
          concat_ws(' · ', o.cycle, nullif(btrim(coalesce(o.destination,'')),'')) as title,
          o.next_contact_at,
          ct.full_name,
          ct.role,
          case when coalesce(ct.do_not_contact,false) then null else ct.mobile end,
          case when coalesce(ct.do_not_contact,false) then null else ct.email end,
          s.state_version,
          o.opportunity_version
        from public.travel_opportunities o
        join public.center_campaigns cc on cc.center_campaign_id = o.center_campaign_id
        join public.centers c on c.id = o.center_id
        join public.center_state s on s.center_id = c.id
        left join public.center_contacts ct on ct.contact_id = o.contact_id
        where cc.campaign_id = v_campaign_id
          and c.active = true
          and o.active = true
          and o.next_contact_at is not null
          and o.status not in ('Trasladado a cotización','No interesado')
          and coalesce(ct.do_not_contact,false) = false
          and s.contact_blocked = false
          and (private.is_admin() or s.assigned_to = private.current_operator_code())
      ) items
    ), '[]'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."get_agenda_items_v2"("p_campaign_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_center_history_v2"("p_center_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."get_center_history_v2"("p_center_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_center_workspace_v1"("p_center_id" "text", "p_campaign_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_campaign public.campaigns%rowtype;
  v_center_campaign_id bigint;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.can_access_center(p_center_id) then
    raise exception 'ACCESS_DENIED';
  end if;

  select c.* into v_campaign
  from public.campaigns c
  where c.active = true
    and (
      (nullif(btrim(coalesce(p_campaign_code,'')),'') is null and c.is_default = true)
      or c.code = nullif(btrim(coalesce(p_campaign_code,'')),'')
    )
  order by c.is_default desc, c.starts_on desc
  limit 1;

  if not found then
    raise exception 'CAMPAIGN_NOT_FOUND';
  end if;

  select cc.center_campaign_id into v_center_campaign_id
  from public.center_campaigns cc
  where cc.center_id = p_center_id
    and cc.campaign_id = v_campaign.campaign_id;

  if v_center_campaign_id is null then
    raise exception 'CENTER_CAMPAIGN_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'schema_version', 2,
    'campaign', jsonb_build_object(
      'campaign_id', v_campaign.campaign_id,
      'code', v_campaign.code,
      'label', v_campaign.label,
      'starts_on', v_campaign.starts_on,
      'ends_on', v_campaign.ends_on,
      'is_default', v_campaign.is_default
    ),
    'center_campaign', (
      select to_jsonb(cc)
      from public.center_campaigns cc
      where cc.center_campaign_id = v_center_campaign_id
    ),
    'contacts', coalesce((
      select jsonb_agg(to_jsonb(ct) order by ct.is_primary desc, ct.active desc, ct.full_name, ct.contact_id)
      from public.center_contacts ct
      where ct.center_id = p_center_id
    ), '[]'::jsonb),
    'opportunities', coalesce((
      select jsonb_agg(
        to_jsonb(o) || jsonb_build_object(
          'contact_name', ct.full_name,
          'contact_role', ct.role
        )
        order by o.active desc, o.created_at desc, o.opportunity_id
      )
      from public.travel_opportunities o
      left join public.center_contacts ct on ct.contact_id = o.contact_id
      where o.center_campaign_id = v_center_campaign_id
    ), '[]'::jsonb),
    'opportunity_audit', coalesce((
      select jsonb_agg(
        to_jsonb(a) || jsonb_build_object('acted_by_name', op.display_name)
        order by a.acted_at desc, a.audit_id desc
      )
      from (
        select oa.*
        from public.opportunity_audit oa
        where oa.center_id = p_center_id
        order by oa.acted_at desc, oa.audit_id desc
        limit 200
      ) a
      left join public.operators op on op.code = a.acted_by_operator
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."get_center_workspace_v1"("p_center_id" "text", "p_campaign_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_campaign_v1"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if private.current_operator_code() is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  select to_jsonb(c) into v_result
  from public.campaigns c
  where c.is_default = true and c.active = true
  limit 1;

  if v_result is null then
    raise exception 'DEFAULT_CAMPAIGN_NOT_FOUND';
  end if;
  return v_result;
end;
$$;


ALTER FUNCTION "public"."get_current_campaign_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_operator"() RETURNS TABLE("code" "text", "display_name" "text", "role" "text", "email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select o.code,o.display_name,o.role,o.email from public.operators o
  where o.auth_user_id=(select auth.uid()) and o.active=true and o.role in ('admin','seller') limit 1;
$$;


ALTER FUNCTION "public"."get_my_operator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_permissions"() RETURNS TABLE("access_role" "text", "can_view_global" boolean, "can_assign_centers" boolean, "can_view_team" boolean, "can_manage_roles" boolean, "can_export_global" boolean, "can_export_backup" boolean, "can_delete_permanently" boolean, "can_manage_security" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    o.access_role,
    private.has_permission('centers.view_global'),
    private.has_permission('centers.assign'),
    private.has_permission('team.view'),
    private.has_permission('users.manage_roles'),
    private.has_permission('exports.global'),
    private.has_permission('backups.export_full'),
    private.has_permission('centers.delete_permanently'),
    private.has_permission('system.manage_security')
  from public.operators o
  where o.auth_user_id = (select auth.uid())
    and o.active = true
    and o.access_role in ('owner','manager','seller')
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_permissions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_permissions"() IS 'Devuelve el rol funcional y las capacidades vigentes del operador autenticado; no usa metadatos editables del usuario.';



CREATE OR REPLACE FUNCTION "public"."get_my_permissions_v2"() RETURNS TABLE("access_role" "text", "can_view_global" boolean, "can_assign_centers" boolean, "can_archive_centers" boolean, "can_restore_centers" boolean, "can_view_team" boolean, "can_manage_roles" boolean, "can_export_global" boolean, "can_export_backup" boolean, "can_delete_permanently" boolean, "can_manage_security" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    o.access_role,
    private.has_permission('centers.view_global'),
    private.has_permission('centers.assign'),
    private.has_permission('centers.archive'),
    private.has_permission('centers.restore'),
    private.has_permission('team.view'),
    private.has_permission('users.manage_roles'),
    private.has_permission('exports.global'),
    private.has_permission('backups.export_full'),
    private.has_permission('centers.delete_permanently'),
    private.has_permission('system.manage_security')
  from public.operators o
  where o.auth_user_id = (select auth.uid())
    and o.active = true
    and o.access_role in ('owner','manager','seller')
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_permissions_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_permissions_v2"() IS 'Permisos V13, incluyendo archivo, restauración y borrado permanente de centros.';



CREATE OR REPLACE FUNCTION "public"."get_statistics_dashboard_v1"("p_period_days" integer DEFAULT 30, "p_operator_code" "text" DEFAULT NULL::"text", "p_community" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_caller_code text;
  v_caller_name text;
  v_access_role text;
  v_operator_filter text := nullif(btrim(coalesce(p_operator_code, '')), '');
  v_community_filter text := nullif(btrim(coalesce(p_community, '')), '');
  v_period_start timestamptz;
  v_metric_operator text;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select o.code, o.display_name, o.access_role
  into v_caller_code, v_caller_name, v_access_role
  from public.operators o
  where o.auth_user_id = v_uid
    and o.active = true
    and o.access_role in ('owner', 'manager', 'seller')
  limit 1;

  if v_caller_code is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  if p_period_days is null or p_period_days not in (0, 7, 30, 90, 365) then
    raise exception 'INVALID_STATS_PERIOD';
  end if;

  v_period_start := case
    when p_period_days = 0 then null
    else now() - make_interval(days => p_period_days)
  end;

  if v_access_role = 'seller' then
    if v_operator_filter is not null and v_operator_filter <> v_caller_code then
      raise exception 'STATS_SCOPE_DENIED';
    end if;
    v_operator_filter := v_caller_code;
    v_metric_operator := v_caller_code;
  else
    if v_operator_filter is not null and not exists (
      select 1
      from public.operators o
      where o.code = v_operator_filter
        and o.active = true
        and o.access_role in ('owner', 'manager', 'seller', 'system')
    ) then
      raise exception 'INVALID_OPERATOR';
    end if;
    v_metric_operator := v_operator_filter;
  end if;

  with
  scoped_centers as materialized (
    select
      c.id,
      c.school,
      c.city,
      c.province,
      c.community,
      c.lead_source,
      c.created_at,
      c.created_by_operator,
      s.assigned_to,
      s.status,
      s.next_contact_at,
      s.last_contact_at,
      s.contact_count
    from public.centers c
    join public.center_state s on s.center_id = c.id
    where c.active = true
      and (
        (v_access_role = 'seller' and s.assigned_to = v_caller_code)
        or
        (v_access_role in ('owner', 'manager')
          and (v_operator_filter is null or s.assigned_to = v_operator_filter))
      )
      and (v_community_filter is null or c.community = v_community_filter)
  ),
  event_sequence as materialized (
    select
      e.id,
      e.center_id,
      e.operator_code,
      e.operator_name,
      e.contacted_at,
      e.channel,
      e.result,
      e.next_contact_at,
      lead(e.contacted_at) over (
        partition by e.center_id
        order by e.contacted_at, e.created_at, e.id
      ) as next_actual_contact_at
    from public.contact_events e
    join scoped_centers c on c.id = e.center_id
  ),
  period_events as materialized (
    select e.*
    from event_sequence e
    where (v_metric_operator is null or e.operator_code = v_metric_operator)
      and (v_period_start is null or e.contacted_at >= v_period_start)
  ),
  due_followups as materialized (
    select e.*
    from event_sequence e
    where (v_metric_operator is null or e.operator_code = v_metric_operator)
      and e.next_contact_at is not null
      and e.next_contact_at <= now()
      and (v_period_start is null or e.next_contact_at >= v_period_start)
  ),
  portfolio_metrics as (
    select
      count(*)::bigint as portfolio_total,
      count(*) filter (
        where contact_count > 0 or status <> 'Pendiente'
      )::bigint as worked_centers,
      count(*) filter (where status = 'Interesado')::bigint as interested_centers,
      count(*) filter (where status = 'Trasladado a cotización')::bigint as quoted_centers,
      count(*) filter (
        where status not in ('Trasladado a cotización', 'No interesado')
          and next_contact_at < now()
      )::bigint as overdue_followups,
      count(*) filter (
        where status not in ('Trasladado a cotización', 'No interesado')
          and (next_contact_at at time zone 'Europe/Madrid')::date =
              (now() at time zone 'Europe/Madrid')::date
      )::bigint as due_today,
      count(*) filter (
        where status in ('Interesado', 'Trasladado a cotización')
          and (next_contact_at is null or next_contact_at <= now())
      )::bigint as unattended_opportunities
    from scoped_centers
  ),
  activity_metrics as (
    select count(*)::bigint as contacts_period
    from period_events
  ),
  followup_metrics as (
    select
      count(*)::bigint as due_followups_period,
      count(*) filter (
        where next_actual_contact_at is not null
          and next_actual_contact_at <= next_contact_at
      )::bigint as on_time_followups
    from due_followups
  ),
  creation_metrics as (
    select count(*)::bigint as new_centers_period
    from scoped_centers c
    where c.created_by_operator is not null
      and (v_metric_operator is null or c.created_by_operator = v_metric_operator)
      and (v_period_start is null or c.created_at >= v_period_start)
  ),
  operator_rows as (
    select
      o.code as operator_code,
      o.display_name as operator_name,
      count(c.id)::bigint as portfolio_total,
      count(c.id) filter (
        where c.contact_count > 0 or c.status <> 'Pendiente'
      )::bigint as worked_centers,
      count(c.id) filter (where c.status = 'Interesado')::bigint as interested_centers,
      count(c.id) filter (where c.status = 'Trasladado a cotización')::bigint as quoted_centers,
      count(c.id) filter (
        where c.status not in ('Trasladado a cotización', 'No interesado')
          and c.next_contact_at < now()
      )::bigint as overdue_followups,
      (
        select count(*)::bigint
        from period_events pe
        where pe.operator_code = o.code
      ) as contacts_period
    from public.operators o
    left join scoped_centers c on c.assigned_to = o.code
    where v_access_role in ('owner', 'manager')
      and o.active = true
      and o.access_role in ('owner', 'manager', 'seller')
      and (v_operator_filter is null or o.code = v_operator_filter)
    group by o.code, o.display_name
  ),
  zone_rows as (
    select
      coalesce(nullif(btrim(community), ''), 'Sin indicar') as community,
      count(*)::bigint as portfolio_total,
      count(*) filter (
        where contact_count > 0 or status <> 'Pendiente'
      )::bigint as worked_centers,
      count(*) filter (where status = 'Interesado')::bigint as interested_centers,
      count(*) filter (where status = 'Trasladado a cotización')::bigint as quoted_centers,
      count(*) filter (
        where status not in ('Trasladado a cotización', 'No interesado')
          and next_contact_at < now()
      )::bigint as overdue_followups
    from scoped_centers
    group by coalesce(nullif(btrim(community), ''), 'Sin indicar')
  ),
  lead_source_rows as (
    select
      coalesce(nullif(btrim(lead_source), ''), 'Sin indicar') as label,
      count(*)::bigint as total
    from scoped_centers
    group by coalesce(nullif(btrim(lead_source), ''), 'Sin indicar')
  ),
  channel_rows as (
    select channel as label, count(*)::bigint as total
    from period_events
    group by channel
  ),
  recent_rows as (
    select
      e.center_id,
      c.school,
      e.operator_code,
      e.operator_name,
      e.contacted_at,
      e.channel,
      e.result
    from period_events e
    join scoped_centers c on c.id = e.center_id
    order by e.contacted_at desc, e.id desc
    limit 12
  ),
  opportunity_rows as (
    select
      c.id as center_id,
      c.school,
      c.community,
      c.assigned_to,
      coalesce(o.display_name, c.assigned_to) as operator_name,
      c.status,
      c.last_contact_at,
      c.next_contact_at,
      greatest(
        0,
        floor(extract(epoch from (now() - coalesce(c.last_contact_at, c.created_at))) / 86400)
      )::integer as days_without_contact
    from scoped_centers c
    left join public.operators o on o.code = c.assigned_to
    where c.status in ('Interesado', 'Trasladado a cotización')
      and (c.next_contact_at is null or c.next_contact_at <= now())
    order by
      case c.status when 'Trasladado a cotización' then 1 else 2 end,
      coalesce(c.next_contact_at, c.last_contact_at, c.created_at),
      c.id
    limit 50
  )
  select jsonb_build_object(
    'schema_version', 1,
    'generated_at', now(),
    'scope', jsonb_build_object(
      'access_role', v_access_role,
      'caller_operator_code', v_caller_code,
      'caller_operator_name', v_caller_name,
      'operator_code', v_operator_filter,
      'community', v_community_filter,
      'period_days', p_period_days,
      'period_start', v_period_start
    ),
    'kpis', jsonb_build_object(
      'portfolio_total', pm.portfolio_total,
      'worked_centers', pm.worked_centers,
      'worked_pct', case when pm.portfolio_total = 0 then 0
        else round(pm.worked_centers::numeric * 100 / pm.portfolio_total, 1) end,
      'interested_centers', pm.interested_centers,
      'quoted_centers', pm.quoted_centers,
      'quote_conversion_pct', case when pm.worked_centers = 0 then 0
        else round(pm.quoted_centers::numeric * 100 / pm.worked_centers, 1) end,
      'contacts_period', am.contacts_period,
      'overdue_followups', pm.overdue_followups,
      'due_today', pm.due_today,
      'on_time_followups_pct', case when fm.due_followups_period = 0 then null
        else round(fm.on_time_followups::numeric * 100 / fm.due_followups_period, 1) end,
      'on_time_followups', fm.on_time_followups,
      'due_followups_period', fm.due_followups_period,
      'new_centers_period', cm.new_centers_period,
      'unattended_opportunities', pm.unattended_opportunities
    ),
    'lead_sources', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.total desc, x.label)
      from lead_source_rows x
    ), '[]'::jsonb),
    'channels', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.total desc, x.label)
      from channel_rows x
    ), '[]'::jsonb),
    'operators', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.portfolio_total desc, x.operator_name)
      from operator_rows x
    ), '[]'::jsonb),
    'zones', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.portfolio_total desc, x.community)
      from zone_rows x
    ), '[]'::jsonb),
    'recent_activity', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.contacted_at desc)
      from recent_rows x
    ), '[]'::jsonb),
    'opportunities', coalesce((
      select jsonb_agg(to_jsonb(x) order by
        case x.status when 'Trasladado a cotización' then 1 else 2 end,
        x.days_without_contact desc,
        x.center_id)
      from opportunity_rows x
    ), '[]'::jsonb),
    'definitions', jsonb_build_object(
      'portfolio', 'Centros activos del alcance actual.',
      'worked', 'Centro con al menos un contacto o con estado distinto de Pendiente.',
      'quote_conversion', 'Centros a cotización dividido entre centros trabajados.',
      'on_time', 'Compromisos vencidos del periodo cuyo siguiente contacto se registró antes o en la fecha y hora programadas.',
      'new_centers', 'Altas manuales creadas durante el periodo.',
      'unattended', 'Centros Interesados o A cotización sin un próximo contacto futuro.'
    )
  )
  into v_result
  from portfolio_metrics pm
  cross join activity_metrics am
  cross join followup_metrics fm
  cross join creation_metrics cm;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."get_statistics_dashboard_v1"("p_period_days" integer, "p_operator_code" "text", "p_community" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_statistics_dashboard_v1"("p_period_days" integer, "p_operator_code" "text", "p_community" "text") IS 'Estadísticas operativas V14 con alcance forzado por rol, sin PII y con filtros de periodo, operador y comunidad.';



CREATE OR REPLACE FUNCTION "public"."get_statistics_dashboard_v2"("p_period_days" integer DEFAULT 30, "p_operator_code" "text" DEFAULT NULL::"text", "p_community" "text" DEFAULT NULL::"text", "p_campaign_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
  select coalesce(jsonb_agg(jsonb_build_object('status',status,'count',total) order by status),'[]'::jsonb)
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
  select coalesce(jsonb_agg(jsonb_build_object('cycle',cycle,'count',total) order by cycle),'[]'::jsonb)
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


ALTER FUNCTION "public"."get_statistics_dashboard_v2"("p_period_days" integer, "p_operator_code" "text", "p_community" "text", "p_campaign_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_presence"() RETURNS TABLE("operator_code" "text", "display_name" "text", "role" "text", "is_online" boolean, "last_seen_at" timestamp with time zone, "last_interaction_at" timestamp with time zone, "inactive_seconds" bigint, "last_real_activity_at" timestamp with time zone, "last_contact_at" timestamp with time zone, "contacts_today" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select
    o.code,
    o.display_name,
    o.role,
    (
      p.last_heartbeat_at is not null
      and p.last_heartbeat_at >= now() - interval '2 minutes'
      and (p.last_logout_at is null or p.last_logout_at < p.last_heartbeat_at)
    ) as is_online,
    p.last_heartbeat_at as last_seen_at,
    p.last_interaction_at,
    case
      when p.last_interaction_at is null then null
      else greatest(0, floor(extract(epoch from (now() - p.last_interaction_at))))::bigint
    end as inactive_seconds,
    greatest(
      ce.last_contact_at,
      cs.last_state_activity_at,
      ex.last_export_at
    ) as last_real_activity_at,
    ce.last_contact_at,
    coalesce(ce.contacts_today,0)::bigint as contacts_today
  from public.operators o
  left join public.operator_presence p on p.operator_code=o.code
  left join lateral (
    select
      max(e.created_at) as last_contact_at,
      count(*) filter (
        where (e.created_at at time zone 'Europe/Madrid')::date = (now() at time zone 'Europe/Madrid')::date
      ) as contacts_today
    from public.contact_events e
    where e.operator_code=o.code
  ) ce on true
  left join lateral (
    select max(s.updated_at) as last_state_activity_at
    from public.center_state s
    where s.updated_by=o.auth_user_id
  ) cs on true
  left join lateral (
    select max(a.exported_at) as last_export_at
    from public.export_audit a
    where a.operator_code=o.code
  ) ex on true
  where o.active=true and o.role in ('admin','seller') and o.auth_user_id is not null
  order by o.role='admin' desc, o.display_name;
end;
$$;


ALTER FUNCTION "public"."get_team_presence"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_presence_v2"() RETURNS TABLE("operator_code" "text", "display_name" "text", "role" "text", "is_online" boolean, "last_seen_at" timestamp with time zone, "last_interaction_at" timestamp with time zone, "inactive_seconds" bigint, "last_real_activity_at" timestamp with time zone, "last_contact_at" timestamp with time zone, "contacts_today" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.has_permission('team.view') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select
    o.code,
    o.display_name,
    o.access_role,
    (
      p.last_heartbeat_at is not null
      and p.last_heartbeat_at >= now() - interval '2 minutes'
      and (p.last_logout_at is null or p.last_logout_at < p.last_heartbeat_at)
    ),
    p.last_heartbeat_at,
    p.last_interaction_at,
    case
      when p.last_interaction_at is null then null
      else greatest(0, floor(extract(epoch from (now() - p.last_interaction_at))))::bigint
    end,
    greatest(ce.last_contact_at, cs.last_state_activity_at, ex.last_export_at),
    ce.last_contact_at,
    coalesce(ce.contacts_today,0)::bigint
  from public.operators o
  left join public.operator_presence p on p.operator_code = o.code
  left join lateral (
    select
      max(e.created_at) as last_contact_at,
      count(*) filter (
        where (e.created_at at time zone 'Europe/Madrid')::date =
              (now() at time zone 'Europe/Madrid')::date
      ) as contacts_today
    from public.contact_events e
    where e.operator_code = o.code
  ) ce on true
  left join lateral (
    select max(s.updated_at) as last_state_activity_at
    from public.center_state s
    where s.updated_by = o.auth_user_id
  ) cs on true
  left join lateral (
    select max(a.exported_at) as last_export_at
    from public.export_audit a
    where a.operator_code = o.code
  ) ex on true
  where o.active = true
    and o.access_role in ('owner','manager','seller')
    and o.auth_user_id is not null
  order by
    case o.access_role when 'owner' then 1 when 'manager' then 2 else 3 end,
    o.display_name;
end;
$$;


ALTER FUNCTION "public"."get_team_presence_v2"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visible_operators"() RETURNS TABLE("code" "text", "display_name" "text", "role" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select o.code,o.display_name,o.role from public.operators o
  where o.active=true and o.role in ('admin','seller')
    and (private.is_admin() or o.code=private.current_operator_code())
  order by o.display_name;
$$;


ALTER FUNCTION "public"."get_visible_operators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visible_travel_summaries_v1"("p_campaign_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_campaign_id bigint;
  v_campaign_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if private.current_operator_code() is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  select c.campaign_id, c.code into v_campaign_id, v_campaign_code
  from public.campaigns c
  where c.active = true
    and (
      (nullif(btrim(coalesce(p_campaign_code,'')),'') is null and c.is_default = true)
      or c.code = nullif(btrim(coalesce(p_campaign_code,'')),'')
    )
  order by c.is_default desc, c.starts_on desc
  limit 1;

  if v_campaign_id is null then
    raise exception 'CAMPAIGN_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'schema_version', 1,
    'campaign_code', v_campaign_code,
    'centers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'center_id', c.id,
        'opportunity_total', coalesce(x.opportunity_total,0),
        'opportunity_pending', coalesce(x.opportunity_pending,0),
        'opportunity_interested', coalesce(x.opportunity_interested,0),
        'opportunity_quoted', coalesce(x.opportunity_quoted,0),
        'opportunity_not_interested', coalesce(x.opportunity_not_interested,0),
        'opportunity_next_contact_at', x.opportunity_next_contact_at,
        'opportunity_overdue', coalesce(x.opportunity_overdue,0)
      ) order by c.id)
      from public.centers c
      join public.center_state s on s.center_id = c.id
      join public.center_campaigns cc
        on cc.center_id = c.id and cc.campaign_id = v_campaign_id
      left join lateral (
        select
          count(*) filter (where o.active)::bigint as opportunity_total,
          count(*) filter (where o.active and o.status = 'Pendiente')::bigint as opportunity_pending,
          count(*) filter (where o.active and o.status = 'Interesado')::bigint as opportunity_interested,
          count(*) filter (where o.active and o.status = 'Trasladado a cotización')::bigint as opportunity_quoted,
          count(*) filter (where o.active and o.status = 'No interesado')::bigint as opportunity_not_interested,
          min(o.next_contact_at) filter (
            where o.active and o.next_contact_at is not null
              and o.status not in ('Trasladado a cotización','No interesado')
          ) as opportunity_next_contact_at,
          count(*) filter (
            where o.active and o.next_contact_at < now()
              and o.status not in ('Trasladado a cotización','No interesado')
          )::bigint as opportunity_overdue
        from public.travel_opportunities o
        where o.center_campaign_id = cc.center_campaign_id
      ) x on true
      where c.active = true
        and (private.is_admin() or s.assigned_to = private.current_operator_code())
    ), '[]'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."get_visible_travel_summaries_v1"("p_campaign_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_archived_centers"() RETURNS TABLE("center_id" "text", "school" "text", "city" "text", "province" "text", "community" "text", "assigned_to" "text", "assigned_to_name" "text", "status" "text", "next_contact_at" timestamp with time zone, "contact_count" integer, "archived_at" timestamp with time zone, "archived_by_operator" "text", "archived_by_name" "text", "archive_reason" "text", "contact_events_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.has_permission('centers.archive') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select
    c.id,
    c.school,
    c.city,
    c.province,
    c.community,
    s.assigned_to,
    coalesce(assignee.display_name, s.assigned_to),
    s.status,
    s.next_contact_at,
    s.contact_count,
    c.archived_at,
    c.archived_by_operator,
    coalesce(actor.display_name, c.archived_by_operator),
    c.archive_reason,
    (
      select count(*)::bigint
      from public.contact_events e
      where e.center_id = c.id
    )
  from public.centers c
  join public.center_state s on s.center_id = c.id
  left join public.operators assignee on assignee.code = s.assigned_to
  left join public.operators actor on actor.code = c.archived_by_operator
  where c.active = false
  order by c.archived_at desc, c.id;
end;
$$;


ALTER FUNCTION "public"."list_archived_centers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_center_lifecycle_audit"("p_limit" integer DEFAULT 100) RETURNS TABLE("audit_id" bigint, "center_id" "text", "action" "text", "center_school" "text", "city" "text", "province" "text", "community" "text", "assigned_to" "text", "status" "text", "contact_events_count" bigint, "reason" "text", "acted_by_operator" "text", "acted_by_name" "text", "acted_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.has_permission('centers.archive') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select
    a.audit_id,
    a.center_id,
    a.action,
    a.center_school,
    a.city,
    a.province,
    a.community,
    a.assigned_to,
    a.status,
    a.contact_events_count,
    a.reason,
    a.acted_by_operator,
    coalesce(o.display_name, a.acted_by_operator),
    a.acted_at
  from public.center_lifecycle_audit a
  left join public.operators o on o.code = a.acted_by_operator
  order by a.acted_at desc, a.audit_id desc
  limit greatest(1, least(coalesce(p_limit,100),500));
end;
$$;


ALTER FUNCTION "public"."list_center_lifecycle_audit"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_export"("p_format" "text", "p_view" "text", "p_row_count" integer, "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_id bigint;
  v_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  v_code := private.current_operator_code();
  if v_code is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;
  if p_format not in ('excel','csv','json') then
    raise exception 'INVALID_EXPORT_FORMAT';
  end if;
  if p_row_count is null or p_row_count < 0 then
    raise exception 'INVALID_ROW_COUNT';
  end if;
  if p_format = 'json' and not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  insert into public.export_audit(
    auth_user_id, operator_code, export_format,
    view_name, row_count, details
  ) values (
    (select auth.uid()), v_code, p_format,
    coalesce(nullif(btrim(p_view),''),'unknown'),
    p_row_count, coalesce(p_details,'{}'::jsonb)
  )
  returning audit_id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."log_export"("p_format" "text", "p_view" "text", "p_row_count" integer, "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_operator_offline"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_operator text;
  v_now timestamptz := now();
begin
  if (select auth.uid()) is null then
    return;
  end if;

  v_operator := private.current_operator_code();
  if v_operator is null then
    return;
  end if;

  insert into public.operator_presence(
    operator_code,last_heartbeat_at,last_interaction_at,last_login_at,last_logout_at,updated_at
  )
  values (v_operator,null,null,null,v_now,v_now)
  on conflict (operator_code) do update
  set last_logout_at=v_now,
      updated_at=v_now;
end;
$$;


ALTER FUNCTION "public"."mark_operator_offline"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owner_export_full_backup_v2"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  return jsonb_build_object(
    'schema_version', 13,
    'online', true,
    'exported_at', now(),
    'centers', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.id)
      from public.centers c
    ), '[]'::jsonb),
    'center_state', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.center_id)
      from public.center_state s
    ), '[]'::jsonb),
    'contact_events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at, e.id)
      from public.contact_events e
    ), '[]'::jsonb),
    'center_creation_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id)
      from public.center_creation_audit a
    ), '[]'::jsonb),
    'center_state_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id)
      from public.center_state_audit a
    ), '[]'::jsonb),
    'center_lifecycle_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id)
      from public.center_lifecycle_audit a
    ), '[]'::jsonb),
    'operator_role_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id)
      from public.operator_role_audit a
    ), '[]'::jsonb),
    'operators', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', o.code,
          'display_name', o.display_name,
          'email', o.email,
          'role', o.role,
          'access_role', o.access_role,
          'active', o.active,
          'linked', o.auth_user_id is not null,
          'created_at', o.created_at,
          'updated_at', o.updated_at
        ) order by o.code
      )
      from public.operators o
    ), '[]'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."owner_export_full_backup_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."owner_export_full_backup_v2"() IS 'Copia lógica completa del CRM para el propietario. Incluye centros activos y archivados, estado, contactos y auditorías; excluye colas de envío y presencia transitoria.';



CREATE OR REPLACE FUNCTION "public"."owner_export_full_backup_v3"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_base jsonb;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.is_owner() then raise exception 'OWNER_REQUIRED'; end if;

  v_base := public.owner_export_full_backup_v2();
  return v_base || jsonb_build_object(
    'schema_version', 15,
    'campaigns', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.campaign_id) from public.campaigns c
    ), '[]'::jsonb),
    'center_campaigns', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.center_campaign_id) from public.center_campaigns c
    ), '[]'::jsonb),
    'center_contacts', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.contact_id) from public.center_contacts c
    ), '[]'::jsonb),
    'travel_opportunities', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.opportunity_id) from public.travel_opportunities o
    ), '[]'::jsonb),
    'contact_event_opportunities', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.event_id,l.opportunity_id)
      from public.contact_event_opportunities l
    ), '[]'::jsonb),
    'opportunity_audit', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.audit_id) from public.opportunity_audit a
    ), '[]'::jsonb)
  );
end;
$$;


ALTER FUNCTION "public"."owner_export_full_backup_v3"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owner_list_operators"() RETURNS TABLE("code" "text", "display_name" "text", "email" "text", "access_role" "text", "active" boolean, "linked" boolean, "assigned_centers" bigint, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_role_change_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  return query
  select
    o.code,
    o.display_name,
    o.email,
    o.access_role,
    o.active,
    o.auth_user_id is not null,
    count(distinct c.id)::bigint,
    o.created_at,
    o.updated_at,
    max(a.changed_at)
  from public.operators o
  left join public.center_state s on s.assigned_to = o.code
  left join public.centers c on c.id = s.center_id and c.active = true
  left join public.operator_role_audit a on a.operator_code = o.code
  where o.access_role <> 'system'
  group by o.code, o.display_name, o.email, o.access_role, o.active,
           o.auth_user_id, o.created_at, o.updated_at
  order by
    case o.access_role when 'owner' then 1 when 'manager' then 2 else 3 end,
    o.display_name;
end;
$$;


ALTER FUNCTION "public"."owner_list_operators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owner_list_role_audit"("p_limit" integer DEFAULT 25) RETURNS TABLE("audit_id" bigint, "operator_code" "text", "operator_name" "text", "old_role" "text", "new_role" "text", "reason" "text", "changed_by_operator" "text", "changed_by_name" "text", "changed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  return query
  select
    a.audit_id,
    a.operator_code,
    coalesce(target.display_name, a.operator_code),
    a.old_role,
    a.new_role,
    a.reason,
    a.changed_by_operator,
    coalesce(actor.display_name, a.changed_by_operator),
    a.changed_at
  from public.operator_role_audit a
  left join public.operators target on target.code = a.operator_code
  left join public.operators actor on actor.code = a.changed_by_operator
  order by a.changed_at desc, a.audit_id desc
  limit greatest(1, least(coalesce(p_limit,25),100));
end;
$$;


ALTER FUNCTION "public"."owner_list_role_audit"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owner_permanently_delete_center"("p_center_id" "text", "p_reason" "text", "p_confirm_center_id" "text") RETURNS TABLE("deleted_center_id" "text", "deleted_at" timestamp with time zone, "deleted_contact_events" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_actor text;
  v_reason text := btrim(coalesce(p_reason,''));
  v_center public.centers%rowtype;
  v_state public.center_state%rowtype;
  v_contacts bigint;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;
  if nullif(btrim(coalesce(p_center_id,'')),'') is null then
    raise exception 'CENTER_REQUIRED';
  end if;
  if btrim(coalesce(p_confirm_center_id,'')) <> btrim(p_center_id) then
    raise exception 'CENTER_CONFIRMATION_MISMATCH';
  end if;
  if char_length(v_reason) < 8 or char_length(v_reason) > 500 then
    raise exception 'CENTER_LIFECYCLE_REASON_REQUIRED';
  end if;

  v_actor := private.current_operator_code();
  if v_actor is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  select c.*
  into v_center
  from public.centers c
  where c.id = btrim(p_center_id)
  for update;

  if not found then
    raise exception 'CENTER_NOT_FOUND';
  end if;
  if v_center.active or v_center.archived_at is null then
    raise exception 'CENTER_MUST_BE_ARCHIVED';
  end if;

  select s.*
  into v_state
  from public.center_state s
  where s.center_id = v_center.id
  for update;

  if not found then
    raise exception 'CENTER_STATE_NOT_FOUND';
  end if;

  select count(*)::bigint
  into v_contacts
  from public.contact_events e
  where e.center_id = v_center.id;

  insert into public.center_lifecycle_audit(
    center_id, action, center_school, city, province, community,
    assigned_to, status, contact_events_count, reason,
    acted_by, acted_by_operator, acted_at
  ) values (
    v_center.id, 'permanent_delete', v_center.school, v_center.city,
    v_center.province, v_center.community, v_state.assigned_to,
    v_state.status, v_contacts, v_reason, v_uid, v_actor, v_now
  );

  -- Todo se ejecuta en la misma transacción: si una dependencia falla, no se
  -- elimina nada. Se borra también la auditoría histórica que contenía PII.
  delete from public.agenda_email_outbox q
  where q.center_id = v_center.id;

  delete from public.contact_events e
  where e.center_id = v_center.id;

  delete from public.center_creation_audit a
  where a.center_id = v_center.id;

  delete from public.center_state s
  where s.center_id = v_center.id;

  delete from public.center_state_audit a
  where a.center_id = v_center.id;

  delete from public.centers c
  where c.id = v_center.id;

  return query select v_center.id, v_now, v_contacts;
end;
$$;


ALTER FUNCTION "public"."owner_permanently_delete_center"("p_center_id" "text", "p_reason" "text", "p_confirm_center_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."owner_permanently_delete_center"("p_center_id" "text", "p_reason" "text", "p_confirm_center_id" "text") IS 'Sólo propietario. Requiere centro archivado, motivo y confirmación exacta del ID. Borra ficha, estado, contactos, agenda técnica y auditorías con PII; conserva una auditoría institucional mínima.';



CREATE OR REPLACE FUNCTION "public"."owner_set_operator_access_role"("p_code" "text", "p_new_role" "text", "p_reason" "text", "p_confirm_code" "text") RETURNS TABLE("code" "text", "access_role" "text", "technical_role" "text", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor text;
  v_operator public.operators%rowtype;
  v_reason text := btrim(coalesce(p_reason,''));
  v_new_role text := lower(btrim(coalesce(p_new_role,'')));
  v_result public.operators%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  v_actor := private.current_operator_code();
  if v_actor is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  if nullif(btrim(coalesce(p_code,'')),'') is null then
    raise exception 'OPERATOR_REQUIRED';
  end if;
  if btrim(coalesce(p_confirm_code,'')) <> btrim(p_code) then
    raise exception 'OPERATOR_CONFIRMATION_MISMATCH';
  end if;
  if char_length(v_reason) < 8 or char_length(v_reason) > 500 then
    raise exception 'ROLE_CHANGE_REASON_REQUIRED';
  end if;
  if v_new_role not in ('manager','seller') then
    raise exception 'INVALID_ACCESS_ROLE';
  end if;

  select *
  into v_operator
  from public.operators o
  where o.code = btrim(p_code)
  for update;

  if not found then
    raise exception 'OPERATOR_NOT_FOUND';
  end if;
  if not v_operator.active then
    raise exception 'OPERATOR_INACTIVE';
  end if;
  if v_operator.access_role = 'system' then
    raise exception 'SYSTEM_OPERATOR_CANNOT_CHANGE_ROLE';
  end if;
  if v_operator.access_role = 'owner' then
    raise exception 'OWNER_ROLE_PROTECTED';
  end if;
  if v_new_role = 'manager' and v_operator.auth_user_id is null then
    raise exception 'OPERATOR_ACCOUNT_NOT_LINKED';
  end if;
  if v_operator.access_role = v_new_role then
    raise exception 'ROLE_UNCHANGED';
  end if;

  update public.operators o
  set access_role = v_new_role
  where o.code = v_operator.code
  returning o.* into v_result;

  insert into public.operator_role_audit(
    operator_code, old_role, new_role, reason,
    changed_by, changed_by_operator
  ) values (
    v_result.code, v_operator.access_role, v_result.access_role, v_reason,
    (select auth.uid()), v_actor
  );

  return query
  select v_result.code, v_result.access_role, v_result.role, v_result.updated_at;
end;
$$;


ALTER FUNCTION "public"."owner_set_operator_access_role"("p_code" "text", "p_new_role" "text", "p_reason" "text", "p_confirm_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."owner_set_operator_access_role"("p_code" "text", "p_new_role" "text", "p_reason" "text", "p_confirm_code" "text") IS 'Sólo propietario. Cambia entre manager y seller con motivo y confirmación exacta del código. El rol owner queda protegido.';



CREATE TABLE IF NOT EXISTS "public"."contact_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "center_id" "text" NOT NULL,
    "operator_code" "text" NOT NULL,
    "operator_name" "text" NOT NULL,
    "contacted_at" timestamp with time zone NOT NULL,
    "channel" "text" NOT NULL,
    "result" "text" NOT NULL,
    "notes" "text" NOT NULL,
    "next_contact_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "legacy_key" "text",
    "contact_id" bigint,
    CONSTRAINT "contact_events_channel_check" CHECK (("channel" = ANY (ARRAY['Llamada'::"text", 'Email'::"text", 'WhatsApp'::"text", 'Reunión'::"text", 'Otro'::"text"]))),
    CONSTRAINT "contact_events_result_check" CHECK (("result" = ANY (ARRAY['No localizado'::"text", 'Información enviada'::"text", 'Pide presupuesto'::"text", 'No interesado'::"text", 'Volver a contactar'::"text"])))
);


ALTER TABLE "public"."contact_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_contact"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_updated_at" timestamp with time zone) RETURNS "public"."contact_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_state public.center_state%rowtype;
  v_event public.contact_events%rowtype;
  v_code text;
  v_name text;
  v_status text;
  v_next timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;
  v_code:=private.current_operator_code(); v_name:=private.current_operator_name();
  if v_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;
  if p_contacted_at is null then raise exception 'CONTACT_DATE_REQUIRED'; end if;
  if p_channel not in ('Llamada','Email','WhatsApp','Reunión','Otro') then raise exception 'INVALID_CHANNEL'; end if;
  if p_result not in ('No localizado','Información enviada','Pide presupuesto','No interesado','Volver a contactar') then raise exception 'INVALID_RESULT'; end if;
  if nullif(btrim(coalesce(p_notes,'')),'') is null then raise exception 'NOTES_REQUIRED'; end if;

  select * into v_state from public.center_state where center_id=p_center_id for update;
  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if p_expected_updated_at is null or v_state.updated_at <> p_expected_updated_at then raise exception 'CONCURRENT_UPDATE'; end if;
  if v_state.assigned_to<>v_code and not private.is_admin() then raise exception 'ASSIGNMENT_CHANGED'; end if;
  if v_state.contact_blocked and p_next_contact_at is not null then raise exception 'CONTACT_BLOCKED_CANNOT_SCHEDULE'; end if;

  v_status:=case p_result
    when 'Información enviada' then 'Interesado'
    when 'Pide presupuesto' then 'Trasladado a cotización'
    when 'No interesado' then 'No interesado'
    else v_state.status end;
  v_next:=case when p_result in ('Pide presupuesto','No interesado') or v_state.contact_blocked then null else p_next_contact_at end;

  insert into public.contact_events(center_id,operator_code,operator_name,contacted_at,channel,result,notes,next_contact_at,created_by)
  values(p_center_id,v_code,v_name,p_contacted_at,p_channel,p_result,btrim(p_notes),v_next,(select auth.uid()))
  returning * into v_event;

  update public.center_state set
    status=v_status,
    next_contact_at=v_next,
    last_contact_at=p_contacted_at,
    last_result=p_result,
    last_operator_code=v_code,
    contact_count=contact_count+1,
    updated_at=now(),updated_by=(select auth.uid())
  where center_id=p_center_id;

  return v_event;
end;
$$;


ALTER FUNCTION "public"."register_contact"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_updated_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_contact_multi_v1"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_state_version" bigint, "p_contact_id" bigint DEFAULT NULL::bigint, "p_opportunity_ids" "text"[] DEFAULT '{}'::"text"[], "p_expected_opportunity_versions" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."register_contact_multi_v1"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_state_version" bigint, "p_contact_id" bigint, "p_opportunity_ids" "text"[], "p_expected_opportunity_versions" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."register_contact_multi_v1"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_state_version" bigint, "p_contact_id" bigint, "p_opportunity_ids" "text"[], "p_expected_opportunity_versions" "jsonb") IS 'Registra una conversación y la vincula atómicamente a ninguno, uno o varios viajes.';



CREATE OR REPLACE FUNCTION "public"."register_contact_v2"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_version" bigint) RETURNS "public"."contact_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_event public.contact_events%rowtype;
  v_code text;
  v_name text;
  v_status text;
  v_next timestamptz;
  v_current_version bigint;
  v_assigned_to text;
  v_contact_blocked boolean;
  v_current_status text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;

  v_code:=private.current_operator_code();
  v_name:=private.current_operator_name();
  if v_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;
  if p_contacted_at is null then raise exception 'CONTACT_DATE_REQUIRED'; end if;
  if p_channel not in ('Llamada','Email','WhatsApp','Reunión','Otro') then raise exception 'INVALID_CHANNEL'; end if;
  if p_result not in ('No localizado','Información enviada','Pide presupuesto','No interesado','Volver a contactar') then raise exception 'INVALID_RESULT'; end if;
  if nullif(btrim(coalesce(p_notes,'')),'') is null then raise exception 'NOTES_REQUIRED'; end if;

  select s.state_version, s.assigned_to, s.contact_blocked, s.status
    into v_current_version, v_assigned_to, v_contact_blocked, v_current_status
    from public.center_state s
   where s.center_id=p_center_id
   for update;

  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if p_expected_version is null or v_current_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;
  if v_assigned_to<>v_code and not private.is_admin() then raise exception 'ASSIGNMENT_CHANGED'; end if;
  if v_contact_blocked then raise exception 'CONTACT_BLOCKED'; end if;

  v_status:=case p_result
    when 'Información enviada' then 'Interesado'
    when 'Pide presupuesto' then 'Trasladado a cotización'
    when 'No interesado' then 'No interesado'
    else v_current_status end;

  v_next:=case when p_result in ('Pide presupuesto','No interesado') then null else p_next_contact_at end;

  insert into public.contact_events(
    center_id,operator_code,operator_name,contacted_at,channel,result,notes,next_contact_at,created_by
  )
  values(
    p_center_id,v_code,v_name,p_contacted_at,p_channel,p_result,btrim(p_notes),v_next,(select auth.uid())
  )
  returning * into v_event;

  update public.center_state set
    status=v_status,
    next_contact_at=v_next,
    last_contact_at=p_contacted_at,
    last_result=p_result,
    last_operator_code=v_code,
    contact_count=contact_count+1,
    state_version=state_version+1,
    updated_at=now(),
    updated_by=(select auth.uid())
  where center_id=p_center_id;

  return v_event;
end;
$$;


ALTER FUNCTION "public"."register_contact_v2"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_version" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_center"("p_center_id" "text", "p_reason" "text") RETURNS TABLE("result_center_id" "text", "result_restored_at" timestamp with time zone, "result_restored_by_operator" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_actor text;
  v_reason text := btrim(coalesce(p_reason,''));
  v_center public.centers%rowtype;
  v_state public.center_state%rowtype;
  v_contacts bigint;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not private.has_permission('centers.restore') then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if nullif(btrim(coalesce(p_center_id,'')),'') is null then
    raise exception 'CENTER_REQUIRED';
  end if;
  if char_length(v_reason) < 8 or char_length(v_reason) > 500 then
    raise exception 'CENTER_LIFECYCLE_REASON_REQUIRED';
  end if;

  v_actor := private.current_operator_code();
  if v_actor is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  select c.*
  into v_center
  from public.centers c
  where c.id = btrim(p_center_id)
  for update;

  if not found then
    raise exception 'CENTER_NOT_FOUND';
  end if;
  if v_center.active then
    raise exception 'CENTER_NOT_ARCHIVED';
  end if;

  select s.*
  into v_state
  from public.center_state s
  where s.center_id = v_center.id
  for update;

  if not found then
    raise exception 'CENTER_STATE_NOT_FOUND';
  end if;

  select count(*)::bigint
  into v_contacts
  from public.contact_events e
  where e.center_id = v_center.id;

  update public.centers c
  set active = true,
      archived_at = null,
      archived_by = null,
      archived_by_operator = null,
      archive_reason = null
  where c.id = v_center.id;

  -- Si el centro tenía una cita todavía válida, reactiva únicamente el aviso
  -- cancelado que corresponde exactamente a esa cita.
  update public.agenda_email_outbox q
  set status = 'pending',
      attempts = 0,
      claimed_at = null,
      last_error = null
  where q.center_id = v_center.id
    and q.status = 'cancelled'
    and v_state.next_contact_at is not null
    and q.scheduled_for = v_state.next_contact_at
    and v_state.status not in ('Trasladado a cotización','No interesado')
    and v_state.contact_blocked = false;

  insert into public.center_lifecycle_audit(
    center_id, action, center_school, city, province, community,
    assigned_to, status, contact_events_count, reason,
    acted_by, acted_by_operator, acted_at
  ) values (
    v_center.id, 'restore', v_center.school, v_center.city,
    v_center.province, v_center.community, v_state.assigned_to,
    v_state.status, v_contacts, v_reason, v_uid, v_actor, v_now
  );

  return query select v_center.id, v_now, v_actor;
end;
$$;


ALTER FUNCTION "public"."restore_center"("p_center_id" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) RETURNS "public"."travel_opportunities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_current public.travel_opportunities%rowtype;
  v_result public.travel_opportunities%rowtype;
  v_restore_next timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_reason is null or char_length(v_reason) not between 8 and 500 then
    raise exception 'OPPORTUNITY_LIFECYCLE_REASON_REQUIRED';
  end if;

  select o.* into v_current
  from public.travel_opportunities o
  where o.opportunity_id = p_opportunity_id
  for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_current.active then raise exception 'OPPORTUNITY_NOT_ARCHIVED'; end if;
  if not private.can_access_center(v_current.center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_version is null or v_current.opportunity_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;

  v_restore_next := case
    when v_current.status in ('Trasladado a cotización','No interesado') then null
    else v_current.next_contact_at
  end;
  if v_restore_next is null
     and v_current.status not in ('Trasladado a cotización','No interesado') then
    select nullif(a.before_data->>'next_contact_at','')::timestamptz
    into v_restore_next
    from public.opportunity_audit a
    where a.opportunity_id = p_opportunity_id
      and a.before_data->>'active' = 'true'
      and a.after_data->>'active' = 'false'
      and nullif(a.before_data->>'next_contact_at','') is not null
    order by a.acted_at desc, a.audit_id desc
    limit 1;
  end if;

  update public.travel_opportunities o
  set active = true,
      next_contact_at = v_restore_next,
      archived_at = null,
      archived_by = null,
      archived_by_operator = null,
      archive_reason = null,
      opportunity_version = o.opportunity_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where o.opportunity_id = p_opportunity_id
  returning * into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."restore_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) IS 'Restaura un viaje y conserva o recupera desde auditoría su seguimiento anterior.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_vge_agenda_queue_worker"() RETURNS TABLE("queued" integer, "cancelled" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select * from private.queue_overdue_agenda();
$$;


ALTER FUNCTION "public"."run_vge_agenda_queue_worker"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_center_duplicates"("p_school" "text", "p_city" "text", "p_province" "text") RETURNS TABLE("candidate_id" "text", "school" "text", "city" "text", "province" "text", "community" "text", "match_kind" "text", "match_score" numeric, "accessible" boolean, "assigned_to" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_school text := private.norm_center_text(coalesce(p_school,''));
  v_city text := private.norm_center_text(coalesce(p_city,''));
  v_province text := private.canonical_province(p_province);
  v_code text;
  v_admin boolean;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  v_code := private.current_operator_code();
  if v_code is null then raise exception 'OPERATOR_NOT_LINKED'; end if;
  if length(v_school) < 3 then raise exception 'SCHOOL_REQUIRED'; end if;
  if length(v_city) < 2 then raise exception 'CITY_REQUIRED'; end if;
  if v_province is null then raise exception 'INVALID_PROVINCE'; end if;
  v_admin := private.is_admin();

  return query
  with scored as (
    select
      c.id as cid,
      c.school as cschool,
      c.city as ccity,
      c.province as cprovince,
      c.community as ccommunity,
      s.assigned_to as cassigned_to,
      private.norm_center_text(c.school) as n_school,
      private.norm_center_text(coalesce(c.city,'')) as n_city,
      extensions.similarity(private.norm_center_text(c.school), v_school) as sim,
      (v_admin or s.assigned_to=v_code) as can_open
    from public.centers c
    join public.center_state s on s.center_id=c.id
    where private.canonical_province(c.province)=v_province
  )
  select
    case when sc.can_open then sc.cid else null end,
    sc.cschool,
    sc.ccity,
    sc.cprovince,
    sc.ccommunity,
    case
      when sc.n_school=v_school and sc.n_city=v_city then 'exact'
      when sc.n_city=v_city and sc.sim>=0.78 then 'strong'
      else 'possible'
    end,
    round((case when sc.n_school=v_school and sc.n_city=v_city then 1.0 else sc.sim end)::numeric,3),
    sc.can_open,
    case when v_admin then sc.cassigned_to else null end
  from scored sc
  where
    (sc.n_school=v_school and sc.n_city=v_city)
    or sc.sim>=0.50
    or (length(v_school)>=4 and (sc.n_school like '%'||v_school||'%' or v_school like '%'||sc.n_school||'%'))
  order by
    (sc.n_school=v_school and sc.n_city=v_city) desc,
    (sc.n_city=v_city) desc,
    sc.sim desc,
    sc.cschool
  limit 8;
end;
$$;


ALTER FUNCTION "public"."search_center_duplicates"("p_school" "text", "p_city" "text", "p_province" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_center_duplicates"("p_school" "text", "p_city" "text", "p_province" "text") IS 'Busca coincidencias institucionales sin exponer ID ni responsable de carteras ajenas a comerciales.';



CREATE OR REPLACE FUNCTION "public"."touch_operator_presence"("p_interaction" boolean DEFAULT false, "p_login" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_operator text;
  v_now timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_operator := private.current_operator_code();
  if v_operator is null then
    raise exception 'OPERATOR_NOT_LINKED';
  end if;

  insert into public.operator_presence(
    operator_code,
    last_heartbeat_at,
    last_interaction_at,
    last_login_at,
    last_logout_at,
    updated_at
  )
  values (
    v_operator,
    v_now,
    case when p_interaction then v_now else null end,
    case when p_login then v_now else null end,
    null,
    v_now
  )
  on conflict (operator_code) do update
  set last_heartbeat_at = v_now,
      last_interaction_at = case
        when p_interaction then v_now
        else public.operator_presence.last_interaction_at
      end,
      last_login_at = case
        when p_login then v_now
        else public.operator_presence.last_login_at
      end,
      last_logout_at = case
        when p_login then null
        else public.operator_presence.last_logout_at
      end,
      updated_at = v_now;
end;
$$;


ALTER FUNCTION "public"."touch_operator_presence"("p_interaction" boolean, "p_login" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_center_contact_v1"("p_contact_id" bigint, "p_patch" "jsonb", "p_expected_version" bigint) RETURNS "public"."center_contacts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_current public.center_contacts%rowtype;
  v_result public.center_contacts%rowtype;
  v_allowed constant text[] := array[
    'full_name','role','mobile','email','is_primary',
    'do_not_contact','do_not_contact_reason'
  ];
  v_key text;
  v_name text;
  v_role text;
  v_mobile text;
  v_email text;
  v_primary boolean;
  v_blocked boolean;
  v_reason text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'INVALID_PATCH'; end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed)) then raise exception 'FIELD_NOT_ALLOWED: %', v_key; end if;
  end loop;

  select c.* into v_current
  from public.center_contacts c
  where c.contact_id = p_contact_id
  for update;
  if not found then raise exception 'CONTACT_NOT_FOUND'; end if;
  if not private.can_access_center(v_current.center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_version is null or v_current.contact_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;

  v_name := case when p_patch ? 'full_name' then nullif(btrim(p_patch->>'full_name'),'') else v_current.full_name end;
  v_role := case when p_patch ? 'role' then nullif(btrim(p_patch->>'role'),'') else v_current.role end;
  v_mobile := case when p_patch ? 'mobile' then nullif(btrim(p_patch->>'mobile'),'') else v_current.mobile end;
  v_email := case when p_patch ? 'email' then nullif(lower(btrim(p_patch->>'email')),'') else v_current.email end;
  v_primary := case when p_patch ? 'is_primary' then coalesce((p_patch->>'is_primary')::boolean,false) else v_current.is_primary end;
  v_blocked := case when p_patch ? 'do_not_contact' then coalesce((p_patch->>'do_not_contact')::boolean,false) else v_current.do_not_contact end;
  v_reason := case
    when not v_blocked then null
    when p_patch ? 'do_not_contact_reason' then nullif(btrim(p_patch->>'do_not_contact_reason'),'')
    else v_current.do_not_contact_reason
  end;

  if v_name is null or char_length(v_name) < 2 then raise exception 'CONTACT_NAME_REQUIRED'; end if;
  if v_email is not null and v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_CONTACT_EMAIL';
  end if;
  if nullif(private.norm_phone(v_mobile),'') is not null and char_length(private.norm_phone(v_mobile)) < 6 then
    raise exception 'INVALID_CONTACT_PHONE';
  end if;
  if v_blocked and (v_reason is null or char_length(v_reason) < 4) then
    raise exception 'CONTACT_BLOCK_REASON_REQUIRED';
  end if;
  if v_current.is_primary and not v_primary then
    raise exception 'PRIMARY_CONTACT_MUST_BE_REPLACED';
  end if;

  if v_primary and not v_current.is_primary then
    update public.center_contacts c
    set is_primary = false,
        contact_version = c.contact_version + 1,
        updated_at = now(),
        updated_by = (select auth.uid())
    where c.center_id = v_current.center_id
      and c.active = true and c.is_primary = true
      and c.contact_id <> p_contact_id;
  end if;

  update public.center_contacts c
  set full_name = v_name,
      role = v_role,
      mobile = v_mobile,
      email = v_email,
      is_primary = v_primary,
      do_not_contact = v_blocked,
      do_not_contact_reason = v_reason,
      do_not_contact_at = case
        when v_blocked then coalesce(c.do_not_contact_at,now())
        else null
      end,
      contact_version = c.contact_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where c.contact_id = p_contact_id
  returning * into v_result;

  if v_result.is_primary then
    update public.center_state s
    set contact_name = v_result.full_name,
        contact_role = v_result.role,
        contact_mobile = v_result.mobile,
        contact_email = v_result.email,
        state_version = s.state_version + 1,
        updated_at = now(),
        updated_by = (select auth.uid())
    where s.center_id = v_result.center_id;
  end if;

  return v_result;
end;
$_$;


ALTER FUNCTION "public"."update_center_contact_v1"("p_contact_id" bigint, "p_patch" "jsonb", "p_expected_version" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_center_profile"("p_center_id" "text", "p_patch" "jsonb", "p_expected_updated_at" timestamp with time zone) RETURNS "public"."center_state"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_state public.center_state%rowtype;
  v_allowed text[] := array['contact_name','contact_role','contact_mobile','contact_email','contact_blocked','contact_block_reason'];
  v_key text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.can_access_center(p_center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'INVALID_PATCH'; end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed)) then raise exception 'FIELD_NOT_ALLOWED: %', v_key; end if;
  end loop;

  select * into v_state from public.center_state where center_id=p_center_id for update;
  if not found then raise exception 'CENTER_STATE_NOT_FOUND'; end if;
  if p_expected_updated_at is null or v_state.updated_at <> p_expected_updated_at then
    raise exception 'CONCURRENT_UPDATE';
  end if;

  update public.center_state s set
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
      else s.next_contact_at end,
    updated_at=now(), updated_by=(select auth.uid())
  where s.center_id=p_center_id
  returning * into v_state;
  return v_state;
end;
$$;


ALTER FUNCTION "public"."update_center_profile"("p_center_id" "text", "p_patch" "jsonb", "p_expected_updated_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_center_profile_v2"("p_center_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) RETURNS "public"."center_state"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."update_center_profile_v2"("p_center_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_travel_opportunity_v1"("p_opportunity_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) RETURNS "public"."travel_opportunities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_current public.travel_opportunities%rowtype;
  v_result public.travel_opportunities%rowtype;
  v_allowed constant text[] := array[
    'cycle','group_description','students_count','teachers_count','destination',
    'travel_start_on','travel_end_on','contact_id','status','next_contact_at',
    'lead_source','lead_source_detail'
  ];
  v_key text;
  v_cycle text;
  v_group text;
  v_students integer;
  v_teachers integer;
  v_destination text;
  v_start date;
  v_end date;
  v_contact_id bigint;
  v_status text;
  v_next timestamptz;
  v_source text;
  v_source_detail text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'INVALID_PATCH'; end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed)) then raise exception 'FIELD_NOT_ALLOWED: %', v_key; end if;
  end loop;

  select o.* into v_current
  from public.travel_opportunities o
  where o.opportunity_id = p_opportunity_id and o.active = true
  for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not private.can_access_center(v_current.center_id) then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_version is null or v_current.opportunity_version is distinct from p_expected_version then
    raise exception 'CONCURRENT_UPDATE';
  end if;

  v_cycle := case when p_patch ? 'cycle' then nullif(btrim(p_patch->>'cycle'),'') else v_current.cycle end;
  v_group := case when p_patch ? 'group_description' then nullif(btrim(p_patch->>'group_description'),'') else v_current.group_description end;
  v_students := case when p_patch ? 'students_count' then nullif(p_patch->>'students_count','')::integer else v_current.students_count end;
  v_teachers := case when p_patch ? 'teachers_count' then nullif(p_patch->>'teachers_count','')::integer else v_current.teachers_count end;
  v_destination := case when p_patch ? 'destination' then nullif(btrim(p_patch->>'destination'),'') else v_current.destination end;
  v_start := case when p_patch ? 'travel_start_on' then nullif(p_patch->>'travel_start_on','')::date else v_current.travel_start_on end;
  v_end := case when p_patch ? 'travel_end_on' then nullif(p_patch->>'travel_end_on','')::date else v_current.travel_end_on end;
  v_contact_id := case when p_patch ? 'contact_id' then nullif(p_patch->>'contact_id','')::bigint else v_current.contact_id end;
  v_status := case when p_patch ? 'status' then nullif(btrim(p_patch->>'status'),'') else v_current.status end;
  v_next := case when p_patch ? 'next_contact_at' then nullif(p_patch->>'next_contact_at','')::timestamptz else v_current.next_contact_at end;
  v_source := case when p_patch ? 'lead_source' then nullif(btrim(p_patch->>'lead_source'),'') else v_current.lead_source end;
  v_source_detail := case when p_patch ? 'lead_source_detail' then nullif(btrim(p_patch->>'lead_source_detail'),'') else v_current.lead_source_detail end;

  if v_cycle is null or v_cycle not in (
    '6.º Primaria','1.º ESO','2.º ESO','3.º ESO','4.º ESO',
    'Bachillerato','FP','Varios ciclos','Otro'
  ) then raise exception 'INVALID_CYCLE'; end if;
  if v_status not in ('Pendiente','Interesado','Trasladado a cotización','No interesado') then
    raise exception 'INVALID_STATUS';
  end if;
  if v_students is not null and v_students not between 1 and 2000 then raise exception 'INVALID_STUDENTS_COUNT'; end if;
  if v_teachers is not null and v_teachers not between 0 and 250 then raise exception 'INVALID_TEACHERS_COUNT'; end if;
  if v_start is not null and v_end is not null and v_end < v_start then raise exception 'INVALID_TRAVEL_DATES'; end if;
  if v_contact_id is not null and not exists (
    select 1 from public.center_contacts c
    where c.contact_id = v_contact_id and c.center_id = v_current.center_id and c.active = true
  ) then raise exception 'INVALID_CENTER_CONTACT'; end if;
  if v_status in ('Trasladado a cotización','No interesado') then v_next := null; end if;

  update public.travel_opportunities o
  set cycle = v_cycle,
      group_description = v_group,
      students_count = v_students,
      teachers_count = v_teachers,
      destination = v_destination,
      travel_start_on = v_start,
      travel_end_on = v_end,
      contact_id = v_contact_id,
      status = v_status,
      next_contact_at = v_next,
      lead_source = v_source,
      lead_source_detail = v_source_detail,
      opportunity_version = o.opportunity_version + 1,
      updated_at = now(),
      updated_by = (select auth.uid())
  where o.opportunity_id = p_opportunity_id
  returning * into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."update_travel_opportunity_v1"("p_opportunity_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_vge_agenda_worker_token"("p_token" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name='vge_agenda_worker_token'
      and decrypted_secret = p_token
  );
$$;


ALTER FUNCTION "public"."verify_vge_agenda_worker_token"("p_token" "text") OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "private"."manual_center_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "private"."manual_center_id_seq" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "private"."travel_opportunity_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "private"."travel_opportunity_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_migration_runs" (
    "migration_name" "text" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_fingerprint" "text",
    "details" "jsonb"
);


ALTER TABLE "public"."admin_migration_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agenda_email_outbox" (
    "id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "assigned_to" "text" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "recipient" "text" DEFAULT 'r10-staging-recipient@example.invalid'::"text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "provider_message_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claimed_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "task_key" "text" DEFAULT 'center'::"text" NOT NULL,
    CONSTRAINT "agenda_email_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."agenda_email_outbox" OWNER TO "postgres";


ALTER TABLE "public"."agenda_email_outbox" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."agenda_email_outbox_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "campaign_id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "starts_on" "date" NOT NULL,
    "ends_on" "date" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "campaigns_code_check" CHECK ((("char_length"("btrim"("code")) >= 3) AND ("char_length"("btrim"("code")) <= 20))),
    CONSTRAINT "campaigns_dates_check" CHECK (("ends_on" >= "starts_on")),
    CONSTRAINT "campaigns_label_check" CHECK ((("char_length"("btrim"("label")) >= 3) AND ("char_length"("btrim"("label")) <= 80)))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


ALTER TABLE "public"."campaigns" ALTER COLUMN "campaign_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."campaigns_campaign_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."center_campaigns" (
    "center_campaign_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "campaign_id" bigint NOT NULL,
    "general_status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "general_next_contact_at" timestamp with time zone,
    "campaign_version" bigint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "center_campaigns_status_check" CHECK (("general_status" = ANY (ARRAY['Pendiente'::"text", 'Interesado'::"text", 'Trasladado a cotización'::"text", 'No interesado'::"text"]))),
    CONSTRAINT "center_campaigns_version_check" CHECK (("campaign_version" > 0))
);


ALTER TABLE "public"."center_campaigns" OWNER TO "postgres";


ALTER TABLE "public"."center_campaigns" ALTER COLUMN "center_campaign_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."center_campaigns_center_campaign_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."center_contacts" ALTER COLUMN "contact_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."center_contacts_contact_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."center_creation_audit" (
    "audit_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "operator_code" "text",
    "lead_source" "text",
    "assigned_to" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."center_creation_audit" OWNER TO "postgres";


ALTER TABLE "public"."center_creation_audit" ALTER COLUMN "audit_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."center_creation_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."center_lifecycle_audit" (
    "audit_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "center_school" "text" NOT NULL,
    "city" "text",
    "province" "text",
    "community" "text",
    "assigned_to" "text",
    "status" "text",
    "contact_events_count" bigint DEFAULT 0 NOT NULL,
    "reason" "text" NOT NULL,
    "acted_by" "uuid" NOT NULL,
    "acted_by_operator" "text" NOT NULL,
    "acted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "center_lifecycle_audit_action_check" CHECK (("action" = ANY (ARRAY['archive'::"text", 'restore'::"text", 'permanent_delete'::"text"]))),
    CONSTRAINT "center_lifecycle_audit_contact_count_check" CHECK (("contact_events_count" >= 0)),
    CONSTRAINT "center_lifecycle_audit_reason_check" CHECK ((("char_length"("btrim"("reason")) >= 8) AND ("char_length"("btrim"("reason")) <= 500)))
);


ALTER TABLE "public"."center_lifecycle_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."center_lifecycle_audit" IS 'Auditoría inmutable de archivo, restauración y borrado permanente. Conserva sólo datos institucionales mínimos, nunca PII de contactos.';



ALTER TABLE "public"."center_lifecycle_audit" ALTER COLUMN "audit_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."center_lifecycle_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."center_state_audit" (
    "audit_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "changed_by_operator" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    CONSTRAINT "center_state_audit_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."center_state_audit" OWNER TO "postgres";


ALTER TABLE "public"."center_state_audit" ALTER COLUMN "audit_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."center_state_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."centers" (
    "id" "text" NOT NULL,
    "school" "text" NOT NULL,
    "city" "text",
    "province" "text",
    "community" "text",
    "school_phone" "text",
    "school_email" "text",
    "active" boolean DEFAULT true NOT NULL,
    "catalog_source" "text" DEFAULT 'VGE 2026'::"text" NOT NULL,
    "catalog_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lead_source" "text",
    "lead_source_detail" "text",
    "created_by" "uuid",
    "created_by_operator" "text",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archived_by_operator" "text",
    "archive_reason" "text",
    CONSTRAINT "centers_archive_state_check" CHECK (((("active" = true) AND ("archived_at" IS NULL) AND ("archived_by" IS NULL) AND ("archived_by_operator" IS NULL) AND ("archive_reason" IS NULL)) OR (("active" = false) AND ("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL) AND (NULLIF("btrim"("archived_by_operator"), ''::"text") IS NOT NULL) AND (("char_length"("btrim"("archive_reason")) >= 8) AND ("char_length"("btrim"("archive_reason")) <= 500)))))
);


ALTER TABLE "public"."centers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."centers"."archived_at" IS 'Fecha de archivado reversible del centro. NULL cuando la ficha está activa.';



COMMENT ON COLUMN "public"."centers"."archive_reason" IS 'Motivo obligatorio del archivado reversible; la restauración queda en la auditoría de ciclo de vida.';



CREATE TABLE IF NOT EXISTS "public"."contact_event_opportunities" (
    "event_id" "uuid" NOT NULL,
    "opportunity_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contact_event_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."crm_centers" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."school",
    "c"."city",
    "c"."province",
    "c"."community",
    "c"."school_phone",
    "c"."school_email",
    "c"."active",
    "s"."assigned_to",
    "s"."status",
    "s"."next_contact_at",
    "s"."contact_name",
    "s"."contact_role",
    "s"."contact_mobile",
    "s"."contact_email",
    "s"."contact_blocked",
    "s"."contact_blocked_at",
    "s"."contact_block_reason",
    "s"."last_contact_at",
    "s"."last_result",
    "s"."last_operator_code",
    "s"."contact_count",
    "s"."updated_at" AS "state_updated_at",
    GREATEST("c"."updated_at", "s"."updated_at") AS "row_updated_at",
    "s"."state_version",
    "c"."catalog_source",
    "c"."lead_source",
    "c"."lead_source_detail",
    "c"."created_by_operator",
    "c"."created_at" AS "center_created_at"
   FROM ("public"."centers" "c"
     JOIN "public"."center_state" "s" ON (("s"."center_id" = "c"."id")))
  WHERE ("c"."active" = true);


ALTER VIEW "public"."crm_centers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."crm_export_centers" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."school",
    "c"."city",
    "c"."province",
    "c"."community",
    "c"."school_phone",
    "c"."school_email",
    "s"."assigned_to",
    "s"."status",
    "s"."next_contact_at",
    "s"."contact_name",
    "s"."contact_role",
        CASE
            WHEN "s"."contact_blocked" THEN NULL::"text"
            ELSE "s"."contact_mobile"
        END AS "contact_mobile",
        CASE
            WHEN "s"."contact_blocked" THEN NULL::"text"
            ELSE "s"."contact_email"
        END AS "contact_email",
    "s"."contact_blocked",
    "s"."contact_block_reason",
    "s"."last_contact_at",
    "s"."last_result",
    "s"."contact_count",
    "s"."state_version",
    "s"."updated_at",
    "c"."catalog_source",
    "c"."lead_source",
    "c"."created_by_operator",
    "c"."created_at" AS "center_created_at"
   FROM ("public"."centers" "c"
     JOIN "public"."center_state" "s" ON (("s"."center_id" = "c"."id")))
  WHERE ("c"."active" = true);


ALTER VIEW "public"."crm_export_centers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."export_audit" (
    "audit_id" bigint NOT NULL,
    "exported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "operator_code" "text",
    "export_format" "text" NOT NULL,
    "view_name" "text" NOT NULL,
    "row_count" integer NOT NULL,
    "details" "jsonb",
    CONSTRAINT "export_audit_export_format_check" CHECK (("export_format" = ANY (ARRAY['excel'::"text", 'csv'::"text", 'json'::"text"]))),
    CONSTRAINT "export_audit_row_count_check" CHECK (("row_count" >= 0))
);


ALTER TABLE "public"."export_audit" OWNER TO "postgres";


ALTER TABLE "public"."export_audit" ALTER COLUMN "audit_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."export_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."operator_audit" (
    "audit_id" bigint NOT NULL,
    "operator_code" "text" NOT NULL,
    "action" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "changed_by_operator" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    CONSTRAINT "operator_audit_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."operator_audit" OWNER TO "postgres";


ALTER TABLE "public"."operator_audit" ALTER COLUMN "audit_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."operator_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."operator_invitation_audit" (
    "invitation_id" bigint NOT NULL,
    "operator_code" "text" NOT NULL,
    "email" "text" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "requested_by_operator" "text" NOT NULL,
    "status" "text" NOT NULL,
    "auth_user_id" "uuid",
    "provider_error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "operator_invitation_audit_email_check" CHECK (("email" ~ '^[^[:space:]@]+@viajesdegruposescolares[.]com$'::"text")),
    CONSTRAINT "operator_invitation_audit_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'sent'::"text", 'failed'::"text", 'link_pending'::"text"])))
);


ALTER TABLE "public"."operator_invitation_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."operator_invitation_audit" IS 'Auditoría interna de invitaciones Auth. Sin acceso desde el navegador; sólo la función administrativa del servidor puede escribirla.';



ALTER TABLE "public"."operator_invitation_audit" ALTER COLUMN "invitation_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."operator_invitation_audit_invitation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."operator_presence" (
    "operator_code" "text" NOT NULL,
    "last_heartbeat_at" timestamp with time zone,
    "last_interaction_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "last_logout_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operator_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operator_role_audit" (
    "audit_id" bigint NOT NULL,
    "operator_code" "text" NOT NULL,
    "old_role" "text" NOT NULL,
    "new_role" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_by_operator" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "operator_role_audit_new_role_check" CHECK (("new_role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'seller'::"text", 'system'::"text"]))),
    CONSTRAINT "operator_role_audit_old_role_check" CHECK (("old_role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'seller'::"text", 'system'::"text"]))),
    CONSTRAINT "operator_role_audit_reason_check" CHECK ((("char_length"("reason") >= 8) AND ("char_length"("reason") <= 500)))
);


ALTER TABLE "public"."operator_role_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."operator_role_audit" IS 'Registro inmutable de cambios de rol funcional con actor, motivo y fecha.';



ALTER TABLE "public"."operator_role_audit" ALTER COLUMN "audit_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."operator_role_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."opportunity_audit" (
    "audit_id" bigint NOT NULL,
    "center_id" "text" NOT NULL,
    "opportunity_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    "acted_by" "uuid",
    "acted_by_operator" "text",
    "acted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "opportunity_audit_action_check" CHECK (("action" = ANY (ARRAY['insert'::"text", 'update'::"text"])))
);


ALTER TABLE "public"."opportunity_audit" OWNER TO "postgres";


ALTER TABLE "public"."opportunity_audit" ALTER COLUMN "audit_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."opportunity_audit_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."admin_migration_runs"
    ADD CONSTRAINT "admin_migration_runs_pkey" PRIMARY KEY ("migration_name");



ALTER TABLE ONLY "public"."agenda_email_outbox"
    ADD CONSTRAINT "agenda_email_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("campaign_id");



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_id_center_unique" UNIQUE ("center_campaign_id", "center_id");



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_pkey" PRIMARY KEY ("center_campaign_id");



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_unique" UNIQUE ("center_id", "campaign_id");



ALTER TABLE ONLY "public"."center_contacts"
    ADD CONSTRAINT "center_contacts_pkey" PRIMARY KEY ("contact_id");



ALTER TABLE ONLY "public"."center_creation_audit"
    ADD CONSTRAINT "center_creation_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."center_lifecycle_audit"
    ADD CONSTRAINT "center_lifecycle_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."center_state_audit"
    ADD CONSTRAINT "center_state_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."center_state"
    ADD CONSTRAINT "center_state_pkey" PRIMARY KEY ("center_id");



ALTER TABLE ONLY "public"."centers"
    ADD CONSTRAINT "centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_event_opportunities"
    ADD CONSTRAINT "contact_event_opportunities_pkey" PRIMARY KEY ("event_id", "opportunity_id");



ALTER TABLE ONLY "public"."contact_events"
    ADD CONSTRAINT "contact_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_audit"
    ADD CONSTRAINT "export_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."operator_audit"
    ADD CONSTRAINT "operator_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."operator_invitation_audit"
    ADD CONSTRAINT "operator_invitation_audit_pkey" PRIMARY KEY ("invitation_id");



ALTER TABLE ONLY "public"."operator_presence"
    ADD CONSTRAINT "operator_presence_pkey" PRIMARY KEY ("operator_code");



ALTER TABLE ONLY "public"."operator_role_audit"
    ADD CONSTRAINT "operator_role_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."opportunity_audit"
    ADD CONSTRAINT "opportunity_audit_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_pkey" PRIMARY KEY ("opportunity_id");



CREATE INDEX "agenda_email_outbox_assigned_to_idx" ON "public"."agenda_email_outbox" USING "btree" ("assigned_to");



CREATE UNIQUE INDEX "agenda_email_outbox_unique_task_due" ON "public"."agenda_email_outbox" USING "btree" ("center_id", "task_key", "scheduled_for");



CREATE INDEX "agenda_email_outbox_work_idx" ON "public"."agenda_email_outbox" USING "btree" ("status", "created_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'failed'::"text", 'processing'::"text"]));



CREATE INDEX "campaigns_created_by_idx" ON "public"."campaigns" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE UNIQUE INDEX "campaigns_one_default_idx" ON "public"."campaigns" USING "btree" ("is_default") WHERE ("is_default" = true);



CREATE INDEX "campaigns_updated_by_idx" ON "public"."campaigns" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "center_campaigns_campaign_center_idx" ON "public"."center_campaigns" USING "btree" ("campaign_id", "center_id");



CREATE INDEX "center_campaigns_created_by_idx" ON "public"."center_campaigns" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "center_campaigns_updated_by_idx" ON "public"."center_campaigns" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE UNIQUE INDEX "center_contacts_active_email_unique_idx" ON "public"."center_contacts" USING "btree" ("center_id", "lower"("btrim"("email"))) WHERE (("active" = true) AND (NULLIF("lower"("btrim"("email")), ''::"text") IS NOT NULL));



CREATE UNIQUE INDEX "center_contacts_active_phone_unique_idx" ON "public"."center_contacts" USING "btree" ("center_id", "private"."norm_phone"("mobile")) WHERE (("active" = true) AND (NULLIF("private"."norm_phone"("mobile"), ''::"text") IS NOT NULL));



CREATE INDEX "center_contacts_center_idx" ON "public"."center_contacts" USING "btree" ("center_id", "active", "full_name");



CREATE INDEX "center_contacts_created_by_idx" ON "public"."center_contacts" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE UNIQUE INDEX "center_contacts_one_primary_idx" ON "public"."center_contacts" USING "btree" ("center_id") WHERE (("is_primary" = true) AND ("active" = true));



CREATE INDEX "center_contacts_updated_by_idx" ON "public"."center_contacts" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "center_creation_audit_center_id_idx" ON "public"."center_creation_audit" USING "btree" ("center_id");



CREATE INDEX "center_lifecycle_audit_at_idx" ON "public"."center_lifecycle_audit" USING "btree" ("acted_at" DESC, "audit_id" DESC);



CREATE INDEX "center_lifecycle_audit_center_at_idx" ON "public"."center_lifecycle_audit" USING "btree" ("center_id", "acted_at" DESC, "audit_id" DESC);



CREATE INDEX "center_state_assigned_idx" ON "public"."center_state" USING "btree" ("assigned_to");



CREATE INDEX "center_state_audit_center_idx" ON "public"."center_state_audit" USING "btree" ("center_id", "changed_at" DESC);



CREATE INDEX "center_state_audit_changed_idx" ON "public"."center_state_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "center_state_blocked_idx" ON "public"."center_state" USING "btree" ("contact_blocked") WHERE ("contact_blocked" = true);



CREATE INDEX "center_state_last_operator_code_idx" ON "public"."center_state" USING "btree" ("last_operator_code") WHERE ("last_operator_code" IS NOT NULL);



CREATE INDEX "center_state_next_contact_idx" ON "public"."center_state" USING "btree" ("next_contact_at");



CREATE INDEX "center_state_statistics_scope_idx" ON "public"."center_state" USING "btree" ("assigned_to", "status", "next_contact_at", "center_id");



CREATE INDEX "center_state_status_idx" ON "public"."center_state" USING "btree" ("status");



CREATE INDEX "center_state_updated_by_idx" ON "public"."center_state" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "centers_active_community_created_idx" ON "public"."centers" USING "btree" ("community", "created_at" DESC, "id") WHERE ("active" = true);



CREATE INDEX "centers_archived_at_idx" ON "public"."centers" USING "btree" ("archived_at" DESC, "id") WHERE ("active" = false);



CREATE INDEX "centers_community_idx" ON "public"."centers" USING "btree" ("community");



CREATE INDEX "centers_created_by_operator_idx" ON "public"."centers" USING "btree" ("created_by_operator");



CREATE INDEX "centers_province_idx" ON "public"."centers" USING "btree" ("province");



CREATE INDEX "centers_school_lower_idx" ON "public"."centers" USING "btree" ("lower"("school"));



CREATE INDEX "contact_event_opportunities_opportunity_idx" ON "public"."contact_event_opportunities" USING "btree" ("opportunity_id", "event_id");



CREATE INDEX "contact_events_center_contacted_idx" ON "public"."contact_events" USING "btree" ("center_id", "contacted_at", "id");



CREATE INDEX "contact_events_center_idx" ON "public"."contact_events" USING "btree" ("center_id", "created_at" DESC);



CREATE INDEX "contact_events_contact_id_idx" ON "public"."contact_events" USING "btree" ("contact_id") WHERE ("contact_id" IS NOT NULL);



CREATE INDEX "contact_events_contacted_idx" ON "public"."contact_events" USING "btree" ("contacted_at" DESC);



CREATE INDEX "contact_events_created_by_idx" ON "public"."contact_events" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE UNIQUE INDEX "contact_events_legacy_key_uidx" ON "public"."contact_events" USING "btree" ("legacy_key") WHERE ("legacy_key" IS NOT NULL);



CREATE INDEX "contact_events_operator_contacted_idx" ON "public"."contact_events" USING "btree" ("operator_code", "contacted_at" DESC, "center_id");



CREATE INDEX "contact_events_operator_idx" ON "public"."contact_events" USING "btree" ("operator_code", "created_at" DESC);



CREATE INDEX "export_audit_auth_user_id_idx" ON "public"."export_audit" USING "btree" ("auth_user_id") WHERE ("auth_user_id" IS NOT NULL);



CREATE INDEX "export_audit_date_idx" ON "public"."export_audit" USING "btree" ("exported_at" DESC);



CREATE INDEX "operator_audit_changed_idx" ON "public"."operator_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "operator_invitation_audit_email_created_idx" ON "public"."operator_invitation_audit" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "operator_invitation_audit_operator_created_idx" ON "public"."operator_invitation_audit" USING "btree" ("operator_code", "created_at" DESC);



CREATE INDEX "operator_presence_heartbeat_idx" ON "public"."operator_presence" USING "btree" ("last_heartbeat_at" DESC);



CREATE INDEX "operator_role_audit_changed_at_idx" ON "public"."operator_role_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "operator_role_audit_operator_changed_idx" ON "public"."operator_role_audit" USING "btree" ("operator_code", "changed_at" DESC);



CREATE UNIQUE INDEX "operators_email_lower_uidx" ON "public"."operators" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE INDEX "opportunity_audit_acted_by_idx" ON "public"."opportunity_audit" USING "btree" ("acted_by") WHERE ("acted_by" IS NOT NULL);



CREATE INDEX "opportunity_audit_center_time_idx" ON "public"."opportunity_audit" USING "btree" ("center_id", "acted_at" DESC);



CREATE INDEX "opportunity_audit_operator_idx" ON "public"."opportunity_audit" USING "btree" ("acted_by_operator") WHERE ("acted_by_operator" IS NOT NULL);



CREATE INDEX "opportunity_audit_opportunity_time_idx" ON "public"."opportunity_audit" USING "btree" ("opportunity_id", "acted_at" DESC);



CREATE INDEX "travel_opportunities_archived_by_idx" ON "public"."travel_opportunities" USING "btree" ("archived_by") WHERE ("archived_by" IS NOT NULL);



CREATE INDEX "travel_opportunities_archived_by_operator_idx" ON "public"."travel_opportunities" USING "btree" ("archived_by_operator") WHERE ("archived_by_operator" IS NOT NULL);



CREATE INDEX "travel_opportunities_campaign_center_fk_idx" ON "public"."travel_opportunities" USING "btree" ("center_campaign_id", "center_id");



CREATE INDEX "travel_opportunities_center_campaign_idx" ON "public"."travel_opportunities" USING "btree" ("center_id", "center_campaign_id", "active");



CREATE INDEX "travel_opportunities_contact_id_idx" ON "public"."travel_opportunities" USING "btree" ("contact_id") WHERE ("contact_id" IS NOT NULL);



CREATE INDEX "travel_opportunities_created_by_idx" ON "public"."travel_opportunities" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "travel_opportunities_created_by_operator_idx" ON "public"."travel_opportunities" USING "btree" ("created_by_operator") WHERE ("created_by_operator" IS NOT NULL);



CREATE INDEX "travel_opportunities_last_operator_idx" ON "public"."travel_opportunities" USING "btree" ("last_operator_code") WHERE ("last_operator_code" IS NOT NULL);



CREATE INDEX "travel_opportunities_next_contact_idx" ON "public"."travel_opportunities" USING "btree" ("next_contact_at", "center_id") WHERE (("active" = true) AND ("next_contact_at" IS NOT NULL) AND ("status" <> ALL (ARRAY['Trasladado a cotización'::"text", 'No interesado'::"text"])));



CREATE INDEX "travel_opportunities_status_idx" ON "public"."travel_opportunities" USING "btree" ("status", "center_id") WHERE ("active" = true);



CREATE INDEX "travel_opportunities_updated_by_idx" ON "public"."travel_opportunities" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_campaigns_touch" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_center_campaigns_touch" BEFORE UPDATE ON "public"."center_campaigns" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_center_contacts_touch" BEFORE UPDATE ON "public"."center_contacts" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_center_lifecycle_audit_immutable" BEFORE DELETE OR UPDATE ON "public"."center_lifecycle_audit" FOR EACH ROW EXECUTE FUNCTION "private"."prevent_center_lifecycle_audit_mutation"();



CREATE OR REPLACE TRIGGER "trg_center_state_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."center_state" FOR EACH ROW EXECUTE FUNCTION "private"."audit_center_state"();



CREATE OR REPLACE TRIGGER "trg_center_state_sync_v15" AFTER INSERT OR UPDATE OF "status", "next_contact_at", "contact_name", "contact_role", "contact_mobile", "contact_email", "contact_blocked", "contact_block_reason", "contact_blocked_at" ON "public"."center_state" FOR EACH ROW EXECUTE FUNCTION "private"."sync_center_state_to_v15"();



CREATE OR REPLACE TRIGGER "trg_centers_ensure_state" AFTER INSERT ON "public"."centers" FOR EACH ROW EXECUTE FUNCTION "private"."ensure_center_state"();



CREATE OR REPLACE TRIGGER "trg_centers_touch" BEFORE UPDATE ON "public"."centers" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_centers_validate_manual_metadata" BEFORE INSERT OR UPDATE OF "catalog_source", "lead_source", "lead_source_detail" ON "public"."centers" FOR EACH ROW EXECUTE FUNCTION "private"."validate_manual_center_metadata"();



CREATE OR REPLACE TRIGGER "trg_operator_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "private"."audit_operator"();



CREATE OR REPLACE TRIGGER "trg_operators_sync_access_role" BEFORE INSERT OR UPDATE OF "role", "access_role" ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "private"."sync_operator_access_role"();



CREATE OR REPLACE TRIGGER "trg_operators_touch" BEFORE UPDATE ON "public"."operators" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_travel_opportunities_audit" AFTER INSERT OR UPDATE ON "public"."travel_opportunities" FOR EACH ROW EXECUTE FUNCTION "private"."audit_travel_opportunity"();



CREATE OR REPLACE TRIGGER "trg_travel_opportunities_touch" BEFORE UPDATE ON "public"."travel_opportunities" FOR EACH ROW EXECUTE FUNCTION "private"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_travel_opportunity_source_v15" BEFORE INSERT OR UPDATE OF "lead_source" ON "public"."travel_opportunities" FOR EACH ROW EXECUTE FUNCTION "private"."validate_travel_opportunity_source_v15"();



ALTER TABLE ONLY "public"."agenda_email_outbox"
    ADD CONSTRAINT "agenda_email_outbox_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."operators"("code");



ALTER TABLE ONLY "public"."agenda_email_outbox"
    ADD CONSTRAINT "agenda_email_outbox_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("campaign_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."center_campaigns"
    ADD CONSTRAINT "center_campaigns_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."center_contacts"
    ADD CONSTRAINT "center_contacts_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."center_contacts"
    ADD CONSTRAINT "center_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."center_contacts"
    ADD CONSTRAINT "center_contacts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."center_creation_audit"
    ADD CONSTRAINT "center_creation_audit_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."center_state"
    ADD CONSTRAINT "center_state_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."operators"("code");



ALTER TABLE ONLY "public"."center_state"
    ADD CONSTRAINT "center_state_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."center_state"
    ADD CONSTRAINT "center_state_last_operator_code_fkey" FOREIGN KEY ("last_operator_code") REFERENCES "public"."operators"("code");



ALTER TABLE ONLY "public"."center_state"
    ADD CONSTRAINT "center_state_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."centers"
    ADD CONSTRAINT "centers_created_by_operator_fkey" FOREIGN KEY ("created_by_operator") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contact_event_opportunities"
    ADD CONSTRAINT "contact_event_opportunities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."contact_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_event_opportunities"
    ADD CONSTRAINT "contact_event_opportunities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."travel_opportunities"("opportunity_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_events"
    ADD CONSTRAINT "contact_events_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contact_events"
    ADD CONSTRAINT "contact_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."center_contacts"("contact_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contact_events"
    ADD CONSTRAINT "contact_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contact_events"
    ADD CONSTRAINT "contact_events_operator_code_fkey" FOREIGN KEY ("operator_code") REFERENCES "public"."operators"("code");



ALTER TABLE ONLY "public"."export_audit"
    ADD CONSTRAINT "export_audit_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operator_invitation_audit"
    ADD CONSTRAINT "operator_invitation_audit_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operator_invitation_audit"
    ADD CONSTRAINT "operator_invitation_audit_operator_code_fkey" FOREIGN KEY ("operator_code") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operator_invitation_audit"
    ADD CONSTRAINT "operator_invitation_audit_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operator_presence"
    ADD CONSTRAINT "operator_presence_operator_code_fkey" FOREIGN KEY ("operator_code") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunity_audit"
    ADD CONSTRAINT "opportunity_audit_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunity_audit"
    ADD CONSTRAINT "opportunity_audit_acted_by_operator_fkey" FOREIGN KEY ("acted_by_operator") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunity_audit"
    ADD CONSTRAINT "opportunity_audit_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_archived_by_operator_fkey" FOREIGN KEY ("archived_by_operator") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_campaign_center_fkey" FOREIGN KEY ("center_campaign_id", "center_id") REFERENCES "public"."center_campaigns"("center_campaign_id", "center_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."center_contacts"("contact_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_created_by_operator_fkey" FOREIGN KEY ("created_by_operator") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_last_operator_code_fkey" FOREIGN KEY ("last_operator_code") REFERENCES "public"."operators"("code") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."travel_opportunities"
    ADD CONSTRAINT "travel_opportunities_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."admin_migration_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agenda_email_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns_select_authenticated" ON "public"."campaigns" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."center_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "center_campaigns_select_visible" ON "public"."center_campaigns" FOR SELECT TO "authenticated" USING (( SELECT "private"."can_access_center"("center_campaigns"."center_id") AS "can_access_center"));



ALTER TABLE "public"."center_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "center_contacts_select_visible" ON "public"."center_contacts" FOR SELECT TO "authenticated" USING (( SELECT "private"."can_access_center"("center_contacts"."center_id") AS "can_access_center"));



ALTER TABLE "public"."center_creation_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "center_creation_audit_admin_only" ON "public"."center_creation_audit" FOR SELECT TO "authenticated" USING ("private"."is_admin"());



ALTER TABLE "public"."center_lifecycle_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "center_lifecycle_audit_owner_only" ON "public"."center_lifecycle_audit" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_owner"() AS "is_owner"));



ALTER TABLE "public"."center_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."center_state_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "center_state_audit_admin_only" ON "public"."center_state_audit" FOR SELECT TO "authenticated" USING ("private"."is_admin"());



CREATE POLICY "center_state_select_visible" ON "public"."center_state" FOR SELECT TO "authenticated" USING (( SELECT "private"."can_access_center"("center_state"."center_id") AS "can_access_center"));



ALTER TABLE "public"."centers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "centers_select_visible" ON "public"."centers" FOR SELECT TO "authenticated" USING (( SELECT "private"."can_access_center"("centers"."id") AS "can_access_center"));



ALTER TABLE "public"."contact_event_opportunities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_event_opportunities_select_visible" ON "public"."contact_event_opportunities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."travel_opportunities" "o"
  WHERE (("o"."opportunity_id" = "contact_event_opportunities"."opportunity_id") AND ( SELECT "private"."can_access_center"("o"."center_id") AS "can_access_center")))));



ALTER TABLE "public"."contact_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_events_select_visible" ON "public"."contact_events" FOR SELECT TO "authenticated" USING (( SELECT "private"."can_access_center"("contact_events"."center_id") AS "can_access_center"));



ALTER TABLE "public"."export_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "export_audit_owner_only" ON "public"."export_audit" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_owner"() AS "is_owner"));



ALTER TABLE "public"."operator_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_audit_owner_only" ON "public"."operator_audit" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_owner"() AS "is_owner"));



ALTER TABLE "public"."operator_invitation_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operator_presence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_presence_admin_select" ON "public"."operator_presence" FOR SELECT TO "authenticated" USING ("private"."is_admin"());



ALTER TABLE "public"."operator_role_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_role_audit_owner_only" ON "public"."operator_role_audit" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_owner"() AS "is_owner"));



ALTER TABLE "public"."operators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operators_select_visible" ON "public"."operators" FOR SELECT TO "authenticated" USING (("private"."is_admin"() OR ("code" = "private"."current_operator_code"())));



ALTER TABLE "public"."opportunity_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opportunity_audit_admin_select" ON "public"."opportunity_audit" FOR SELECT TO "authenticated" USING (( SELECT "private"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."travel_opportunities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "travel_opportunities_select_visible" ON "public"."travel_opportunities" FOR SELECT TO "authenticated" USING (( SELECT "private"."can_access_center"("travel_opportunities"."center_id") AS "can_access_center"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































































































































REVOKE ALL ON FUNCTION "private"."audit_center_state"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."audit_operator"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."audit_travel_opportunity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."can_access_center"("p_center_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."can_access_center"("p_center_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."current_operator_code"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."current_operator_code"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."current_operator_name"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."current_operator_name"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."ensure_center_state"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."has_permission"("p_permission" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_owner"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_owner"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."prevent_center_lifecycle_audit_mutation"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."queue_overdue_agenda"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."sync_center_state_to_v15"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."sync_operator_access_role"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."touch_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_manual_center_metadata"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_travel_opportunity_source_v15"() FROM PUBLIC;



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."center_state" TO "service_role";
GRANT SELECT ON TABLE "public"."center_state" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_assign_center"("p_center_id" "text", "p_operator_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_assign_center"("p_center_id" "text", "p_operator_code" "text") TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."operators" TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_create_operator"("p_code" "text", "p_display_name" "text", "p_email" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_create_operator"("p_code" "text", "p_display_name" "text", "p_email" "text", "p_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_deactivate_operator"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_deactivate_operator"("p_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_link_operator"("p_code" "text", "p_auth_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_link_operator"("p_code" "text", "p_auth_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."archive_center"("p_center_id" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_center"("p_center_id" "text", "p_reason" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."center_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."center_contacts" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."archive_center_contact_v1"("p_contact_id" bigint, "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_center_contact_v1"("p_contact_id" bigint, "p_expected_version" bigint) TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."travel_opportunities" TO "service_role";
GRANT SELECT ON TABLE "public"."travel_opportunities" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."archive_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."bulk_assign_zone"("p_scope_type" "text", "p_scope_value" "text", "p_shares" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bulk_assign_zone"("p_scope_type" "text", "p_scope_value" "text", "p_shares" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."claim_vge_agenda_email_batch"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_vge_agenda_email_batch"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_vge_agenda_email"("p_id" bigint, "p_success" boolean, "p_provider_message_id" "text", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_vge_agenda_email"("p_id" bigint, "p_success" boolean, "p_provider_message_id" "text", "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_center_contact_v1"("p_center_id" "text", "p_full_name" "text", "p_role" "text", "p_mobile" "text", "p_email" "text", "p_is_primary" boolean, "p_do_not_contact" boolean, "p_do_not_contact_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_center_contact_v1"("p_center_id" "text", "p_full_name" "text", "p_role" "text", "p_mobile" "text", "p_email" "text", "p_is_primary" boolean, "p_do_not_contact" boolean, "p_do_not_contact_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_manual_center"("p_school" "text", "p_city" "text", "p_province" "text", "p_lead_source" "text", "p_school_phone" "text", "p_school_email" "text", "p_contact_name" "text", "p_contact_role" "text", "p_contact_mobile" "text", "p_contact_email" "text", "p_lead_source_detail" "text", "p_assigned_to" "text", "p_confirm_possible_duplicate" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_manual_center"("p_school" "text", "p_city" "text", "p_province" "text", "p_lead_source" "text", "p_school_phone" "text", "p_school_email" "text", "p_contact_name" "text", "p_contact_role" "text", "p_contact_mobile" "text", "p_contact_email" "text", "p_lead_source_detail" "text", "p_assigned_to" "text", "p_confirm_possible_duplicate" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_travel_opportunity_v1"("p_center_id" "text", "p_campaign_code" "text", "p_cycle" "text", "p_group_description" "text", "p_students_count" integer, "p_teachers_count" integer, "p_destination" "text", "p_travel_start_on" "date", "p_travel_end_on" "date", "p_contact_id" bigint, "p_status" "text", "p_next_contact_at" timestamp with time zone, "p_lead_source" "text", "p_lead_source_detail" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_travel_opportunity_v1"("p_center_id" "text", "p_campaign_code" "text", "p_cycle" "text", "p_group_description" "text", "p_students_count" integer, "p_teachers_count" integer, "p_destination" "text", "p_travel_start_on" "date", "p_travel_end_on" "date", "p_contact_id" bigint, "p_status" "text", "p_next_contact_at" timestamp with time zone, "p_lead_source" "text", "p_lead_source_detail" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_access_fingerprint"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_access_fingerprint"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_access_fingerprint_v2"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_access_fingerprint_v2"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_agenda_items_v2"("p_campaign_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_agenda_items_v2"("p_campaign_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_center_history_v2"("p_center_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_center_history_v2"("p_center_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_center_workspace_v1"("p_center_id" "text", "p_campaign_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_center_workspace_v1"("p_center_id" "text", "p_campaign_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_current_campaign_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_campaign_v1"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_my_operator"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_operator"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_my_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_my_permissions_v2"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_permissions_v2"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_statistics_dashboard_v1"("p_period_days" integer, "p_operator_code" "text", "p_community" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_statistics_dashboard_v1"("p_period_days" integer, "p_operator_code" "text", "p_community" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_statistics_dashboard_v2"("p_period_days" integer, "p_operator_code" "text", "p_community" "text", "p_campaign_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_statistics_dashboard_v2"("p_period_days" integer, "p_operator_code" "text", "p_community" "text", "p_campaign_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_team_presence"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_team_presence"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_team_presence_v2"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_team_presence_v2"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_visible_operators"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visible_operators"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_visible_travel_summaries_v1"("p_campaign_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visible_travel_summaries_v1"("p_campaign_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_archived_centers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_archived_centers"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_center_lifecycle_audit"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_center_lifecycle_audit"("p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_export"("p_format" "text", "p_view" "text", "p_row_count" integer, "p_details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_export"("p_format" "text", "p_view" "text", "p_row_count" integer, "p_details" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_operator_offline"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_operator_offline"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owner_export_full_backup_v2"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owner_export_full_backup_v2"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owner_export_full_backup_v3"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owner_export_full_backup_v3"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owner_list_operators"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owner_list_operators"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owner_list_role_audit"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owner_list_role_audit"("p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owner_permanently_delete_center"("p_center_id" "text", "p_reason" "text", "p_confirm_center_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owner_permanently_delete_center"("p_center_id" "text", "p_reason" "text", "p_confirm_center_id" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."owner_set_operator_access_role"("p_code" "text", "p_new_role" "text", "p_reason" "text", "p_confirm_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."owner_set_operator_access_role"("p_code" "text", "p_new_role" "text", "p_reason" "text", "p_confirm_code" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contact_events" TO "service_role";
GRANT SELECT ON TABLE "public"."contact_events" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."register_contact"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_updated_at" timestamp with time zone) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."register_contact_multi_v1"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_state_version" bigint, "p_contact_id" bigint, "p_opportunity_ids" "text"[], "p_expected_opportunity_versions" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_contact_multi_v1"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_state_version" bigint, "p_contact_id" bigint, "p_opportunity_ids" "text"[], "p_expected_opportunity_versions" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."register_contact_v2"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_contact_v2"("p_center_id" "text", "p_contacted_at" timestamp with time zone, "p_channel" "text", "p_result" "text", "p_notes" "text", "p_next_contact_at" timestamp with time zone, "p_expected_version" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."restore_center"("p_center_id" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_center"("p_center_id" "text", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."restore_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_travel_opportunity_v1"("p_opportunity_id" "text", "p_reason" "text", "p_expected_version" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."run_vge_agenda_queue_worker"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."run_vge_agenda_queue_worker"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_center_duplicates"("p_school" "text", "p_city" "text", "p_province" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_center_duplicates"("p_school" "text", "p_city" "text", "p_province" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."touch_operator_presence"("p_interaction" boolean, "p_login" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_operator_presence"("p_interaction" boolean, "p_login" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_center_contact_v1"("p_contact_id" bigint, "p_patch" "jsonb", "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_center_contact_v1"("p_contact_id" bigint, "p_patch" "jsonb", "p_expected_version" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_center_profile"("p_center_id" "text", "p_patch" "jsonb", "p_expected_updated_at" timestamp with time zone) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."update_center_profile_v2"("p_center_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_center_profile_v2"("p_center_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_travel_opportunity_v1"("p_opportunity_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_travel_opportunity_v1"("p_opportunity_id" "text", "p_patch" "jsonb", "p_expected_version" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."verify_vge_agenda_worker_token"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_vge_agenda_worker_token"("p_token" "text") TO "service_role";
























GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_migration_runs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."agenda_email_outbox" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."campaigns" TO "service_role";
GRANT SELECT ON TABLE "public"."campaigns" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."center_campaigns" TO "service_role";
GRANT SELECT ON TABLE "public"."center_campaigns" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."center_creation_audit" TO "service_role";
GRANT SELECT ON TABLE "public"."center_creation_audit" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."center_lifecycle_audit" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."center_state_audit" TO "service_role";
GRANT SELECT ON TABLE "public"."center_state_audit" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."centers" TO "service_role";
GRANT SELECT ON TABLE "public"."centers" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contact_event_opportunities" TO "service_role";
GRANT SELECT ON TABLE "public"."contact_event_opportunities" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."crm_centers" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_centers" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."crm_export_centers" TO "service_role";
GRANT SELECT ON TABLE "public"."crm_export_centers" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."export_audit" TO "service_role";
GRANT SELECT ON TABLE "public"."export_audit" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."operator_audit" TO "service_role";
GRANT SELECT ON TABLE "public"."operator_audit" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."operator_invitation_audit" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."operator_invitation_audit_invitation_id_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."operator_presence" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."operator_presence" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."operator_role_audit" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."opportunity_audit" TO "service_role";
GRANT SELECT ON TABLE "public"."opportunity_audit" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































