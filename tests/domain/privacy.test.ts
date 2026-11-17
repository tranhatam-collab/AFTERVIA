import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_DELETION_PATH,
  ACCOUNT_EXPORTS_PATH,
  DELETION_CATALOGUE_STATUS,
  DELETION_PENDING_STEPS,
  classifyDeletionResponse,
  isDeletionRequestId,
  readPendingSteps,
} from '@aftervia/domain';

// Biên nhận thật của migration 0020 (jsonb_build_object trong request_account_deletion).
const RECEIPT = {
  request_id: 'erase-0001',
  status: 'PENDING_POLICY',
  access_revoked: { grants: 2, participants: 1, memberships: 0 },
  pending: [
    'primary_data_erasure',
    'retention_policy',
    'append_only_erasure',
    'session_revocation',
    'identity_verification',
    'tombstone_registry_outside_backup',
  ],
};

// WO11-03 (T25). Web và mobile đọc câu trả lời của API qua cùng một hàm, nên hai bên không thể lệch nhau.
describe('WO11-03 privacy paths and flags', () => {
  it('names the two routes the privacy screen uses, and the legal flag for the deletion catalogue', () => {
    expect(ACCOUNT_DELETION_PATH).toBe('/v1/account/deletion');
    expect(ACCOUNT_EXPORTS_PATH).toBe('/v1/exports');
    // OD-08: danh mục xóa chờ luật sư (HUM-LEGAL-DEL-01), nên giao diện phải nói rõ.
    expect(DELETION_CATALOGUE_STATUS).toBe('LEGAL_PENDING');
  });
});

describe('WO11-03 the deletion request id follows the same rule as the database', () => {
  it('needs 8 to 128 characters once the ends are trimmed', () => {
    expect(isDeletionRequestId('a'.repeat(7))).toBe(false);
    expect(isDeletionRequestId('a'.repeat(8))).toBe(true);
    expect(isDeletionRequestId('a'.repeat(128))).toBe(true);
    expect(isDeletionRequestId('a'.repeat(129))).toBe(false);
    expect(isDeletionRequestId(`   ${'a'.repeat(8)}   `)).toBe(true);
    expect(isDeletionRequestId(`   ${'a'.repeat(7)}   `)).toBe(false);
  });

  it('refuses anything that is not a string', () => {
    for (const bad of [null, undefined, 42, {}, [], true]) expect(isDeletionRequestId(bad)).toBe(false);
  });
});

describe('WO11-03 reading the answer to a deletion request', () => {
  it('T25 401 means the session is too old for this operation, not a wrong sign-in', () => {
    expect(classifyDeletionResponse(401, { code: 'unauthenticated' })).toEqual({ kind: 'reauth_required' });
    expect(classifyDeletionResponse(401, null)).toEqual({ kind: 'reauth_required' });
  });

  it('T25 a receipt is only accepted when both fields are there', () => {
    expect(classifyDeletionResponse(200, { request_id: 'erase-0001', status: 'PENDING_POLICY' })).toEqual({
      kind: 'requested',
      requestId: 'erase-0001',
      status: 'PENDING_POLICY',
      pending: [],
      unknownPending: 0,
    });
    // Never report success on a shape we did not expect.
    for (const body of [null, {}, { request_id: 'erase-0001' }, { status: 'PENDING_POLICY' }, { request_id: '', status: 'x' }, [1, 2]]) {
      expect(classifyDeletionResponse(200, body)).toEqual({ kind: 'refused', reason: 'unknown' });
    }
  });

  it('T25 every other status maps to a reason the screen can explain', () => {
    expect(classifyDeletionResponse(400, {})).toEqual({ kind: 'refused', reason: 'invalid_input' });
    expect(classifyDeletionResponse(403, {})).toEqual({ kind: 'refused', reason: 'forbidden' });
    expect(classifyDeletionResponse(404, {})).toEqual({ kind: 'refused', reason: 'not_found' });
    expect(classifyDeletionResponse(409, {})).toEqual({ kind: 'refused', reason: 'invalid_state' });
    expect(classifyDeletionResponse(429, {})).toEqual({ kind: 'refused', reason: 'rate_limited' });
    expect(classifyDeletionResponse(500, {})).toEqual({ kind: 'refused', reason: 'server' });
    expect(classifyDeletionResponse(503, {})).toEqual({ kind: 'refused', reason: 'server' });
    expect(classifyDeletionResponse(302, {})).toEqual({ kind: 'refused', reason: 'unknown' });
  });
});

describe('WO11-03 the receipt says what is still outstanding', () => {
  it('T25 keeps every step of the real receipt, so the screen cannot report the account as erased', () => {
    const outcome = classifyDeletionResponse(200, RECEIPT);
    if (outcome.kind !== 'requested') throw new Error(`expected requested, got ${outcome.kind}`);
    expect(outcome.pending).toEqual([...DELETION_PENDING_STEPS]);
    expect(outcome.unknownPending).toBe(0);
    // Yêu cầu đã nhận, nhưng còn 6 việc chưa làm: giao diện phải nói ra.
    expect(outcome.pending.length).toBe(6);
  });

  it('T25 counts a step it cannot name instead of dropping it', () => {
    const outcome = classifyDeletionResponse(200, { ...RECEIPT, pending: ['retention_policy', 'a_step_from_a_later_release'] });
    if (outcome.kind !== 'requested') throw new Error(`expected requested, got ${outcome.kind}`);
    expect(outcome.pending).toEqual(['retention_policy']);
    expect(outcome.unknownPending).toBe(1);
  });

  it('T25 reads a missing, malformed or duplicated pending list without throwing', () => {
    expect(readPendingSteps(undefined)).toEqual({ pending: [], unknownPending: 0 });
    expect(readPendingSteps('retention_policy')).toEqual({ pending: [], unknownPending: 0 });
    expect(readPendingSteps([])).toEqual({ pending: [], unknownPending: 0 });
    expect(readPendingSteps(['retention_policy', 'retention_policy'])).toEqual({ pending: ['retention_policy'], unknownPending: 0 });
    expect(readPendingSteps([null, 7, {}])).toEqual({ pending: [], unknownPending: 3 });
  });
});
