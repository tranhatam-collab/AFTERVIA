// Logic thuần của biểu mẫu Web Desk (WO10-03e): kiểm dữ liệu nhập, đổi kết quả thành khóa thông báo, và quy tắc khóa idempotency.
// Không đọc DOM. Mọi chữ hiển thị là khóa của bộ văn bản (t); không ghép chuỗi từ dữ liệu người dùng nhập.
import { CASE_STATES, REASON_MAX, RESOLUTION_OUTCOMES, type CaseState, type ResolutionOutcome } from '@aftervia/domain';
import type { MessageKey } from '@aftervia/i18n';
import { isUuid, type ActionResult, type NewCase, type NewItem, type Transition } from './actions';

export type Checked<T> = { ok: true; value: T } | { ok: false; error: MessageKey };

export interface ItemFormValues {
  title: string;
  brand: string;
  model: string;
  purchasedOn: string;
  currency: string;
}

export interface CaseFormValues {
  itemId: string;
  organizationId: string;
  description: string;
}

export interface TransitionFormValues {
  caseId: string;
  expectedVersion: string;
  nextState: string;
  reason: string;
  outcome: string;
}

export type FormKind = 'item' | 'case' | 'transition';

export const DEFAULT_CURRENCY = 'VND';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const CURRENCY = /^[A-Z]{3}$/;
const WHOLE = /^\d+$/;
const TITLE_MAX = 200;

export const STATUS_KEY: Record<CaseState, MessageKey> = {
  draft: 'desk.status.draft',
  submitted: 'desk.status.submitted',
  triaged: 'desk.status.triaged',
  waiting_customer: 'desk.status.waiting_customer',
  waiting_merchant: 'desk.status.waiting_merchant',
  waiting_partner: 'desk.status.waiting_partner',
  in_progress: 'desk.status.in_progress',
  resolved: 'desk.status.resolved',
  closed: 'desk.status.closed',
  withdrawn: 'desk.status.withdrawn',
};

export const OUTCOME_KEY: Record<ResolutionOutcome, MessageKey> = {
  repaired: 'desk.outcome.repaired',
  replaced: 'desk.outcome.replaced',
  refunded: 'desk.outcome.refunded',
  credited: 'desk.outcome.credited',
  no_remedy: 'desk.outcome.no_remedy',
};

// Ngày thật theo lịch (không nhận 31/02). Kiểm bằng UTC để không lệch theo múi giờ.
export function isRealDateOnly(value: string): boolean {
  const m = DATE_ONLY.exec(value);
  if (m === null) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function checkItem(values: ItemFormValues): Checked<NewItem> {
  const title = values.title.trim();
  if (title.length === 0 || title.length > TITLE_MAX) return { ok: false, error: 'item.error.title' };
  const purchased = values.purchasedOn.trim();
  if (purchased.length > 0 && !isRealDateOnly(purchased)) return { ok: false, error: 'item.error.purchased_on' };
  const currency = values.currency.trim();
  if (currency.length > 0 && !CURRENCY.test(currency)) return { ok: false, error: 'item.error.currency' };
  return {
    ok: true,
    value: {
      title,
      brand: values.brand.trim().length === 0 ? null : values.brand.trim(),
      model: values.model.trim().length === 0 ? null : values.model.trim(),
      purchasedOn: purchased.length === 0 ? null : purchased,
      currency: currency.length === 0 ? null : currency,
    },
  };
}

// Giới hạn mô tả theo kho dữ liệu (REASON_MAX, 500 ký tự), cùng giới hạn máy chủ kiểm khi mở case.
export function checkCase(values: CaseFormValues): Checked<NewCase> {
  const itemId = values.itemId.trim();
  const organizationId = values.organizationId.trim();
  if (!isUuid(itemId) || !isUuid(organizationId)) return { ok: false, error: 'desk.error.uuid' };
  const description = values.description.trim();
  if (description.length === 0 || description.length > REASON_MAX) return { ok: false, error: 'desk.error.description' };
  return { ok: true, value: { itemId, organizationId, description, sharedDocumentIds: [] } };
}

export function checkTransition(values: TransitionFormValues): Checked<{ caseId: string; input: Transition }> {
  const caseId = values.caseId.trim();
  if (!isUuid(caseId)) return { ok: false, error: 'desk.error.uuid' };
  const version = values.expectedVersion.trim();
  if (!WHOLE.test(version) || Number(version) < 1 || !Number.isSafeInteger(Number(version))) {
    return { ok: false, error: 'desk.error.version' };
  }
  if (!(CASE_STATES as readonly string[]).includes(values.nextState)) return { ok: false, error: 'desk.result.invalid' };
  const nextState = values.nextState as CaseState;
  const reason = values.reason.trim();
  if (reason.length === 0 || reason.length > REASON_MAX) return { ok: false, error: 'desk.error.reason' };
  const input: Transition = { nextState, reason, expectedVersion: Number(version) };
  if (nextState === 'resolved') {
    // Chuyển sang đã giải quyết cần kết quả trong danh sách của miền; các trạng thái khác không gửi outcome.
    if (!(RESOLUTION_OUTCOMES as readonly string[]).includes(values.outcome)) {
      return { ok: false, error: 'desk.transition.outcome.required' };
    }
    input.outcome = values.outcome as ResolutionOutcome;
  }
  return { ok: true, value: { caseId, input } };
}

// Khóa thông báo cho kết quả thất bại. Kết quả thành công do từng biểu mẫu hiển thị, vì cần tham số.
export function failureKey(result: ActionResult<unknown>): MessageKey | null {
  switch (result.kind) {
    case 'success':
      return null;
    case 'invalid':
      return 'desk.result.invalid';
    case 'denied':
      return 'desk.result.denied';
    case 'error':
      return 'desk.result.error';
    case 'offline':
      return 'desk.result.offline';
    case 'conflict':
      if (result.code === 'version_conflict') return 'desk.result.conflict.version';
      if (result.code === 'invalid_state') return 'desk.result.conflict.state';
      return 'desk.result.conflict.unknown';
  }
}

export interface PendingKey {
  key: string;
  fingerprint: string;
}

// Giữ khóa khi người dùng gửi lại đúng nội dung cũ (sau lỗi mạng hoặc xung đột), để máy chủ nhận ra cùng một yêu cầu.
// Nội dung đổi thì cấp khóa mới, không bao giờ dùng một khóa cho hai yêu cầu khác nhau.
export function keyFor(pending: PendingKey | null, fingerprint: string, newKey: () => string): PendingKey {
  if (pending !== null && pending.fingerprint === fingerprint) return pending;
  return { key: newKey(), fingerprint };
}
