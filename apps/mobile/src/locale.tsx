// Ngôn ngữ đang chọn cho toàn ứng dụng (WO10-02). Mọi chữ đi qua t() của bộ i18n dùng chung.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { t as translate, type Locale, type MessageKey } from '@aftervia/i18n';

export interface LocaleValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('vi');
  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (value === null) throw new Error('locale_provider_missing');
  return value;
}
