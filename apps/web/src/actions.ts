// Các thao tác ghi của Web Desk qua HTTP (WO10-03b): thêm món, mở case, chuyển trạng thái và đóng có outcome.
// Logic thuần, như state.ts: nhận fetch từ bên ngoài, không đọc DOM và không đọc môi trường.
// Chống SSRF (T38): mọi đường dẫn là hằng số, hoặc được dựng sau khi id khớp dạng UUID. Không có URL nào lấy từ dữ liệu.
// Không tự thử lại: mỗi lần gọi gửi đúng một yêu cầu. POST /v1/items hiện chưa khử trùng theo Idempotency-Key.
import { CASE_STATES, REASON_MAX, RESOLUTION_OUTCOMES, type CaseState, type ResolutionOutcome } from '@aftervia/domain';
import { ITEMS_PATH, classifyStatus, networkFailure } from './state';

export const CASES_PATH = '/v1/cases';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type ActionResult<T> =
  | { kind: 'success'; value: T }
  | { kind: 'invalid' }
  | { kind: 'conflict'; code: 'version_conflict' | 'invalid_state' | 'unknown' }
  | { kind: 'denied' }
  | { kind: 'error' }
  | { kind: 'offline' };

export interface ActionOptions {
  fetchImpl: typeof fetch;
  base: string;
  token: string | null;
  online: boolean;
}

export interface NewItem {
  title: string;
  brand?: string | null;
  model?: string | null;
  purchasedOn?: string | null;
  currency?: string | null;
}

export interface CaseSummary {
  id: string;
  status: CaseState;
  version: number;
  outcome: ResolutionOutcome | null;
}

export interface NewCase {
  itemId: string;
  organizationId: string;
  description: string;
  sharedDocumentIds: string[];
}

export interface Transition {
  nextState: CaseState;
  reason: string;
  expectedVersion: number;
  outcome?: ResolutionOutcome;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

// Khóa idempotency: 8 đến 128 ký tự, cùng quy tắc với máy chủ.
export function isIdempotencyKey(value: string): boolean {
  return value.length >= 8 && value.length <= 128;
}

// Đường dẫn chuyển trạng thái. Chỉ dựng khi id khớp UUID; nếu không khớp thì trả về null và không có yêu cầu nào đi.
export function transitionPath(caseId: string): string | null {
  return isUuid(caseId) ? `${CASES_PATH}/${caseId}/transitions` : null;
}

export type Sent = { kind: 'sent'; status: number; body: unknown } | { kind: 'stopped'; result: ActionResult<never> };

export type Method = 'POST' | 'DELETE';

// Một lần gửi, không thử lại. Không có token thì không gửi gì và trả về denied. Chỉ gửi thân khi được truyền vào.
export async function send(options: ActionOptions, method: Method, path: string, body: unknown, key: string | null): Promise<Sent> {
  if (options.token === null) return { kind: 'stopped', result: { kind: 'denied' } };
  const headers: Record<string, string> = { accept: 'application/json', authorization: `Bearer ${options.token}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (key !== null) headers['idempotency-key'] = key;
  let response: Response;
  try {
    // Gọi qua biến, như state.ts: fetch của trình duyệt không chấp nhận this khác window.
    const call = options.fetchImpl;
    response = await call(`${options.base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    return { kind: 'stopped', result: networkFailure(options.online) === 'offline' ? { kind: 'offline' } : { kind: 'error' } };
  }
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  return { kind: 'sent', status: response.status, body: parsed };
}

// Gửi có thân JSON (POST). Mọi quy tắc khác giống send.
async function post(options: ActionOptions, path: string, body: unknown, key: string | null): Promise<Sent> {
  return send(options, 'POST', path, body, key);
}

function conflictCode(body: unknown): 'version_conflict' | 'invalid_state' | 'unknown' {
  const code = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).code : undefined;
  return code === 'version_conflict' || code === 'invalid_state' ? code : 'unknown';
}

// 401, 403 và 404 cùng là "không có quyền": không cho biết đối tượng có tồn tại hay không.
export function failureOf(status: number, body: unknown): ActionResult<never> {
  if (status === 400) return { kind: 'invalid' };
  if (status === 409) return { kind: 'conflict', code: conflictCode(body) };
  return classifyStatus(status) === 'denied' ? { kind: 'denied' } : { kind: 'error' };
}

// Chỉ nhận case có id dạng UUID, trạng thái và outcome nằm trong danh sách của miền; còn lại là lỗi, không hiển thị.
function parseCase(body: unknown): CaseSummary | null {
  if (typeof body !== 'object' || body === null) return null;
  const r = body as Record<string, unknown>;
  if (!isUuid(r.id)) return null;
  if (typeof r.status !== 'string' || !(CASE_STATES as readonly string[]).includes(r.status)) return null;
  if (typeof r.version !== 'number' || !Number.isInteger(r.version) || r.version < 1) return null;
  const outcome = r.outcome ?? null;
  if (outcome !== null && (typeof outcome !== 'string' || !(RESOLUTION_OUTCOMES as readonly string[]).includes(outcome))) return null;
  return { id: r.id, status: r.status as CaseState, version: r.version, outcome: outcome as ResolutionOutcome | null };
}

function parseCreatedId(body: unknown): { id: string } | null {
  if (typeof body !== 'object' || body === null) return null;
  const id = (body as Record<string, unknown>).id;
  return isUuid(id) ? { id } : null;
}

// Thêm món đồ: POST /v1/items. Chỉ tiêu đề là bắt buộc; các trường khác chỉ gửi khi có giá trị.
export async function addItem(options: ActionOptions, input: NewItem): Promise<ActionResult<{ id: string }>> {
  if (typeof input.title !== 'string' || input.title.trim().length === 0) return { kind: 'invalid' };
  const body: Record<string, string> = { title: input.title };
  if (input.brand) body.brand = input.brand;
  if (input.model) body.model = input.model;
  if (input.purchasedOn) {
    if (!DATE_ONLY.test(input.purchasedOn)) return { kind: 'invalid' };
    body.purchased_on = input.purchasedOn;
  }
  if (input.currency) body.currency = input.currency;
  const sent = await post(options, ITEMS_PATH, body, null);
  if (sent.kind === 'stopped') return sent.result;
  if (classifyStatus(sent.status) !== 'success') return failureOf(sent.status, sent.body);
  const created = parseCreatedId(sent.body);
  return created === null ? { kind: 'error' } : { kind: 'success', value: created };
}

// Mở case trên món của chính người dùng: POST /v1/cases. Khóa idempotency do người gọi cấp; thử lại cùng khóa thì nhận cùng case.
export async function openCase(options: ActionOptions, input: NewCase, idempotencyKey: string): Promise<ActionResult<CaseSummary>> {
  if (!isUuid(input.itemId) || !isUuid(input.organizationId) || !input.sharedDocumentIds.every((id) => isUuid(id))) {
    return { kind: 'invalid' };
  }
  if (!isIdempotencyKey(idempotencyKey)) return { kind: 'invalid' };
  const body = {
    item_id: input.itemId,
    organization_id: input.organizationId,
    description: input.description,
    shared_document_ids: input.sharedDocumentIds,
  };
  const sent = await post(options, CASES_PATH, body, idempotencyKey);
  if (sent.kind === 'stopped') return sent.result;
  if (classifyStatus(sent.status) !== 'success') return failureOf(sent.status, sent.body);
  const summary = parseCase(sent.body);
  return summary === null ? { kind: 'error' } : { kind: 'success', value: summary };
}

// Chuyển trạng thái case: POST /v1/cases/{id}/transitions. Chuyển sang resolved cần outcome; closed giữ outcome đã có.
export async function transitionCase(
  options: ActionOptions,
  caseId: string,
  input: Transition,
  idempotencyKey: string,
): Promise<ActionResult<CaseSummary>> {
  const path = transitionPath(caseId);
  if (path === null || !isIdempotencyKey(idempotencyKey)) return { kind: 'invalid' };
  if (!(CASE_STATES as readonly string[]).includes(input.nextState)) return { kind: 'invalid' };
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) return { kind: 'invalid' };
  const reason = input.reason.trim();
  if (reason.length === 0 || reason.length > REASON_MAX) return { kind: 'invalid' };
  if (input.outcome !== undefined && !(RESOLUTION_OUTCOMES as readonly string[]).includes(input.outcome)) return { kind: 'invalid' };
  const body: Record<string, unknown> = { next_state: input.nextState, reason, expected_version: input.expectedVersion };
  if (input.outcome !== undefined) body.outcome = input.outcome;
  const sent = await post(options, path, body, idempotencyKey);
  if (sent.kind === 'stopped') return sent.result;
  if (classifyStatus(sent.status) !== 'success') return failureOf(sent.status, sent.body);
  const summary = parseCase(sent.body);
  return summary === null ? { kind: 'error' } : { kind: 'success', value: summary };
}
