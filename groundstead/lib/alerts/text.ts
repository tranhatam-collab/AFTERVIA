import type { Kind } from './model.ts';

export type AlertLocale = 'en' | 'vi';
export type SourceState = 'ok' | 'stale' | 'failed' | 'never';

// Copy for alerts (GS-050). The note under a source never says that an area is safe: with no public alert in force,
// it says what the product does not know.
export type AlertText = {
  sender: string;
  sent: string;
  received: string;
  effective: string;
  kind: string;
  kinds: Record<Kind, string>;
  lastUpdated: string; // contains {time}
  noUpdate: string;
  notes: Record<SourceState, string>; // "ok" and "stale" contain {time}
};

export const ALERT_TEXT: Record<AlertLocale, AlertText> = {
  en: {
    sender: 'Issued by',
    sent: 'Sent',
    received: 'Received',
    effective: 'Effective from',
    kind: 'Type',
    kinds: { observation: 'Observation', forecast: 'Forecast', warning: 'Warning', order: 'Order' },
    lastUpdated: 'Last updated: {time}',
    noUpdate: 'No update from this source yet.',
    notes: {
      ok: 'No public alert is in force in this source as of {time}. That is not a statement that the area is safe.',
      stale: 'This source has not updated since {time}, so alerts may be missing. Check the official channels.',
      failed: 'This source could not be read, so alerts may be missing. Check the official channels.',
      never: 'No update from this source yet, so alerts may be missing. Check the official channels.',
    },
  },
  vi: {
    sender: 'Cơ quan phát',
    sent: 'Giờ phát',
    received: 'Giờ nhận',
    effective: 'Hiệu lực từ',
    kind: 'Loại',
    kinds: { observation: 'Quan trắc', forecast: 'Dự báo', warning: 'Cảnh báo', order: 'Lệnh' },
    lastUpdated: 'Cập nhật lần cuối: {time}',
    noUpdate: 'Chưa có cập nhật nào từ nguồn này.',
    notes: {
      ok: 'Hiện không có cảnh báo công khai nào còn hiệu lực từ nguồn này tính đến {time}. Điều đó không có nghĩa là khu vực an toàn.',
      stale: 'Nguồn này chưa cập nhật từ {time}, nên có thể thiếu cảnh báo. Hãy kiểm tra kênh chính thức.',
      failed: 'Không đọc được nguồn này, nên có thể thiếu cảnh báo. Hãy kiểm tra kênh chính thức.',
      never: 'Chưa có cập nhật nào từ nguồn này, nên có thể thiếu cảnh báo. Hãy kiểm tra kênh chính thức.',
    },
  },
};
