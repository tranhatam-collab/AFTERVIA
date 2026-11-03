import { describe, expect, it } from 'vitest';
import type { ActionOptions } from '../../apps/web/src/actions';
import { grantDocument, grantPath, grantsPath, requestExport, revokeGrant, type NewGrant } from '../../apps/web/src/sharing';

// WO10-03c: chia tài liệu và xuất gói qua lớp yêu cầu của Desk (T38). Dữ liệu tổng hợp; fetch giả ghi lại mọi yêu cầu.
const BASE = 'https://desk.test.invalid';
const CASE = '0000000c-0000-4000-8000-000000000003';
const GRANT = '0000000d-0000-4000-8000-000000000004';
const DOC = '0000000e-0000-4000-8000-000000000005';
const PARTNER = '0000000f-0000-4000-8000-000000000006';
const KEY = 'desk-share-0001';

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

const GRANT_INPUT: NewGrant = { documentId: DOC, recipientId: PARTNER, expiresAt: '2026-11-04T10:00:00.000Z', canDownload: false };

describe('WO10-03c Web Desk sharing and export: fixed paths, one send per call, and every answer checked before use', () => {
  it('T38 ids that are not UUIDs are refused before any request, for grants, revocations and documents', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(201, { id: GRANT, status: 'active' }, calls);
    expect(grantsPath('../../admin')).toBeNull();
    expect(grantPath(CASE, '../../x')).toBeNull();
    expect(await grantDocument(options(fetchImpl), '../../admin', GRANT_INPUT, KEY)).toEqual({ kind: 'invalid' });
    expect(await grantDocument(options(fetchImpl), CASE, { ...GRANT_INPUT, documentId: 'x' }, KEY)).toEqual({ kind: 'invalid' });
    expect(await grantDocument(options(fetchImpl), CASE, { ...GRANT_INPUT, recipientId: '../x' }, KEY)).toEqual({ kind: 'invalid' });
    expect(await revokeGrant(options(fetchImpl), CASE, '../../y')).toEqual({ kind: 'invalid' });
    expect(calls).toHaveLength(0);
  });

  it('T38 the expiry is sent as one normalized ISO date-time, and an expiry that does not parse is refused before any request', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(200, { id: GRANT, status: 'active' }, calls);
    expect(await grantDocument(options(fetchImpl), CASE, { ...GRANT_INPUT, expiresAt: '2026-11-04T17:00:00+07:00' }, KEY)).toEqual({
      kind: 'success',
      value: { id: GRANT, status: 'active' },
    });
    const sent = JSON.parse((calls[0]?.init as { body: string }).body) as Record<string, unknown>;
    expect(sent.expires_at).toBe('2026-11-04T10:00:00.000Z');
    expect(sent.can_download).toBe(false);
    expect(await grantDocument(options(fetchImpl), CASE, { ...GRANT_INPUT, expiresAt: 'ngày mai' }, KEY)).toEqual({ kind: 'invalid' });
    expect(calls).toHaveLength(1);
  });

  it('T38 a grant needs a boolean download flag and an idempotency key of 8 to 128 characters, and both are checked before any request', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(200, { id: GRANT, status: 'active' }, calls);
    expect(await grantDocument(options(fetchImpl), CASE, { ...GRANT_INPUT, canDownload: 'yes' as unknown as boolean }, KEY)).toEqual({ kind: 'invalid' });
    expect(await grantDocument(options(fetchImpl), CASE, GRANT_INPUT, 'short')).toEqual({ kind: 'invalid' });
    expect(await requestExport(options(fetchImpl), 'short')).toEqual({ kind: 'invalid' });
    expect(calls).toHaveLength(0);
  });

  it('T38 a revocation is a DELETE to the fixed grant path, with no body and no Content-Type header', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(200, { id: GRANT, status: 'revoked' }, calls);
    expect(await revokeGrant(options(fetchImpl), CASE, GRANT)).toEqual({ kind: 'success', value: { id: GRANT, status: 'revoked' } });
    expect(calls[0]?.url).toBe(`${BASE}/v1/cases/${CASE}/grants/${GRANT}`);
    const init = calls[0]?.init as { method: string; body?: unknown; headers: Record<string, string> };
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(init.headers['content-type']).toBeUndefined();
    expect(init.headers.authorization).toBe('Bearer token-ok');
  });

  it('T38 a grant or revocation answer must name the status it asked for, and an id that is not a UUID is an error', async () => {
    const calls: Recorded[] = [];
    expect(await grantDocument(options(fakeFetch(200, { id: GRANT, status: 'revoked' }, calls)), CASE, GRANT_INPUT, KEY)).toEqual({ kind: 'error' });
    expect(await revokeGrant(options(fakeFetch(200, { id: 'not-a-uuid', status: 'revoked' }, calls)), CASE, GRANT)).toEqual({ kind: 'error' });
    expect(await revokeGrant(options(fakeFetch(200, { id: GRANT, status: 'active' }, calls)), CASE, GRANT)).toEqual({ kind: 'error' });
  });

  it('T38 an export request is a POST that carries the key, and only a succeeded job with a UUID id is reported', async () => {
    const calls: Recorded[] = [];
    expect(await requestExport(options(fakeFetch(200, { id: GRANT, status: 'succeeded' }, calls)), KEY)).toEqual({
      kind: 'success',
      value: { id: GRANT, status: 'succeeded' },
    });
    expect(calls[0]?.url).toBe(`${BASE}/v1/exports`);
    const init = calls[0]?.init as { method: string; body: string; headers: Record<string, string> };
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({});
    expect(init.headers['idempotency-key']).toBe(KEY);
    expect(await requestExport(options(fakeFetch(200, { id: GRANT, status: 'pending' }, calls)), KEY)).toEqual({ kind: 'error' });
  });

  it('T38 without a token nothing is sent for grants, revocations or exports, and the result is denied', async () => {
    const calls: Recorded[] = [];
    const fetchImpl = fakeFetch(200, { id: GRANT, status: 'active' }, calls);
    expect(await grantDocument(options(fetchImpl, null), CASE, GRANT_INPUT, KEY)).toEqual({ kind: 'denied' });
    expect(await revokeGrant(options(fetchImpl, null), CASE, GRANT)).toEqual({ kind: 'denied' });
    expect(await requestExport(options(fetchImpl, null), KEY)).toEqual({ kind: 'denied' });
    expect(calls).toHaveLength(0);
  });

  it('T38 403 and 404 are denied for grants and revocations, 400 is invalid, and a 409 keeps the code the server gives', async () => {
    const calls: Recorded[] = [];
    expect(await grantDocument(options(fakeFetch(404, { code: 'not_found' }, calls)), CASE, GRANT_INPUT, KEY)).toEqual({ kind: 'denied' });
    expect(await revokeGrant(options(fakeFetch(403, { code: 'forbidden' }, calls)), CASE, GRANT)).toEqual({ kind: 'denied' });
    expect(await grantDocument(options(fakeFetch(400, { code: 'invalid_input' }, calls)), CASE, GRANT_INPUT, KEY)).toEqual({ kind: 'invalid' });
    expect(await grantDocument(options(fakeFetch(409, { code: 'invalid_state' }, calls)), CASE, GRANT_INPUT, KEY)).toEqual({
      kind: 'conflict',
      code: 'invalid_state',
    });
  });
});
