import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { connect, resetTestDatabase } from '../support/db';

// WO05-01 qua HTTP. Mọi kiểm tra đi qua token của từng người dùng (đăng nhập giả lập ở local/test).
const SECRET = ['local', 'test', 'signing', 'material', '0004'].join('-');
const UNKNOWN_DOC = '00000000-0000-4000-8000-0000000000ff';
const USERS = {
  owner: '00000000-0000-4000-8000-0000000000a1',
  agent: '00000000-0000-4000-8000-0000000000a3',
  other: '00000000-0000-4000-8000-0000000000b1',
} as const;
type UserName = keyof typeof USERS;

interface Harness {
  server: Server;
  pool: pg.Pool;
  url: string;
}

async function startHarness(): Promise<Harness> {
  const pool = createPool(process.env.TEST_DATABASE_URL ?? '');
  const server = createHttpServer({ pool, jwtSecret: SECRET, appEnv: 'test' });
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
let orgA = '';
let documentId = '';
const tokens = {} as Record<UserName, string>;

describe('WO05-01 documents over HTTP: private, owner-only, no storage keys exposed', () => {
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
    h = await startHarness();
    for (const name of Object.keys(USERS) as UserName[]) {
      tokens[name] = (await api(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS[name] })).json.access_token as string;
    }
    orgA = (await api(h.url, 'POST', '/v1/organizations', tokens.owner, { legal_name: 'Tổ chức A', country: 'VN' })).json.id as string;
    await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.owner, { user_id: USERS.agent, role: 'agent' });
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T38 creating an upload ticket returns only identifiers and an expiry, never a storage key or path', async () => {
    const r = await api(h.url, 'POST', '/v1/documents', tokens.owner, { declared_mime: 'application/pdf', size_bytes: 40960 });
    expect(r.status).toBe(201);
    expect(Object.keys(r.json).sort()).toEqual(['document_id', 'expires_at', 'ticket_id']);
    documentId = r.json.document_id as string;
    const expiresMs = Date.parse(r.json.expires_at as string) - Date.now();
    expect(expiresMs).toBeGreaterThan(0);
    expect(expiresMs).toBeLessThanOrEqual(15 * 60 * 1000 + 5000);
  });

  it('T38 the owner lists its documents without any storage key', async () => {
    const r = await api(h.url, 'GET', '/v1/documents', tokens.owner);
    expect(r.status).toBe(200);
    expect(r.json.documents.map((d: { id: string }) => d.id)).toEqual([documentId]);
    expect(Object.keys(r.json.documents[0]).sort()).toEqual(['created_at', 'declared_mime', 'id', 'scan_status', 'size_bytes', 'updated_at']);
    expect(r.json.documents[0].scan_status).toBe('PENDING_UPLOAD');
  });

  it('T04 another account gets the same 404 for another person document as for an unknown id', async () => {
    const foreign = await api(h.url, 'GET', `/v1/documents/${documentId}`, tokens.other);
    const unknown = await api(h.url, 'GET', `/v1/documents/${UNKNOWN_DOC}`, tokens.other);
    expect(foreign.status).toBe(404);
    expect(foreign.json).toEqual(unknown.json);
    expect((await api(h.url, 'GET', '/v1/documents', tokens.other)).json.documents).toEqual([]);
  });

  it('T04 membership of an organization does not open a personal document of one of its members', async () => {
    expect((await api(h.url, 'GET', `/v1/documents/${documentId}`, tokens.agent)).status).toBe(404);
    expect((await api(h.url, 'GET', '/v1/documents', tokens.agent)).json.documents).toEqual([]);
  });

  it('invalid declared type or size is refused with 400', async () => {
    expect((await api(h.url, 'POST', '/v1/documents', tokens.owner, { declared_mime: 'application/x-msdownload', size_bytes: 10 })).status).toBe(400);
    expect((await api(h.url, 'POST', '/v1/documents', tokens.owner, { declared_mime: 'image/png', size_bytes: 0 })).status).toBe(400);
    expect((await api(h.url, 'POST', '/v1/documents', tokens.owner, { declared_mime: 'image/png', size_bytes: 10 * 1024 * 1024 + 1 })).status).toBe(400);
  });

  it('requests without a valid token are refused with 401', async () => {
    expect((await api(h.url, 'POST', '/v1/documents', null, { declared_mime: 'image/png', size_bytes: 10 })).status).toBe(401);
    expect((await api(h.url, 'GET', '/v1/documents', null)).status).toBe(401);
  });
});
