import type { Locale } from '../i18n/locales.ts';

// Copy for the offline copy panel. The panel says what is and is not checked, and never calls a copy ready
// unless every file matched its SHA-256.
export type OfflineText = {
  title: string;
  lead: string;
  download: string;
  check: string;
  remove: string;
  statusNone: string;
  statusChecking: string;
  statusReady: string; // contains {version} and {date}
  statusNotReady: string;
  statusFailed: string;
  statusUnsupported: string;
  statusRemoved: string;
  note: string;
};

const EN: OfflineText = {
  title: 'Offline copy',
  lead: 'Download the emergency guides and the contact list to this device, so they still open when the connection drops. Every file is checked before the copy is used.',
  download: 'Download offline copy',
  check: 'Check the copy',
  remove: 'Remove the offline copy',
  statusNone: 'No offline copy on this device.',
  statusChecking: 'Checking the files…',
  statusReady: 'Offline copy ready: version {version}, updated {date}.',
  statusNotReady: 'The copy is incomplete or does not match, so it is not used. Try downloading again.',
  statusFailed: 'The download did not finish, or some files did not match. The copy on this device was not changed.',
  statusUnsupported: 'This browser cannot store an offline copy.',
  statusRemoved: 'The offline copy was removed from this device.',
  note: 'Official alerts and local orders still come first.',
};

const VI: OfflineText = {
  title: 'Bản sao ngoại tuyến',
  lead: 'Tải hướng dẫn khẩn cấp và danh bạ về thiết bị này để vẫn mở được khi mất mạng. Mỗi tệp được kiểm trước khi bản sao được dùng.',
  download: 'Tải bản sao ngoại tuyến',
  check: 'Kiểm tra bản sao',
  remove: 'Xóa bản sao ngoại tuyến',
  statusNone: 'Chưa có bản sao ngoại tuyến trên thiết bị này.',
  statusChecking: 'Đang kiểm tra các tệp…',
  statusReady: 'Bản sao ngoại tuyến đã sẵn sàng: phiên bản {version}, cập nhật {date}.',
  statusNotReady: 'Bản sao chưa đủ hoặc không khớp, nên không được dùng. Hãy thử tải lại.',
  statusFailed: 'Tải chưa xong hoặc có tệp không khớp. Bản sao trên thiết bị này không thay đổi.',
  statusUnsupported: 'Trình duyệt này không lưu được bản sao ngoại tuyến.',
  statusRemoved: 'Đã xóa bản sao ngoại tuyến khỏi thiết bị này.',
  note: 'Cảnh báo chính thức và lệnh của chính quyền địa phương vẫn được ưu tiên trước.',
};

export const OFFLINE: Record<Locale, OfflineText> = { en: EN, vi: VI };
