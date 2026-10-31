// Quy tắc nhập liệu cho món đồ (WO07-01). Thuần túy, dùng chung cho server, web và mobile.
// Ngày mua là ngày theo lịch (date-only): không chuyển sang thời điểm và không lệch theo múi giờ (T22).

export const ITEM_LIMITS = { title: 200, brand: 100, model: 100 } as const;

export interface ItemFields {
  title: string;
  brand: string | null;
  model: string | null;
  purchasedOn: string | null;
  currency: string | null;
}

export type ItemResult = { ok: true; value: ItemFields } | { ok: false; field: string };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CURRENCY = /^[A-Z]{3}$/;

export function isDateOnly(value: string): boolean {
  const m = DATE_ONLY.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// raw dùng tên trường theo API (snake_case). base là giá trị hiện tại khi cập nhật từng phần.
export function normalizeItemFields(raw: Record<string, unknown>, base?: ItemFields): ItemResult {
  const value: ItemFields = {
    title: base?.title ?? '',
    brand: base?.brand ?? null,
    model: base?.model ?? null,
    purchasedOn: base?.purchasedOn ?? null,
    currency: base?.currency ?? null,
  };

  if ('title' in raw) {
    if (typeof raw.title !== 'string') return { ok: false, field: 'title' };
    const title = raw.title.trim();
    if (title.length < 1 || title.length > ITEM_LIMITS.title) return { ok: false, field: 'title' };
    value.title = title;
  } else if (!base) {
    return { ok: false, field: 'title' };
  }

  for (const [key, field, max] of [
    ['brand', 'brand', ITEM_LIMITS.brand],
    ['model', 'model', ITEM_LIMITS.model],
  ] as const) {
    if (!(key in raw)) continue;
    const input = raw[key];
    if (input === null) {
      value[field] = null;
      continue;
    }
    if (typeof input !== 'string') return { ok: false, field: key };
    const trimmed = input.trim();
    if (trimmed.length > max) return { ok: false, field: key };
    value[field] = trimmed.length === 0 ? null : trimmed;
  }

  if ('purchased_on' in raw) {
    const input = raw.purchased_on;
    if (input === null) {
      value.purchasedOn = null;
    } else if (typeof input === 'string' && isDateOnly(input)) {
      value.purchasedOn = input;
    } else {
      return { ok: false, field: 'purchased_on' };
    }
  }

  if ('currency' in raw) {
    const input = raw.currency;
    if (input === null) {
      value.currency = null;
    } else if (typeof input === 'string' && CURRENCY.test(input)) {
      value.currency = input;
    } else {
      return { ok: false, field: 'currency' };
    }
  }

  return { ok: true, value };
}
