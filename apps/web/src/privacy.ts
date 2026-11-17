// Yêu cầu xóa tài khoản qua HTTP cho Web Desk (WO11-03). Đường dẫn, thân và cách đọc kết quả lấy từ
// @aftervia/domain, nên bản web và bản di động không thể hiểu khác nhau về cùng một câu trả lời.
//
// Không gắn Idempotency-Key: chính mã yêu cầu là khóa khử trùng (hàm SQL trả lại đúng biên nhận cũ nếu
// gửi lại cùng mã). 401 ở route này nghĩa là phiên quá cũ cho thao tác xóa, không phải "sai quyền".
import { send, type ActionOptions } from './actions';
import { buildDeletionRequest, classifyDeletionResponse, type DeletionReceipt, type DeletionRefusal } from '@aftervia/domain';

export type DeletionAttempt =
  | { kind: 'requested'; receipt: DeletionReceipt }
  | { kind: 'reauth_required' }
  | { kind: 'refused'; reason: DeletionRefusal }
  | { kind: 'signed_out' }
  | { kind: 'offline' }
  | { kind: 'error' }
  | { kind: 'invalid' };

export async function requestAccountDeletion(options: ActionOptions, requestId: string): Promise<DeletionAttempt> {
  const plan = buildDeletionRequest(requestId);
  if (plan === null) return { kind: 'invalid' };
  const sent = await send(options, plan.method, plan.path, plan.body, null);
  if (sent.kind === 'stopped') {
    if (sent.result.kind === 'offline') return { kind: 'offline' };
    // send() trả denied khi không có token: chưa đăng nhập thì chưa hỏi máy chủ được.
    return sent.result.kind === 'denied' ? { kind: 'signed_out' } : { kind: 'error' };
  }
  const outcome = classifyDeletionResponse(sent.status, sent.body);
  return outcome.kind === 'requested' ? { kind: 'requested', receipt: outcome } : outcome;
}
