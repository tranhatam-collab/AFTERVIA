import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { CONTRACT_ROUTES } from '../../services/api/src/http/contract';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO09-03: 13 thao tác của hợp đồng qua HTTP.
// Kiểm: operationId, method và đường dẫn khớp với OpenAPI; lỗi có đúng hình dạng Error; người ngoài và đối tượng
// không tồn tại nhận cùng một phản hồi; luồng case, người tham gia và grant đi đúng quy tắc của cơ sở dữ liệu.
// Hợp đồng chưa có endpoint mời người tham gia và hoàn tất tải lên, nên các bước đó chuẩn bị qua hàm DB.
const SPEC = new URL('../../docs/spec/AFTERVIA_AZ_2026-10-31/engineering/03_API_CONTRACT.openapi.yaml', import.meta.url);
const SECRET = ['local', 'test', 'signing', 'material', '0005'].join('-');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNKNOWN_ID = '00000000-0000-4000-8000-0000000000fb';
const UNKNOWN_CASE = '00000000-0000-4000-8000-0000000000fd';
const UNKNOWN_ITEM = '00000000-0000-4000-8000-0000000000fe';
const USERS = {
  customer: '00000000-0000-4000-8000-0000000000a1', // khách sở hữu món đồ, case và tài liệu
  customerOther: '00000000-0000-4000-8000-0000000000a2', // khách khác, không liên quan
  merchantOwner: '00000000-0000-4000-8000-0000000000c1', // chủ cửa hàng A
  merchantAgent: '00000000-0000-4000-8000-0000000000c3', // nhân viên cửa hàng A
  orgBOwner: '00000000-0000-4000-8000-0000000000d1', // chủ cửa hàng B, tổ chức khác
  partner: '00000000-0000-4000-8000-0000000000e1', // partner được mời vào case
  stranger: '00000000-0000-4000-8000-0000000000f1', // không có quan hệ với case
} as const;
type UserName = keyof typeof USERS;

interface Harness {
  server: Server;
  pool: pg.Pool;
  url: string;
}

interface Reply {
  status: number;
  json: any;
}

interface OperationRef {
  operationId: string;
  method: string;
  path: string;
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

async function api(
  url: string,
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Reply> {
  const all: Record<string, string> = { 'content-type': 'application/json', ...headers };
  if (token) all.authorization = `Bearer ${token}`;
  const res = await fetch(url + path, { method, headers: all, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function idem(label: string): Record<string, string> {
  return { 'idempotency-key': `idem-${label}` };
}

function iso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

// Mọi lỗi của hợp đồng có đúng ba trường, và request_id là UUID.
function expectError(r: Reply, status: number, code: string): void {
  expect(r.status).toBe(status);
  expect(Object.keys(r.json).sort()).toEqual(['code', 'message', 'request_id']);
  expect(r.json.code).toBe(code);
  expect(r.json.request_id).toMatch(UUID_RE);
}

// So sánh hai lỗi mà không tính request_id, vì request_id là duy nhất cho mỗi yêu cầu.
function sameError(a: Reply, b: Reply): void {
  expect(a.status).toBe(b.status);
  expect({ code: a.json.code, message: a.json.message }).toEqual({ code: b.json.code, message: b.json.message });
}

// Đọc OpenAPI bằng bộ quét dòng (không có thư viện YAML). Chỉ lấy operationId, method và đường dẫn.
function operationsIn(text: string): OperationRef[] {
  const found: OperationRef[] = [];
  let path = '';
  let method = '';
  for (const line of text.split('\n')) {
    const p = /^ {2}(\/\S+):\s*$/.exec(line);
    if (p) {
      path = p[1] ?? '';
      method = '';
      continue;
    }
    const m = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (m) {
      method = (m[1] ?? '').toUpperCase();
      continue;
    }
    const op = /^ {6}operationId:\s*(\w+)\s*$/.exec(line);
    if (op && path && method) found.push({ operationId: op[1] ?? '', method, path });
  }
  return found;
}

function byOperation(a: OperationRef, b: OperationRef): number {
  return a.operationId.localeCompare(b.operationId);
}

// Tài liệu đã tải xong và được quét bởi scanner không khả dụng (trạng thái được phép làm bằng chứng).
async function completedDocument(user: string, key: string, sha: string): Promise<string> {
  const doc = await asActor(user, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(user, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(user, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, key, sha, 4096]));
  return doc;
}

let h: Harness;
const tokens = {} as Record<UserName, string>;
let orgA = '';
let orgB = '';
let itemId = '';
let docA = '';
let docB = '';
let caseId = '';
let grantId = '';

describe('WO09-03 HTTP contract: 13 operations, one error shape, case and grant flows', () => {
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
    orgA = (await api(h.url, 'POST', '/v1/organizations', tokens.merchantOwner, { legal_name: 'Cửa hàng A', country: 'VN' })).json.id as string;
    orgB = (await api(h.url, 'POST', '/v1/organizations', tokens.orgBOwner, { legal_name: 'Cửa hàng B', country: 'VN' })).json.id as string;
    await api(h.url, 'POST', `/v1/organizations/${orgA}/members`, tokens.merchantOwner, { user_id: USERS.merchantAgent, role: 'agent' });
    itemId = (
      await api(h.url, 'POST', '/v1/items', tokens.customer, { title: 'Máy giặt', brand: 'Hãng Y', purchased_on: '2026-05-02', currency: 'VND' })
    ).json.id as string;
    docA = await completedDocument(USERS.customer, 'contract-doc-a', 'a'.repeat(64));
    docB = await completedDocument(USERS.customer, 'contract-doc-b', 'b'.repeat(64));
    expect(orgA).toMatch(UUID_RE);
    expect(orgB).toMatch(UUID_RE);
    expect(itemId).toMatch(UUID_RE);
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('contract parity: the route table names the same 13 operations, methods and paths as the OpenAPI contract', () => {
    const spec = operationsIn(readFileSync(SPEC, 'utf8')).sort(byOperation);
    const table = CONTRACT_ROUTES.map((r) => ({ operationId: r.operationId, method: r.method, path: r.path })).sort(byOperation);
    expect(spec).toHaveLength(13);
    expect(table).toEqual(spec);
  });

  it('contract errors share one shape: a call without a token to a contract route answers 401 with code, message and request_id', async () => {
    expectError(await api(h.url, 'POST', '/v1/cases', null, {}, idem('no-token-0001')), 401, 'unauthenticated');
  });

  it('known gap: the upload-ticket path takes the legacy document body; the contract body (mime, sha256) is refused with 400', async () => {
    const legacy = await api(h.url, 'POST', '/v1/documents/upload-ticket', tokens.customer, { declared_mime: 'image/png', size_bytes: 2048 }, idem('ticket-0001'));
    expect(legacy.status).toBe(201);
    expect(Object.keys(legacy.json).sort()).toEqual(['document_id', 'expires_at', 'ticket_id']);
    const contractBody = await api(h.url, 'POST', '/v1/documents/upload-ticket', tokens.customer, { mime: 'image/png', size_bytes: 2048, sha256: 'c'.repeat(64) }, idem('ticket-0002'));
    expect(contractBody).toEqual({ status: 400, json: { error: 'invalid_input' } });
  });

  it('T04 another customer cannot open a case on an item they do not own: the same 404 as for an unknown item', async () => {
    const body = { item_id: itemId, organization_id: orgA, description: 'Không lên nguồn', shared_document_ids: [] };
    const foreign = await api(h.url, 'POST', '/v1/cases', tokens.customerOther, body, idem('foreign-case-0001'));
    const unknown = await api(h.url, 'POST', '/v1/cases', tokens.customerOther, { ...body, item_id: UNKNOWN_ITEM }, idem('unknown-item-0001'));
    expectError(foreign, 404, 'not_found');
    sameError(foreign, unknown);
  });

  it('createCase refuses a missing Idempotency-Key, unknown fields, an empty description, and a description over the stored limit', async () => {
    const body = { item_id: itemId, organization_id: orgA, description: 'Máy không lên nguồn', shared_document_ids: [] };
    expectError(await api(h.url, 'POST', '/v1/cases', tokens.customer, body), 400, 'invalid_input');
    expectError(await api(h.url, 'POST', '/v1/cases', tokens.customer, { ...body, status: 'resolved' }, idem('extra-field-0001')), 400, 'invalid_input');
    expectError(await api(h.url, 'POST', '/v1/cases', tokens.customer, { ...body, description: '   ' }, idem('empty-desc-0001')), 400, 'invalid_input');
    expectError(await api(h.url, 'POST', '/v1/cases', tokens.customer, { ...body, description: 'x'.repeat(501) }, idem('long-desc-0001')), 400, 'invalid_input');
  });

  it('createCase: the customer opens a case with shared evidence in one transaction, and a retry with the same key returns that case', async () => {
    const body = { item_id: itemId, organization_id: orgA, description: 'Máy không lên nguồn', shared_document_ids: [docA] };
    const created = await api(h.url, 'POST', '/v1/cases', tokens.customer, body, idem('case-create-0001'));
    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({ status: 'draft', version: 1 });
    caseId = created.json.id as string;
    expect(caseId).toMatch(UUID_RE);
    const retry = await api(h.url, 'POST', '/v1/cases', tokens.customer, body, idem('case-create-0001'));
    expect(retry.status).toBe(200);
    expect(retry.json.id).toBe(caseId);
    const admin = await connect();
    try {
      const evidence = await admin.query('select count(*)::int as n from public.case_evidence where case_id = $1', [caseId]);
      expect(evidence.rows[0].n).toBe(1);
    } finally {
      await admin.end();
    }
  });

  it('T04 another customer and a stranger see the case as the same 404 as an unknown case, and a malformed id is 404 too', async () => {
    const unknown = await api(h.url, 'GET', `/v1/cases/${UNKNOWN_CASE}`, tokens.customerOther);
    expectError(unknown, 404, 'not_found');
    for (const who of ['customerOther', 'stranger'] as const) {
      sameError(await api(h.url, 'GET', `/v1/cases/${caseId}`, tokens[who]), unknown);
    }
    expectError(await api(h.url, 'GET', '/v1/cases/not-a-uuid', tokens.customer), 404, 'not_found');
  });

  it('transitionCase: the customer submits, a retry with the same key returns the same result, and a stale version is refused with 409', async () => {
    const submit = { next_state: 'submitted', reason: 'Máy không lên nguồn', expected_version: 1 };
    const first = await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.customer, submit, idem('submit-0001'));
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ id: caseId, status: 'submitted', version: 2 });
    const retry = await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.customer, submit, idem('submit-0001'));
    expect(retry.status).toBe(200);
    expect(retry.json).toMatchObject({ status: 'submitted', version: 2 });
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.customer, { next_state: 'withdrawn', reason: 'Đổi ý', expected_version: 1 }, idem('stale-0001')),
      409,
      'version_conflict',
    );
  });

  it('transitionCase: a move the role does not allow is 403 forbidden, and a move the rules do not list is 409 invalid_state', async () => {
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.customer, { next_state: 'triaged', reason: 'Tự phân loại', expected_version: 2 }, idem('role-0001')),
      403,
      'forbidden',
    );
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.merchantAgent, { next_state: 'closed', reason: 'Đóng luôn', expected_version: 2 }, idem('jump-0001')),
      409,
      'invalid_state',
    );
  });

  it('transitionCase: the merchant triages and reads the case, and an unknown state is refused with 400', async () => {
    const triaged = await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.merchantAgent, { next_state: 'triaged', reason: 'Đã nhận', expected_version: 2 }, idem('triage-0001'));
    expect(triaged.status).toBe(200);
    expect(triaged.json).toMatchObject({ status: 'triaged', version: 3 });
    expect((await api(h.url, 'GET', `/v1/cases/${caseId}`, tokens.merchantAgent)).json).toMatchObject({ status: 'triaged', version: 3 });
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.merchantAgent, { next_state: 'teleported', reason: 'Sai', expected_version: 3 }, idem('unknown-state-0001')),
      400,
      'invalid_input',
    );
  });

  it('transitionCase: resolving without an outcome, or with one the DB does not allow, is refused with 400 and leaves the case in_progress', async () => {
    const progress = await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.merchantAgent, { next_state: 'in_progress', reason: 'Đang sửa', expected_version: 3 }, idem('progress-0001'));
    expect(progress.status).toBe(200);
    expect(progress.json).toMatchObject({ status: 'in_progress', version: 4 });
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.merchantAgent, { next_state: 'resolved', reason: 'Đã sửa xong', expected_version: 4 }, idem('resolve-no-outcome-0001')),
      400,
      'invalid_input',
    );
    expectError(
      await api(
        h.url,
        'POST',
        `/v1/cases/${caseId}/transitions`,
        tokens.merchantAgent,
        { next_state: 'resolved', reason: 'Đã sửa xong', expected_version: 4, outcome: 'sent' },
        idem('resolve-bad-outcome-0001'),
      ),
      400,
      'invalid_input',
    );
    expect((await api(h.url, 'GET', `/v1/cases/${caseId}`, tokens.merchantAgent)).json).toMatchObject({ status: 'in_progress', version: 4 });
  });

  it('transitionCase: with a valid outcome the merchant resolves and closes the case end to end over HTTP (WO25-01)', async () => {
    const created = await api(
      h.url,
      'POST',
      '/v1/cases',
      tokens.customer,
      { item_id: itemId, organization_id: orgA, description: 'Máy kêu to khi chạy', shared_document_ids: [docA] },
      idem('resolve-flow-case-0001'),
    );
    expect(created.status).toBe(200);
    const flowCaseId = created.json.id as string;
    const move = async (actor: UserName, nextState: string, expectedVersion: number, outcome: string | undefined, key: string) =>
      api(
        h.url,
        'POST',
        `/v1/cases/${flowCaseId}/transitions`,
        tokens[actor],
        outcome === undefined
          ? { next_state: nextState, reason: 'Luồng xử lý', expected_version: expectedVersion }
          : { next_state: nextState, reason: 'Luồng xử lý', expected_version: expectedVersion, outcome },
        idem(key),
      );
    expect((await move('customer', 'submitted', 1, undefined, 'flow-submit-0001')).status).toBe(200);
    expect((await move('merchantAgent', 'triaged', 2, undefined, 'flow-triage-0001')).status).toBe(200);
    expect((await move('merchantAgent', 'in_progress', 3, undefined, 'flow-progress-0001')).status).toBe(200);
    const resolved = await move('merchantAgent', 'resolved', 4, 'replaced', 'flow-resolve-0001');
    expect(resolved.status).toBe(200);
    expect(resolved.json).toMatchObject({ id: flowCaseId, status: 'resolved', version: 5, outcome: 'replaced' });
    const closed = await move('merchantAgent', 'closed', 5, undefined, 'flow-close-0001');
    expect(closed.status).toBe(200);
    expect(closed.json).toMatchObject({ id: flowCaseId, status: 'closed', version: 6, outcome: 'replaced' });
    expect((await api(h.url, 'GET', `/v1/cases/${flowCaseId}`, tokens.merchantAgent)).json).toMatchObject({ status: 'closed', version: 6, outcome: 'replaced' });
  });

  it('grantDocument: after the customer invites a partner, the customer grants one evidence document, and the partner can read the case and the document', async () => {
    await asActor(USERS.customer, (c) =>
      c.query("select public.invite_case_participant($1::uuid, $2::uuid, now() + interval '1 day') as id", [caseId, USERS.partner]),
    );
    const granted = await api(
      h.url,
      'POST',
      `/v1/cases/${caseId}/grants`,
      tokens.customer,
      { document_id: docA, recipient_id: USERS.partner, expires_at: iso(1), can_download: false },
      idem('grant-partner-0001'),
    );
    expect(granted.status).toBe(200);
    expect(granted.json).toMatchObject({ status: 'active' });
    grantId = granted.json.id as string;
    expect(grantId).toMatch(UUID_RE);
    expect((await api(h.url, 'GET', `/v1/cases/${caseId}`, tokens.partner)).json).toMatchObject({ id: caseId, status: 'in_progress' });
    const access = await asActor(USERS.partner, async (c) =>
      (await c.query('select out_allowed, out_can_download, out_reason from public.check_document_access($1::uuid, $2::uuid)', [caseId, docA])).rows[0],
    );
    expect(access).toEqual({ out_allowed: true, out_can_download: false, out_reason: 'granted' });
  });

  it('grantDocument refuses a document that is not evidence, a recipient who is not an active participant, an expiry over 30 days, a missing flag, and anyone but the owner (404)', async () => {
    const grantPath = `/v1/cases/${caseId}/grants`;
    const ok = { document_id: docA, recipient_id: USERS.partner, expires_at: iso(1), can_download: false };
    expectError(await api(h.url, 'POST', grantPath, tokens.customer, { ...ok, document_id: docB }, idem('not-evidence-0001')), 400, 'invalid_input');
    expectError(await api(h.url, 'POST', grantPath, tokens.customer, { ...ok, recipient_id: USERS.stranger }, idem('stranger-0001')), 409, 'invalid_state');
    expectError(await api(h.url, 'POST', grantPath, tokens.customer, { ...ok, expires_at: iso(31) }, idem('too-long-0001')), 400, 'invalid_input');
    const withoutFlag: Record<string, unknown> = { ...ok };
    delete withoutFlag.can_download;
    expectError(await api(h.url, 'POST', grantPath, tokens.customer, withoutFlag, idem('no-flag-0001')), 400, 'invalid_input');
    expectError(await api(h.url, 'POST', grantPath, tokens.partner, ok, idem('partner-grant-0001')), 404, 'not_found');
    expectError(await api(h.url, 'POST', grantPath, tokens.merchantAgent, ok, idem('merchant-grant-0001')), 404, 'not_found');
  });

  it('revokeGrant: the owner revokes, reads stop at once, a repeat is harmless, and other people, other cases and unknown grants get 404', async () => {
    const emptyCase = await api(h.url, 'POST', '/v1/cases', tokens.customer, { item_id: itemId, organization_id: orgA, description: 'Hộp đựng thư', shared_document_ids: [] }, idem('case-create-0002'));
    expect(emptyCase.status).toBe(200);
    const emptyCaseId = emptyCase.json.id as string;
    expect(emptyCaseId).toMatch(UUID_RE);
    const revoke = `/v1/cases/${caseId}/grants/${grantId}`;
    expect((await api(h.url, 'DELETE', revoke, tokens.customer)).json).toMatchObject({ id: grantId, status: 'revoked' });
    expect((await api(h.url, 'DELETE', revoke, tokens.customer)).json).toMatchObject({ id: grantId, status: 'revoked' });
    const blocked = await asActor(USERS.partner, async (c) =>
      (await c.query('select out_allowed, out_reason from public.check_document_access($1::uuid, $2::uuid)', [caseId, docA])).rows[0],
    );
    expect(blocked).toEqual({ out_allowed: false, out_reason: 'grant_revoked' });
    expectError(await api(h.url, 'DELETE', revoke, tokens.partner), 404, 'not_found');
    expectError(await api(h.url, 'DELETE', revoke, tokens.stranger), 404, 'not_found');
    expectError(await api(h.url, 'DELETE', `/v1/cases/${emptyCaseId}/grants/${grantId}`, tokens.customer), 404, 'not_found');
    expectError(await api(h.url, 'DELETE', `/v1/cases/${caseId}/grants/${UNKNOWN_ID}`, tokens.customer), 404, 'not_found');
  });

  it('T05 an organization of another tenant cannot read, change, or grant on the case, and cannot revoke its grant', async () => {
    expectError(await api(h.url, 'GET', `/v1/cases/${caseId}`, tokens.orgBOwner), 404, 'not_found');
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/transitions`, tokens.orgBOwner, { next_state: 'withdrawn', reason: 'Không thuộc cửa hàng này', expected_version: 4 }, idem('tenant-b-move-0001')),
      404,
      'not_found',
    );
    expectError(
      await api(h.url, 'POST', `/v1/cases/${caseId}/grants`, tokens.orgBOwner, { document_id: docA, recipient_id: USERS.partner, expires_at: iso(1), can_download: true }, idem('tenant-b-grant-0001')),
      404,
      'not_found',
    );
    expectError(await api(h.url, 'DELETE', `/v1/cases/${caseId}/grants/${grantId}`, tokens.orgBOwner), 404, 'not_found');
    expect((await api(h.url, 'GET', `/v1/cases/${caseId}`, tokens.customer)).json).toMatchObject({ status: 'in_progress', version: 4 });
  });

  it('contract: operations without a data foundation answer 501 not_implemented after authentication, and 401 without it', async () => {
    const pending: Array<[string, string]> = [
      ['POST', `/v1/documents/${docA}/extract`],
      ['POST', `/v1/extractions/${UNKNOWN_ID}/review`],
      ['POST', '/v1/exports'],
      ['POST', '/v1/account/deletion'],
      ['GET', `/v1/jobs/${UNKNOWN_ID}`],
    ];
    for (const [method, path] of pending) {
      const body = method === 'GET' ? undefined : {};
      expectError(await api(h.url, method, path, null, body, idem('pending-anon-0001')), 401, 'unauthenticated');
      expectError(await api(h.url, method, path, tokens.customer, body, idem('pending-auth-0001')), 501, 'not_implemented');
    }
  });

  it('an unknown route answers 404 route_not_found for a signed-in caller', async () => {
    expect(await api(h.url, 'GET', '/v1/unknown-route', tokens.customer)).toEqual({ status: 404, json: { error: 'route_not_found' } });
  });
});
