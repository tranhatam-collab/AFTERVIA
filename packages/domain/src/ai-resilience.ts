// Chống lỗi và giới hạn chi tiêu cho cuộc gọi AI (WO06-04). Không gọi mạng: nhà cung cấp được truyền vào.
// Quy tắc:
//  - Tối đa 2 lần thử lại (giá trị lớn hơn bị cắt về 2). Tổng số lần gọi tối đa là 3.
//  - Mỗi lần gọi đều dự trữ ngân sách trước khi gửi. Hết ngân sách thì dừng ngay, không gọi.
//  - Lỗi có thể thử lại (timeout, 5xx, 429) được tính vào ngân sách. Lỗi không thể thử lại dừng ngay.
//  - Mọi lần thử dùng cùng một khóa idempotency.
//  - Nhà cung cấp tắt, lỗi hoặc hết ngân sách đều trả về nhập tay (fallback = manual_entry). Không ném lỗi làm hỏng item hay case.
//  - Ngưỡng thông báo 50, 80 và 100% được báo đúng một lần khi vượt qua trong lần chạy.

export const MAX_RETRIES_CAP = 2;
export const BUDGET_NOTIFICATION_POINTS: readonly number[] = [50, 80, 100];

export interface Budget {
  cap: number;
  used: number;
}

export type AttemptOutcome =
  | { kind: 'ok'; text: string; units: number }
  | { kind: 'retryable'; code: 'rate_limited' | 'server_error' }
  | { kind: 'fatal'; code: 'invalid_request' | 'refused' };

export interface ResilienceInput {
  idempotencyKey: string;
  estimatedUnits: number;
  maxRetries: number;
  timeoutMs: number;
  budget: Budget;
  attempt: ((idempotencyKey: string) => Promise<AttemptOutcome>) | null;
}

export type ResilienceResult =
  | { ok: true; text: string; attempts: number; notifications: number[] }
  | {
      ok: false;
      reason: 'provider_disabled' | 'provider_timeout' | 'provider_error' | 'budget_exceeded';
      attempts: number;
      fallback: 'manual_entry';
      notifications: number[];
    };

const TIMED_OUT = Symbol('timed_out');

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Các ngưỡng vượt qua trong khoảng (before, after] với mốc phần trăm, dùng số nguyên để tránh sai số.
export function crossedThresholds(before: number, after: number, cap: number): number[] {
  if (cap <= 0) return [];
  return BUDGET_NOTIFICATION_POINTS.filter((point) => before * 100 < point * cap && after * 100 >= point * cap);
}

export async function runWithResilience(input: ResilienceInput): Promise<ResilienceResult> {
  if (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) throw new Error('timeout_ms_invalid');
  if (!Number.isFinite(input.estimatedUnits) || input.estimatedUnits <= 0) throw new Error('estimated_units_invalid');
  const startUsed = input.budget.used;
  const notes = (): number[] => crossedThresholds(startUsed, input.budget.used, input.budget.cap);
  const maxRetries = Math.max(0, Math.min(Math.trunc(input.maxRetries), MAX_RETRIES_CAP));

  if (input.attempt === null) {
    return { ok: false, reason: 'provider_disabled', attempts: 0, fallback: 'manual_entry', notifications: notes() };
  }

  let attempts = 0;
  let failure: 'provider_timeout' | 'provider_error' = 'provider_error';
  while (attempts <= maxRetries) {
    if (input.budget.cap <= 0 || input.budget.used + input.estimatedUnits > input.budget.cap) {
      return { ok: false, reason: 'budget_exceeded', attempts, fallback: 'manual_entry', notifications: notes() };
    }
    input.budget.used += input.estimatedUnits;
    attempts += 1;

    let outcome: AttemptOutcome | typeof TIMED_OUT;
    try {
      outcome = await raceTimeout(input.attempt(input.idempotencyKey), input.timeoutMs);
    } catch {
      outcome = { kind: 'retryable', code: 'server_error' };
    }

    if (outcome === TIMED_OUT) {
      failure = 'provider_timeout';
      continue;
    }
    if (outcome.kind === 'ok') {
      input.budget.used += outcome.units - input.estimatedUnits;
      return { ok: true, text: outcome.text, attempts, notifications: notes() };
    }
    if (outcome.kind === 'fatal') {
      return { ok: false, reason: 'provider_error', attempts, fallback: 'manual_entry', notifications: notes() };
    }
    failure = 'provider_error';
  }
  return { ok: false, reason: failure, attempts, fallback: 'manual_entry', notifications: notes() };
}
