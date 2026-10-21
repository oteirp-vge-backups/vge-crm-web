#!/usr/bin/env python3
"""Discover EVERY post-audit migration and execute only in disposable local CI."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ANCHOR = '871051cdf68178c349b3b490ed2727f38ad540e2'
NAME = re.compile(r'^[0-9]{14}_[a-z0-9_]+\.sql$')
TABLE = re.compile(r'^public\.[a-z][a-z0-9_]*$')
ROLES = ('anon', 'authenticated', 'service_role')
PRIVILEGES = ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')
CREDENTIALS = ('SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_DB_URL',
               'TARGET_DB_URL', 'DATABASE_URL', 'AWS_ACCESS_KEY_ID',
               'AWS_SECRET_ACCESS_KEY', 'RESEND_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY')


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def regular(root: Path, relative: str) -> Path:
    p = Path(relative)
    require(not p.is_absolute() and '..' not in p.parts, 'UNSAFE_PATH')
    current = root
    for part in p.parts:
        current = current / part
        require(not current.is_symlink(), 'SYMLINK_REFUSED')
    require(current.is_file() and current.stat().st_size > 0, 'MISSING_OR_EMPTY_FILE: ' + relative)
    return current


def build_plan(root: Path, historical: dict, inventory: list, contracts: dict) -> dict:
    """Pure discovery/validation. No database connection and no SQL execution."""
    source = root / 'supabase/migrations'
    require(source.is_dir() and not source.is_symlink(), 'MIGRATIONS_DIRECTORY_REQUIRED')
    names = sorted(p.name for p in source.iterdir())
    require(all(NAME.fullmatch(n) for n in names), 'INVALID_MIGRATION_FILENAME')
    require(len({n[:14] for n in names}) == len(names), 'DUPLICATE_MIGRATION_VERSION')
    hashes = {n: digest(regular(root, 'supabase/migrations/' + n)) for n in names}
    for name, expected in historical.items():
        require(hashes.get(name) == expected, 'HISTORICAL_SQL_CHANGED: ' + name)
    indexed = {}
    for item in inventory:
        name = item['repository_file']
        require(name not in indexed, 'DUPLICATE_LEDGER_ENTRY')
        indexed[name] = item['sha256']
    require(indexed == hashes, 'LEDGER_MUST_COVER_EVERY_SQL_WITH_EXACT_HASH')
    future = sorted(set(names) - set(historical))
    require(all(n > max(historical, default='') for n in future), 'BACKDATED_MIGRATION')
    require(contracts.get('schema_version') == 1, 'CONTRACT_VERSION')
    entries = contracts.get('migrations')
    require(isinstance(entries, list), 'MIGRATION_CONTRACTS_REQUIRED')
    registered = {}
    table_contracts = {}
    for entry in entries:
        name = entry['file']
        require(name not in registered, 'DUPLICATE_CONTRACT')
        tests = entry.get('tests')
        require(isinstance(tests, list) and bool(tests), 'MIGRATION_NEEDS_EXECUTABLE_TESTS')
        test_hashes = {}
        for test in tests:
            require(isinstance(test, str) and test.startswith('supabase/tests/') and test.endswith('.sql'), 'TEST_PATH_REQUIRED')
            test_hashes[test] = digest(regular(root, test))
        tables = entry.get('tables')
        require(isinstance(tables, dict), 'EXPLICIT_TABLE_CONTRACT_REQUIRED')
        for table, access in tables.items():
            require(TABLE.fullmatch(table) is not None, 'INVALID_TABLE_NAME')
            require(table not in table_contracts, 'DUPLICATE_TABLE_CONTRACT')
            require(isinstance(access, dict) and set(access) == set(ROLES), 'ALL_THREE_ROLES_REQUIRED')
            for role, privileges in access.items():
                require(isinstance(privileges, list) and len(privileges) == len(set(privileges)), 'INVALID_PRIVILEGES')
                require(set(privileges) <= {'SELECT', 'INSERT', 'UPDATE', 'DELETE'}, 'ADMINISTRATIVE_GRANT_REFUSED')
            require(access['anon'] == [], 'ANONYMOUS_CRM_ACCESS_REFUSED')
            table_contracts[table] = {r: sorted(v) for r, v in access.items()}
        registered[name] = {'file': name, 'sha256': hashes.get(name), 'tests': test_hashes}
    require(set(registered) == set(future), 'EVERY_NEW_MIGRATION_NEEDS_A_CONTRACT')
    return {'anchor': ANCHOR, 'migrations': [registered[n] for n in future], 'tables': table_contracts}


def require_local_ci() -> None:
    require(os.environ.get('R10_ISOLATED_CI') == 'YES' and os.environ.get('GITHUB_ACTIONS') == 'true', 'ISOLATED_CI_REQUIRED')
    require(not any(n in os.environ for n in CREDENTIALS), 'REMOTE_CREDENTIAL_REFUSED')


def local_sql(*arguments: str) -> str:
    require_local_ci()
    env = {'PATH': os.environ['PATH'], 'HOME': os.environ['HOME'],
           'PGPASSWORD': 'postgres', 'PGSSLMODE': 'disable', 'PGPASSFILE': '/dev/null'}
    result = subprocess.run(['psql', '-X', '--host=127.0.0.1', '--port=54322',
        '--username=postgres', '--dbname=postgres', '--set=ON_ERROR_STOP=1',
        '--quiet', '--tuples-only', '--no-align', *arguments],
        env=env, check=True, capture_output=True, text=True, timeout=120)
    return result.stdout.strip()


def snapshot() -> dict:
    # Metadata only: no CRM row content. Fixed query and fixed localhost endpoint.
    sql = """SELECT coalesce(jsonb_object_agg('public.'||t.relname,
      jsonb_build_object('rls',t.relrowsecurity,'roles',
        (SELECT jsonb_object_agg(r, (SELECT coalesce(jsonb_agg(p ORDER BY p),'[]')
          FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
          WHERE has_table_privilege(r,t.oid,p)))
         FROM unnest(ARRAY['anon','authenticated','service_role']) r))), '{}')
      FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relkind IN ('r','p')"""
    return json.loads(local_sql('--command', sql))


def validate_contracts(plan: dict, before: dict, after: dict) -> None:
    expected = plan['tables']
    require(set(before) <= set(after), 'EXISTING_TABLE_REMOVED')
    require((set(after) - set(before)) <= set(expected), 'NEW_TABLE_WITHOUT_CONTRACT')
    require(set(expected) <= set(after), 'DECLARED_TABLE_NOT_CREATED')
    for table, info in after.items():
        require(info['rls'], 'RLS_REQUIRED: ' + table)
        require(info['roles']['anon'] == [], 'ANON_PRIVILEGE: ' + table)
        if table in expected:
            require(info['roles'] == expected[table], 'GRANT_CONTRACT_MISMATCH: ' + table)
        elif table in before:
            require(info == before[table], 'UNDECLARED_EXISTING_ACCESS_CHANGE: ' + table)


def execute_candidates(plan: dict, source: Path) -> None:
    # Same execution path is used by the synthetic positive and negative controls.
    require_local_ci()
    for migration in plan['migrations']:
        name = migration['file']
        require(NAME.fullmatch(name) is not None, 'INVALID_MIGRATION_FILENAME')
        path = source / name
        require(path.is_file() and not path.is_symlink() and digest(path) == migration['sha256'], 'CANDIDATE_HASH_CHANGED')
        local_sql('--file', str(path))
        print('APPLIED_LOCAL_CANDIDATE: ' + name, flush=True)


def git_bytes(root: Path, path: str) -> bytes:
    return subprocess.check_output(['git', '-C', str(root), 'show', ANCHOR + ':' + path])


def main() -> None:
    command = sys.argv[1]
    root = Path(sys.argv[2]).resolve()
    if command == 'plan':
        for path in ('supabase/baseline/current-schema.sql', 'supabase/baseline/current-schema.sql.sha256', 'supabase/config.toml'):
            require(regular(root, path).read_bytes() == git_bytes(root, path), 'FROZEN_BASE_OR_LOCAL_CONFIG_CHANGED: ' + path)
        sealed = json.loads(git_bytes(root, 'supabase/baseline/production-ledger-current.json'))
        historical = {m['repository_file']: m['sha256'] for m in sealed['source_mappings']}
        current = json.loads(regular(root, 'supabase/baseline/production-ledger-current.json').read_text())
        pending = json.loads(regular(root, 'supabase/baseline/pending-migrations.json').read_text())
        require(all(m.get('status') == 'pending_authorization' for m in pending['migrations']), 'PENDING_STATUS_REQUIRED')
        contracts = json.loads(regular(root, 'supabase/tests/data-api-contracts.json').read_text())
        plan = build_plan(root, historical, current['source_mappings'] + pending['migrations'], contracts)
        print(json.dumps(plan, indent=2))
    elif command == 'apply':
        plan = json.loads(Path(sys.argv[3]).read_text())
        source = Path(sys.argv[4])
        before = snapshot()
        execute_candidates(plan, source)
        validate_contracts(plan, before, snapshot())
        tests = sorted({test for m in plan['migrations'] for test in m['tests']})
        for migration in plan['migrations']:
            for test, expected in migration['tests'].items():
                require(digest(regular(root, test)) == expected, 'TEST_HASH_CHANGED')
        Path(sys.argv[5]).write_text(''.join(t + '\n' for t in tests))
        print(f'CANDIDATE_RESULT: {len(plan["migrations"])} migrations applied; {len(tests)} registered SQL test files.')
    else:
        raise ValueError('UNKNOWN_COMMAND')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError, subprocess.SubprocessError) as error:
        # Do not print captured SQL stderr: future migrations could include sensitive literals.
        print('DATA_API_PLAN_FAILED: ' + (str(error) if isinstance(error, ValueError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
