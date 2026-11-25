import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from '../i18n/locales.ts';

export type Alternates = {
  canonical: string;
  languages: Record<string, string>;
};

// hreflang map for one page: every locale plus x-default (= DEFAULT_LOCALE), all absolute URLs.
export function buildAlternates(siteUrl: string, locale: Locale, path = ''): Alternates {
  const base = siteUrl.replace(/\/+$/, '');
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `${base}${localePath(l, path)}`;
  languages['x-default'] = `${base}${localePath(DEFAULT_LOCALE, path)}`;
  return { canonical: `${base}${localePath(locale, path)}`, languages };
}
