import { describe, expect, it } from 'vitest';
import { isDateOnly, normalizeItemFields } from '@aftervia/domain';

describe('WO07-01 item input rules', () => {
  it('T22 the purchase date is kept as a calendar date and impossible dates are refused', () => {
    const ok = normalizeItemFields({ title: 'Máy hút bụi', purchased_on: '2026-03-04' });
    expect(ok).toEqual({
      ok: true,
      value: { title: 'Máy hút bụi', brand: null, model: null, purchasedOn: '2026-03-04', currency: null },
    });
    expect(normalizeItemFields({ title: 'x', purchased_on: '2024-02-29' }).ok).toBe(true);
    expect(normalizeItemFields({ title: 'x', purchased_on: '2026-02-31' })).toEqual({ ok: false, field: 'purchased_on' });
    expect(isDateOnly('2026-13-01')).toBe(false);
    expect(isDateOnly('2026-03-04T00:00:00Z')).toBe(false);
  });

  it('a title is required on create, trimmed, and bounded', () => {
    expect(normalizeItemFields({})).toEqual({ ok: false, field: 'title' });
    expect(normalizeItemFields({ title: '   ' })).toEqual({ ok: false, field: 'title' });
    expect(normalizeItemFields({ title: 'a'.repeat(201) })).toEqual({ ok: false, field: 'title' });
    const trimmed = normalizeItemFields({ title: '  Đèn bàn  ' });
    expect(trimmed.ok && trimmed.value.title).toBe('Đèn bàn');
  });

  it('a partial update keeps the fields it does not mention', () => {
    const base = { title: 'Đèn bàn', brand: 'Hãng Y', model: null, purchasedOn: '2025-01-01', currency: 'VND' };
    const result = normalizeItemFields({ title: 'Đèn bàn mới' }, base);
    expect(result).toEqual({ ok: true, value: { ...base, title: 'Đèn bàn mới' } });
  });

  it('currency must be three uppercase letters and brand or model may be cleared with null', () => {
    expect(normalizeItemFields({ title: 'x', currency: 'vnd' })).toEqual({ ok: false, field: 'currency' });
    expect(normalizeItemFields({ title: 'x', currency: 'USD' }).ok).toBe(true);
    const cleared = normalizeItemFields({ title: 'x', brand: null, model: '   ' });
    expect(cleared.ok && cleared.value.brand).toBeNull();
    expect(cleared.ok && cleared.value.model).toBeNull();
  });
});
