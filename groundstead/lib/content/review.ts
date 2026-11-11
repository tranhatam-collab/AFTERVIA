import type { Locale } from '../i18n/locales.ts';
import type { Review } from './types.ts';

// Problems with a review record that would make its public label misleading.
export function reviewIssues(review: Review): string[] {
  const out: string[] = [];
  const name = review.reviewer?.name;
  switch (review.status) {
    case 'AI_DRAFT':
      if (review.reviewer || review.reviewed_on) out.push('AI_DRAFT must not carry a reviewer or reviewed_on');
      break;
    case 'COMMUNITY_CHECKED':
      if (!name) out.push('COMMUNITY_CHECKED needs reviewer.name');
      if (!review.reviewed_on) out.push('COMMUNITY_CHECKED needs reviewed_on');
      break;
    case 'EXPERT_REVIEWED':
      if (!name) out.push('EXPERT_REVIEWED needs reviewer.name');
      if (!review.reviewer?.expertise) out.push('EXPERT_REVIEWED needs reviewer.expertise');
      if (!review.reviewed_on) out.push('EXPERT_REVIEWED needs reviewed_on');
      break;
    case 'STALE':
      if (!review.stale_reason) out.push('STALE needs stale_reason');
      break;
  }
  return out;
}

// Fail closed (G-07): a production build publishes a card only when a person has checked it and the record can back the
// label. AI_DRAFT, STALE and any review missing its reviewer details are refused.
export function publishable(review: Review): boolean {
  return (review.status === 'COMMUNITY_CHECKED' || review.status === 'EXPERT_REVIEWED') && reviewIssues(review).length === 0;
}

// A translation is STALE as soon as its original has a newer version than the one it was based on.
export function effectiveReview(
  item: { review: Review; based_on?: { version: number } },
  original?: { version: number },
): Review {
  if (item.based_on && original && original.version > item.based_on.version) {
    return {
      status: 'STALE',
      stale_reason: `original is at version ${original.version}, this was based on version ${item.based_on.version}`,
    };
  }
  return item.review;
}

const LABELS: Record<Locale, Record<'AI_DRAFT' | 'COMMUNITY_CHECKED' | 'EXPERT_REVIEWED' | 'STALE', string>> = {
  en: {
    AI_DRAFT: 'AI-drafted from the sources listed below. No expert has reviewed it yet.',
    COMMUNITY_CHECKED: 'Checked by {name} on {date}. This is not an expert review.',
    EXPERT_REVIEWED: 'Reviewed by {name} ({expertise}) on {date}.',
    STALE: 'The source changed after this was written. This version is waiting to be checked again.',
  },
  vi: {
    AI_DRAFT: 'Bản nháp do AI soạn từ các nguồn bên dưới. Chưa có chuyên gia duyệt.',
    COMMUNITY_CHECKED: 'Đã được {name} kiểm tra ngày {date}. Đây không phải bản duyệt của chuyên gia.',
    EXPERT_REVIEWED: 'Duyệt bởi {name} ({expertise}), ngày {date}.',
    STALE: 'Nguồn gốc đã thay đổi sau khi bài này được viết. Bản này đang chờ kiểm tra lại.',
  },
};

// Public label for a review. It never claims a review that the record cannot back up:
// a "checked" or "reviewed" status with missing reviewer details falls back to the AI-draft label.
export function reviewLabel(locale: Locale, review: Review): string {
  const labels = LABELS[locale];
  const backed = reviewIssues(review).length === 0;
  const status = (review.status === 'COMMUNITY_CHECKED' || review.status === 'EXPERT_REVIEWED') && !backed ? 'AI_DRAFT' : review.status;
  return labels[status]
    .replace('{name}', review.reviewer?.name ?? '')
    .replace('{expertise}', review.reviewer?.expertise ?? '')
    .replace('{date}', review.reviewed_on ?? '');
}
