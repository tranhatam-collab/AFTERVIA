// WO11-03: màn Quyền riêng tư (xuất, xóa, chia sẻ). Logic dùng chung cho Web Desk và ứng dụng di động,
// để hai bên không lệch nhau khi đọc câu trả lời của API. Hàm thuần: không I/O, không phụ thuộc nền tảng.
//
// Điểm quan trọng là 401. Yêu cầu xóa tài khoản chỉ được nhận khi phiên được phát trong 300 giây gần
// nhất (xác thực lại trước khi xóa; xem OWN-A-05 và migration 0028). Vì thế 401 ở riêng route này KHÔNG
// phải "đăng nhập sai" mà là "cần đăng nhập lại ngay trước khi xóa", và giao diện phải nói đúng điều đó.

export const ACCOUNT_DELETION_PATH = '/v1/account/deletion';
export const ACCOUNT_EXPORTS_PATH = '/v1/exports';

// Cờ của OD-08 (chủ dự án duyệt 10/11): danh mục xóa và giữ lại dữ liệu chưa được luật sư xác nhận
// (task HUMAN `HUM-LEGAL-DEL-01`, chặn WO20-01). Mọi giao diện nói về xóa dữ liệu phải hiện ghi chú này,
// nên nó là hằng số dùng chung chứ không phải chữ viết rải rác.
export const DELETION_CATALOGUE_STATUS = 'LEGAL_PENDING';

export type DeletionRefusal = 'invalid_state' | 'invalid_input' | 'forbidden' | 'not_found' | 'rate_limited' | 'server' | 'unknown';

// Biên nhận của request_account_deletion liệt kê các việc CHƯA làm (migration 0014/0020). Vì thế
// "đã nhận yêu cầu" không phải "đã xóa xong", và giao diện phải nói ra các bước còn lại thay vì báo
// một câu thành công. Danh sách khóa dưới đây khớp mảng 'pending' của biên nhận.
export const DELETION_PENDING_STEPS = [
  'primary_data_erasure',
  'retention_policy',
  'append_only_erasure',
  'session_revocation',
  'identity_verification',
  'tombstone_registry_outside_backup',
] as const;

export type DeletionPendingStep = (typeof DELETION_PENDING_STEPS)[number];

export interface DeletionReceipt {
  requestId: string;
  status: string;
  // Các bước còn lại mà giao diện biết cách gọi tên.
  pending: readonly DeletionPendingStep[];
  // Số bước còn lại mà bản này chưa biết tên. Không bỏ im: đếm để giao diện nói còn việc khác.
  unknownPending: number;
}

export type DeletionOutcome =
  | ({ kind: 'requested' } & DeletionReceipt)
  | { kind: 'reauth_required' }
  | { kind: 'refused'; reason: DeletionRefusal };

function isPendingStep(value: unknown): value is DeletionPendingStep {
  return typeof value === 'string' && (DELETION_PENDING_STEPS as readonly string[]).includes(value);
}

// Mảng 'pending' đến từ máy chủ nên được đọc phòng vệ: chỉ nhận mảng, tách khóa đã biết khỏi khóa lạ,
// bỏ trùng. Khóa lạ chỉ được đếm, vì t() sẽ ném lỗi nếu giao diện cố dịch một khóa không có trong bộ văn bản.
export function readPendingSteps(value: unknown): { pending: DeletionPendingStep[]; unknownPending: number } {
  if (!Array.isArray(value)) return { pending: [], unknownPending: 0 };
  const pending: DeletionPendingStep[] = [];
  let unknownPending = 0;
  for (const entry of value) {
    if (isPendingStep(entry)) {
      if (!pending.includes(entry)) pending.push(entry);
    } else {
      unknownPending += 1;
    }
  }
  return { pending, unknownPending };
}

// Mã yêu cầu xóa: cùng ràng buộc với hàm SQL request_account_deletion (8 đến 128 ký tự sau khi bỏ
// khoảng trắng hai đầu). Kiểm ở phía giao diện để người dùng biết trước khi gửi.
export function isDeletionRequestId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= 8 && trimmed.length <= 128;
}

function asRecord(body: unknown): Record<string, unknown> | null {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export function classifyDeletionResponse(status: number, body: unknown): DeletionOutcome {
  // Phiên quá cũ cho thao tác này. Người dùng cần đăng nhập lại, không phải sửa dữ liệu đã nhập.
  if (status === 401) return { kind: 'reauth_required' };
  if (status === 200) {
    const row = asRecord(body);
    const requestId = row?.request_id;
    const state = row?.status;
    if (typeof requestId === 'string' && requestId.length > 0 && typeof state === 'string' && state.length > 0) {
      const steps = readPendingSteps(row?.pending);
      return { kind: 'requested', requestId, status: state, pending: steps.pending, unknownPending: steps.unknownPending };
    }
    // 200 mà thiếu trường thì không được coi là đã nhận: không bao giờ báo thành công khi chưa chắc.
    return { kind: 'refused', reason: 'unknown' };
  }
  if (status === 400) return { kind: 'refused', reason: 'invalid_input' };
  if (status === 403) return { kind: 'refused', reason: 'forbidden' };
  if (status === 404) return { kind: 'refused', reason: 'not_found' };
  if (status === 409) return { kind: 'refused', reason: 'invalid_state' };
  if (status === 429) return { kind: 'refused', reason: 'rate_limited' };
  if (status >= 500) return { kind: 'refused', reason: 'server' };
  return { kind: 'refused', reason: 'unknown' };
}

export interface DeletionRequestPlan {
  method: 'POST';
  path: typeof ACCOUNT_DELETION_PATH;
  body: { request_id: string };
}

// Web và di động dựng cùng một yêu cầu từ đây, nên đường dẫn và thân không thể lệch nhau giữa hai bên.
// Thuần túy: không gọi mạng. Mỗi bên tự gửi bằng fetch của mình rồi đọc kết quả bằng classifyDeletionResponse.
export function buildDeletionRequest(requestId: unknown): DeletionRequestPlan | null {
  if (!isDeletionRequestId(requestId)) return null;
  return { method: 'POST', path: ACCOUNT_DELETION_PATH, body: { request_id: requestId.trim() } };
}
