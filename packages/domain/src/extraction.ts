// Kiểm đầu ra trích xuất (WO06-01). Hàm thuần: không gọi model, không I/O, không ghi dữ liệu.
// Quy tắc: schema trước, rồi kiểm ngữ nghĩa. Lỗi thì từ chối; không bao giờ tự bịa giá trị.
//  - Ngày mơ hồ (không có năm, hoặc cả hai thành phần <= 12 mà locale chưa biết) bị đặt thành null, gắn cờ cần xác nhận.
//  - Tiền tệ phải là mã ISO 4217 (danh sách của ICU).
//  - Trường null phải có lý do: warnings chứa "missing:<trường>" hoặc "ambiguous:<trường>".
//  - Giá trị khác null phải có source_text (không có nguồn thì coi là bịa).
//  - Mô hình không được tự xác nhận: review_status phải là NEEDS_REVIEW.
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { EXTRACTION_SCHEMA } from './extraction-schema';

export type ReviewStatus = 'NEEDS_REVIEW' | 'CONFIRMED' | 'REJECTED';
export type ExtractionLocale = 'vi' | 'en-US';
export type FieldName = 'merchant' | 'purchase_date' | 'amount_minor' | 'currency' | 'item_name' | 'serial';

export interface ExtractionField {
  value: string | number | null;
  source_text: string | null;
  page: number | null;
  review_status: ReviewStatus;
}

export interface Extraction {
  document_id: string;
  schema_version: '1.0';
  merchant: ExtractionField;
  purchase_date: ExtractionField;
  amount_minor: ExtractionField;
  currency: ExtractionField;
  item_name: ExtractionField;
  serial: ExtractionField;
  warnings: string[];
}

export type ExtractionCheck = { ok: true; value: Extraction } | { ok: false; errors: string[] };

const FIELDS: FieldName[] = ['merchant', 'purchase_date', 'amount_minor', 'currency', 'item_name', 'serial'];
const ISO_4217 = new Set<string>(Intl.supportedValuesOf('currency'));
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NUMERIC_DATE = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{4}))?$/;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(EXTRACTION_SCHEMA);

function isoFrom(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Phân giải ngày viết dạng số. "ambiguous" nghĩa là cần người xác nhận; "invalid" nghĩa là không phải ngày thật.
export function resolveNumericDate(
  sourceText: string,
  locale: ExtractionLocale | null,
): { iso: string | null; ambiguous: boolean; invalid: boolean } {
  const match = NUMERIC_DATE.exec(sourceText.trim());
  if (!match) return { iso: null, ambiguous: false, invalid: false };
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (match[3] === undefined) return { iso: null, ambiguous: true, invalid: false };
  const year = Number(match[3]);
  let iso: string | null;
  if (a > 12 && b <= 12) iso = isoFrom(year, b, a);
  else if (b > 12 && a <= 12) iso = isoFrom(year, a, b);
  else if (a === b) iso = isoFrom(year, a, b);
  else if (locale === 'vi') iso = isoFrom(year, b, a);
  else if (locale === 'en-US') iso = isoFrom(year, a, b);
  else return { iso: null, ambiguous: true, invalid: false };
  return iso === null ? { iso: null, ambiguous: false, invalid: true } : { iso, ambiguous: false, invalid: false };
}

export function validateExtraction(
  raw: unknown,
  options: { expectedDocumentId: string; locale?: ExtractionLocale | null },
): ExtractionCheck {
  if (!validateSchema(raw)) {
    const errors = (validateSchema.errors ?? []).map((e) => `schema ${e.instancePath || '/'} ${e.message ?? ''}`.trim());
    return { ok: false, errors };
  }
  const extraction = structuredClone(raw) as Extraction;
  const errors: string[] = [];
  const warnings = new Set<string>(extraction.warnings);

  if (extraction.document_id !== options.expectedDocumentId) errors.push('document_mismatch');

  for (const name of FIELDS) {
    const field = extraction[name];
    if (field.review_status !== 'NEEDS_REVIEW') errors.push(`model_cannot_confirm:${name}`);
    if (field.value !== null && (field.source_text === null || field.source_text.trim() === '')) {
      errors.push(`value_without_source:${name}`);
    }
  }

  // Ngày: không tin giá trị mô hình khi nguồn là ngày số mơ hồ.
  const date = extraction.purchase_date;
  if (date.value !== null && date.source_text !== null) {
    const resolved = resolveNumericDate(date.source_text, options.locale ?? null);
    if (resolved.invalid) {
      errors.push('invalid_date_in_source:purchase_date');
    } else if (resolved.ambiguous) {
      date.value = null;
      warnings.add('ambiguous:purchase_date');
    } else if (resolved.iso !== null && resolved.iso !== date.value) {
      errors.push('date_mismatch_with_source:purchase_date');
    }
  }
  if (date.value !== null && !ISO_DATE.test(String(date.value))) errors.push('purchase_date_not_iso');

  // Tiền tệ: mã phải thuộc ISO 4217.
  const currency = extraction.currency;
  if (currency.value !== null && !ISO_4217.has(String(currency.value))) {
    errors.push(`currency_not_iso4217:${String(currency.value)}`);
  }

  // Trường null phải có lý do.
  for (const name of FIELDS) {
    if (extraction[name].value === null && !warnings.has(`missing:${name}`) && !warnings.has(`ambiguous:${name}`)) {
      errors.push(`null_without_reason:${name}`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  extraction.warnings = [...warnings].sort();
  return { ok: true, value: extraction };
}
