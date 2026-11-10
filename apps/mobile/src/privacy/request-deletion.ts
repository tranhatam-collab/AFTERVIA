// Yêu cầu xóa tài khoản từ bản di động (WO11-03). Nhận fetch qua tham số để kiểm thử được trên Node,
// cùng cách với send-item.ts. Đường dẫn, thân và cách đọc kết quả lấy từ @aftervia/domain, nên bản
// di động và Web Desk hiểu giống hệt nhau về cùng một câu trả lời của máy chủ.
//
// Không gắn Idempotency-Key: mã yêu cầu chính là khóa khử trùng (gửi lại cùng mã trả cùng biên nhận).
import { buildDeletionRequest, classifyDeletionResponse, type DeletionOutcome } from '@aftervia/domain';

export type DeletionAttempt = DeletionOutcome | { kind: 'signed_out' } | { kind: 'invalid' } | { kind: 'network' };

export async function requestDeletion(
  fetchImpl: typeof fetch,
  base: string,
  token: string | null,
  requestId: string,
): Promise<DeletionAttempt> {
  const plan = buildDeletionRequest(requestId);
  if (plan === null) return { kind: 'invalid' };
  // Chưa đăng nhập thì không gửi gì cả: thao tác này đòi phiên vừa được cấp, không thể làm ẩn danh.
  if (token === null) return { kind: 'signed_out' };
  let response: Response;
  try {
    const call = fetchImpl;
    response = await call(`${base}${plan.path}`, {
      method: plan.method,
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(plan.body),
    });
  } catch {
    return { kind: 'network' };
  }
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  return classifyDeletionResponse(response.status, parsed);
}

// Mã yêu cầu do máy tạo, cùng cách đặt mã với hàng đợi offline (OutboxProvider.newId). Đây là khóa
// khử trùng do người gọi cấp, không phải bí mật. Nguồn ngẫu nhiên nhận qua tham số để kiểm thử xác định.
export function newDeletionRequestId(now: () => number = Date.now, random: () => number = Math.random): string {
  return `erase-${now().toString(36)}-${random().toString(36).slice(2, 10)}`;
}
