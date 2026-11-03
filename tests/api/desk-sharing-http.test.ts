import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addItem, openCase, type ActionOptions } from '../../apps/web/src/actions';
import { grantDocument, requestExport, revokeGrant } from '../../apps/web/src/sharing';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO10-03c: Web Desk chia tài liệu và xuất gói với API thật (T38). Dữ liệu tổng hợp.
const SECRET = ['local', 'test', 'signing', 'material', '1006'].join('-');
const USERS = {
  customer: '00000000-0000-4000-8000-0000000000f1',
  partner: '00000000-0000-4000-8000-0000000000f2',
  stranger: '00000000-0000-4000-8000-0000000000f3',
  customerOther: '00000000-0000-4000-8000-0000000000f4',
  merchantOwner: '00000000-0000-4000-8000-0000000000f5',
  merchantAgent: '00000000-0000-4000-8000-0000000000f6',
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

// Chỉ dùng để chuẩn bị dữ liệu (đăng nhập giả lập, tạo tổ chức). Các thao tác của Desk đi qua recordingFetch.
async function api(url: string, method: string, path: string, token: string | null, body?: unknown): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// Mọi yêu cầu của Desk trong tệp này đi qua hàm này, để kiểm đường dẫn ở cuối tệp.
const seen: string[] = [];
const recordingFetch = (async (input: unknown, init?: unknown) => {
  seen.push(String(input));
  return fetch(input as string, init as RequestInit);
}) as typeof fetch;

// Tài liệu đã tải xong và được quét bởi scanner không khả dụng: trạng thái được phép làm bằng chứng (như contract test).
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

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

let h: Harness;
const tokens = {} as Record<UserName, string>;
let orgId = '';
let itemId = '';
let caseId = '';
let docA = '';
let docB = '';
let grantId = '';

function desk(token: string | null): ActionOptions {
  return { fetchImpl: recordingFetch, base: h.url, token, online: true };
}

describe('WO10-03c Web Desk over HTTP: grant an evidence document, revoke it, and request an export', () => {
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
    orgId = (await api(h.url, 'POST', '/v1/organizations', tokens.merchantOwner, { legal_name: 'Cửa hàng chia sẻ', country: 'VN' })).json.id as string;
    await api(h.url, 'POST', `/v1/organizations/${orgId}/members`, tokens.merchantOwner, { user_id: USERS.merchantAgent, role: 'agent' });
    docA = await completedDocument(USERS.customer, 'desk-share-doc-a', 'a'.repeat(64));
    docB = await completedDocument(USERS.customer, 'desk-share-doc-b', 'b'.repeat(64));
    const added = await addItem(desk(tokens.customer), { title: 'Máy giặt', brand: 'Hãng Y', purchasedOn: '2026-05-02', currency: 'VND' });
    if (added.kind !== 'success') throw new Error('the item must be added');
    itemId = added.value.id;
    const opened = await openCase(desk(tokens.customer), { itemId, organizationId: orgId, description: 'Máy không lên nguồn', sharedDocumentIds: [docA] }, 'desk-share-case-1');
    if (opened.kind !== 'success') throw new Error('the case must open with evidence');
    caseId = opened.value.id;
    await asActor(USERS.customer, (c) =>
      c.query("select public.invite_case_participant($1::uuid, $2::uuid, now() + interval '1 day') as id", [caseId, USERS.partner]),
    );
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T38 the Desk grants an evidence document to the invited partner over HTTP, and the partner can read it in the database', async () => {
    const granted = await grantDocument(desk(tokens.customer), caseId, { documentId: docA, recipientId: USERS.partner, expiresAt: iso(1), canDownload: false }, 'desk-grant-0001');
    expect(granted).toMatchObject({ kind: 'success', value: { status: 'active' } });
    if (granted.kind !== 'success') return;
    grantId = granted.value.id;
    const access = await asActor(USERS.partner, async (c) =>
      (await c.query('select out_allowed, out_can_download, out_reason from public.check_document_access($1::uuid, $2::uuid)', [caseId, docA])).rows[0],
    );
    expect(access).toEqual({ out_allowed: true, out_can_download: false, out_reason: 'granted' });
  });

  it('T38 a grant the server refuses comes back as invalid, conflict or denied, each with its own kind', async () => {
    const base = { documentId: docA, recipientId: USERS.partner, expiresAt: iso(1), canDownload: false };
    expect(await grantDocument(desk(tokens.customer), caseId, { ...base, documentId: docB }, 'desk-grant-0002')).toEqual({ kind: 'invalid' });
    expect(await grantDocument(desk(tokens.customer), caseId, { ...base, recipientId: USERS.stranger }, 'desk-grant-0003')).toEqual({
      kind: 'conflict',
      code: 'invalid_state',
    });
    expect(await grantDocument(desk(tokens.customer), caseId, { ...base, expiresAt: iso(31) }, 'desk-grant-0004')).toEqual({ kind: 'invalid' });
    expect(await grantDocument(desk(tokens.partner), caseId, base, 'desk-grant-0005')).toEqual({ kind: 'denied' });
    expect(await grantDocument(desk(tokens.merchantAgent), caseId, base, 'desk-grant-0006')).toEqual({ kind: 'denied' });
  });

  it('T38 the owner revokes the grant over HTTP, a repeat is harmless, the partner loses access, and a revoke by someone else is denied', async () => {
    expect(await revokeGrant(desk(tokens.customer), caseId, grantId)).toEqual({ kind: 'success', value: { id: grantId, status: 'revoked' } });
    expect(await revokeGrant(desk(tokens.customer), caseId, grantId)).toEqual({ kind: 'success', value: { id: grantId, status: 'revoked' } });
    const blocked = await asActor(USERS.partner, async (c) =>
      (await c.query('select out_allowed, out_reason from public.check_document_access($1::uuid, $2::uuid)', [caseId, docA])).rows[0],
    );
    expect(blocked).toEqual({ out_allowed: false, out_reason: 'grant_revoked' });
    expect(await revokeGrant(desk(tokens.partner), caseId, grantId)).toEqual({ kind: 'denied' });
  });

  it('T38 the Desk requests an export over HTTP; a retry with the same key returns the same job', async () => {
    const first = await requestExport(desk(tokens.customer), 'desk-export-0001');
    expect(first).toMatchObject({ kind: 'success', value: { status: 'succeeded' } });
    expect(await requestExport(desk(tokens.customer), 'desk-export-0001')).toEqual(first);
  });

  it('T38 every request the Desk sent in this file went to a fixed path, and none carried a URL taken from data', () => {
    const fixed = [
      /^\/v1\/items$/,
      /^\/v1\/cases$/,
      /^\/v1\/cases\/[0-9a-f-]{36}\/grants$/,
      /^\/v1\/cases\/[0-9a-f-]{36}\/grants\/[0-9a-f-]{36}$/,
      /^\/v1\/exports$/,
    ];
    expect(seen.length).toBeGreaterThan(8);
    for (const url of seen) {
      const parsed = new URL(url);
      expect(fixed.some((re) => re.test(parsed.pathname)), parsed.pathname).toBe(true);
      expect(parsed.search).toBe('');
    }
  });
});
