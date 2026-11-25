import { BRAND } from '../../../lib/brand.ts';
import { getContent } from '../../../lib/content/load.ts';
import { isLocale, LOCALES, localePath, type Locale } from '../../../lib/i18n/locales.ts';
import { MESSAGES } from '../../../lib/i18n/messages.ts';
import { pageMetadata } from '../../../lib/seo/page.ts';
import type { Metadata } from 'next';

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  return pageMetadata({
    locale,
    path: 'help/',
    title: `${MESSAGES[locale].helpTitle} · ${BRAND.name}`,
    description: MESSAGES[locale].helpLead,
  });
}

export default async function HelpIndex({ params }: Params) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  return (
    <>
      <a className="skip" href="#main">{m.skipToContent}</a>
      <header className="top">
        <p className="brand">
          {BRAND.name}
          {locale === 'vi' ? <span className="brand-vi"> · {BRAND.nameVi}</span> : null}
        </p>
        <a href={localePath(other, 'help/')} hrefLang={other} lang={other}>
          {MESSAGES[other].otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <p><a href={localePath(locale)}>{m.helpBackHome}</a></p>
        <h1>{m.helpTitle}</h1>
        <p>{m.helpLead}</p>
        <h2>{m.helpCountriesTitle}</h2>
        <ul>
          {getContent().countries.map((c) => (
            <li key={c.data.code}>
              <a href={localePath(locale, `help/${c.data.code.toLowerCase()}/`)}>
                {locale === 'vi' ? (c.data.name.vi ?? c.data.name.en) : c.data.name.en}
              </a>
            </li>
          ))}
        </ul>
        <p className="footnote">{m.helpFooter}</p>
      </main>
    </>
  );
}
