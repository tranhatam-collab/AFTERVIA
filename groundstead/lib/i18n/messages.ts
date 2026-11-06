import type { Locale } from './locales.ts';

export type Messages = {
  languageName: string;
  otherLanguageLabel: string;
  skipToContent: string;
  statusTitle: string;
  statusBody: string;
  comingTitle: string;
  coming: readonly string[];
};

const en: Messages = {
  languageName: 'English',
  otherLanguageLabel: 'Tiếng Việt',
  skipToContent: 'Skip to content',
  statusTitle: 'Under construction',
  statusBody:
    'This is an early build. It is not a finished product, and its guidance has not been reviewed by an expert yet. In an emergency, follow your local authorities and call your local emergency number.',
  comingTitle: 'What we are building',
  coming: [
    '72-Hour City Mode: emergency guidance that works offline',
    'A family plan and a supply cabinet that stay on your device',
    'Alerts from official sources, with the source and time shown',
    'An 8-step path from city life to self-reliant living on good land',
  ],
};

const vi: Messages = {
  languageName: 'Tiếng Việt',
  otherLanguageLabel: 'English',
  skipToContent: 'Bỏ qua để tới nội dung',
  statusTitle: 'Đang xây dựng',
  statusBody:
    'Đây là bản dựng sớm, chưa phải sản phẩm hoàn chỉnh, và hướng dẫn chưa được chuyên gia duyệt. Khi khẩn cấp, hãy làm theo chính quyền địa phương và gọi số khẩn cấp tại nơi bạn ở.',
  comingTitle: 'Những gì đang được xây',
  coming: [
    'Chế độ 72 giờ đô thị: hướng dẫn khẩn cấp dùng được khi mất mạng',
    'Kế hoạch gia đình và tủ vật dụng lưu ngay trên máy của bạn',
    'Cảnh báo từ nguồn chính thức, luôn ghi nguồn và giờ',
    'Lộ trình 8 bước từ phố về sống tự chủ trên đất lành',
  ],
};

export const MESSAGES: Record<Locale, Messages> = { en, vi };
