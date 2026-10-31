import { describe, expect, it } from 'vitest';
import { LOCALES, formatDateOnly, formatMoneyMinor, t, type MessageKey } from '@aftervia/i18n';
import en from '../../packages/i18n/src/en.json';
import vi from '../../packages/i18n/src/vi.json';

const CATALOGS = { vi, en } as const;
const PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

function placeholdersOf(text: string): string[] {
  return Array.from(text.matchAll(PLACEHOLDER), (m) => m[1] ?? '').sort();
}

// Intl dùng khoảng trắng không ngắt (U+00A0) giữa số và ký hiệu; chuẩn hóa để so sánh chữ.
const nbsp = (s: string): string => s.replace(/ /g, ' ');

describe('WO07-04 Vietnamese and English messages, dates and money', () => {
  it('T32 the Vietnamese and English catalogs have exactly the same keys, and no value is empty or badly spaced', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(CATALOGS[locale])) {
        expect(value.length, key).toBeGreaterThan(0);
        expect(value.trim(), key).toBe(value);
        expect(value, key).not.toMatch(/\s{2,}/);
      }
    }
  });

  it('T32 every state and feature label the app uses has a message in both languages', () => {
    const required: MessageKey[] = [
      'common.loading',
      'common.empty',
      'common.error',
      'common.offline',
      'common.denied',
      'common.save',
      'common.cancel',
      'item.title.label',
      'item.brand.label',
      'item.model.label',
      'item.purchasedOn.label',
      'item.currency.label',
      'item.error.title',
      'item.error.brand',
      'item.error.model',
      'item.error.purchased_on',
      'item.error.currency',
      'item.error.version',
      'reminder.due.title',
      'reminder.status.scheduled',
      'reminder.status.pushAccepted',
      'reminder.status.inboxOnly',
      'reminder.inbox.empty',
      'ai.suggestion.badge',
      'confirmed.badge',
      'confirmed.evidence',
      'locale.vi',
      'locale.en',
      'app.name',
    ];
    expect(new Set(required)).toEqual(new Set(Object.keys(vi)));
    for (const key of required) {
      for (const locale of LOCALES) {
        expect(t(locale, key, { actor: 'Hà', source: 'Hóa đơn' })).not.toBe('');
      }
    }
  });

  it('T32 each message uses the same placeholders in both languages, and a placeholder without a value is refused', () => {
    for (const key of Object.keys(vi) as MessageKey[]) {
      expect(placeholdersOf(en[key]), key).toEqual(placeholdersOf(vi[key]));
    }
    expect(t('en', 'confirmed.badge', { actor: 'Hà' })).toBe('Confirmed by Hà');
    expect(() => t('vi', 'confirmed.badge', {})).toThrow('missing_param:confirmed.badge:actor');
  });

  it('T32 messages come only from the catalogs: an unknown key or an object property is refused, never shown as a raw key', () => {
    expect(() => t('vi', 'no.such.key' as MessageKey)).toThrow('missing_message:vi:no.such.key');
    expect(() => t('en', 'toString' as MessageKey)).toThrow('missing_message:en:toString');
  });

  it('T32 Vietnamese text is stored in Unicode NFC, so the same diacritics are composed the same way everywhere', () => {
    for (const value of Object.values(vi)) {
      expect(value.normalize('NFC')).toBe(value);
    }
  });

  it('T32 a date-only value is shown as the same calendar day in both languages, and impossible dates are refused', () => {
    expect(formatDateOnly('2026-04-30', 'vi')).toBe('30 thg 4, 2026');
    expect(formatDateOnly('2026-04-30', 'en')).toBe('Apr 30, 2026');
    expect(formatDateOnly('2026-01-01', 'en')).toBe('Jan 1, 2026');
    expect(formatDateOnly('2024-02-29', 'vi')).toBe('29 thg 2, 2024');
    expect(() => formatDateOnly('2026-02-31', 'en')).toThrow(RangeError);
    expect(() => formatDateOnly('2026-04-30T00:00:00Z', 'en')).toThrow(RangeError);
  });

  it("T32 money is kept in minor units and shown with each currency's own digits in both languages", () => {
    expect(nbsp(formatMoneyMinor(129000, 'VND', 'vi'))).toBe('129.000 ₫');
    expect(nbsp(formatMoneyMinor(1299, 'USD', 'en'))).toBe('$12.99');
    expect(nbsp(formatMoneyMinor(1500, 'JPY', 'en'))).toBe('¥1,500');
    expect(nbsp(formatMoneyMinor(1299, 'USD', 'vi'))).toBe('12,99 US$');
    expect(() => formatMoneyMinor(12.5, 'USD', 'en')).toThrow(RangeError);
    expect(() => formatMoneyMinor(100, 'XXXXX', 'en')).toThrow(RangeError);
    expect(() => formatMoneyMinor(100, 'usd', 'en')).toThrow(RangeError);
  });
});
