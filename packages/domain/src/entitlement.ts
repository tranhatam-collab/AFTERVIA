// WO12-02: máy trạng thái entitlement (T29, T46). Thuần túy: không I/O, dùng chung cho web, di động và API.
//
// Nguyên tắc quan trọng nhất, lấy thẳng từ engineering/11: "Không xóa hồ sơ vì expired."
// Mất quyền trả tiền KHÔNG bao giờ đồng nghĩa với mất dữ liệu. Vì vậy khả năng đọc hồ sơ và khả năng
// xuất dữ liệu được viết là hằng số `true` ở mọi trạng thái, chứ không phải một nhánh if có thể sửa nhầm.
// Đây là cam kết với người dùng: họ trả tiền để dùng tính năng, không phải để được giữ chứng từ của mình.

export const ENTITLEMENT_STATES = [
  'trial',
  'active',
  'grace',
  'past_due',
  'canceled_at_period_end',
  'expired',
  'refunded',
  'disputed',
] as const;

export type EntitlementState = (typeof ENTITLEMENT_STATES)[number];

export function isEntitlementState(value: unknown): value is EntitlementState {
  return typeof value === 'string' && (ENTITLEMENT_STATES as readonly string[]).includes(value);
}

export interface EntitlementCapabilities {
  // Tính năng trả tiền (ví dụ trích xuất bằng AI, hạn mức cao hơn).
  paidFeatures: boolean;
  // Đọc hồ sơ đã có. LUÔN đúng: hết hạn không phải là lý do để giấu dữ liệu của người ta.
  readRecords: true;
  // Tạo gói xuất. LUÔN đúng: người dùng phải lấy được dữ liệu ra, nhất là khi họ vừa thôi trả tiền.
  exportData: true;
  // Thêm hồ sơ mới. Hết quyền trả tiền thì dừng ghi thêm, nhưng không đụng tới cái đã có.
  addRecords: boolean;
  // Giao diện nên nhắc người dùng về tình trạng thanh toán.
  needsAttention: boolean;
}

// grace và past_due vẫn còn quyền: nhà cung cấp chưa kết thúc kỳ, chỉ là thu tiền chưa xong.
// canceled_at_period_end vẫn còn quyền cho tới khi hết kỳ; sự kiện 'expire' mới là lúc mất.
// disputed giữ dữ liệu nhưng dừng tính năng trả tiền cho tới khi giải quyết xong.
const PAID: Record<EntitlementState, boolean> = {
  trial: true,
  active: true,
  grace: true,
  past_due: true,
  canceled_at_period_end: true,
  expired: false,
  refunded: false,
  disputed: false,
};

const NEEDS_ATTENTION: Record<EntitlementState, boolean> = {
  trial: false,
  active: false,
  grace: true,
  past_due: true,
  canceled_at_period_end: true,
  expired: true,
  refunded: false,
  disputed: true,
};

export function capabilitiesOf(state: EntitlementState): EntitlementCapabilities {
  const paid = PAID[state];
  return {
    paidFeatures: paid,
    readRecords: true,
    exportData: true,
    addRecords: paid,
    needsAttention: NEEDS_ATTENTION[state],
  };
}

// Chuyển trạng thái mà nhà cung cấp thường gửi. Danh sách này KHÔNG dùng để từ chối sự kiện: nhà cung cấp
// là nguồn đúng, nên một bước lạ vẫn được ghi nhận. Nó dùng để nhận ra bước lạ và báo cho người vận hành.
const EXPECTED: Record<EntitlementState, readonly EntitlementState[]> = {
  trial: ['active', 'canceled_at_period_end', 'expired', 'past_due'],
  active: ['active', 'grace', 'past_due', 'canceled_at_period_end', 'refunded', 'disputed', 'expired'],
  grace: ['active', 'past_due', 'expired', 'canceled_at_period_end', 'refunded', 'disputed'],
  past_due: ['active', 'grace', 'expired', 'canceled_at_period_end', 'refunded', 'disputed'],
  canceled_at_period_end: ['expired', 'active', 'refunded', 'disputed'],
  expired: ['active', 'trial', 'refunded', 'disputed'],
  refunded: ['active', 'disputed'],
  disputed: ['active', 'refunded', 'expired'],
};

export type TransitionVerdict = 'initial' | 'unchanged' | 'expected' | 'unexpected';

export function classifyTransition(from: EntitlementState | null, to: EntitlementState): TransitionVerdict {
  if (from === null) return 'initial';
  if (from === to) return 'unchanged';
  return EXPECTED[from].includes(to) ? 'expected' : 'unexpected';
}

// T46: hủy ở đâu, và việc gì KHÔNG tự xảy ra theo. Nói sai chỗ này là để người dùng tiếp tục bị tính tiền.
// Theo engineering/11: hủy subscription không tự xóa tài khoản; xóa tài khoản không mặc nhiên hủy
// subscription ở store nếu store đòi thao tác riêng.
export type CancellationVenue = 'in_app' | 'app_store' | 'play_store';

export interface CancellationGuidance {
  venue: CancellationVenue;
  // Hủy gói có tự xóa tài khoản không? Luôn là không.
  cancellingDeletesAccount: false;
  // Xóa tài khoản có tự hủy gói không? Với store thì KHÔNG: người dùng phải tự làm một bước nữa.
  deletingCancelsSubscription: boolean;
}

export function cancellationGuidance(provider: string): CancellationGuidance {
  if (provider === 'sandbox_app_store') {
    return { venue: 'app_store', cancellingDeletesAccount: false, deletingCancelsSubscription: false };
  }
  if (provider === 'sandbox_play') {
    return { venue: 'play_store', cancellingDeletesAccount: false, deletingCancelsSubscription: false };
  }
  // Gói mua thẳng của bản web: hủy và xóa đều nằm trong hệ thống này.
  return { venue: 'in_app', cancellingDeletesAccount: false, deletingCancelsSubscription: true };
}
