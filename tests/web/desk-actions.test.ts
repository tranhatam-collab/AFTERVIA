import type { ResolutionOutcome } from '@aftervia/domain';
import { describe, expect, it } from 'vitest';
import { addItem, isIdempotencyKey, openCase, transitionCase, transitionPath, type ActionOptions, type Transition } from '../../apps/web/src/actions';

// WO10-03b: ranh giới yêu cầu ghi của Web Desk (T38). Dữ liệu tổng hợp; fetch giả ghi lại mọi yêu cầu.
const BASE = 'https://desk.test.invalid';
const ITEM = '0000000a-0000-4000-8000-000000000001';
const ORG = '0000000b-0000-4000-8000-000000000002';
const CASE = '0000000c-0000-4000-8000-000000000003';
const KEY = 'desk-key-0000001';

interface Recorded {
  url: string;
  init: unknown;
}

function fakeFetch(status: number, body: unknown, calls: Recorded[]): typeof fetch {
  return (async (input: unknown, init?: unknown) => {
    calls.push({ url: String(input), init });
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

function options(fetchImpl: typeof fetch, token: string | null = 'token-ok', online = true): ActionOptions {
  return { fetchImpl, base: BASE, token, online };
}

const NEW_CASE = { itemId: ITEM, organizationId: ORG, description: 'Máy không lên nguồn', sharedDocumentIds: [] };

describe('WO10-03b Web Desk actions: fixed paths, one send per call, and every answer checked before use', () => {
  it('T38 an id that is not a UUID is refused before any request is sent', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(201, { id: ITEM }, calls);
    expect(transitionPath('../../admin')).toBeNull();
    expect(transitionPath(`${CASE}/../../x`)).toBeNull();
    const transition: Transition = { nextState: 'submitted', reason: 'Gửi', expectedVersion: 1 };
    expect(await transitionCase(options(fetchImpl), '../../admin', transition, KEY)).toEqual({ kind: 'invalid' });
    expect(await openCase(options(fetchImpl), { ...NEW_CASE, itemId: 'x' }, KEY)).toEqual({ kind: 'invalid' });
    expect(await openCase(options(fetchImpl), { ...NEW_CASE, sharedDocumentIds: ['../x'] }, KEY)).toEqual({ kind: 'invalid' });
    expect(calls).toHaveLength(0);
  });

  it('T38 every request goes to a fixed path, and text from the data is sent as data, never as part of the URL', async () => {
    const calls: Recorded[] = [];
    const hostile = '../../admin?x=1 <script>alert(1)</script>';
    const result = await addItem(options(fakeFetch(201, { id: ITEM }, calls)), { title: hostile });
    expect(result).toEqual({ kind: 'success', value: { id: ITEM } });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${BASE}/v1/items`);
    const sent = JSON.parse((calls[0]?.init as { body: string }).body) as { title: string };
    expect(sent.title).toBe(hostile);
  });

  it('T38 a request without a token is not sent, and the result is denied', async () => {
    const calls: Recorded[] = [];
    expect(await addItem(options(fakeFetch(201, { id: ITEM }, calls), null), { title: 'Máy giặt' })).toEqual({ kind: 'denied' });
    expect(await openCase(options(fakeFetch(200, {}, calls), null), NEW_CASE, KEY)).toEqual({ kind: 'denied' });
    expect(calls).toHaveLength(0);
  });

  it('T38 a write is sent once with no automatic retry, and the case key travels in the Idempotency-Key header', async () => {
    const calls: Recorded[] = [];
    const failed = await openCase(options(fakeFetch(503, { code: 'internal_error' }, calls)), NEW_CASE, KEY);
    expect(failed).toEqual({ kind: 'error' });
    expect(calls).toHaveLength(1);
    const headers = (calls[0]?.init as { headers: Record<string, string> }).headers;
    expect(headers['idempotency-key']).toBe(KEY);
    expect(headers.authorization).toBe('Bearer token-ok');
  });

  it('T38 a success answer that does not match the shape is an error, and nothing is reported as done', async () => {
    const calls: Recorded[] = [];
    expect(await addItem(options(fakeFetch(201, { id: 'not-a-uuid' }, calls)), { title: 'Máy giặt' })).toEqual({ kind: 'error' });
    expect(await openCase(options(fakeFetch(200, { id: CASE, status: 'hacked', version: 1, outcome: null }, calls)), NEW_CASE, KEY)).toEqual({ kind: 'error' });
    const resolve: Transition = { nextState: 'resolved', reason: 'Đã sửa', expectedVersion: 4, outcome: 'replaced' };
    expect(await transitionCase(options(fakeFetch(200, { id: CASE, status: 'resolved', version: 5, outcome: 'bogus' }, calls)), CASE, resolve, KEY)).toEqual({
      kind: 'error',
    });
    const submit: Transition = { nextState: 'submitted', reason: 'Gửi', expectedVersion: 1 };
    expect(await transitionCase(options(fakeFetch(200, { id: CASE, status: 'submitted', version: 0, outcome: null }, calls)), CASE, submit, KEY)).toEqual({
      kind: 'error',
    });
  });

  it('T38 a conflict says which conflict it is, and an unknown conflict code is reported as unknown', async () => {
    const calls: Recorded[] = [];
    const withdraw: Transition = { nextState: 'withdrawn', reason: 'Đổi ý', expectedVersion: 1 };
    expect(await transitionCase(options(fakeFetch(409, { code: 'version_conflict' }, calls)), CASE, withdraw, KEY)).toEqual({
      kind: 'conflict',
      code: 'version_conflict',
    });
    expect(await transitionCase(options(fakeFetch(409, { code: 'invalid_state' }, calls)), CASE, withdraw, KEY)).toEqual({
      kind: 'conflict',
      code: 'invalid_state',
    });
    expect(await transitionCase(options(fakeFetch(409, { code: 'something_else' }, calls)), CASE, withdraw, KEY)).toEqual({
      kind: 'conflict',
      code: 'unknown',
    });
  });

  it('T38 401, 403 and 404 are denied, 400 is invalid, and any other failure is an error', async () => {
    const calls: Recorded[] = [];
    const run = (status: number) => addItem(options(fakeFetch(status, { code: 'x' }, calls)), { title: 'Máy giặt' });
    expect(await run(401)).toEqual({ kind: 'denied' });
    expect(await run(403)).toEqual({ kind: 'denied' });
    expect(await run(404)).toEqual({ kind: 'denied' });
    expect(await run(400)).toEqual({ kind: 'invalid' });
    expect(await run(500)).toEqual({ kind: 'error' });
  });

  it('T38 a network failure is offline only when the browser reports no connection, otherwise it is an error', async () => {
    const broken = (async () => {
      throw new TypeError('network');
    }) as typeof fetch;
    expect(await addItem(options(broken, 'token-ok', false), { title: 'Máy giặt' })).toEqual({ kind: 'offline' });
    expect(await addItem(options(broken, 'token-ok', true), { title: 'Máy giặt' })).toEqual({ kind: 'error' });
  });

  it('T38 an idempotency key outside 8 to 128 characters is refused before any request', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(200, {}, calls);
    expect(await openCase(options(fetchImpl), NEW_CASE, 'short')).toEqual({ kind: 'invalid' });
    expect(await openCase(options(fetchImpl), NEW_CASE, 'k'.repeat(129))).toEqual({ kind: 'invalid' });
    expect(await addItem(options(fetchImpl), { title: 'Máy giặt' }, 'short')).toEqual({ kind: 'invalid' });
    expect(await addItem(options(fetchImpl), { title: 'Máy giặt' }, 'k'.repeat(129))).toEqual({ kind: 'invalid' });
    expect(isIdempotencyKey('k'.repeat(8))).toBe(true);
    expect(isIdempotencyKey('k'.repeat(128))).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('T38 a reason over the stored limit, an empty title, a bad date, or an outcome the domain does not list is refused before any request', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(200, {}, calls);
    const longReason: Transition = { nextState: 'submitted', reason: 'x'.repeat(501), expectedVersion: 1 };
    expect(await transitionCase(options(fetchImpl), CASE, longReason, KEY)).toEqual({ kind: 'invalid' });
    const badOutcome: Transition = { nextState: 'resolved', reason: 'Đã sửa', expectedVersion: 4, outcome: 'sent' as string as ResolutionOutcome };
    expect(await transitionCase(options(fetchImpl), CASE, badOutcome, KEY)).toEqual({ kind: 'invalid' });
    expect(await addItem(options(fetchImpl), { title: '   ' })).toEqual({ kind: 'invalid' });
    expect(await addItem(options(fetchImpl), { title: 'Máy giặt', purchasedOn: '2026-02-31x' })).toEqual({ kind: 'invalid' });
    expect(calls).toHaveLength(0);
  });

  it('T38 the write is called without a receiver, as the browser fetch requires', async () => {
    // Hàm giống fetch của trình duyệt: từ chối khi được gọi như thuộc tính của một đối tượng khác.
    const unbound = function (this: unknown): Promise<Response> {
      if (this !== undefined) return Promise.reject(new TypeError('Illegal invocation'));
      return Promise.resolve(new Response(JSON.stringify({ id: ITEM }), { status: 201, headers: { 'content-type': 'application/json' } }));
    } as unknown as typeof fetch;
    expect(await addItem(options(unbound), { title: 'Máy giặt' })).toEqual({ kind: 'success', value: { id: ITEM } });
  });
});
