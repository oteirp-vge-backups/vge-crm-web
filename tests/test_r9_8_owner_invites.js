const fs=require('fs');
const html=fs.readFileSync('publish/index.html','utf8');
const edge=fs.readFileSync('supabase/functions/vge-admin-invite-operator/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260824144908_owner_invite_operator.sql','utf8');
const hardening=fs.readFileSync('supabase/migrations/20260824145216_harden_owner_invites.sql','utf8');

function check(condition,message){if(!condition)throw new Error(message)}

check(html.includes('VERSIÓN V15 · R9.8'),'La interfaz no identifica R9.8');
check(html.includes('vge-admin-invite-operator'),'La interfaz no invoca la función de invitaciones');
check(html.includes('if(!isOwner){alert("Esta acción está reservada al propietario.")'),'Falta el bloqueo de propietario en el cliente');
check(html.includes('data-invite-send'),'Falta el control de envío por operador');
check(edge.includes('owner.access_role !== "owner"'),'La función no revalida el rol de propietario en la base');
check(edge.includes('userClient.auth.getUser(token)'),'La función no valida la sesión en Supabase Auth');
check(edge.includes('adminClient.auth.admin.inviteUserByEmail'),'La función no utiliza la invitación oficial de Supabase');
check(edge.includes('auth_user_id: inviteData.user.id'),'La función no enlaza el usuario con el operador');
check(edge.includes('.from("operator_invitation_audit")'),'La función no registra la auditoría de invitaciones');
check(!html.includes('SUPABASE_SERVICE_ROLE_KEY'),'El HTML público contiene una referencia a la clave administrativa');
check(migration.includes('if not private.is_owner()'),'La base no revalida al propietario');
check(migration.includes('revoke all on function public.owner_prepare_operator_invitation'),'La función SQL no revoca el acceso público');
check(migration.includes('grant execute on function public.owner_prepare_operator_invitation'),'La función SQL no limita la ejecución a autenticados');
check(hardening.includes('drop function if exists public.owner_prepare_operator_invitation'),'No se retira el RPC público provisional');
check(hardening.includes('alter table public.operator_invitation_audit enable row level security'),'La auditoría no tiene RLS');
check(hardening.includes('revoke all on table public.operator_invitation_audit from public, anon, authenticated'),'La auditoría es accesible desde el navegador');

console.log('R9.8: invitaciones exclusivas del propietario protegidas en cliente, servidor y base');
