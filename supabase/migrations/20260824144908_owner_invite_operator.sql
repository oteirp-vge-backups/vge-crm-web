create or replace function public.owner_prepare_operator_invitation(
  p_code text,
  p_email text,
  p_confirm_code text
)
returns table(
  code text,
  display_name text,
  email text,
  access_role text,
  active boolean,
  auth_user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
  v_operator public.operators%rowtype;
begin
  if not private.is_owner() then
    raise exception 'OWNER_REQUIRED';
  end if;

  if p_confirm_code is distinct from p_code then
    raise exception 'CONFIRMATION_MISMATCH';
  end if;

  v_email := lower(btrim(coalesce(p_email, '')));
  if length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@viajesdegruposescolares[.]com$' then
    raise exception 'INVALID_VGE_EMAIL';
  end if;

  select o.* into v_operator
  from public.operators o
  where o.code = p_code
  for update;

  if not found
     or not v_operator.active
     or v_operator.access_role not in ('manager', 'seller') then
    raise exception 'OPERATOR_NOT_INVITABLE';
  end if;

  if v_operator.auth_user_id is not null then
    raise exception 'OPERATOR_ALREADY_LINKED';
  end if;

  if exists (
    select 1
    from public.operators o
    where lower(o.email) = v_email
      and o.code <> p_code
  ) then
    raise exception 'EMAIL_ALREADY_ASSIGNED';
  end if;

  update public.operators o
  set email = v_email,
      updated_at = now()
  where o.code = p_code
  returning o.* into v_operator;

  return query
  select
    v_operator.code,
    v_operator.display_name,
    v_operator.email,
    v_operator.access_role,
    v_operator.active,
    v_operator.auth_user_id;
end;
$function$;

revoke all on function public.owner_prepare_operator_invitation(text, text, text) from public;
revoke all on function public.owner_prepare_operator_invitation(text, text, text) from anon;
grant execute on function public.owner_prepare_operator_invitation(text, text, text) to authenticated;

comment on function public.owner_prepare_operator_invitation(text, text, text)
is 'Prepara una invitación de operador. Sólo el propietario autenticado puede validar y asociar el email corporativo antes del alta en Auth.';
