-- Only disposable local CI, after the separately guarded review fixture.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();
SELECT ok(NOT has_table_privilege(r.role_name,'public.operator_presence',p.privilege),
 r.role_name||' cannot '||p.privilege)
 FROM (VALUES('authenticated'),('service_role')) r(role_name)
 CROSS JOIN (VALUES('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) p(privilege);
SELECT ok(has_table_privilege('authenticated','public.operator_presence','SELECT'),'authenticated retains SELECT');
SELECT ok(NOT has_table_privilege('authenticated','public.operator_presence','INSERT,UPDATE,DELETE'),'no direct client DML');
SELECT ok(NOT has_table_privilege('anon','public.operator_presence','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN'),'anon remains blocked');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.operator_presence'::regclass),'RLS remains enabled');
SELECT ok(has_function_privilege('authenticated','public.touch_operator_presence(boolean,boolean)','EXECUTE'),'heartbeat RPC remains callable');
SELECT ok(has_function_privilege('authenticated','public.mark_operator_offline()','EXECUTE'),'logout RPC remains callable');
SELECT ok(has_function_privilege('authenticated','public.get_team_presence_v2()','EXECUTE'),'team RPC remains callable with internal authorization');
SELECT ok(NOT has_function_privilege('anon','public.touch_operator_presence(boolean,boolean)','EXECUTE'),'anon cannot call heartbeat');
SELECT ok(NOT has_function_privilege('authenticated','public.get_team_presence()','EXECUTE'),'legacy RPC stays disabled');

INSERT INTO auth.users(id,email) VALUES
 ('50000000-0000-4000-8000-000000000001','presence-a@example.invalid'),
 ('50000000-0000-4000-8000-000000000002','presence-b@example.invalid'),
 ('50000000-0000-4000-8000-000000000003','presence-owner@example.invalid'),
 ('50000000-0000-4000-8000-000000000004','presence-manager@example.invalid');
INSERT INTO public.operators(code,display_name,email,auth_user_id,role,access_role,active) VALUES
 ('R22-A','Presence A','presence-a@example.invalid','50000000-0000-4000-8000-000000000001','seller','seller',true),
 ('R22-B','Presence B','presence-b@example.invalid','50000000-0000-4000-8000-000000000002','seller','seller',true),
 ('R22-OWNER','Presence Owner','presence-owner@example.invalid','50000000-0000-4000-8000-000000000003','admin','owner',true),
 ('R22-MANAGER','Presence Manager','presence-manager@example.invalid','50000000-0000-4000-8000-000000000004','admin','manager',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT lives_ok($$SELECT public.touch_operator_presence(true,true)$$,'seller can record login and interaction');
SELECT lives_ok($$SELECT public.touch_operator_presence(false,false)$$,'seller can renew heartbeat');
SELECT results_eq($$SELECT count(*) FROM public.operator_presence$$,ARRAY[0::bigint],'seller cannot directly read team presence');
SELECT throws_ok($$SELECT * FROM public.get_team_presence_v2()$$,'P0001','ADMIN_REQUIRED','seller cannot view team RPC');
SELECT throws_ok($$TRUNCATE public.operator_presence$$,'42501','permission denied for table operator_presence','seller cannot truncate');
SELECT throws_ok($$UPDATE public.operator_presence SET last_logout_at=now()$$,'42501','permission denied for table operator_presence','seller cannot directly update presence');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.operator_presence WHERE operator_code='R22-A' AND last_heartbeat_at IS NOT NULL AND last_login_at IS NOT NULL AND last_interaction_at IS NOT NULL),1::bigint,'heartbeat and login persisted through definer RPC');
SELECT is((SELECT count(*) FROM public.operator_presence WHERE operator_code='R22-B'),0::bigint,'A did not create a presence row for B');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
SELECT lives_ok($$SELECT public.touch_operator_presence(true,true)$$,'second seller can record own presence');
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT results_eq($$SELECT count(*) FROM public.get_team_presence_v2()$$,ARRAY[4::bigint],'owner sees four synthetic team members');
SELECT results_eq($$SELECT is_online FROM public.get_team_presence_v2() WHERE operator_code='R22-A'$$,ARRAY[true],'owner sees seller online');
SELECT results_eq($$SELECT count(*) FROM public.operator_presence$$,ARRAY[2::bigint],'owner retains RLS-protected direct read');
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
SELECT results_eq($$SELECT count(*) FROM public.get_team_presence_v2()$$,ARRAY[4::bigint],'manager retains team overview');
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT lives_ok($$SELECT public.mark_operator_offline()$$,'seller can record logout');
RESET ROLE;
SELECT ok((SELECT last_logout_at IS NOT NULL FROM public.operator_presence WHERE operator_code='R22-A'),'logout persisted');
SELECT ok((SELECT last_logout_at IS NULL FROM public.operator_presence WHERE operator_code='R22-B'),'logout did not affect another seller');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SELECT results_eq($$SELECT is_online FROM public.get_team_presence_v2() WHERE operator_code='R22-A'$$,ARRAY[false],'owner sees logged-out seller offline');
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT lives_ok($$SELECT public.touch_operator_presence(true,true)$$,'seller can log in again');
RESET ROLE;
SELECT ok((SELECT last_logout_at IS NULL FROM public.operator_presence WHERE operator_code='R22-A'),'new login clears logout marker');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated"}',true);
SELECT throws_ok($$SELECT public.touch_operator_presence(false,false)$$,'P0001','AUTH_REQUIRED','missing identity is denied');
SELECT set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
SELECT throws_ok($$SELECT public.touch_operator_presence(false,false)$$,'P0001','OPERATOR_NOT_LINKED','unlinked identity is denied');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok($$TRUNCATE public.operator_presence$$,'42501','permission denied for table operator_presence','backend role cannot truncate either');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
