// Hiển thị các trạng thái của Web Desk (WO10-01). Mọi văn bản cố định đi qua t().
// Nội dung món đồ luôn là chữ: React tự thoát, và không có liên kết nào được dựng từ dữ liệu.
import { formatDateOnly, t, type Locale } from '@aftervia/i18n';
import type { Item, ListResult } from './state';

export interface ItemsViewProps {
  locale: Locale;
  result: ListResult;
  onRetry: () => void;
}

// Ngày mua có thể sai về lịch; khi đó bỏ dòng ngày, không làm hỏng cả danh sách.
function formatPurchase(value: string, locale: Locale): string | null {
  try {
    return formatDateOnly(value, locale);
  } catch {
    return null;
  }
}

function ItemList({ locale, items }: { locale: Locale; items: Item[] }) {
  return (
    <ul className="items">
      {items.map((item) => {
        const purchased = item.purchased_on === null ? null : formatPurchase(item.purchased_on, locale);
        return (
          <li className="item" key={item.id}>
            <p className="item-title">{item.title}</p>
            {item.brand === null ? null : <p className="item-meta">{`${t(locale, 'item.brand.label')}: ${item.brand}`}</p>}
            {item.model === null ? null : <p className="item-meta">{`${t(locale, 'item.model.label')}: ${item.model}`}</p>}
            {purchased === null ? null : <p className="item-meta">{`${t(locale, 'item.purchasedOn.label')}: ${purchased}`}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export function ItemsView({ locale, result, onRetry }: ItemsViewProps) {
  switch (result.kind) {
    case 'loading':
      return <p className="state" role="status">{t(locale, 'common.loading')}</p>;
    case 'denied':
      return <p className="state" role="alert">{t(locale, 'common.denied')}</p>;
    case 'error':
      return (
        <div className="state">
          <p role="alert">{t(locale, 'common.error')}</p>
          <button type="button" onClick={onRetry}>
            {t(locale, 'common.retry')}
          </button>
        </div>
      );
    case 'offline':
      // Ngoại tuyến không bao giờ báo thành công. Dữ liệu đã tải trước đó được giữ và báo là có thể cũ.
      return (
        <div className="state">
          <p role="alert">{t(locale, 'common.offline')}</p>
          {result.cached === null || result.cached.length === 0 ? null : <ItemList locale={locale} items={result.cached} />}
        </div>
      );
    case 'success':
      return result.items.length === 0 ? (
        <p className="state" role="status">{t(locale, 'common.empty')}</p>
      ) : (
        <ItemList locale={locale} items={result.items} />
      );
  }
}
