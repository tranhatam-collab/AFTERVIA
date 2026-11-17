import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { asActor, connect, resetTestDatabase } from '../support/db';

// SEC-IDEM-01: khử trùng ở máy chủ cho tạo món (POST /v1/items) và cấp grant. Mọi kiểm tra đi qua HTTP thật trên DB _test.
// Dữ liệu tổng hợp. Mỗi tiêu đề có tiền tố T38 để báo cáo gắn vào ma trận.
const SECRET = ['local', 'test', 'signing', 'material', 'idem', '01'].join('-');
const USERS = {
  owner: '00000000-0000-4000-8000-0000000000c1',
  partner: '00000000-0000-4000-8000-0000000000c2',
  merchant: '00000000-0000-4000-8000-0000000000c3',
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

async function stopHarness(harness: Harness): Promise<void> {
  harness.server.closeAllConnections();
  await new Promise<void>((resolve) => harness.server.close(() => resolve()));
  await harness.pool.end();
}

async function call(
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

async function adminRows(sql: string, params: unknown[] = []): Promise<any[]> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

async function countItems(title: string): Promise<number> {
  return (await adminRows('select count(*)::int as n from public.items where owner_user_id = $1 and title = $2', [USERS.owner, title]))[0].n;
}

// Tài liệu đã tải xong, quét bởi scanner không khả dụng: được phép làm bằng chứng (như các kiểm thử HTTP khác).
async function completedDocument(): Promise<string> {
  const doc = await asActor(USERS.owner, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(USERS.owner, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(USERS.owner, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, 'idem-doc-0001', 'd'.repeat(64), 4096]));
  return doc;
}

let h: Harness;
const tokens = {} as Record<UserName, string>;
let orgId = '';
let caseId = '';
let docId = '';
let grantId = '';
const EXPIRES = new Date(Date.now() + 86_400_000).toISOString();
const GRANT_BODY = (): Record<string, unknown> => ({ document_id: docId, recipient_id: USERS.partner, expires_at: EXPIRES, can_download: false });

describe('SEC-IDEM-01 server idempotency for item creation and grants', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      for (const [name, id] of Object.entries(USERS)) {
        await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@idem.test.invalid`]);
      }
    } finally {
      await admin.end();
    }
    h = await startHarness();
    for (const name of Object.keys(USERS) as UserName[]) {
      tokens[name] = (await call(h.url, 'POST', '/v1/dev/sign-in', null, { user_id: USERS[name] })).json.access_token as string;
    }
    orgId = (await call(h.url, 'POST', '/v1/organizations', tokens.merchant, { legal_name: 'Cửa hàng idempotency', country: 'VN' })).json.id as string;
    const setupItem = await call(h.url, 'POST', '/v1/items', tokens.owner, { title: 'Món cho case', currency: 'VND' }, { 'idempotency-key': 'idem-setup-item-01' });
    docId = await completedDocument();
    const opened = await call(
      h.url,
      'POST',
      '/v1/cases',
      tokens.owner,
      { item_id: setupItem.json.id, organization_id: orgId, description: 'Máy không lên nguồn', shared_document_ids: [docId] },
      { 'idempotency-key': 'idem-case-0001' },
    );
    if (opened.status !== 200) throw new Error(`the case must open with evidence, got ${opened.status}`);
    caseId = opened.json.id as string;
    await asActor(USERS.owner, (c) =>
      c.query("select public.invite_case_participant($1::uuid, $2::uuid, now() + interval '1 day') as id", [caseId, USERS.partner]),
    );
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T38 a repeated item request with the same key returns the same item and creates one row', async () => {
    const body = { title: 'Máy giặt khử trùng', currency: 'VND' };
    const headers = { 'idempotency-key': 'idem-item-0001' };
    const first = await call(h.url, 'POST', '/v1/items', tokens.owner, body, headers);
    const second = await call(h.url, 'POST', '/v1/items', tokens.owner, body, headers);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.json.id).toBe(first.json.id);
    expect(await countItems('Máy giặt khử trùng')).toBe(1);
  });

  it('T38 the same item key with another body is refused with 409 and creates nothing', async () => {
    const conflict = await call(h.url, 'POST', '/v1/items', tokens.owner, { title: 'Máy giặt khử trùng khác', currency: 'VND' }, { 'idempotency-key': 'idem-item-0001' });
    expect(conflict.status).toBe(409);
    expect(conflict.json.error).toBe('conflict');
    expect(await countItems('Máy giặt khử trùng khác')).toBe(0);
  });

  it('T38 a new key creates a new item, and a request without a key keeps the old behaviour', async () => {
    const body = { title: 'Máy giặt khử trùng', currency: 'VND' };
    const other = await call(h.url, 'POST', '/v1/items', tokens.owner, body, { 'idempotency-key': 'idem-item-0002' });
    const legacyA = await call(h.url, 'POST', '/v1/items', tokens.owner, body);
    const legacyB = await call(h.url, 'POST', '/v1/items', tokens.owner, body);
    expect(other.status).toBe(201);
    expect(legacyA.status).toBe(201);
    expect(legacyB.status).toBe(201);
    expect(new Set([other.json.id, legacyA.json.id, legacyB.json.id]).size).toBe(3);
    // Một dòng từ lần gửi đầu, cộng khóa mới, cộng hai yêu cầu không khóa.
    expect(await countItems('Máy giặt khử trùng')).toBe(4);
  });

  it('T38 concurrent identical requests with one key create exactly one item', async () => {
    const body = { title: 'Máy giặt đồng thời', currency: 'VND' };
    const headers = { 'idempotency-key': 'idem-item-race-01' };
    const results = await Promise.all(Array.from({ length: 6 }, () => call(h.url, 'POST', '/v1/items', tokens.owner, body, headers)));
    for (const r of results) expect(r.status).toBe(201);
    expect(new Set(results.map((r) => r.json.id)).size).toBe(1);
    expect(await countItems('Máy giặt đồng thời')).toBe(1);
  });

  it('T38 a key shorter than 8 characters is refused before any write', async () => {
    const bad = await call(h.url, 'POST', '/v1/items', tokens.owner, { title: 'Khóa quá ngắn', currency: 'VND' }, { 'idempotency-key': 'short' });
    expect(bad.status).toBe(400);
    expect(await countItems('Khóa quá ngắn')).toBe(0);
  });

  it('T38 a repeated grant with the same key returns the same grant and creates one row', async () => {
    const headers = { 'idempotency-key': 'idem-grant-0001' };
    const first = await call(h.url, 'POST', `/v1/cases/${caseId}/grants`, tokens.owner, GRANT_BODY(), headers);
    const second = await call(h.url, 'POST', `/v1/cases/${caseId}/grants`, tokens.owner, GRANT_BODY(), headers);
    expect(first.status).toBe(200);
    expect(first.json.status).toBe('active');
    expect(second.status).toBe(200);
    expect(second.json.id).toBe(first.json.id);
    grantId = first.json.id as string;
    const rows = await adminRows(
      'select count(*)::int as n from public.case_document_grants where case_id = $1 and document_id = $2 and recipient_id = $3',
      [caseId, docId, USERS.partner],
    );
    expect(rows[0].n).toBe(1);
  });

  it('T38 the same grant key with another body is refused with 409', async () => {
    const other = await call(h.url, 'POST', `/v1/cases/${caseId}/grants`, tokens.owner, { ...GRANT_BODY(), can_download: true }, { 'idempotency-key': 'idem-grant-0001' });
    expect(other.status).toBe(409);
    expect(other.json.code).toBe('conflict');
    const rows = await adminRows(
      'select count(*)::int as n from public.case_document_grants where case_id = $1 and document_id = $2 and recipient_id = $3',
      [caseId, docId, USERS.partner],
    );
    expect(rows[0].n).toBe(1);
  });

  it('T38 a second active grant for the same document and recipient is refused under a new key', async () => {
    const again = await call(h.url, 'POST', `/v1/cases/${caseId}/grants`, tokens.owner, GRANT_BODY(), { 'idempotency-key': 'idem-grant-0002' });
    expect(again.status).toBe(409);
    expect(again.json.code).toBe('conflict');
    const rows = await adminRows(
      'select count(*)::int as n from public.case_document_grants where case_id = $1 and document_id = $2 and recipient_id = $3',
      [caseId, docId, USERS.partner],
    );
    expect(rows[0].n).toBe(1);
  });

  it('T38 after revocation the replayed grant reports revoked and is not reactivated', async () => {
    const revoked = await call(h.url, 'DELETE', `/v1/cases/${caseId}/grants/${grantId}`, tokens.owner);
    expect(revoked.status).toBe(200);
    expect(revoked.json.status).toBe('revoked');
    const replay = await call(h.url, 'POST', `/v1/cases/${caseId}/grants`, tokens.owner, GRANT_BODY(), { 'idempotency-key': 'idem-grant-0001' });
    expect(replay.status).toBe(200);
    expect(replay.json.id).toBe(grantId);
    expect(replay.json.status).toBe('revoked');
    const rows = await adminRows('select count(*)::int as n, count(revoked_at)::int as revoked from public.case_document_grants where id = $1', [grantId]);
    expect(rows[0]).toEqual({ n: 1, revoked: 1 });
  });

  // Tình huống đua có chủ đích: giao dịch đầu giữ khóa khi chưa commit; giao dịch thứ hai cùng khóa phải chờ,
  // rồi sau khi commit trả đúng bản đầu. Không dựa vào thời gian ngẫu nhiên, nên lỗi khóa tư vấn luôn bị bắt.
  it('T38 a request that races another with the same key waits for it and replays its item', async () => {
    const key = 'idem-item-race-02';
    const title = 'Máy giặt chặn song song';
    const a = await connect();
    await beginAs(a, USERS.owner);
    const first = (await a.query('select out_item_id, out_replayed from public.create_item_keyed($1, $2, $3, $4, $5, $6)', [key, title, null, null, null, 'VND'])).rows[0];
    const b = await connect();
    const second = (async () => {
      try {
        await beginAs(b, USERS.owner);
        const row = (await b.query('select out_item_id, out_replayed from public.create_item_keyed($1, $2, $3, $4, $5, $6)', [key, title, null, null, null, 'VND'])).rows[0];
        await b.query('commit');
        return row;
      } finally {
        await b.end();
      }
    })();
    let settled = false;
    second.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(settled).toBe(false);
    await a.query('commit');
    await a.end();
    const replay = await second;
    expect(replay.out_replayed).toBe(true);
    expect(replay.out_item_id).toBe(first.out_item_id);
    expect(await countItems(title)).toBe(1);
  });

  it('T38 a grant request that races another with the same key waits for it and replays the grant', async () => {
    const key = 'idem-grant-race-01';
    const args = [key, caseId, docId, USERS.partner, false, EXPIRES];
    const a = await connect();
    await beginAs(a, USERS.owner);
    const first = (await a.query('select out_grant_id, out_replayed from public.grant_case_document_keyed($1, $2::uuid, $3::uuid, $4::uuid, $5::boolean, $6::timestamptz)', args)).rows[0];
    const b = await connect();
    const second = (async () => {
      try {
        await beginAs(b, USERS.owner);
        const row = (await b.query('select out_grant_id, out_replayed from public.grant_case_document_keyed($1, $2::uuid, $3::uuid, $4::uuid, $5::boolean, $6::timestamptz)', args)).rows[0];
        await b.query('commit');
        return row;
      } finally {
        await b.end();
      }
    })();
    let settled = false;
    second.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(settled).toBe(false);
    await a.query('commit');
    await a.end();
    const replay = await second;
    expect(replay.out_replayed).toBe(true);
    expect(replay.out_grant_id).toBe(first.out_grant_id);
    const rows = await adminRows('select count(*)::int as n from public.case_document_grants where create_request_id = $1', [key]);
    expect(rows[0].n).toBe(1);
  });
});

async function beginAs(client: pg.Client, userId: string): Promise<void> {
  await client.query('begin');
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
  await client.query('set local role authenticated');
}
