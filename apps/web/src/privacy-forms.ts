// Logic thuần của biểu mẫu xóa tài khoản (WO11-03). Không đọc DOM, không gọi mạng.
// Hai lớp chắn trước khi gửi: mã yêu cầu đúng khuôn của máy chủ, và người dùng gõ đúng chữ xác nhận.
import { isDeletionRequestId } from '@aftervia/domain';
import type { Checked } from './forms';

export interface DeletionFormValues {
  requestId: string;
  confirm: string;
}

// Mã mặc định do máy tạo: người dùng không phải tự nghĩ ra, và gửi lại cùng mã thì máy chủ trả cùng biên nhận.
export function newDeletionRequestId(uuid: () => string): string {
  return `erase-${uuid()}`;
}

// Chữ xác nhận so sánh sau khi bỏ khoảng trắng và đưa về chữ hoa, nên gõ thường vẫn nhận; gõ thiếu dấu thì không.
export function checkDeletion(values: DeletionFormValues, confirmWord: string): Checked<{ requestId: string }> {
  const requestId = values.requestId.trim();
  if (!isDeletionRequestId(requestId)) return { ok: false, error: 'privacy.delete.error.requestId' };
  if (values.confirm.trim().toUpperCase() !== confirmWord.trim().toUpperCase()) {
    return { ok: false, error: 'privacy.delete.error.confirm' };
  }
  return { ok: true, value: { requestId } };
}
