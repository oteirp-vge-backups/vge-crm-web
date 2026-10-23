-- Read-only pre/post evidence; no application data and no functional RPC calls.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='8s';
SET LOCAL lock_timeout='1s';
WITH target AS (
 SELECT c.* FROM pg_class c WHERE c.oid=to_regclass('public.operator_presence')
), expected AS (
 SELECT ARRAY['postgres=arwdDxtm/postgres','authenticated=rDxtm/postgres','service_role=Dxtm/postgres']::aclitem[] AS legacy,
        ARRAY['postgres=arwdDxtm/postgres','authenticated=r/postgres']::aclitem[] AS minimal
)
SELECT jsonb_build_object(
 'read_only',current_setting('transaction_read_only'),'checked_at',now(),'executor',current_user,
 'state',(SELECT CASE WHEN t.relacl @> e.legacy AND t.relacl <@ e.legacy THEN 'ORIGINAL'
                     WHEN t.relacl @> e.minimal AND t.relacl <@ e.minimal THEN 'HARDENED'
                     ELSE 'DRIFT' END FROM target t CROSS JOIN expected e),
 'table',(SELECT jsonb_build_object('owner',pg_get_userbyid(relowner),'rls',relrowsecurity,'force_rls',relforcerowsecurity,'acl',relacl::text) FROM target),
 'privileges',(SELECT jsonb_agg(jsonb_build_object('role',r,'privilege',p,'allowed',has_table_privilege(r,t.oid,p)) ORDER BY r,p)
   FROM target t CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) r
   CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'definition_md5',md5(pg_get_functiondef(p.oid)),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'acl',p.proacl::text) ORDER BY p.proname)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
   AND p.proname IN ('touch_operator_presence','mark_operator_offline','get_team_presence_v2','get_team_presence')),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.policyname) FROM pg_policies p WHERE schemaname='public' AND tablename='operator_presence'),
 'migration_count',(SELECT count(*) FROM supabase_migrations.schema_migrations),
 'latest_migration',(SELECT jsonb_build_object('version',version,'name',name) FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1)
) AS presence_verification;
ROLLBACK;
