// Chia tài liệu (grant) và xuất gói qua HTTP cho Web Desk (WO10-03c). Cùng quy tắc với actions.ts:
// đường dẫn cố định, id kiểm UUID trước khi dựng URL, một lần gửi không thử lại, phản hồi kiểm hình dạng trước khi dùng.
// Máy chủ chưa khử trùng việc cấp grant theo khóa, nên Desk không tự gửi lại. Gói xuất chưa có đường tải (HUM-WO10-03a).
import { failureOf, isIdempotencyKey, isUuid, send, type ActionOptions, type ActionResult } from './actions';
import { classifyStatus } from './state';

export const EXPORTS_PATH = '/v1/exports';

export function grantsPath(caseId: string): string | null {
  return isUuid(caseId) ? `/v1/cases/${caseId}/grants` : null;
}

export function grantPath(caseId: string, grantId: string): string | null {
  return isUuid(caseId) && isUuid(grantId) ? `/v1/cases/${caseId}/grants/${grantId}` : null;
}

export interface NewGrant {
  documentId: string;
  recipientId: string;
  expiresAt: string;
  canDownload: boolean;
}

export interface GrantResult {
  id: string;
  status: 'active' | 'revoked';
}

export interface ExportResult {
  id: string;
  status: 'succeeded';
}

// Mã và trạng thái trong phản hồi phải khớp với yêu cầu. Sai thì không hiển thị gì.
function idWithStatus(body: unknown, status: string): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const r = body as Record<string, unknown>;
  return isUuid(r.id) && r.status === status ? r.id : null;
}

// Cấp grant cho một tài liệu đã là bằng chứng của case, cho một người tham gia còn hiệu lực. Chỉ chủ case làm được.
export async function grantDocument(
  options: ActionOptions,
  caseId: string,
  input: NewGrant,
  idempotencyKey: string,
): Promise<ActionResult<GrantResult>> {
  const path = grantsPath(caseId);
  if (path === null || !isIdempotencyKey(idempotencyKey)) return { kind: 'invalid' };
  if (!isUuid(input.documentId) || !isUuid(input.recipientId) || typeof input.canDownload !== 'boolean') return { kind: 'invalid' };
  const expires = new Date(input.expiresAt);
  if (Number.isNaN(expires.getTime())) return { kind: 'invalid' };
  const body = {
    document_id: input.documentId,
    recipient_id: input.recipientId,
    expires_at: expires.toISOString(),
    can_download: input.canDownload,
  };
  const sent = await send(options, 'POST', path, body, idempotencyKey);
  if (sent.kind === 'stopped') return sent.result;
  if (classifyStatus(sent.status) !== 'success') return failureOf(sent.status, sent.body);
  const id = idWithStatus(sent.body, 'active');
  return id === null ? { kind: 'error' } : { kind: 'success', value: { id, status: 'active' } };
}

// Thu hồi grant: DELETE, không có thân và không cần khóa. Thu hồi lặp lại là vô hại (máy chủ trả cùng kết quả).
export async function revokeGrant(options: ActionOptions, caseId: string, grantId: string): Promise<ActionResult<GrantResult>> {
  const path = grantPath(caseId, grantId);
  if (path === null) return { kind: 'invalid' };
  const sent = await send(options, 'DELETE', path, undefined, null);
  if (sent.kind === 'stopped') return sent.result;
  if (classifyStatus(sent.status) !== 'success') return failureOf(sent.status, sent.body);
  const id = idWithStatus(sent.body, 'revoked');
  return id === null ? { kind: 'error' } : { kind: 'success', value: { id, status: 'revoked' } };
}

// Tạo gói xuất: POST /v1/exports với khóa idempotency do người gọi cấp. Gói chỉ chứa món của người gọi (máy chủ kiểm).
// Chưa có đường tải gói: mã truy cập không được trả ra (HUM-WO10-03a).
export async function requestExport(options: ActionOptions, idempotencyKey: string): Promise<ActionResult<ExportResult>> {
  if (!isIdempotencyKey(idempotencyKey)) return { kind: 'invalid' };
  const sent = await send(options, 'POST', EXPORTS_PATH, {}, idempotencyKey);
  if (sent.kind === 'stopped') return sent.result;
  if (classifyStatus(sent.status) !== 'success') return failureOf(sent.status, sent.body);
  const id = idWithStatus(sent.body, 'succeeded');
  return id === null ? { kind: 'error' } : { kind: 'success', value: { id, status: 'succeeded' } };
}
