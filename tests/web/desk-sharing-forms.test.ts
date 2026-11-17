import { describe, expect, it } from 'vitest';
import { t, type MessageKey } from '@aftervia/i18n';
import en from '../../packages/i18n/src/en.json';
import vi from '../../packages/i18n/src/vi.json';
import { checkGrant, checkRevoke, localInput, MAX_GRANT_DAYS, type GrantFormValues } from '../../apps/web/src/sharing-forms';

// WO10-03f: biểu mẫu chia tài liệu, thu hồi và xuất gói (T32 nhãn và thông báo; T38 ranh giới dữ liệu và hạn truy cập).
const CASE = '0000000c-0000-4000-8000-000000000003';
const DOC = '0000000e-0000-4000-8000-000000000005';
const PARTNER = '0000000f-0000-4000-8000-000000000006';
const GRANT = '0000000d-0000-4000-8000-000000000004';
const DAY = 86_400_000;
const NOW = new Date('2026-11-03T04:00:00Z');
const BASE_GRANT: GrantFormValues = {
  caseId: CASE,
  documentId: DOC,
  recipientId: PARTNER,
  expiresAt: localInput(new Date(NOW.getTime() + 3 * DAY)),
  canDownload: false,
};

const NEW_KEYS: MessageKey[] = [
  'desk.error.expiry',
  'desk.grant.heading',
  'desk.grant.documentId.label',
  'desk.grant.recipientId.label',
  'desk.grant.expiresAt.label',
  'desk.grant.canDownload.label',
  'desk.grant.submit',
  'desk.grant.granted',
  'desk.revoke.heading',
  'desk.revoke.grantId.label',
  'desk.revoke.submit',
  'desk.revoke.revoked',
  'desk.export.heading',
  'desk.export.note',
  'desk.export.submit',
  'desk.export.created',
  'desk.export.status.succeeded',
];

describe('WO10-03f Web Desk sharing forms: validation, expiry, labels', () => {
  it('T38 a grant needs three IDs in UUID form, and anything else is refused before any request', () => {
    expect(checkGrant({ ...BASE_GRANT, documentId: 'x' }, NOW)).toEqual({ ok: false, error: 'desk.error.uuid' });
    expect(checkGrant({ ...BASE_GRANT, recipientId: '../x' }, NOW)).toEqual({ ok: false, error: 'desk.error.uuid' });
    expect(checkGrant({ ...BASE_GRANT, caseId: '' }, NOW)).toEqual({ ok: false, error: 'desk.error.uuid' });
  });

  it('T38 the expiry must be after now and at most 30 days away, and it is sent as a UTC ISO time', () => {
    expect(checkGrant({ ...BASE_GRANT, expiresAt: '' }, NOW)).toEqual({ ok: false, error: 'desk.error.expiry' });
    expect(checkGrant({ ...BASE_GRANT, expiresAt: localInput(new Date(NOW.getTime() - DAY)) }, NOW)).toEqual({
      ok: false,
      error: 'desk.error.expiry',
    });
    expect(checkGrant({ ...BASE_GRANT, expiresAt: localInput(new Date(NOW.getTime() + (MAX_GRANT_DAYS + 1) * DAY)) }, NOW)).toEqual({
      ok: false,
      error: 'desk.error.expiry',
    });
    expect(checkGrant({ ...BASE_GRANT, expiresAt: localInput(new Date(NOW.getTime() + MAX_GRANT_DAYS * DAY)) }, NOW).ok).toBe(true);
    expect(checkGrant(BASE_GRANT, NOW)).toEqual({
      ok: true,
      value: {
        caseId: CASE,
        input: { documentId: DOC, recipientId: PARTNER, expiresAt: new Date(NOW.getTime() + 3 * DAY).toISOString(), canDownload: false },
      },
    });
  });

  it('T38 the download flag passes through as a boolean', () => {
    const allowed = checkGrant({ ...BASE_GRANT, canDownload: true }, NOW);
    expect(allowed.ok && allowed.value.input.canDownload).toBe(true);
  });

  it('T38 a revocation needs two IDs in UUID form', () => {
    expect(checkRevoke({ caseId: CASE, grantId: 'x' })).toEqual({ ok: false, error: 'desk.error.uuid' });
    expect(checkRevoke({ caseId: CASE, grantId: GRANT })).toEqual({ ok: true, value: { caseId: CASE, grantId: GRANT } });
  });

  it('T32 the new labels and messages exist in both languages, and the two differ', () => {
    for (const key of NEW_KEYS) {
      const params = { id: 'x', status: 'y', version: 1 };
      expect(t('vi', key, params), key).not.toBe(t('en', key, params));
    }
  });

  it('T32 the new Desk labels contain no markup and no doubled spaces', () => {
    for (const key of NEW_KEYS) {
      expect(vi[key], key).not.toMatch(/[<>]/);
      expect(vi[key], key).not.toMatch(/\s{2,}/);
      expect(en[key], key).not.toMatch(/\s{2,}/);
    }
  });

  it('T32 a local expiry round-trips to the same minute', () => {
    const at = new Date('2026-11-04T10:30:00Z');
    expect(new Date(localInput(at)).getTime()).toBe(at.getTime());
  });
});
