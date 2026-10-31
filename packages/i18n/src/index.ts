// Bộ văn bản và định dạng VI/EN (WO07-04). Thuần túy: không đọc ngôn ngữ của trình duyệt hay của máy chủ.
// Mọi văn bản hiển thị đi qua t(locale, key). Khóa được kiểm kiểu từ bộ tiếng Việt, nên khóa sai bị báo khi kiểm kiểu.
// Ngày chỉ có ngày (date-only) được định dạng theo UTC: không đổi ngày theo múi giờ của người xem.
// Tiền lưu theo đơn vị nhỏ nhất (số nguyên); số chữ số thập phân lấy từ ISO 4217 qua Intl, không hard-code.

import en from './en.json';
import vi from './vi.json';

export type Locale = 'vi' | 'en';
export const LOCALES: readonly Locale[] = ['vi', 'en'];
export type MessageKey = keyof typeof vi;

const CATALOGS: Record<Locale, Record<string, string>> = { vi, en };
const INTL_TAG: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };
const PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CURRENCY = /^[A-Z]{3}$/;

export function isLocale(value: unknown): value is Locale {
  return value === 'vi' || value === 'en';
}

// Không bao giờ trả về khóa thô hay thuộc tính của Object: khóa lạ bị từ chối.
export function t(locale: Locale, key: MessageKey, params: Record<string, string | number> = {}): string {
  const catalog = CATALOGS[locale];
  if (!Object.prototype.hasOwnProperty.call(catalog, key)) throw new Error(`missing_message:${locale}:${key}`);
  const template = catalog[key];
  if (template === undefined) throw new Error(`missing_message:${locale}:${key}`);
  return template.replace(PLACEHOLDER, (_match: string, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`missing_param:${key}:${name}`);
    return String(value);
  });
}

// Ngày chỉ có ngày theo lịch (YYYY-MM-DD), hiển thị theo UTC để ngày không lệch theo múi giờ.
export function formatDateOnly(value: string, locale: Locale): string {
  const m = DATE_ONLY.exec(value);
  if (!m) throw new RangeError('invalid_date_only');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError('invalid_date_only');
  }
  return new Intl.DateTimeFormat(INTL_TAG[locale], { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

// Tiền theo đơn vị nhỏ nhất (số nguyên an toàn). Số chữ số thập phân theo ISO 4217 của mã tiền tệ.
export function formatMoneyMinor(minor: number, currency: string, locale: Locale): string {
  if (!Number.isSafeInteger(minor)) throw new RangeError('minor_units_must_be_integer');
  if (!CURRENCY.test(currency) || !Intl.supportedValuesOf('currency').includes(currency)) {
    throw new RangeError('unknown_currency');
  }
  const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  if (digits === undefined) throw new RangeError('unknown_currency');
  return new Intl.NumberFormat(INTL_TAG[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}
