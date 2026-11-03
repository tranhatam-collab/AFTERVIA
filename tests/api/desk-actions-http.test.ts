import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type pg from 'pg';
import type { CaseState, ResolutionOutcome } from '@aftervia/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addItem, openCase, transitionCase, type ActionOptions } from '../../apps/web/src/actions';
import { loadItems } from '../../apps/web/src/state';
import { ItemsView } from '../../apps/web/src/view';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO10-03b: Web Desk nói chuyện với API thật qua lớp yêu cầu của Desk (T38). Dữ liệu tổng hợp.
const SECRET = ['local', 'test', 'signing', 'material', '1005'].join('-');
const USERS = {
  customer: '00000000-0000-4000-8000-0000000000d1',
  customerOther: '00000000-0000-4000-8000-0000000000d2',
  merchantOwner: '00000000-0000-4000-8000-0000000000e1',
  merchantAgent: '00000000-0000-4000-8000-0000000000e2',
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

let h: Harness;
const tokens = {} as Record<UserName, string>;
let orgId = '';
let itemId = '';
let caseId = '';
let docA = '';

function desk(token: string | null): ActionOptions {
  return { fetchImpl: recordingFetch, base: h.url, token, online: true };
}

// Tài liệu đã tải xong và được quét bởi scanner không khả dụng: trạng thái được phép làm bằng chứng (như contract test).
// Case chỉ được chuyển sang resolved khi có ít nhất một bằng chứng (0008_cases.sql: "evidence is required").
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

describe('WO10-03b Web Desk over HTTP: add an item, open a case, move it to closed with an outcome', () => {
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
    orgId = (await api(h.url, 'POST', '/v1/organizations', tokens.merchantOwner, { legal_name: 'Cửa hàng Desk', country: 'VN' })).json.id as string;
    await api(h.url, 'POST', `/v1/organizations/${orgId}/members`, tokens.merchantOwner, { user_id: USERS.merchantAgent, role: 'agent' });
    docA = await completedDocument(USERS.customer, 'desk-doc-0001', 'a'.repeat(64));
  });

  afterAll(async () => {
    await stopHarness(h);
  });

  it('T38 the Desk adds an item over HTTP, and the list shows its text with the markup escaped and no link', async () => {
    const title = '<img src=x onerror="alert(1)">Máy giặt';
    const added = await addItem(desk(tokens.customer), { title, brand: 'Hãng <b>X</b>', purchasedOn: '2026-05-02', currency: 'VND' });
    expect(added).toMatchObject({ kind: 'success', value: { id: expect.any(String) } });
    if (added.kind !== 'success') return;
    itemId = added.value.id;
    const listed = await loadItems(desk(tokens.customer));
    expect(listed.kind).toBe('success');
    const markup = renderToStaticMarkup(createElement(ItemsView, { locale: 'vi', result: listed, onRetry: () => {} }));
    expect(markup).toContain('&lt;img');
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(markup).not.toContain('href');
  });

  it('T38 the Desk opens a case on the customer own item, a retry with the same key returns that case, and another account is denied', async () => {
    const body = { itemId, organizationId: orgId, description: 'Máy không lên nguồn', sharedDocumentIds: [docA] };
    const first = await openCase(desk(tokens.customer), body, 'desk-open-0001');
    expect(first).toMatchObject({ kind: 'success', value: { status: 'draft', version: 1, outcome: null } });
    if (first.kind !== 'success') return;
    caseId = first.value.id;
    expect(await openCase(desk(tokens.customer), body, 'desk-open-0001')).toMatchObject({ kind: 'success', value: { id: caseId } });
    expect(await openCase(desk(tokens.customerOther), body, 'desk-open-0002')).toEqual({ kind: 'denied' });
  });

  it('T38 the Desk submits, triages, starts, resolves with an outcome and closes the case over HTTP', async () => {
    const step = (token: string, nextState: CaseState, expectedVersion: number, outcome?: ResolutionOutcome) =>
      transitionCase(
        desk(token),
        caseId,
        outcome === undefined
          ? { nextState, reason: 'Luồng xử lý', expectedVersion }
          : { nextState, reason: 'Luồng xử lý', expectedVersion, outcome },
        `desk-flow-${nextState}`,
      );
    expect(await step(tokens.customer, 'submitted', 1)).toMatchObject({ kind: 'success', value: { status: 'submitted', version: 2 } });
    expect(await step(tokens.merchantAgent, 'triaged', 2)).toMatchObject({ kind: 'success', value: { status: 'triaged', version: 3 } });
    expect(await step(tokens.merchantAgent, 'in_progress', 3)).toMatchObject({ kind: 'success', value: { status: 'in_progress', version: 4 } });
    expect(await step(tokens.merchantAgent, 'resolved', 4, 'replaced')).toMatchObject({
      kind: 'success',
      value: { status: 'resolved', version: 5, outcome: 'replaced' },
    });
    expect(await step(tokens.merchantAgent, 'closed', 5)).toMatchObject({
      kind: 'success',
      value: { status: 'closed', version: 6, outcome: 'replaced' },
    });
  });

  it('T38 the Desk reports a stale version as a conflict, a move its role does not allow as denied, and a resolve without an outcome as invalid', async () => {
    const opened = await openCase(desk(tokens.customer), { itemId, organizationId: orgId, description: 'Máy kêu to', sharedDocumentIds: [docA] }, 'desk-open-0003');
    if (opened.kind !== 'success') throw new Error('the second case must open');
    const second = opened.value.id;
    expect(await transitionCase(desk(tokens.customer), second, { nextState: 'submitted', reason: 'Gửi', expectedVersion: 1 }, 'desk-stale-0001')).toMatchObject({
      kind: 'success',
      value: { status: 'submitted', version: 2 },
    });
    expect(await transitionCase(desk(tokens.customer), second, { nextState: 'withdrawn', reason: 'Đổi ý', expectedVersion: 1 }, 'desk-stale-0002')).toEqual({
      kind: 'conflict',
      code: 'version_conflict',
    });
    expect(await transitionCase(desk(tokens.customer), second, { nextState: 'triaged', reason: 'Tự phân loại', expectedVersion: 2 }, 'desk-role-0001')).toEqual({
      kind: 'denied',
    });
    expect(await transitionCase(desk(tokens.merchantAgent), second, { nextState: 'triaged', reason: 'Đã nhận', expectedVersion: 2 }, 'desk-triage-0002')).toMatchObject({
      kind: 'success',
      value: { status: 'triaged', version: 3 },
    });
    expect(await transitionCase(desk(tokens.merchantAgent), second, { nextState: 'in_progress', reason: 'Đang sửa', expectedVersion: 3 }, 'desk-progress-0002')).toMatchObject({
      kind: 'success',
      value: { version: 4 },
    });
    expect(await transitionCase(desk(tokens.merchantAgent), second, { nextState: 'resolved', reason: 'Đã sửa xong', expectedVersion: 4 }, 'desk-no-outcome-0001')).toEqual({
      kind: 'invalid',
    });
  });

  it('T38 every request the Desk sent in this file went to a fixed path, and none carried a URL taken from data', () => {
    const fixed = [/^\/v1\/items$/, /^\/v1\/cases$/, /^\/v1\/cases\/[0-9a-f-]{36}\/transitions$/];
    expect(seen.length).toBeGreaterThan(10);
    for (const url of seen) {
      const parsed = new URL(url);
      expect(fixed.some((re) => re.test(parsed.pathname)), parsed.pathname).toBe(true);
      expect(parsed.search).toBe('');
    }
  });
});
