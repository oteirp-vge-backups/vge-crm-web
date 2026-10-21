#!/usr/bin/env python3
"""HTTP tests against a disposable LOCAL Supabase only. Never log keys or tokens."""
from __future__ import annotations
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = 'http://127.0.0.1:54321'
USER_A = '40000000-0000-4000-8000-000000000001'
USER_B = '40000000-0000-4000-8000-000000000002'
OWNER = '40000000-0000-4000-8000-000000000003'
MANAGER = '40000000-0000-4000-8000-000000000004'
checks = 0

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('HTTP_REDIRECT_REFUSED')


def check(condition: bool, label: str) -> None:
    global checks
    if not condition:
        raise AssertionError(label)
    checks += 1
    print(f'PASS HTTP {checks}: {label}', flush=True)


def sql(statement: str) -> None:
    env = {'PATH': os.environ['PATH'], 'HOME': os.environ['HOME'],
           'PGPASSWORD': 'postgres', 'PGSSLMODE': 'disable'}
    subprocess.run(['psql', '-X', '--host=127.0.0.1', '--port=54322',
                    '--username=postgres', '--dbname=postgres', '--set=ON_ERROR_STOP=1',
                    '--quiet', '--command', statement],
                   env=env, check=True, stdout=subprocess.DEVNULL)


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


def main() -> None:
    if os.environ.get('R10_ISOLATED_CI') != 'YES' or os.environ.get('GITHUB_ACTIONS') != 'true':
        raise RuntimeError('ISOLATED_CI_REQUIRED')
    if len(sys.argv) != 2:
        raise RuntimeError('LOCAL_STATUS_FILE_REQUIRED')
    config = json.loads(Path(sys.argv[1]).read_text())
    if config.get('API_URL', '').rstrip('/') != API:
        raise RuntimeError('NON_LOCAL_API_REFUSED')
    secret, api_key = config.get('JWT_SECRET'), config.get('ANON_KEY')
    if not isinstance(secret, str) or not isinstance(api_key, str) or not secret or not api_key:
        raise RuntimeError('LOCAL_LEGACY_TEST_KEYS_UNAVAILABLE')
    opener = urllib.request.build_opener(NoRedirect, urllib.request.ProxyHandler({}))

    def token(role: str, user: str | None = None) -> str:
        payload = {'role': role, 'aud': 'authenticated', 'iat': int(time.time()),
                   'exp': int(time.time()) + 600}
        if user is not None:
            payload['sub'] = user
        message = b64(b'{"alg":"HS256","typ":"JWT"}') + '.' + b64(json.dumps(payload).encode())
        signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
        return message + '.' + b64(signature)

    def request(path: str, role: str, user: str | None = None,
                body: dict | None = None) -> tuple[int, object]:
        if not path.startswith('/rest/v1/') or '://' in path:
            raise RuntimeError('NON_LOCAL_PATH_REFUSED')
        headers = {'apikey': api_key, 'Authorization': 'Bearer ' + token(role, user),
                   'Content-Type': 'application/json'}
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(API + path, headers=headers, data=data)
        try:
            with opener.open(req, timeout=10) as response:
                return response.status, json.loads(response.read() or b'null')
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read() or b'null')

    def denied(result: tuple[int, object]) -> bool:
        status, payload = result
        return (status in (401, 403, 404) and isinstance(payload, dict)
                and payload.get('code') in ('42501', 'PGRST205'))

    # Test data does not come from a backup or a remote database.
    sql(f"""
BEGIN;
CREATE TABLE public.r10_http_grant_probe(id integer primary key, owner_id uuid not null, payload text not null);
ALTER TABLE public.r10_http_grant_probe ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON public.r10_http_grant_probe FOR SELECT TO authenticated
  USING ((select auth.uid())=owner_id);
INSERT INTO public.r10_http_grant_probe VALUES
  (1,'{USER_A}','synthetic-a'),(2,'{USER_B}','synthetic-b');
INSERT INTO auth.users(id,email) VALUES
  ('{USER_A}','api-a@example.invalid'),('{USER_B}','api-b@example.invalid'),
  ('{OWNER}','api-owner@example.invalid'),('{MANAGER}','api-manager@example.invalid');
INSERT INTO public.operators(code,display_name,email,auth_user_id,role,access_role,active) VALUES
  ('Sin asignar','Sin asignar',null,null,'system','system',true),
  ('API-A','Comercial A ficticio','api-a@example.invalid','{USER_A}','seller','seller',true),
  ('API-B','Comercial B ficticio','api-b@example.invalid','{USER_B}','seller','seller',true),
  ('API-OWNER','Propietario ficticio','api-owner@example.invalid','{OWNER}','admin','owner',true),
  ('API-MANAGER','Administrador ficticio','api-manager@example.invalid','{MANAGER}','admin','manager',true);
INSERT INTO public.centers(id,school,city,province,community) VALUES
  ('R10-API-A','Centro ficticio A','Madrid','Madrid','Madrid'),
  ('R10-API-B','Centro ficticio B','Madrid','Madrid','Madrid'),
  ('R10-API-OWNER','Centro ficticio global','Madrid','Madrid','Madrid');
UPDATE public.center_state SET assigned_to='API-A' WHERE center_id='R10-API-A';
UPDATE public.center_state SET assigned_to='API-B' WHERE center_id='R10-API-B';
UPDATE public.center_state SET assigned_to='API-OWNER' WHERE center_id='R10-API-OWNER';
NOTIFY pgrst,'reload schema';
COMMIT;
""")
    probe = '/rest/v1/r10_http_grant_probe?select=id,payload&order=id'
    check(denied(request(probe, 'authenticated', USER_A)), 'API denies a new table without an explicit GRANT')
    check(denied(request(probe, 'anon')), 'API denies anonymous access before GRANT')
    sql('GRANT SELECT ON public.r10_http_grant_probe TO authenticated; NOTIFY pgrst,\'reload schema\';')
    result = (0, None)
    for _ in range(20):
        result = request(probe, 'authenticated', USER_A)
        if result[0] == 200:
            break
        time.sleep(0.5)
    check(result == (200, [{'id': 1, 'payload': 'synthetic-a'}]), 'Explicit GRANT plus RLS returns only user A row')
    check(request(probe, 'authenticated', USER_B) == (200, [{'id': 2, 'payload': 'synthetic-b'}]),
          'User B cannot read user A row')
    check(denied(request(probe, 'anon')), 'Anonymous access remains blocked after authenticated GRANT')
    check(denied(request('/rest/v1/r10_http_grant_probe', 'authenticated', USER_A,
                         {'id': 3, 'owner_id': USER_A, 'payload': 'must-not-be-created'})),
          'Read-only GRANT does not permit API inserts')

    # Exercise real R10 endpoints with local synthetic identities.
    for user, expected in [(USER_A, ['R10-API-A']), (USER_B, ['R10-API-B']),
                           (OWNER, ['R10-API-A', 'R10-API-B', 'R10-API-OWNER']),
                           (MANAGER, ['R10-API-A', 'R10-API-B', 'R10-API-OWNER'])]:
        status, data = request('/rest/v1/crm_centers?select=id&order=id', 'authenticated', user)
        check(status == 200 and isinstance(data, list) and [r['id'] for r in data] == expected,
              'CRM portfolio scope for synthetic identity ' + user[-4:])
    for user, expected in [(USER_A, 'seller'), (USER_B, 'seller'), (OWNER, 'owner'), (MANAGER, 'manager')]:
        status, data = request('/rest/v1/rpc/get_my_permissions_v2', 'authenticated', user, {})
        check(status == 200 and isinstance(data, list) and len(data) == 1
              and data[0].get('access_role') == expected, 'Permission RPC for role ' + expected)
    check(denied(request('/rest/v1/crm_centers?select=id', 'anon')), 'Anonymous clients cannot read the CRM view')
    status, data = request('/rest/v1/crm_centers?select=state_version&id=eq.R10-API-A', 'authenticated', USER_A)
    check(status == 200 and isinstance(data, list) and len(data) == 1, 'Current record version is readable')
    status, _ = request('/rest/v1/rpc/update_center_profile_v2', 'authenticated', USER_A,
                        {'p_center_id': 'R10-API-A',
                         'p_patch': {'school': 'Centro ficticio A editado',
                                     'school_phone': '900000001', 'school_email': 'editado@example.invalid'},
                         'p_expected_version': data[0]['state_version']})
    check(status == 200, 'Controlled RPC preserves the October 13 center-editing feature')
    status, data = request('/rest/v1/crm_centers?select=school,school_phone,school_email&id=eq.R10-API-A',
                           'authenticated', USER_A)
    check(status == 200 and data == [{'school': 'Centro ficticio A editado',
                                     'school_phone': '900000001', 'school_email': 'editado@example.invalid'}],
          'Name, phone and email are persisted in the isolated CRM')
    print(f'HTTP_RESULT: {checks} checks passed; local synthetic data only.', flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never include a request object, status-file contents, bearer or key in logs.
        print(f'HTTP_FAILED: {type(error).__name__}: {error}', file=sys.stderr)
        raise SystemExit(1)
