import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signHs256 } from '../../services/api/src/auth/jwt';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { connect, resetTestDatabase } from '../support/db';

// WO11-02a qua HTTP: yêu cầu xóa tài khoản, và phiên phát trước yêu cầu bị từ chối ở mọi route.
// Dữ liệu tổng hợp. Mốc cắt phiên là requested_at trong account_deletion_requests (bảng chỉ thêm).
const SECRET = ['local', 'test', 'signing', 'material', '0025'].join('-');
const USERS = {
  cOwner: '00000000-0000-4000-8000-0000000000c1',
  dOther: '00000000-0000-4000-8000-0000000000d1',
  soleOwner: '00000000-0000-4000-8000-0000000000b1',
  reauth: '00000000-0000-4000-8000-0000000000b2',
} as const;
type UserName = keyof typeof USERS;
const REQUEST_ID = 'erase-c1-request-0001';
const UNKNOWN_CASE = '00000000-0000-4000-8000-0000000000ff';

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

async function admin<T>(run: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = await connect();
  try {
    return await run(c);
  } finally {
    await c.end();
  }
}

async function profileStatus(userId: string): Promise<string | undefined> {
  return admin(async (c) => (await c.query('select deletion_status from public.profiles where id = $1', [userId])).rows[0]?.deletion_status);
}

async function cutoffOf(userId: string): Promise<number | null> {
  return admin(async (c) => {
    const row = (await c.query('select extract(epoch from min(requested_at))::bigint as cutoff from public.account_deletion_requests where user_id = $1', [userId])).rows[0];
    return row?.cutoff === null || row?.cutoff === undefined ? null : Number(row.cutoff);
  });
}

// Phiên phát sau mốc cắt (iat > mốc). Dùng để kiểm đường đi hợp lệ sau yêu cầu xóa, không phụ thuộc đồng hồ.
async function freshSession(userId: string): Promise<string> {
  const cutoff = await cutoffOf(userId);
  if (cutoff === null) throw new Error('no deletion request for this user');
  // iat chỉ cần đứng SAU mốc cắt, và mốc cắt lấy từ cơ sở dữ liệu nên so sánh đó không phụ thuộc đồng hồ
  // của máy chạy test. Nhưng OWN-A-08 thêm kiểm "iat không ở tương lai quá 60 giây" theo đồng hồ của Node,
  // nên khoảng cách phải nhỏ: với `cutoff + 60`, chỉ cần đồng hồ Postgres nhanh hơn runner vài giây là
  // token bị coi là ở tương lai và trả 401. Trên CI hai đồng hồ là hai container khác nhau, nên lỗi chỉ
  // xuất hiện ở đó. `cutoff + 5` giữ đúng ý định và chịu được lệch tới khoảng 55 giây.
  // Tuổi thọ cũng phải nằm trong thời hạn phiên 900 giây (D-09).
  return signHs256({ sub: userId, role: 'authenticated', iat: cutoff + 5, exp: cutoff + 5 + 900, simulated: true }, SECRET);
}

let h: Harness;
const tokens = {} as Record<UserName, string>;

describe('WO11-02a deletion over HTTP: receipt, and sessions issued before the request refused on every route', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await admin(async (c) => {
      for (const [name, id] of Object.entries(USERS)) {
        await c.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@test.invalid`]);
      }
    });
    h = await startHarness('test');
    for (const name of Object.keys(USERS) as UserName[]) {
      tokens[name] = (await api(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS[name] })).json.access_token as string;
    }
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T25 a deletion request over HTTP returns the receipt and moves the profile to PENDING_DELETION; a repeat with the same id returns the same receipt', async () => {
    const first = await api(h.url, 'POST', '/v1/account/deletion', tokens.cOwner, { request_id: REQUEST_ID });
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ request_id: REQUEST_ID, status: 'PENDING_POLICY' });
    expect(await profileStatus(USERS.cOwner)).toBe('PENDING_DELETION');

    const again = await api(h.url, 'POST', '/v1/account/deletion', await freshSession(USERS.cOwner), { request_id: REQUEST_ID });
    expect(again.status).toBe(200);
    expect(again.json).toEqual(first.json);
  });

  it('T25 a session issued before the request is refused on every route after it', async () => {
    expect((await api(h.url, 'GET', '/v1/items', tokens.cOwner)).status).toBe(401);
    expect((await api(h.url, 'GET', `/v1/cases/${UNKNOWN_CASE}`, tokens.cOwner)).status).toBe(401);
    expect((await api(h.url, 'POST', '/v1/account/deletion', tokens.cOwner, { request_id: 'erase-c1-request-0002' })).status).toBe(401);
  });

  it('T25 a session issued after the cutoff is accepted, and a session without iat is refused', async () => {
    expect((await api(h.url, 'GET', '/v1/items', await freshSession(USERS.cOwner))).status).toBe(200);
    const withoutIat = signHs256({ sub: USERS.cOwner, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, simulated: true }, SECRET);
    expect((await api(h.url, 'GET', '/v1/items', withoutIat)).status).toBe(401);
  });

  it('T25 another account keeps its session and its profile after the request', async () => {
    expect((await api(h.url, 'GET', '/v1/items', tokens.dOther)).status).toBe(200);
    expect(await profileStatus(USERS.dOther)).toBe('ACTIVE');
  });

  it('T25 a request without a session is refused, and a body without a valid request_id is refused without changing the profile', async () => {
    expect((await api(h.url, 'POST', '/v1/account/deletion', null, { request_id: 'erase-d1-request-0001' })).status).toBe(401);

    const missing = await api(h.url, 'POST', '/v1/account/deletion', tokens.dOther, {});
    expect(missing.status).toBe(400);
    expect(missing.json.code).toBe('invalid_input');

    const short = await api(h.url, 'POST', '/v1/account/deletion', tokens.dOther, { request_id: 'short' });
    expect(short.status).toBe(400);
    expect(short.json.code).toBe('invalid_input');

    expect(await profileStatus(USERS.dOther)).toBe('ACTIVE');
  });

  it('T25 over HTTP, the sole active owner of an organization gets 409 invalid_state, and the profile stays ACTIVE', async () => {
    await admin(async (c) => {
      const org = await c.query("insert into public.organizations (legal_name, country, created_by) values ('Cửa hàng HTTP', 'VN', $1) returning id", [
        USERS.soleOwner,
      ]);
      await c.query("insert into public.organization_members (org_id, user_id, role, status, granted_by) values ($1, $2, 'owner', 'ACTIVE', $2)", [
        org.rows[0].id,
        USERS.soleOwner,
      ]);
    });
    const refused = await api(h.url, 'POST', '/v1/account/deletion', tokens.soleOwner, { request_id: 'erase-sole-request-0001' });
    expect(refused.status).toBe(409);
    expect(refused.json.code).toBe('invalid_state');
    expect(await profileStatus(USERS.soleOwner)).toBe('ACTIVE');
  });

  it('T25 a sign-in lasts 15 minutes: expires_in is 900, and the token expires 900 seconds after it is issued', async () => {
    const signIn = await api(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS.reauth });
    expect(signIn.status).toBe(200);
    expect(signIn.json.expires_in).toBe(900);
    const claims = JSON.parse(Buffer.from(String(signIn.json.access_token).split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      iat: number;
      exp: number;
    };
    expect(claims.exp - claims.iat).toBe(900);
  });

  it('T25 a deletion request needs a session issued within the last 5 minutes: an older session is refused with 401, and it still reads items', async () => {
    // Mốc 360 giây thay vì 301 để kết quả không phụ thuộc đồng hồ. Ranh giới 300 giây nằm trong mã và được đọc ở đó.
    const now = Math.floor(Date.now() / 1000);
    // exp cách iat 860 giây, dưới chặn trên 900 giây của D-09, nên token vẫn hợp lệ và chỉ bị từ chối vì cũ.
    const stale = signHs256({ sub: USERS.reauth, role: 'authenticated', iat: now - 360, exp: now + 500, simulated: true }, SECRET);
    expect((await api(h.url, 'GET', '/v1/items', stale)).status).toBe(200);
    const refused = await api(h.url, 'POST', '/v1/account/deletion', stale, { request_id: 'erase-reauth-stale-0001' });
    expect(refused.status).toBe(401);
    expect(refused.json.code).toBe('unauthenticated');
    expect(await profileStatus(USERS.reauth)).toBe('ACTIVE');
  });

  it('T25 a session issued within the last 5 minutes can request deletion, and the profile moves to PENDING_DELETION', async () => {
    const now = Math.floor(Date.now() / 1000);
    const recent = signHs256({ sub: USERS.reauth, role: 'authenticated', iat: now - 240, exp: now + 600, simulated: true }, SECRET);
    const accepted = await api(h.url, 'POST', '/v1/account/deletion', recent, { request_id: 'erase-reauth-recent-0001' });
    expect(accepted.status).toBe(200);
    expect(accepted.json).toMatchObject({ request_id: 'erase-reauth-recent-0001', status: 'PENDING_POLICY' });
    expect(await profileStatus(USERS.reauth)).toBe('PENDING_DELETION');
  });
});
