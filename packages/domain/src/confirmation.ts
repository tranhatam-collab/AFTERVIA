// Xác nhận của người và cổng hành động (WO06-03). Hàm thuần: không I/O, không ghi dữ liệu.
// Quy tắc:
//  - Mọi trường quan trọng (CRITICAL_FIELDS) phải được MỘT NGƯỜI xác nhận trước mọi nhắc nhở, deadline hoặc hành động.
//  - Model không xác nhận được (WO06-01). Điểm tin cậy do mô hình tạo không thay thế xác nhận.
//  - Trường được xác nhận vắng mặt (null) phải có lý do rõ ràng: "confirmed_absent". Không bịa giá trị.
//  - Mỗi xác nhận ghi người xác nhận và thời điểm; thiếu một trong hai thì từ chối.
// Danh sách trường quan trọng là lựa chọn của đội phát triển, cần chủ dự án xác nhận (xem evidence WO06-03).
import { isIso4217, type Extraction, type FieldName } from './extraction';

export const CRITICAL_FIELDS: readonly FieldName[] = ['purchase_date', 'amount_minor', 'currency', 'serial'];

export interface HumanConfirmation {
  field: FieldName;
  value: string | number | null;
  absentReason?: 'confirmed_absent';
  actorId: string;
  confirmedAt: string;
}

export interface ConfirmationAudit {
  field: FieldName;
  value: string | number | null;
  actorId: string;
  confirmedAt: string;
}

export type ConfirmOutcome = { ok: true; value: Extraction; audit: ConfirmationAudit } | { ok: false; errors: string[] };

export interface GateDecision {
  allowed: boolean;
  blockedBy: string[];
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function problemWithValue(field: FieldName, value: string | number): string | null {
  switch (field) {
    case 'purchase_date':
      return typeof value === 'string' && isValidIsoDate(value) ? null : 'purchase_date_must_be_iso_date';
    case 'amount_minor':
      return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? null : 'amount_minor_must_be_non_negative_integer';
    case 'currency':
      return typeof value === 'string' && isIso4217(value) ? null : 'currency_must_be_iso4217';
    case 'serial':
      return typeof value === 'string' && value.trim().length > 0 && value.length <= 100 ? null : 'serial_must_be_non_empty';
    default:
      return typeof value === 'string' && value.trim().length > 0 ? null : 'value_must_be_non_empty';
  }
}

export function confirmField(extraction: Extraction, confirmation: HumanConfirmation): ConfirmOutcome {
  const errors: string[] = [];
  if (confirmation.actorId.trim() === '') errors.push('actor_required');
  if (Number.isNaN(Date.parse(confirmation.confirmedAt))) errors.push('confirmed_at_invalid');
  if (confirmation.value === null) {
    if (confirmation.absentReason !== 'confirmed_absent') errors.push(`absent_reason_required:${confirmation.field}`);
  } else {
    const problem = problemWithValue(confirmation.field, confirmation.value);
    if (problem !== null) errors.push(problem);
  }
  if (errors.length > 0) return { ok: false, errors };

  const next = structuredClone(extraction);
  const field = next[confirmation.field];
  field.value = confirmation.value;
  field.review_status = 'CONFIRMED';
  next.warnings = next.warnings.filter(
    (warning) => warning !== `missing:${confirmation.field}` && warning !== `ambiguous:${confirmation.field}`,
  );
  if (confirmation.value === null) next.warnings.push(`confirmed_absent:${confirmation.field}`);
  next.warnings.sort();
  return {
    ok: true,
    value: next,
    audit: {
      field: confirmation.field,
      value: confirmation.value,
      actorId: confirmation.actorId,
      confirmedAt: confirmation.confirmedAt,
    },
  };
}

export function rejectField(
  extraction: Extraction,
  rejection: { field: FieldName; actorId: string; rejectedAt: string },
): ConfirmOutcome {
  const errors: string[] = [];
  if (rejection.actorId.trim() === '') errors.push('actor_required');
  if (Number.isNaN(Date.parse(rejection.rejectedAt))) errors.push('rejected_at_invalid');
  if (errors.length > 0) return { ok: false, errors };

  const next = structuredClone(extraction);
  const field = next[rejection.field];
  field.value = null;
  field.review_status = 'REJECTED';
  next.warnings = [...new Set([...next.warnings, `rejected:${rejection.field}`])].sort();
  return {
    ok: true,
    value: next,
    audit: { field: rejection.field, value: null, actorId: rejection.actorId, confirmedAt: rejection.rejectedAt },
  };
}

// Hành động chỉ được phép khi mọi trường quan trọng đã được một người xác nhận.
export function gateAction(extraction: Extraction): GateDecision {
  const blockedBy: string[] = [];
  for (const name of CRITICAL_FIELDS) {
    const status = extraction[name].review_status;
    if (status === 'CONFIRMED') continue;
    blockedBy.push(status === 'REJECTED' ? `rejected:${name}` : `unconfirmed:${name}`);
  }
  return { allowed: blockedBy.length === 0, blockedBy };
}
