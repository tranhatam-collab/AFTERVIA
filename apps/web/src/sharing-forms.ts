// Logic thuần của biểu mẫu chia tài liệu, thu hồi quyền và tạo gói xuất (WO10-03f). Không đọc DOM.
// Hạn truy cập nhập theo giờ địa phương (datetime-local) và được đổi sang UTC trước khi gửi. Giới hạn 30 ngày theo máy chủ.
import { isUuid } from './actions';
import type { Checked } from './forms';
import type { NewGrant } from './sharing';

export interface GrantFormValues {
  caseId: string;
  documentId: string;
  recipientId: string;
  expiresAt: string;
  canDownload: boolean;
}

export interface RevokeFormValues {
  caseId: string;
  grantId: string;
}

export const MAX_GRANT_DAYS = 30;
const DAY_MS = 86_400_000;

// Chuỗi giờ địa phương theo phút (YYYY-MM-DDTHH:mm), đúng định dạng của ô datetime-local.
export function localInput(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Hạn phải sau thời điểm hiện tại và không quá 30 ngày. Thời điểm hiện tại được truyền vào để kiểm thử xác định.
export function checkGrant(values: GrantFormValues, now: Date): Checked<{ caseId: string; input: NewGrant }> {
  const caseId = values.caseId.trim();
  const documentId = values.documentId.trim();
  const recipientId = values.recipientId.trim();
  if (!isUuid(caseId) || !isUuid(documentId) || !isUuid(recipientId)) return { ok: false, error: 'desk.error.uuid' };
  const raw = values.expiresAt.trim();
  const expires = new Date(raw);
  if (raw.length === 0 || Number.isNaN(expires.getTime())) return { ok: false, error: 'desk.error.expiry' };
  const ahead = expires.getTime() - now.getTime();
  if (ahead <= 0 || ahead > MAX_GRANT_DAYS * DAY_MS) return { ok: false, error: 'desk.error.expiry' };
  return {
    ok: true,
    value: { caseId, input: { documentId, recipientId, expiresAt: expires.toISOString(), canDownload: values.canDownload } },
  };
}

export function checkRevoke(values: RevokeFormValues): Checked<{ caseId: string; grantId: string }> {
  const caseId = values.caseId.trim();
  const grantId = values.grantId.trim();
  if (!isUuid(caseId) || !isUuid(grantId)) return { ok: false, error: 'desk.error.uuid' };
  return { ok: true, value: { caseId, grantId } };
}
