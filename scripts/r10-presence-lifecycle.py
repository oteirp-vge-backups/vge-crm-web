#!/usr/bin/env python3
"""Exercise the exact forward/rollback files only on disposable localhost CI."""
from __future__ import annotations
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
NAME = '20261023144210_reduce_operator_presence_admin_privileges.sql'
ROLLBACK = 'supabase/rollback/r10_presence_restore_audited_acl.sql'
spec = importlib.util.spec_from_file_location('r10_plan', ROOT / 'scripts/r10-data-api-plan.py')
plan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plan)
checks = 0
CONFIRM = "SET LOCAL r10.presence_rollback='RESTORE_AUDITED_ACL';\n"

SNAPSHOT = """
SELECT jsonb_build_object(
 'relations',(SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'schema',n.nspname,
   'name',c.relname,'kind',c.relkind,'owner',c.relowner,'rls',c.relrowsecurity,
   'force_rls',c.relforcerowsecurity,'acl',ARRAY(SELECT a::text FROM unnest(c.relacl) a ORDER BY a::text COLLATE "C")) ORDER BY c.oid)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')),
 'functions',(SELECT jsonb_agg(jsonb_build_object('oid',p.oid,'definition',md5(pg_get_functiondef(p.oid)),'acl',p.proacl,'owner',p.proowner) ORDER BY p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind='f'),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_policy p),
 'defaults',(SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_default_acl d),
 'columns',(SELECT jsonb_agg(jsonb_build_object('rel',a.attrelid,'num',a.attnum,'name',a.attname,'type',a.atttypid,
   'notnull',a.attnotnull,'identity',a.attidentity,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attrelid,a.attnum)
   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE n.nspname IN ('public','private') AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('oid',c.oid,'def',pg_get_constraintdef(c.oid)) ORDER BY c.oid)
   FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('oid',t.oid,'def',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) ORDER BY t.oid)
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')),
 'presence_rows',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY operator_code),'[]') FROM public.operator_presence p)
)
"""


def snapshot() -> dict:
    return json.loads(plan.local_sql('--command', SNAPSHOT))


def check(condition: bool, label: str) -> None:
    global checks
    if not condition:
        raise ValueError('LIFECYCLE_FAILED: ' + label)
    checks += 1
    print(f'PASS PRESENCE LIFECYCLE {checks}: {label}', flush=True)


def without_presence_acl(value: dict) -> dict:
    result = copy.deepcopy(value)
    for relation in result['relations']:
        if relation['schema'] == 'public' and relation['name'] == 'operator_presence':
            relation['acl'] = []
    return result


def expected_failure(sql: str, marker: str, label: str) -> None:
    before = snapshot()
    try:
        plan.local_sql('--command', sql)
    except subprocess.CalledProcessError as error:
        # Inspect the expected SQL error but never emit raw database output.
        check(marker in (error.stderr or '') and snapshot() == before, label)
    else:
        raise ValueError('EXPECTED_REJECTION_MISSING: ' + label)


def main() -> None:
    plan.require_local_ci()
    if len(sys.argv) != 2:
        raise ValueError('MIGRATION_SOURCE_DIRECTORY_REQUIRED')
    path = Path(sys.argv[1]) / NAME
    if not path.is_file() or path.is_symlink():
        raise ValueError('FORMAL_MIGRATION_REQUIRED')
    registry = json.loads((ROOT / 'supabase/baseline/pending-migrations.json').read_text())
    entries = [m for m in registry['migrations'] if m['repository_file'] == NAME]
    if len(entries) != 1 or hashlib.sha256(path.read_bytes()).hexdigest() != entries[0]['sha256']:
        raise ValueError('FORMAL_MIGRATION_HASH_MISMATCH')
    forward = path.read_text()
    rollback = plan.regular(ROOT, ROLLBACK).read_text()
    legacy = snapshot()
    plan.local_sql('--file', str(path))
    hardened = snapshot()
    check(legacy != hardened and without_presence_acl(legacy) == without_presence_acl(hardened),
          'exact migration changes only presence ACL; rows, structures, functions, policies and defaults unchanged')
    plan.local_sql('--file', str(path))
    check(snapshot() == hardened, 'reapplying exact migration is idempotent')
    expected_failure(rollback, 'PRESENCE_ROLLBACK_CONFIRMATION_REQUIRED', 'rollback without explicit flag is rejected without changes')
    plan.local_sql('--command', 'BEGIN;\n' + CONFIRM + rollback + '\nCOMMIT;')
    check(snapshot() == legacy, 'authorized local rollback restores exact original metadata')
    expected_failure('BEGIN;\n' + forward + "\nDO $$ BEGIN RAISE EXCEPTION 'FORCED_AFTER_REVOKE'; END $$;\nCOMMIT;",
                     'FORCED_AFTER_REVOKE', 'forced later failure rolls back every permission change')
    plan.local_sql('--file', str(path))
    check(snapshot() == hardened, 'migration reapplies successfully after rollback')
    expected_failure('BEGIN; GRANT SELECT ON public.operator_presence TO anon;\n' + forward,
                     'PRESENCE_ACL_DRIFT', 'unexpected anonymous grant stops migration without collateral changes')
    expected_failure('BEGIN; GRANT TRUNCATE ON public.operator_presence TO authenticated;\n' + forward,
                     'PRESENCE_ACL_DRIFT', 'partially changed privileges stop migration')
    expected_failure('BEGIN; ALTER TABLE public.operator_presence DISABLE ROW LEVEL SECURITY;\n' + forward,
                     'PRESENCE_STRUCTURE_DRIFT', 'disabled RLS stops migration')
    expected_failure('BEGIN; REVOKE EXECUTE ON FUNCTION public.touch_operator_presence(boolean,boolean) FROM authenticated;\n' + forward,
                     'PRESENCE_RPC_DRIFT', 'unexpected heartbeat RPC permissions stop migration')
    expected_failure('BEGIN; SET LOCAL ROLE authenticated;\n' + forward,
                     'PRESENCE_OWNER_REQUIRED', 'application role cannot apply the migration')
    expected_failure('BEGIN; GRANT UPDATE ON public.operator_presence TO authenticated;\n' + CONFIRM + rollback,
                     'PRESENCE_ROLLBACK_ACL_DRIFT', 'rollback refuses a changed access configuration')

    # Real nonempty synthetic row, all inside a transaction that is rolled back.
    seed = """
BEGIN;
INSERT INTO auth.users(id,email) VALUES ('60000000-0000-4000-8000-000000000001','lifecycle@example.invalid');
INSERT INTO public.operators(code,display_name,email,auth_user_id,role,access_role,active)
 VALUES ('R22-LIFECYCLE','Synthetic lifecycle','lifecycle@example.invalid','60000000-0000-4000-8000-000000000001','seller','seller',true);
INSERT INTO public.operator_presence(operator_code,last_heartbeat_at,updated_at) VALUES ('R22-LIFECYCLE',now(),now());
CREATE TEMP TABLE r22_preserved_rows ON COMMIT DROP AS SELECT to_jsonb(p) AS data FROM public.operator_presence p;
"""
    unchanged_rows = """
DO $$ BEGIN
 IF EXISTS ((SELECT data FROM r22_preserved_rows EXCEPT SELECT to_jsonb(p) FROM public.operator_presence p)
   UNION ALL (SELECT to_jsonb(p) FROM public.operator_presence p EXCEPT SELECT data FROM r22_preserved_rows))
 THEN RAISE EXCEPTION 'SYNTHETIC_PRESENCE_ROWS_CHANGED'; END IF;
END $$;
"""
    plan.local_sql('--command', seed + CONFIRM + rollback + unchanged_rows + forward + unchanged_rows + '\nROLLBACK;')
    check(snapshot() == hardened, 'nonempty synthetic presence rows survive rollback and reapply; test data rolled back')
    plan.local_sql('--command', 'BEGIN;\n' + CONFIRM + rollback + '\nCOMMIT;')
    check(snapshot() == legacy, 'original local baseline restored before normal candidate pipeline')
    print(f'PRESENCE_LIFECYCLE_RESULT: {checks}/{checks}; exact registered migration and guarded rollback.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print('PRESENCE_LIFECYCLE_ERROR: ' + (str(error) if isinstance(error, ValueError) else type(error).__name__), file=sys.stderr)
        raise SystemExit(1)
