#!/usr/bin/env python3
"""Exercise real discovery + local execution + validation with disposable fake SQL."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

SPEC = importlib.util.spec_from_file_location('r10_plan', Path(__file__).with_name('r10-data-api-plan.py'))
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)
TABLE = 'public.r10_ci_candidate_probe'
ACCESS = {'anon': [], 'authenticated': ['SELECT'], 'service_role': []}


def main():
    p.require_local_ci()
    before = p.snapshot()
    p.require(TABLE not in before, 'CONTROL_NAME_COLLISION')
    with tempfile.TemporaryDirectory(prefix='r10-candidate-controls-', dir=os.environ['RUNNER_TEMP']) as tmp:
        root = Path(tmp)
        (root / 'supabase/migrations').mkdir(parents=True)
        (root / 'supabase/tests').mkdir(parents=True)
        subprocess.run(['supabase', 'migration', 'new', '--help'], cwd=root, check=True, stdout=subprocess.DEVNULL)
        # A genuine CLI-generated filename; never committed or installed in production.
        subprocess.run(['supabase', 'migration', 'new', 'r10_ci_candidate_probe'], cwd=root, check=True, stdout=subprocess.DEVNULL)
        paths = list((root / 'supabase/migrations').glob('*.sql'))
        p.require(len(paths) == 1, 'ONE_SYNTHETIC_MIGRATION_REQUIRED')
        migration = paths[0]
        test = 'supabase/tests/probe.test.sql'
        (root / test).write_text('begin; select plan(1); select ok(true); select * from finish(); rollback;\n')
        template = f'''CREATE TABLE {TABLE} (id integer primary key, payload text not null);
REVOKE ALL ON {TABLE} FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_test ON {TABLE} FOR SELECT TO authenticated USING (true);
GRANT SELECT ON {TABLE} TO authenticated;
INSERT INTO {TABLE} VALUES (1, 'executed-by-discovered-file');
'''
        cases = [
            ('valid', template, None),
            ('missing_grant', template.replace(f'GRANT SELECT ON {TABLE} TO authenticated;', ''), 'GRANT_CONTRACT_MISMATCH'),
            ('missing_rls', template.replace(f'ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY;', f'ALTER TABLE {TABLE} DISABLE ROW LEVEL SECURITY;'), 'RLS_REQUIRED'),
            ('anonymous_grant', template + f'GRANT SELECT ON {TABLE} TO anon;\n', 'ANON_PRIVILEGE'),
            ('table_not_created', 'SELECT 1;\n', 'DECLARED_TABLE_NOT_CREATED'),
        ]
        for label, sql, expected_failure in cases:
            migration.write_text(sql)
            inventory = [{'repository_file': migration.name, 'sha256': p.digest(migration)}]
            contracts = {'schema_version': 1, 'migrations': [{'file': migration.name,
                         'tests': [test], 'tables': {TABLE: ACCESS}}]}
            plan = p.build_plan(root, {}, inventory, contracts)
            try:
                p.execute_candidates(plan, migration.parent)
                try:
                    p.validate_contracts(plan, before, p.snapshot())
                except ValueError as error:
                    if expected_failure is None or not str(error).startswith(expected_failure):
                        raise
                    print('PASS CANDIDATE CONTROL: ' + label + ' rejected as ' + expected_failure, flush=True)
                else:
                    p.require(expected_failure is None, 'NEGATIVE_CONTROL_DID_NOT_FAIL: ' + label)
                    p.require(p.local_sql('--command', f'SELECT payload FROM {TABLE} WHERE id=1') == 'executed-by-discovered-file', 'SQL_FILE_NOT_EXECUTED')
                    print('PASS CANDIDATE CONTROL: valid migration discovered, executed and grant verified.', flush=True)
            finally:
                # The precondition above guarantees this is our disposable synthetic table.
                if TABLE in p.snapshot():
                    p.local_sql('--command', f'DROP TABLE {TABLE}')
        p.require(p.snapshot() == before, 'SYNTHETIC_CONTROLS_LEFT_SCHEMA_CHANGES')
        print('CANDIDATE_CONTROLS_RESULT: 5/5; pre-test metadata restored.', flush=True)


if __name__ == '__main__':
    main()
