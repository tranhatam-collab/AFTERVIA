import { describe, expect, it, vi } from 'vitest';
import { isDeletionRequestId } from '@aftervia/domain';
import { newDeletionRequestId, requestDeletion } from '../../apps/mobile/src/privacy/request-deletion';

// WO11-03: phần logic của màn Quyền riêng tư trên bản di động, chạy trên Node với fetch giả.
// Tên kiểm thử KHÔNG bắt đầu bằng T25: T25 còn cần bằng chứng trên thiết bị thật (DEV-01),
// nên phần này không được ghi PASS vào ma trận thay cho bản chạy trên máy.
const BASE = 'https://api.example.test';
const TOKEN = 'token-ok';
const REQUEST_ID = 'erase-0001-test';

const RECEIPT = {
  request_id: REQUEST_ID,
  status: 'PENDING_POLICY',
  access_revoked: { grants: 0, participants: 0, memberships: 0 },
  pending: ['primary_data_erasure', 'session_revocation'],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('mobile privacy: a deletion request is only sent when it can succeed', () => {
  it('sends nothing without a session, because this operation needs a session issued minutes ago', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    expect(await requestDeletion(fetchMock as unknown as typeof fetch, BASE, null, REQUEST_ID)).toEqual({ kind: 'signed_out' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing when the request id is outside the range the server accepts', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    expect(await requestDeletion(fetchMock as unknown as typeof fetch, BASE, TOKEN, 'short')).toEqual({ kind: 'invalid' });
    expect(await requestDeletion(fetchMock as unknown as typeof fetch, BASE, TOKEN, 'e'.repeat(129))).toEqual({ kind: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends one POST to the same path and body the web app uses', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse(200, RECEIPT)));
    await requestDeletion(fetchMock as unknown as typeof fetch, BASE, TOKEN, ` ${REQUEST_ID} `);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/v1/account/deletion`);
    expect(call?.[1]?.method).toBe('POST');
    // Khoảng trắng hai đầu bị cắt trước khi gửi, giống ràng buộc của hàm SQL.
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ request_id: REQUEST_ID });
    const headers = call?.[1]?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers['idempotency-key']).toBeUndefined();
  });
});

describe('mobile privacy: the answer is read exactly as the web app reads it', () => {
  it('keeps the outstanding steps of a receipt', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(200, RECEIPT)));
    expect(await requestDeletion(fetchMock as unknown as typeof fetch, BASE, TOKEN, REQUEST_ID)).toEqual({
      kind: 'requested',
      requestId: REQUEST_ID,
      status: 'PENDING_POLICY',
      pending: ['primary_data_erasure', 'session_revocation'],
      unknownPending: 0,
    });
  });

  it('reads 401 as "the session is too old", 409 as a refusal, and a torn connection as a network failure', async () => {
    const unauth = vi.fn(() => Promise.resolve(jsonResponse(401, { code: 'unauthenticated' })));
    expect(await requestDeletion(unauth as unknown as typeof fetch, BASE, TOKEN, REQUEST_ID)).toEqual({ kind: 'reauth_required' });

    const conflict = vi.fn(() => Promise.resolve(jsonResponse(409, { code: 'invalid_state' })));
    expect(await requestDeletion(conflict as unknown as typeof fetch, BASE, TOKEN, REQUEST_ID)).toEqual({
      kind: 'refused',
      reason: 'invalid_state',
    });

    const broken = vi.fn(() => Promise.reject(new Error('connection reset')));
    expect(await requestDeletion(broken as unknown as typeof fetch, BASE, TOKEN, REQUEST_ID)).toEqual({ kind: 'network' });
  });

  it('never reports a body it cannot read as a recorded request', async () => {
    const notJson = vi.fn(() => Promise.resolve(new Response('<html>gateway</html>', { status: 200 })));
    expect(await requestDeletion(notJson as unknown as typeof fetch, BASE, TOKEN, REQUEST_ID)).toEqual({ kind: 'refused', reason: 'unknown' });
  });
});

describe('mobile privacy: the generated request id fits the server rule', () => {
  it('is inside 8 to 128 characters for a fixed clock and random source, and changes between presses', () => {
    const id = newDeletionRequestId(
      () => 1_762_000_000_000,
      () => 0.123456789,
    );
    expect(isDeletionRequestId(id)).toBe(true);
    expect(id.startsWith('erase-')).toBe(true);
    expect(newDeletionRequestId()).not.toBe(newDeletionRequestId(() => Date.now() + 1));
  });

  it('stays inside the range even when the random source gives the shortest possible value', () => {
    const id = newDeletionRequestId(
      () => 0,
      () => 0,
    );
    expect(isDeletionRequestId(id)).toBe(true);
    expect(id.length).toBeLessThanOrEqual(128);
  });
});
