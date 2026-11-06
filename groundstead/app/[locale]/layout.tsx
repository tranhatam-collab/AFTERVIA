import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '../../lib/brand.ts';
import { LOCALES, isLocale, type Locale } from '../../lib/i18n/locales.ts';
import { buildAlternates } from '../../lib/seo/alternates.ts';
import { allowIndexing } from '../../lib/site.ts';
import '../globals.css';

export const dynamicParams = false;

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const alt = buildAlternates(BRAND.siteUrl, locale);
  const title = locale === 'vi' ? `${BRAND.name} · ${BRAND.nameVi}` : BRAND.name;
  return {
    metadataBase: new URL(BRAND.siteUrl),
    title,
    description: BRAND.tagline[locale],
    alternates: { canonical: alt.canonical, languages: alt.languages },
    robots: allowIndexing() ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: Params & { children: ReactNode }) {
  const { locale } = await params;
  return (
    <html lang={isLocale(locale) ? locale : 'en'}>
      <body>{children}</body>
    </html>
  );
}
