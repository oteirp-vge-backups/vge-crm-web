drop function if exists public.owner_prepare_operator_invitation(text, text, text);

create table if not exists public.operator_invitation_audit (
  invitation_id bigint generated always as identity primary key,
  operator_code text not null references public.operators(code) on update cascade on delete restrict,
  email text not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_by_operator text not null,
  status text not null check (status in ('requested', 'sent', 'failed', 'link_pending')),
  auth_user_id uuid references auth.users(id) on delete set null,
  provider_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operator_invitation_audit_email_check
    check (email ~ '^[^[:space:]@]+@viajesdegruposescolares[.]com$')
);

create index if not exists operator_invitation_audit_operator_created_idx
  on public.operator_invitation_audit(operator_code, created_at desc);

create index if not exists operator_invitation_audit_email_created_idx
  on public.operator_invitation_audit(email, created_at desc);

alter table public.operator_invitation_audit enable row level security;
revoke all on table public.operator_invitation_audit from public, anon, authenticated;
grant select, insert, update on table public.operator_invitation_audit to service_role;
grant usage, select on sequence public.operator_invitation_audit_invitation_id_seq to service_role;

comment on table public.operator_invitation_audit
is 'Auditoría interna de invitaciones Auth. Sin acceso desde el navegador; sólo la función administrativa del servidor puede escribirla.';
