import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '../../lib/brand.ts';
import { LOCALES, isLocale, type Locale } from '../../lib/i18n/locales.ts';
import { pageMetadata } from '../../lib/seo/page.ts';
import '../globals.css';

export const dynamicParams = false;

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === 'vi' ? `${BRAND.name} · ${BRAND.nameVi}` : BRAND.name;
  return {
    metadataBase: new URL(BRAND.siteUrl),
    ...pageMetadata({ locale, path: '', title, description: BRAND.tagline[locale] }),
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
