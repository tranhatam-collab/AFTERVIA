// WO12-01: nhận một webhook thanh toán sandbox và ghi vào sổ (T27, T28).
//
// Thứ tự cố ý: xác minh chữ ký và mốc thời gian TRƯỚC, đọc thân sau, chạm cơ sở dữ liệu sau cùng. Một
// payload không có chữ ký hợp lệ không bao giờ đi tới câu lệnh SQL nào, nên nó không thể đổi entitlement.
//
// Khử trùng và quy tắc thứ tự nằm trong hàm SQL record_billing_event, không nằm ở đây: một lần gọi là một
// câu lệnh, nên nó nguyên tử, và hai webhook tới cùng lúc không chen được vào giữa.
import type pg from 'pg';
import { classifyTransition, isEntitlementState, type TransitionVerdict } from '@aftervia/domain';
import { verifyWebhook, type WebhookRejection } from './webhook';

export const BILLING_PROVIDERS = ['sandbox_b2b', 'sandbox_app_store', 'sandbox_play'] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export const BILLING_EVENT_TYPES = ['purchase', 'renew', 'cancel', 'expire', 'refund', 'dispute'] as const;
export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export const PROVIDER_STATES = [
  'trial',
  'active',
  'grace',
  'past_due',
  'canceled_at_period_end',
  'expired',
  'refunded',
  'disputed',
] as const;
export type ProviderState = (typeof PROVIDER_STATES)[number];

export interface BillingWebhookBody {
  event_id: string;
  event_type: BillingEventType;
  subject_user_id: string;
  provider_state: ProviderState;
  effective_at: string;
  provider_seq?: number | null;
}

export type IngestRejection = WebhookRejection | 'unknown_provider' | 'invalid_payload';

export type IngestResult =
  | {
      kind: 'accepted';
      recorded: boolean;
      duplicate: boolean;
      entitlementChanged: boolean;
      previousState: string | null;
      state: string | null;
      // WO12-02: bước chuyển có nằm trong những bước nhà cung cấp thường gửi không. Bước lạ KHÔNG bị từ
      // chối (nhà cung cấp là nguồn đúng) nhưng phải nổi lên để người vận hành nhìn thấy.
      transition: TransitionVerdict | null;
    }
  | { kind: 'rejected'; reason: IngestRejection };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBillingProvider(value: unknown): value is BillingProvider {
  return typeof value === 'string' && (BILLING_PROVIDERS as readonly string[]).includes(value);
}

// Thân phải đúng hình dạng trước khi tới cơ sở dữ liệu. Thiếu hay sai kiểu là từ chối, không phải đoán.
export function readWebhookBody(raw: string): BillingWebhookBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const body = parsed as Record<string, unknown>;
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : '';
  if (eventId.length < 1 || eventId.length > 200) return null;
  if (typeof body.event_type !== 'string' || !(BILLING_EVENT_TYPES as readonly string[]).includes(body.event_type)) return null;
  if (typeof body.provider_state !== 'string' || !(PROVIDER_STATES as readonly string[]).includes(body.provider_state)) return null;
  if (typeof body.subject_user_id !== 'string' || !UUID.test(body.subject_user_id)) return null;
  if (typeof body.effective_at !== 'string' || Number.isNaN(new Date(body.effective_at).getTime())) return null;
  const seq = body.provider_seq;
  if (seq !== undefined && seq !== null && !(typeof seq === 'number' && Number.isSafeInteger(seq) && seq >= 0)) return null;
  return {
    event_id: eventId,
    event_type: body.event_type as BillingEventType,
    provider_state: body.provider_state as ProviderState,
    subject_user_id: body.subject_user_id,
    effective_at: new Date(body.effective_at).toISOString(),
    provider_seq: seq === undefined ? null : (seq as number | null),
  };
}

export interface IngestInput {
  provider: string;
  secret: string;
  // Đúng chuỗi byte đã nhận: chữ ký tính trên nó, nên không được parse rồi dựng lại.
  rawBody: string;
  signatureHeader: string | undefined | null;
  nowSeconds?: number;
}

// Chỉ phân loại khi cả hai đầu là trạng thái đã biết. Trạng thái lạ (bản máy chủ mới hơn) trả null,
// vì đoán bừa một bước chuyển còn tệ hơn là nói thẳng rằng chưa biết.
function verdictOf(previous: string | null, next: string | null): TransitionVerdict | null {
  if (!isEntitlementState(next)) return null;
  if (previous === null) return classifyTransition(null, next);
  return isEntitlementState(previous) ? classifyTransition(previous, next) : null;
}

export async function ingestBillingWebhook(pool: pg.Pool, input: IngestInput): Promise<IngestResult> {
  if (!isBillingProvider(input.provider)) return { kind: 'rejected', reason: 'unknown_provider' };
  const verified = verifyWebhook(input.secret, input.rawBody, input.signatureHeader, input.nowSeconds);
  if (!verified.ok) return { kind: 'rejected', reason: verified.reason };
  const body = readWebhookBody(input.rawBody);
  if (body === null) return { kind: 'rejected', reason: 'invalid_payload' };

  const result = await pool.query(
    'select public.record_billing_event($1::text, $2::text, $3::uuid, $4::text, $5::text, $6::timestamptz, $7::bigint, $8::jsonb) as receipt',
    [
      input.provider,
      body.event_id,
      body.subject_user_id,
      body.event_type,
      body.provider_state,
      body.effective_at,
      body.provider_seq,
      input.rawBody,
    ],
  );
  const receipt = result.rows[0]?.receipt as
    | { recorded: boolean; duplicate: boolean; entitlement_changed: boolean; previous_state: string | null; state: string | null }
    | undefined;
  if (receipt === undefined) return { kind: 'rejected', reason: 'invalid_payload' };
  return {
    kind: 'accepted',
    recorded: receipt.recorded,
    duplicate: receipt.duplicate,
    entitlementChanged: receipt.entitlement_changed,
    previousState: receipt.previous_state,
    state: receipt.state,
    transition: verdictOf(receipt.previous_state, receipt.state),
  };
}
