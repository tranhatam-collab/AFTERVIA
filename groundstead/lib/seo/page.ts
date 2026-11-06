import type { Metadata } from 'next';
import { BRAND } from '../brand.ts';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/locales.ts';
import { allowIndexing } from '../site.ts';
import { buildAlternates } from './alternates.ts';

export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', vi: 'vi_VN' };

// Metadata for one page (GS-081). Each page names its own path, so its canonical and its hreflang list belong to that
// page; a sub-page never points at the home page. Only the locales that have the page are listed, and x-default is
// listed only when the default locale has it. Indexing needs both the page's own opt-in and the site's switch.
export function pageMetadata(input: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  available?: readonly Locale[];
  index?: boolean;
}): Metadata {
  const available = input.available ?? LOCALES;
  const alt = buildAlternates(BRAND.siteUrl, input.locale, input.path);
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const url = alt.languages[l];
    if (url && available.includes(l)) languages[l] = url;
  }
  const xDefault = alt.languages['x-default'];
  if (xDefault && available.includes(DEFAULT_LOCALE)) languages['x-default'] = xDefault;
  const index = (input.index ?? true) && allowIndexing();
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: alt.canonical, languages },
    openGraph: {
      title: input.title,
      description: input.description,
      url: alt.canonical,
      siteName: BRAND.name,
      locale: OG_LOCALE[input.locale],
      type: 'website',
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
  };
}
