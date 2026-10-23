-- MANUAL CONTINGENCY ONLY. Not in the forward migration directory.
-- Requires separate authorization in production; restores eight inherited grants.
-- Run in one connection with SET r10.presence_rollback='RESTORE_AUDITED_ACL'.
DO $presence_rollback$
DECLARE
  target oid := to_regclass('public.operator_presence');
  actual aclitem[];
  legacy constant aclitem[] := ARRAY[
    'postgres=arwdDxtm/postgres','authenticated=rDxtm/postgres',
    'service_role=Dxtm/postgres']::aclitem[];
  minimal constant aclitem[] := ARRAY[
    'postgres=arwdDxtm/postgres','authenticated=r/postgres']::aclitem[];
  previous_lock_timeout text := current_setting('lock_timeout');
BEGIN
  IF current_setting('r10.presence_rollback',true) IS DISTINCT FROM 'RESTORE_AUDITED_ACL' THEN
    RAISE EXCEPTION 'PRESENCE_ROLLBACK_CONFIRMATION_REQUIRED';
  END IF;
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'PRESENCE_OWNER_REQUIRED'; END IF;
  PERFORM set_config('lock_timeout','2s',true);
  IF target IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid=target AND relkind='r'
      AND relowner='postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity
  ) THEN RAISE EXCEPTION 'PRESENCE_STRUCTURE_DRIFT'; END IF;
  SELECT relacl INTO actual FROM pg_class WHERE oid=target;
  IF NOT coalesce(actual @> minimal AND actual <@ minimal,false) THEN
    RAISE EXCEPTION 'PRESENCE_ROLLBACK_ACL_DRIFT';
  END IF;
  GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
    ON TABLE public.operator_presence TO authenticated, service_role;
  SELECT relacl INTO actual FROM pg_class WHERE oid=target;
  IF NOT coalesce(actual @> legacy AND actual <@ legacy,false) THEN
    RAISE EXCEPTION 'PRESENCE_ROLLBACK_POSTCONDITION_FAILED';
  END IF;
  PERFORM set_config('lock_timeout',previous_lock_timeout,true);
END;
$presence_rollback$;
