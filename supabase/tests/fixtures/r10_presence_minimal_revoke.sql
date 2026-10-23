-- REVIEW FIXTURE ONLY. Not a production migration. Fixed-local CI runner only.
BEGIN;
DO $$ BEGIN
  IF current_setting('r10.isolated_presence_review',true) IS DISTINCT FROM 'YES' THEN
    RAISE EXCEPTION 'ISOLATED_PRESENCE_REVIEW_REQUIRED';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.operator_presence'::regclass
    AND relowner='postgres'::regrole AND relrowsecurity) THEN
    RAISE EXCEPTION 'UNEXPECTED_PRESENCE_STRUCTURE';
  END IF;
END $$;
CREATE TEMP TABLE r22_relation_snapshot ON COMMIT DROP AS
 SELECT c.oid,c.relacl,c.relrowsecurity,c.relforcerowsecurity,c.relowner
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','private');
CREATE TEMP TABLE r22_function_snapshot ON COMMIT DROP AS
 SELECT p.oid,md5(pg_get_functiondef(p.oid)) AS definition_hash,p.proacl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','private') AND p.prokind='f';
CREATE TEMP TABLE r22_policy_snapshot ON COMMIT DROP AS
 SELECT oid,to_jsonb(p) AS definition FROM pg_policy p;
CREATE TEMP TABLE r22_defaults_snapshot ON COMMIT DROP AS
 SELECT oid,to_jsonb(d) AS definition FROM pg_default_acl d;

-- The entire proposed functional change: only four table privileges, two API roles.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
 ON TABLE public.operator_presence FROM authenticated, service_role;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM r22_relation_snapshot s JOIN pg_class c USING(oid)
    WHERE s.relowner IS DISTINCT FROM c.relowner
       OR s.relrowsecurity IS DISTINCT FROM c.relrowsecurity
       OR s.relforcerowsecurity IS DISTINCT FROM c.relforcerowsecurity
       OR (s.oid<>'public.operator_presence'::regclass AND s.relacl IS DISTINCT FROM c.relacl)) THEN
    RAISE EXCEPTION 'UNEXPECTED_RELATION_CHANGE';
  END IF;
  IF EXISTS(SELECT 1 FROM r22_function_snapshot s JOIN pg_proc p USING(oid)
    WHERE s.definition_hash IS DISTINCT FROM md5(pg_get_functiondef(p.oid)) OR s.proacl IS DISTINCT FROM p.proacl) THEN
    RAISE EXCEPTION 'UNEXPECTED_FUNCTION_CHANGE';
  END IF;
  IF EXISTS(SELECT 1 FROM r22_policy_snapshot s FULL JOIN pg_policy p USING(oid)
    WHERE s.definition IS DISTINCT FROM to_jsonb(p)) THEN RAISE EXCEPTION 'UNEXPECTED_POLICY_CHANGE'; END IF;
  IF EXISTS(SELECT 1 FROM r22_defaults_snapshot s FULL JOIN pg_default_acl d USING(oid)
    WHERE s.definition IS DISTINCT FROM to_jsonb(d)) THEN RAISE EXCEPTION 'UNEXPECTED_DEFAULT_CHANGE'; END IF;
  IF NOT has_table_privilege('authenticated','public.operator_presence','SELECT')
     OR has_table_privilege('authenticated','public.operator_presence','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
     OR has_table_privilege('anon','public.operator_presence','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
     OR has_table_privilege('service_role','public.operator_presence','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN
    RAISE EXCEPTION 'UNEXPECTED_PRESENCE_GRANTS';
  END IF;
END $$;
COMMIT;
SELECT 'LOCAL_PRESENCE_REVIEW: only eight grants removed; RLS, functions, defaults and other relation ACLs unchanged';
