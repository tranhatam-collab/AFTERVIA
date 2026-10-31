import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signHs256 } from '../../services/api/src/auth/jwt';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { connect, resetTestDatabase } from '../support/db';

// Lát cắt HTTP mỏng (WO04-04). Đăng nhập là GIẢ LẬP ở môi trường local/test (DEC-ENG-11).
// Mọi kiểm tra quyền đi qua token của từng người dùng, không dùng superuser làm bằng chứng.
const SECRET = ['local', 'test', 'signing', 'material', '0001'].join('-');
const UNKNOWN_ORG = '00000000-0000-4000-8000-0000000000ff';

const USERS = {
  aOwner: '00000000-0000-4000-8000-0000000000a1',
  aMgr: '00000000-0000-4000-8000-0000000000a2',
  aAgent: '00000000-0000-4000-8000-0000000000a3',
  bOwner: '00000000-0000-4000-8000-0000000000b1',
  bAgent: '00000000-0000-4000-8000-0000000000b2',
  outsider: '00000000-0000-4000-8000-0000000000c1',
} as const;

type UserName = keyof typeof USERS;

interface Harness {
  server: Server;
  pool: pg.Pool;
  url: string;
}

async function startHarness(appEnv: string): Promise<Harness> {
  const pool = createPool(process.env.TEST_DATABASE_URL ?? '');
  const server = createHttpServer({ pool, jwtSecret: SECRET, appEnv });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, pool, url: `http://127.0.0.1:${port}` };
}

async function stopHarness(h: Harness): Promise<void> {
  h.server.closeAllConnections();
  await new Promise<void>((resolve) => h.server.close(() => resolve()));
  await h.pool.end();
}

async function api(
  url: string,
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

let h: Harness;
let orgA = '';
let orgB = '';
const tokens = {} as Record<UserName, string>;

async function adminRows(sqlText: string, params: unknown[] = []): Promise<any[]> {
  const admin = await connect();
  try {
    return (await admin.query(sqlText, params)).rows;
  } finally {
    await admin.end();
  }
}

describe('T03, T04, T05, T06 HTTP slice: two accounts through the API', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      for (const [name, id] of Object.entries(USERS)) {
        await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@test.invalid`]);
      }
    } finally {
      await admin.end();
    }
    h = await startHarness('test');
    for (const name of Object.keys(USERS) as UserName[]) {
      const r = await api(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS[name] });
      tokens[name] = r.json.access_token as string;
    }
    orgA = (await api(h.url, 'POST', '/v1/organizations', tokens.aOwner, { legal_name: 'Tổ chức A', country: 'VN' })).json.id;
    orgB = (await api(h.url, 'POST', '/v1/organizations', tokens.bOwner, { legal_name: 'Tổ chức B', country: 'VN' })).json.id;
    await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.aOwner, { user_id: USERS.aMgr, role: 'manager' });
    await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.aOwner, { user_id: USERS.aAgent, role: 'agent' });
    await api(h.url, 'POST', `/v1/organizations/${orgB}/members`, tokens.bOwner, { user_id: USERS.bAgent, role: 'agent' });
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T03 two accounts keep their organizations and memberships after the API restarts', async () => {
    await stopHarness(h);
    h = await startHarness('test');
    const list = await api(h.url, 'GET', '/v1/organizations', tokens.aOwner);
    expect(list.status).toBe(200);
    expect(list.json.organizations.map((o: { id: string }) => o.id)).toEqual([orgA]);
    const members = await api(h.url, 'GET', `/v1/organizations/${orgA}/members`, tokens.aOwner);
    expect(members.json.members).toHaveLength(3);
    const session = await api(h.url, 'GET', '/v1/session', tokens.bOwner);
    expect(session.json).toEqual({ user_id: USERS.bOwner, simulated: true });
  });

  it('T04 each account lists only its own organizations, including an agent member', async () => {
    expect((await api(h.url, 'GET', '/v1/organizations', tokens.aOwner)).json.organizations.map((o: { id: string }) => o.id)).toEqual([orgA]);
    expect((await api(h.url, 'GET', '/v1/organizations', tokens.bOwner)).json.organizations.map((o: { id: string }) => o.id)).toEqual([orgB]);
    expect((await api(h.url, 'GET', '/v1/organizations', tokens.aAgent)).json.organizations.map((o: { id: string }) => o.id)).toEqual([orgA]);
  });

  it('T04 the detail of another tenant answers exactly like an unknown identifier', async () => {
    const foreign = await api(h.url, 'GET', `/v1/organizations/${orgB}`, tokens.aOwner);
    const unknown = await api(h.url, 'GET', `/v1/organizations/${UNKNOWN_ORG}`, tokens.aOwner);
    expect(foreign.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(foreign.json).toEqual(unknown.json);
  });

  it('T04 the member list of another tenant is empty while the own tenant shows all members', async () => {
    const foreign = await api(h.url, 'GET', `/v1/organizations/${orgB}/members`, tokens.aOwner);
    expect(foreign.status).toBe(200);
    expect(foreign.json.members).toEqual([]);
    const own = await api(h.url, 'GET', `/v1/organizations/${orgA}/members`, tokens.aOwner);
    expect(own.json.members).toHaveLength(3);
  });

  it('T05 writes into another tenant are refused with 403 and leave that tenant unchanged', async () => {
    expect((await api(h.url, 'POST', `/v1/organizations/${orgB}/members`, tokens.aOwner, { user_id: USERS.outsider, role: 'agent' })).status).toBe(403);
    expect((await api(h.url, 'PATCH', `/v1/organizations/${orgB}/members/${USERS.bAgent}`, tokens.aOwner, { role: 'owner' })).status).toBe(403);
    expect((await api(h.url, 'DELETE', `/v1/organizations/${orgB}/members/${USERS.bAgent}`, tokens.aOwner)).status).toBe(403);
    expect((await api(h.url, 'POST', `/v1/organizations/${orgB}/members`, tokens.aMgr, { user_id: USERS.outsider, role: 'agent' })).status).toBe(403);
    const members = await adminRows(
      "select user_id, role from public.organization_members where org_id = $1 and status = 'ACTIVE' order by role",
      [orgB],
    );
    expect(members.map((m) => m.role)).toEqual(['agent', 'owner']);
  });

  it('T06 role escalation through the API is refused with 403', async () => {
    expect((await api(h.url, 'PATCH', `/v1/organizations/${orgA}/members/${USERS.aAgent}`, tokens.aAgent, { role: 'owner' })).status).toBe(403);
    expect((await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.aMgr, { user_id: USERS.outsider, role: 'owner' })).status).toBe(403);
    expect((await api(h.url, 'PATCH', `/v1/organizations/${orgA}/members/${USERS.aOwner}`, tokens.aOwner, { role: 'manager' })).status).toBe(403);
  });

  it('T06 every refused write is recorded once in the audit trail of the tenant it targeted', async () => {
    // Tenant B: owner A bị từ chối 3 lần (mời, sửa vai trò, thu hồi) và manager A bị từ chối 1 lần (mời).
    const rowsB = await adminRows("select actor_user_id, details from public.audit_events where action = 'authz.denied' and org_id = $1", [orgB]);
    expect(rowsB).toHaveLength(4);
    expect(rowsB.map((r) => r.details.operation).sort()).toEqual(['member.invite', 'member.invite', 'member.revoke', 'member.role_change']);
    expect(rowsB.filter((r) => r.actor_user_id === USERS.aOwner)).toHaveLength(3);
    expect(rowsB.filter((r) => r.actor_user_id === USERS.aMgr)).toHaveLength(1);
    // Tenant A: agent tự nâng quyền, manager mời owner, owner tự hạ vai trò.
    const rowsA = await adminRows("select actor_user_id, details from public.audit_events where action = 'authz.denied' and org_id = $1", [orgA]);
    expect(rowsA).toHaveLength(3);
    expect(rowsA.map((r) => r.details.operation).sort()).toEqual(['member.invite', 'member.role_change', 'member.role_change']);
  });

  it('T06 requests without a valid token are refused with 401', async () => {
    const forged = signHs256({ sub: USERS.aOwner, exp: Math.floor(Date.now() / 1000) + 60 }, `${SECRET}-other`);
    const expired = signHs256({ sub: USERS.aOwner, exp: Math.floor(Date.now() / 1000) - 5 }, SECRET);
    const noneAlg = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: USERS.aOwner, exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url')}.`;
    expect((await api(h.url, 'GET', '/v1/organizations', null)).status).toBe(401);
    expect((await api(h.url, 'GET', '/v1/organizations', forged)).status).toBe(401);
    expect((await api(h.url, 'GET', '/v1/organizations', expired)).status).toBe(401);
    expect((await api(h.url, 'GET', '/v1/organizations', noneAlg)).status).toBe(401);
  });

  it('T06 the simulated sign-in is unavailable outside local and test, and unknown users cannot sign in', async () => {
    const prod = await startHarness('production');
    try {
      expect((await api(prod.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS.aOwner })).status).toBe(404);
    } finally {
      await stopHarness(prod);
    }
    expect((await api(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: UNKNOWN_ORG })).status).toBe(404);
  });

  it('T06 a revoked member loses access on the next request', async () => {
    expect((await api(h.url, 'DELETE', `/v1/organizations/${orgA}/members/${USERS.aAgent}`, tokens.aOwner)).status).toBe(200);
    expect((await api(h.url, 'GET', `/v1/organizations/${orgA}`, tokens.aAgent)).status).toBe(404);
    expect((await api(h.url, 'GET', '/v1/organizations', tokens.aAgent)).json.organizations).toEqual([]);
  });

  it('T06 the last active owner cannot revoke themselves', async () => {
    const r = await api(h.url, 'DELETE', `/v1/organizations/${orgA}/members/${USERS.aOwner}`, tokens.aOwner);
    expect(r.status).toBe(409);
    expect(r.json).toEqual({ error: 'last_owner' });
  });

  it('T05 an invitation for an existing member or an unknown person is refused without revealing data', async () => {
    const existing = await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.aOwner, { user_id: USERS.aMgr, role: 'agent' });
    expect(existing.status).toBe(409);
    expect(existing.json).toEqual({ error: 'already_member' });
    const unknown = await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.aOwner, { user_id: UNKNOWN_ORG, role: 'agent' });
    expect(unknown.status).toBe(404);
    expect(unknown.json).toEqual({ error: 'not_found' });
  });
});
