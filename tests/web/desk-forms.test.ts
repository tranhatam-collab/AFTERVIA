import { CASE_STATES, RESOLUTION_OUTCOMES } from '@aftervia/domain';
import { t } from '@aftervia/i18n';
import { describe, expect, it } from 'vitest';
import en from '../../packages/i18n/src/en.json';
import vi from '../../packages/i18n/src/vi.json';
import {
  OUTCOME_KEY,
  STATUS_KEY,
  checkCase,
  checkItem,
  checkTransition,
  failureKey,
  keyFor,
  type CaseFormValues,
  type ItemFormValues,
  type TransitionFormValues,
} from '../../apps/web/src/forms';

// WO10-03e: kiểm dữ liệu, nhãn và thông báo của biểu mẫu Web Desk (T32), và quy tắc khóa idempotency (T38).
const ID = '0000000a-0000-4000-8000-000000000001';
const ORG = '0000000b-0000-4000-8000-000000000002';

const EMPTY_ITEM: ItemFormValues = { title: '', brand: '', model: '', purchasedOn: '', currency: 'VND' };
const EMPTY_CASE: CaseFormValues = { itemId: ID, organizationId: ORG, description: 'Máy không lên nguồn' };
const TRANSITION: TransitionFormValues = { caseId: ID, expectedVersion: '4', nextState: 'in_progress', reason: 'Đang sửa', outcome: '' };

describe('WO10-03e Web Desk forms: validation, labels, failure messages, and the idempotency key', () => {
  it('T32 every case state and every outcome has a Vietnamese and an English label, and the two differ', () => {
    for (const state of CASE_STATES) {
      const key = STATUS_KEY[state];
      expect(t('vi', key)).not.toBe(t('en', key));
    }
    for (const outcome of RESOLUTION_OUTCOMES) {
      const key = OUTCOME_KEY[outcome];
      expect(t('vi', key)).not.toBe(t('en', key));
    }
  });

  it('T32 the two catalogs keep exactly the same keys, and the Desk labels contain no markup and no doubled spaces', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    for (const [key, value] of Object.entries(vi)) {
      if (!key.startsWith('desk.')) continue;
      expect(value, key).not.toMatch(/[<>]/);
      expect(value, key).not.toMatch(/\s{2,}/);
    }
  });

  it('T32 an item needs a title of 1 to 200 characters, a real purchase date and an upper-case currency, and names the wrong field', () => {
    expect(checkItem({ ...EMPTY_ITEM, title: '   ' })).toEqual({ ok: false, error: 'item.error.title' });
    expect(checkItem({ ...EMPTY_ITEM, title: 'x'.repeat(201) })).toEqual({ ok: false, error: 'item.error.title' });
    expect(checkItem({ ...EMPTY_ITEM, title: 'Máy giặt', purchasedOn: '2026-02-31' })).toEqual({ ok: false, error: 'item.error.purchased_on' });
    expect(checkItem({ ...EMPTY_ITEM, title: 'Máy giặt', currency: 'vnd' })).toEqual({ ok: false, error: 'item.error.currency' });
    expect(checkItem({ ...EMPTY_ITEM, title: '  Máy giặt  ', brand: ' ', purchasedOn: '2026-05-02' })).toEqual({
      ok: true,
      value: { title: 'Máy giặt', brand: null, model: null, purchasedOn: '2026-05-02', currency: 'VND' },
    });
  });

  it('T32 a case needs two IDs in UUID form and a description of 1 to 500 characters', () => {
    expect(checkCase({ ...EMPTY_CASE, itemId: 'not-an-id' })).toEqual({ ok: false, error: 'desk.error.uuid' });
    expect(checkCase({ ...EMPTY_CASE, organizationId: '' })).toEqual({ ok: false, error: 'desk.error.uuid' });
    expect(checkCase({ ...EMPTY_CASE, description: '  ' })).toEqual({ ok: false, error: 'desk.error.description' });
    expect(checkCase({ ...EMPTY_CASE, description: 'x'.repeat(501) })).toEqual({ ok: false, error: 'desk.error.description' });
    expect(checkCase(EMPTY_CASE)).toEqual({
      ok: true,
      value: { itemId: ID, organizationId: ORG, description: 'Máy không lên nguồn', sharedDocumentIds: [] },
    });
  });

  it('T32 a move to resolved needs an outcome from the list; other moves send no outcome, even if one was chosen earlier', () => {
    expect(checkTransition({ ...TRANSITION, nextState: 'resolved', reason: 'Đã sửa', outcome: '' })).toEqual({
      ok: false,
      error: 'desk.transition.outcome.required',
    });
    expect(checkTransition({ ...TRANSITION, nextState: 'resolved', reason: 'Đã sửa', outcome: 'sent' })).toEqual({
      ok: false,
      error: 'desk.transition.outcome.required',
    });
    expect(checkTransition({ ...TRANSITION, nextState: 'resolved', reason: 'Đã sửa', outcome: 'replaced' })).toEqual({
      ok: true,
      value: { caseId: ID, input: { nextState: 'resolved', reason: 'Đã sửa', expectedVersion: 4, outcome: 'replaced' } },
    });
    expect(checkTransition({ ...TRANSITION, nextState: 'closed', outcome: 'replaced' })).toEqual({
      ok: true,
      value: { caseId: ID, input: { nextState: 'closed', reason: 'Đang sửa', expectedVersion: 4 } },
    });
  });

  it('T32 the expected version must be a whole number of 1 or more, the reason 1 to 500 characters, and the state from the list', () => {
    expect(checkTransition({ ...TRANSITION, expectedVersion: '0' })).toEqual({ ok: false, error: 'desk.error.version' });
    expect(checkTransition({ ...TRANSITION, expectedVersion: '1.5' })).toEqual({ ok: false, error: 'desk.error.version' });
    expect(checkTransition({ ...TRANSITION, expectedVersion: 'abc' })).toEqual({ ok: false, error: 'desk.error.version' });
    expect(checkTransition({ ...TRANSITION, reason: 'x'.repeat(501) })).toEqual({ ok: false, error: 'desk.error.reason' });
    expect(checkTransition({ ...TRANSITION, nextState: 'teleported' })).toEqual({ ok: false, error: 'desk.result.invalid' });
    expect(checkTransition({ ...TRANSITION, caseId: 'x' })).toEqual({ ok: false, error: 'desk.error.uuid' });
  });

  it('T32 each failure has one message, and a success has none', () => {
    expect(failureKey({ kind: 'success', value: null })).toBeNull();
    expect(failureKey({ kind: 'invalid' })).toBe('desk.result.invalid');
    expect(failureKey({ kind: 'denied' })).toBe('desk.result.denied');
    expect(failureKey({ kind: 'error' })).toBe('desk.result.error');
    expect(failureKey({ kind: 'offline' })).toBe('desk.result.offline');
    expect(failureKey({ kind: 'conflict', code: 'version_conflict' })).toBe('desk.result.conflict.version');
    expect(failureKey({ kind: 'conflict', code: 'invalid_state' })).toBe('desk.result.conflict.state');
    expect(failureKey({ kind: 'conflict', code: 'unknown' })).toBe('desk.result.conflict.unknown');
  });

  it('T38 a request sent again with the same content reuses its key, and changed content gets a new key', () => {
    let counter = 0;
    const next = (): string => `key-${++counter}`;
    const first = keyFor(null, 'A', next);
    expect(first.key).toBe('key-1');
    expect(keyFor(first, 'A', next)).toBe(first);
    expect(keyFor(first, 'B', next)).toEqual({ key: 'key-2', fingerprint: 'B' });
    expect(counter).toBe(2);
  });
});
