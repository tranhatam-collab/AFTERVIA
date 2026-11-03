import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { connect, resetTestDatabase } from '../support/db';

// WO10-03a (T24) qua HTTP: xuất gói chỉ có phạm vi của người gọi. Tải gói chưa có trong đặc tả nên không kiểm ở đây.
// Dữ liệu tổng hợp. Phạm vi được store_export kiểm khi lưu; test này kiểm đường HTTP đi qua đúng phạm vi đó.
const SECRET = ['local', 'test', 'signing', 'material', '1003'].join('-');
const USERS = {
  aOwner: '00000000-0000-4000-8000-0000000000a5',
  bOwner: '00000000-0000-4000-8000-0000000000b5',
} as const;
type UserName = keyof typeof USERS;
const UNKNOWN_JOB = '00000000-0000-4000-8000-0000000000ff';

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
  headers: Record<string, string> = {},
): Promise<{ status: number; json: any }> {
  const all: Record<string, string> = { 'content-type': 'application/json', ...headers };
  if (token) all.authorization = `Bearer ${token}`;
  const res = await fetch(url + path, { method, headers: all, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

let h: Harness;
const tokens = {} as Record<UserName, string>;
const itemIds: Record<UserName, string[]> = { aOwner: [], bOwner: [] };
let jobA = '';

describe('WO10-03a exports over HTTP: only the caller items, one job per request key, owner-only reads', () => {
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
    for (const title of ['Máy hút bụi', 'Tủ lạnh']) {
      const created = await api(h.url, 'POST', '/v1/items', tokens.aOwner, { title, brand: 'Hãng A', purchased_on: '2026-03-04', currency: 'VND' });
      itemIds.aOwner.push(created.json.id as string);
    }
    const bItem = await api(h.url, 'POST', '/v1/items', tokens.bOwner, { title: 'Máy giặt', brand: 'Hãng B', purchased_on: '2026-02-01', currency: 'VND' });
    itemIds.bOwner.push(bItem.json.id as string);
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T24 an export over HTTP returns a succeeded job, and the same Idempotency-Key returns the same job', async () => {
    const key = 'exp-a-0001-key';
    const first = await api(h.url, 'POST', '/v1/exports', tokens.aOwner, undefined, { 'idempotency-key': key });
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ status: 'succeeded' });
    jobA = first.json.id as string;

    const again = await api(h.url, 'POST', '/v1/exports', tokens.aOwner, undefined, { 'idempotency-key': key });
    expect(again.status).toBe(200);
    expect(again.json.id).toBe(jobA);
  });

  it('T24 the stored export lists only the caller items and none of another account items', async () => {
    const admin = await connect();
    try {
      const row = (await admin.query("select body from public.export_files where job_id = $1 and path = 'items.json'", [jobA])).rows[0];
      const exported = (JSON.parse(row.body as string).items as Array<{ id: string }>).map((i) => i.id).sort();
      expect(exported).toEqual([...itemIds.aOwner].sort());
      expect(exported).not.toContain(itemIds.bOwner[0]);
    } finally {
      await admin.end();
    }
  });

  it('T24 a job is readable by its owner only; another account gets not_found for the same job', async () => {
    const own = await api(h.url, 'GET', `/v1/jobs/${jobA}`, tokens.aOwner);
    expect(own.status).toBe(200);
    expect(own.json).toMatchObject({ id: jobA, status: 'succeeded' });

    const other = await api(h.url, 'GET', `/v1/jobs/${jobA}`, tokens.bOwner);
    expect(other.status).toBe(404);
    expect(other.json.code).toBe('not_found');
  });

  it('T24 an export without an Idempotency-Key is refused, without a session is refused, and an unknown job is not found', async () => {
    const noKey = await api(h.url, 'POST', '/v1/exports', tokens.aOwner, undefined, {});
    expect(noKey.status).toBe(400);
    expect(noKey.json.code).toBe('invalid_input');

    expect((await api(h.url, 'POST', '/v1/exports', null, undefined, { 'idempotency-key': 'exp-anon-0001' })).status).toBe(401);
    expect((await api(h.url, 'GET', `/v1/jobs/${UNKNOWN_JOB}`, tokens.aOwner)).status).toBe(404);
  });
});
