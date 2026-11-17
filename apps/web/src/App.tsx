// Trang Web Desk (WO10-01): danh sách món đồ với mọi trạng thái, chuyển VI/EN, thử lại và xử lý ngoại tuyến.
import { useCallback, useEffect, useRef, useState } from 'react';
import { t, type Locale } from '@aftervia/i18n';
import { loadItems, type Item, type ListResult } from './state';
import { ItemsView } from './view';
import { DeskForms } from './DeskForms';
import { PrivacyForms } from './PrivacyForms';
import type { CaseSummary } from './actions';

export interface AppProps {
  base: string;
  token: string | null;
  initialLocale: Locale;
}

export function App({ base, token, initialLocale }: AppProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [result, setResult] = useState<ListResult>({ kind: 'loading' });
  // Bản tải thành công gần nhất, chỉ giữ trong bộ nhớ. Dùng khi ngoại tuyến; dữ liệu đó có thể đã cũ.
  const lastItems = useRef<Item[] | null>(null);
  // Case đang làm việc: lấy từ biểu mẫu mở case hoặc chuyển trạng thái; biểu mẫu chuyển trạng thái dùng để điền sẵn.
  const [activeCase, setActiveCase] = useState<CaseSummary | null>(null);

  const reload = useCallback(async () => {
    setResult({ kind: 'loading' });
    const next = await loadItems({ fetchImpl: fetch, base, token, online: navigator.onLine });
    if (next.kind === 'success') {
      lastItems.current = next.items;
      setResult(next);
    } else if (next.kind === 'offline') {
      setResult({ kind: 'offline', cached: lastItems.current });
    } else {
      setResult(next);
    }
  }, [base, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onOffline = () => setResult({ kind: 'offline', cached: lastItems.current });
    const onOnline = () => void reload();
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [reload]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main className="page">
      <header className="toolbar">
        <h1>{t(locale, 'app.name')}</h1>
        <div className="locale">
          <button type="button" aria-pressed={locale === 'vi'} onClick={() => setLocale('vi')}>
            {t(locale, 'locale.vi')}
          </button>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
            {t(locale, 'locale.en')}
          </button>
        </div>
      </header>
      <ItemsView locale={locale} result={result} onRetry={() => void reload()} />
      <DeskForms
        locale={locale}
        base={base}
        token={token}
        activeCase={activeCase}
        onItemAdded={() => void reload()}
        onCaseChanged={setActiveCase}
      />
      <PrivacyForms locale={locale} base={base} token={token} activeCase={activeCase} />
    </main>
  );
}
