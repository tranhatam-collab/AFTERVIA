import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { connect, resetTestDatabase } from '../support/db';

// WO07-01 qua HTTP. Mọi kiểm tra cách ly đi qua token của từng người dùng.
const SECRET = ['local', 'test', 'signing', 'material', '0003'].join('-');
const UNKNOWN_ITEM = '00000000-0000-4000-8000-0000000000ff';
const USERS = {
  aOwner: '00000000-0000-4000-8000-0000000000a1',
  aAgent: '00000000-0000-4000-8000-0000000000a3',
  bOwner: '00000000-0000-4000-8000-0000000000b1',
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

async function api(url: string, method: string, path: string, token: string | null, body?: unknown): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

let h: Harness;
let itemId = '';
let orgA = '';
const tokens = {} as Record<UserName, string>;

describe('WO07-01 items over HTTP: persistence and isolation of two accounts', () => {
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
      tokens[name] = (await api(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS[name] })).json.access_token as string;
    }
    orgA = (await api(h.url, 'POST', '/v1/organizations', tokens.aOwner, { legal_name: 'Tổ chức A', country: 'VN' })).json.id as string;
    await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.aOwner, { user_id: USERS.aAgent, role: 'agent' });
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T03 an item created over HTTP is still there after the API restarts, with its version', async () => {
    const created = await api(h.url, 'POST', '/v1/items', tokens.aOwner, {
      title: 'Máy hút bụi',
      brand: 'Hãng X',
      purchased_on: '2026-03-04',
      currency: 'VND',
    });
    expect(created.status).toBe(201);
    itemId = created.json.id as string;
    await stopHarness(h);
    h = await startHarness('test');
    const read = await api(h.url, 'GET', `/v1/items/${itemId}`, tokens.aOwner);
    expect(read.status).toBe(200);
    expect(read.json.item).toMatchObject({ title: 'Máy hút bụi', brand: 'Hãng X', purchased_on: '2026-03-04', currency: 'VND', version: 1 });
  });

  it('T04 another account gets the same 404 as for an unknown item and cannot list or change it', async () => {
    const foreign = await api(h.url, 'GET', `/v1/items/${itemId}`, tokens.bOwner);
    const unknown = await api(h.url, 'GET', `/v1/items/${UNKNOWN_ITEM}`, tokens.bOwner);
    expect(foreign.status).toBe(404);
    expect(foreign.json).toEqual(unknown.json);
    expect((await api(h.url, 'GET', '/v1/items', tokens.bOwner)).json.items).toEqual([]);
    expect((await api(h.url, 'PATCH', `/v1/items/${itemId}`, tokens.bOwner, { version: 1, title: 'Bị đổi' })).status).toBe(404);
  });

  it('T04 membership of an organization does not open a personal item of one of its members', async () => {
    expect((await api(h.url, 'GET', `/v1/items/${itemId}`, tokens.aAgent)).status).toBe(404);
    expect((await api(h.url, 'GET', '/v1/items', tokens.aAgent)).json.items).toEqual([]);
  });

  it('the owner updates with the current version, and a stale version is refused with 409', async () => {
    const ok = await api(h.url, 'PATCH', `/v1/items/${itemId}`, tokens.aOwner, { version: 1, title: 'Máy hút bụi 2' });
    expect(ok.status).toBe(200);
    expect(ok.json).toEqual({ version: 2 });
    const stale = await api(h.url, 'PATCH', `/v1/items/${itemId}`, tokens.aOwner, { version: 1, title: 'Phiên bản cũ' });
    expect(stale.status).toBe(409);
    expect(stale.json).toEqual({ error: 'version_conflict' });
    const read = await api(h.url, 'GET', `/v1/items/${itemId}`, tokens.aOwner);
    expect(read.json.item).toMatchObject({ title: 'Máy hút bụi 2', version: 2 });
  });

  it('invalid input is refused with 400 and the item does not change', async () => {
    expect((await api(h.url, 'POST', '/v1/items', tokens.aOwner, { brand: 'Không tên' })).status).toBe(400);
    expect((await api(h.url, 'POST', '/v1/items', tokens.aOwner, { title: 'x', purchased_on: '2026-02-31' })).status).toBe(400);
    expect((await api(h.url, 'POST', '/v1/items', tokens.aOwner, { title: 'x', currency: 'vnd' })).status).toBe(400);
    const read = await api(h.url, 'GET', `/v1/items/${itemId}`, tokens.aOwner);
    expect(read.json.item.version).toBe(2);
  });

  it('requests without a valid token are refused with 401', async () => {
    expect((await api(h.url, 'GET', '/v1/items', null)).status).toBe(401);
  });
});
