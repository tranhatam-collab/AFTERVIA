// Country pack và cổng mở thị trường (WO16-04, T41). Quy tắc theo engineering/07_COUNTRY_PACK.schema.json và DEC07:
// mặc định DISABLED; khi DISABLED thì không mở giao dịch và không nêu khẳng định về tính đủ điều kiện pháp lý.
// Mở thị trường cần đồng thời: pack ENABLED, người rà soát pháp lý được nêu tên, ngày rà soát và hạn rà soát còn hiệu lực,
// ba cờ sẵn sàng đúng, có nguồn, và cờ country_activation (WO16-02) đang bật.
// Việc xác thực JSON schema của tệp pack được kiểm trong tests/country. Tệp pack lúc chạy phải được xác thực trước khi dùng.

export type PackStatus = 'DISABLED' | 'IN_REVIEW' | 'ENABLED';

export interface PackSource {
  title: string;
  url: string;
  accessed_at: string;
  scope: string;
}

export interface CountryPack {
  country_code: string;
  version: string;
  status: PackStatus;
  ui_locales: string[];
  currency: string;
  legal_review: {
    reviewer: string | null;
    reviewed_at: string | null;
    next_review_at: string | null;
  };
  sources: PackSource[];
  supported_product_categories?: string[];
  billing_ready?: boolean;
  privacy_ready?: boolean;
  support_ready?: boolean;
}

export interface MarketDecision {
  transactionsOpen: boolean;
  legalEligibilityClaim: boolean;
  blockers: string[];
}

// Pack mới luôn ở trạng thái DISABLED, không có phê duyệt, không có nguồn.
export function newDisabledPack(countryCode: string, currency: string, uiLocales: string[], version: string): CountryPack {
  return {
    country_code: countryCode,
    version,
    status: 'DISABLED',
    ui_locales: uiLocales,
    currency,
    legal_review: { reviewer: null, reviewed_at: null, next_review_at: null },
    sources: [],
    billing_ready: false,
    privacy_ready: false,
    support_ready: false,
  };
}

// Quyết định mở thị trường. Hàm thuần: nhận thời điểm hiện tại và trạng thái cờ, không đọc gì khác.
export function marketDecision(pack: CountryPack, countryActivationSwitch: boolean, now: Date): MarketDecision {
  const blockers: string[] = [];
  if (!countryActivationSwitch) blockers.push('kill_switch_country_activation_off');
  if (pack.status !== 'ENABLED') blockers.push('status_not_enabled');
  if (!pack.legal_review.reviewer) blockers.push('legal_reviewer_missing');
  if (!pack.legal_review.reviewed_at) blockers.push('legal_review_date_missing');
  if (!pack.legal_review.next_review_at) {
    blockers.push('next_review_missing');
  } else if (new Date(pack.legal_review.next_review_at).getTime() < now.getTime()) {
    blockers.push('legal_review_expired');
  }
  if (pack.billing_ready !== true) blockers.push('billing_not_ready');
  if (pack.privacy_ready !== true) blockers.push('privacy_not_ready');
  if (pack.support_ready !== true) blockers.push('support_not_ready');
  if (pack.sources.length === 0) blockers.push('sources_missing');
  const open = blockers.length === 0;
  return { transactionsOpen: open, legalEligibilityClaim: open, blockers };
}
