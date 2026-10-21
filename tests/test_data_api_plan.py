"""Offline tests: discovery must fail closed, never silently skip new SQL."""
import copy
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('r10_plan', Path(__file__).resolve().parents[1] / 'scripts/r10-data-api-plan.py')
p = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(p)
OLD = '20261013102327_historical.sql'
NEW = '20990101000000_future.sql'
TEST = 'supabase/tests/migrations/future.test.sql'
ACCESS = {'anon': [], 'authenticated': ['SELECT'], 'service_role': []}


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'supabase/migrations').mkdir(parents=True)
        (self.root / 'supabase/tests/migrations').mkdir(parents=True)
        self.write(OLD, '-- frozen historical SQL\n')
        self.historical = {OLD: p.digest(self.root / 'supabase/migrations' / OLD)}
        self.contracts = {'schema_version': 1, 'migrations': []}

    def write(self, name, sql):
        (self.root / 'supabase/migrations' / name).write_text(sql)

    def inventory(self):
        return [{'repository_file': f.name, 'sha256': p.digest(f)}
                for f in (self.root / 'supabase/migrations').iterdir() if f.is_file()]

    def add_future(self, name=NEW):
        self.write(name, 'select 1;\n')
        (self.root / TEST).write_text('begin; select plan(1); select ok(true); select * from finish(); rollback;\n')
        self.contracts['migrations'].append({'file': name, 'tests': [TEST], 'tables': {'public.future': copy.deepcopy(ACCESS)}})

    def plan(self):
        return p.build_plan(self.root, self.historical, self.inventory(), self.contracts)

    def test_empty_future_is_valid(self):
        self.assertEqual(self.plan()['migrations'], [])

    def test_new_sql_is_discovered_with_tests_and_hash(self):
        self.add_future()
        result = self.plan()['migrations'][0]
        self.assertEqual(result['file'], NEW)
        self.assertIn(TEST, result['tests'])
        self.assertEqual(len(result['sha256']), 64)

    def test_unregistered_sql_is_not_skipped(self):
        self.write(NEW, 'select 1;')
        with self.assertRaisesRegex(ValueError, 'EVERY_NEW_MIGRATION'):
            self.plan()

    def test_changed_historical_file_is_blocked(self):
        self.write(OLD, 'select 2;')
        with self.assertRaisesRegex(ValueError, 'HISTORICAL_SQL_CHANGED'):
            self.plan()

    def test_deleted_historical_file_is_blocked(self):
        (self.root / 'supabase/migrations' / OLD).unlink()
        with self.assertRaisesRegex(ValueError, 'HISTORICAL_SQL_CHANGED'):
            self.plan()

    def test_missing_test_is_blocked(self):
        self.add_future()
        (self.root / TEST).unlink()
        with self.assertRaisesRegex(ValueError, 'MISSING_OR_EMPTY'):
            self.plan()

    def test_empty_test_list_is_blocked(self):
        self.add_future()
        self.contracts['migrations'][0]['tests'] = []
        with self.assertRaisesRegex(ValueError, 'EXECUTABLE_TESTS'):
            self.plan()

    def test_missing_ledger_entry_is_blocked(self):
        self.add_future()
        with self.assertRaisesRegex(ValueError, 'LEDGER_MUST_COVER'):
            p.build_plan(self.root, self.historical, [], self.contracts)

    def test_symlink_is_blocked(self):
        self.add_future()
        f = self.root / 'supabase/migrations' / NEW
        f.unlink()
        f.symlink_to(self.root / 'supabase/migrations' / OLD)
        with self.assertRaisesRegex(ValueError, 'SYMLINK_REFUSED'):
            self.plan()

    def test_backdated_sql_is_blocked(self):
        self.add_future('20000101000000_backdated.sql')
        with self.assertRaisesRegex(ValueError, 'BACKDATED'):
            self.plan()

    def test_duplicate_version_is_blocked(self):
        self.add_future()
        self.write('20990101000000_duplicate.sql', 'select 1;')
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_MIGRATION_VERSION'):
            self.plan()

    def test_path_traversal_is_blocked(self):
        self.add_future()
        self.contracts['migrations'][0]['tests'] = ['supabase/tests/../../outside.sql']
        with self.assertRaisesRegex(ValueError, 'UNSAFE_PATH'):
            self.plan()

    def test_anonymous_contract_is_blocked(self):
        self.add_future()
        self.contracts['migrations'][0]['tables']['public.future']['anon'] = ['SELECT']
        with self.assertRaisesRegex(ValueError, 'ANONYMOUS'):
            self.plan()

    def test_admin_privilege_contract_is_blocked(self):
        self.add_future()
        self.contracts['migrations'][0]['tables']['public.future']['authenticated'] = ['TRUNCATE']
        with self.assertRaisesRegex(ValueError, 'ADMINISTRATIVE'):
            self.plan()

    def test_order_is_chronological(self):
        self.add_future('20990102000000_later.sql')
        self.add_future(NEW)
        # Two migrations may share a test, not claim the same final table contract twice.
        self.contracts['migrations'][0]['tables'] = {}
        self.assertEqual([m['file'] for m in self.plan()['migrations']], [NEW, '20990102000000_later.sql'])

    def test_runtime_refuses_non_ci(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ValueError, 'ISOLATED_CI'):
                p.local_sql('--command', 'select 1')

    def test_runtime_refuses_remote_credentials(self):
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'R10_ISOLATED_CI': 'YES', 'DATABASE_URL': 'refused'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'REMOTE_CREDENTIAL'):
                p.local_sql('--command', 'select 1')

    def test_runtime_uses_fixed_local_connection_clean_environment(self):
        with patch.dict(os.environ, {'GITHUB_ACTIONS': 'true', 'R10_ISOLATED_CI': 'YES', 'PATH': '/usr/bin', 'HOME': '/tmp', 'PGHOST': 'remote.invalid'}, clear=True):
            with patch.object(p.subprocess, 'run') as run:
                run.return_value.stdout = 'ok'
                p.local_sql('--command', 'select 1')
                args, kwargs = run.call_args
                self.assertIn('--host=127.0.0.1', args[0])
                self.assertIn('--port=54322', args[0])
                self.assertNotIn('PGHOST', kwargs['env'])


class ContractTests(unittest.TestCase):
    def test_missing_grant_is_detected(self):
        with self.assertRaisesRegex(ValueError, 'GRANT_CONTRACT_MISMATCH'):
            p.validate_contracts({'tables': {'public.future': ACCESS}}, {}, {'public.future': {'rls': True, 'roles': {r: [] for r in p.ROLES}}})

    def test_new_table_without_declaration_is_detected(self):
        with self.assertRaisesRegex(ValueError, 'NEW_TABLE_WITHOUT_CONTRACT'):
            p.validate_contracts({'tables': {}}, {}, {'public.future': {'rls': True, 'roles': ACCESS}})

    def test_existing_access_change_is_detected(self):
        before = {'public.old': {'rls': True, 'roles': ACCESS}}
        after = copy.deepcopy(before)
        after['public.old']['roles']['authenticated'] = []
        with self.assertRaisesRegex(ValueError, 'UNDECLARED_EXISTING_ACCESS_CHANGE'):
            p.validate_contracts({'tables': {}}, before, after)


if __name__ == '__main__':
    unittest.main()
