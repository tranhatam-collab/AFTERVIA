import type { Locale } from './locales.ts';

export type Messages = {
  languageName: string;
  otherLanguageLabel: string;
  skipToContent: string;
  statusTitle: string;
  statusBody: string;
  comingTitle: string;
  coming: readonly string[];
  homeHelpLink: string;
  helpTitle: string;
  helpLead: string;
  helpCountriesTitle: string;
  helpNumbers: string;
  helpNumber: string;
  helpService: string;
  helpServiceGeneral: string;
  helpServicePolice: string;
  helpServiceFire: string;
  helpServiceAmbulance: string;
  helpServiceDisaster: string;
  helpServicePoison: string;
  helpAuthorities: string;
  helpRoleDisaster: string;
  helpRoleWeather: string;
  helpRoleRedCross: string;
  helpRoleHealth: string;
  helpRoleOther: string;
  helpSourceLabel: string;
  helpCheckedOn: string;
  helpStateCurrent: string;
  helpStateStale: string;
  helpStateUnknown: string;
  helpStaleNotice: string;
  helpFooter: string;
  helpBackHome: string;
  helpPackChecked: string;
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
  homeHelpLink: 'Who can help me: contacts by country',
  helpTitle: 'Who can help me',
  helpLead: 'Contacts by country. Each entry shows its source and the date it was last checked.',
  helpCountriesTitle: 'Choose a country',
  helpNumbers: 'Emergency numbers',
  helpNumber: 'Number',
  helpService: 'Service',
  helpServiceGeneral: 'General emergency',
  helpServicePolice: 'Police',
  helpServiceFire: 'Fire and rescue',
  helpServiceAmbulance: 'Ambulance',
  helpServiceDisaster: 'Disaster',
  helpServicePoison: 'Poison information',
  helpAuthorities: 'Contacts',
  helpRoleDisaster: 'Disaster agency',
  helpRoleWeather: 'Weather service',
  helpRoleRedCross: 'Red Cross or Red Crescent',
  helpRoleHealth: 'Health ministry',
  helpRoleOther: 'Government or other',
  helpSourceLabel: 'Source',
  helpCheckedOn: 'Checked on',
  helpStateCurrent: 'Checked',
  helpStateStale: 'Needs re-check',
  helpStateUnknown: 'Check date unknown',
  helpStaleNotice: 'Not checked for more than 92 days. Check the official page before you rely on it.',
  helpFooter:
    'This page only lists contacts. It does not send rescue requests, and it does not say whether any place is safe or has room.',
  helpBackHome: 'Back to home',
  helpPackChecked: 'This country page was last checked on',
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
  homeHelpLink: 'Ai giúp tôi: danh bạ theo quốc gia',
  helpTitle: 'Ai giúp tôi',
  helpLead: 'Danh bạ theo quốc gia. Mỗi mục ghi nguồn và ngày kiểm gần nhất.',
  helpCountriesTitle: 'Chọn quốc gia',
  helpNumbers: 'Số khẩn cấp',
  helpNumber: 'Số',
  helpService: 'Dịch vụ',
  helpServiceGeneral: 'Khẩn cấp chung',
  helpServicePolice: 'Công an',
  helpServiceFire: 'Cứu hỏa, cứu nạn',
  helpServiceAmbulance: 'Cấp cứu',
  helpServiceDisaster: 'Thiên tai',
  helpServicePoison: 'Tư vấn ngộ độc',
  helpAuthorities: 'Nơi liên hệ',
  helpRoleDisaster: 'Cơ quan phòng chống thiên tai',
  helpRoleWeather: 'Cơ quan khí tượng',
  helpRoleRedCross: 'Hội Chữ thập đỏ hoặc Trăng lưỡi liềm đỏ',
  helpRoleHealth: 'Bộ Y tế',
  helpRoleOther: 'Chính phủ hoặc khác',
  helpSourceLabel: 'Nguồn',
  helpCheckedOn: 'Ngày kiểm',
  helpStateCurrent: 'Đã kiểm',
  helpStateStale: 'Cần kiểm lại',
  helpStateUnknown: 'Chưa rõ ngày kiểm',
  helpStaleNotice: 'Chưa được kiểm lại quá 92 ngày. Hãy kiểm trên trang chính thức trước khi dựa vào thông tin này.',
  helpFooter:
    'Trang này chỉ liệt kê nơi liên hệ. Nó không gửi yêu cầu cứu hộ, và không cho biết nơi nào đang an toàn hay còn chỗ.',
  helpBackHome: 'Về trang chủ',
  helpPackChecked: 'Trang quốc gia này được kiểm gần nhất vào',
};

export const MESSAGES: Record<Locale, Messages> = { en, vi };
