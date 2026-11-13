import { BRAND } from '../../../lib/brand.ts';
import { cardsFor } from '../../../lib/emergency/cards.ts';
import { isLocale, localePath, type Locale } from '../../../lib/i18n/locales.ts';
import { MESSAGES } from '../../../lib/i18n/messages.ts';
import { pageMetadata } from '../../../lib/seo/page.ts';
import type { Metadata } from 'next';
import { READINESS } from '../../../lib/readiness/text.ts';
import ReadinessCheck from '../../../components/ReadinessCheck.tsx';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const t = READINESS[locale];
  return pageMetadata({ locale, path: 'readiness/', title: `${t.title} · ${BRAND.name}`, description: t.intro });
}

export default async function Readiness({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  const t = READINESS[locale];
  // Same rule as the home page: do not say a guide is available when this build carries none.
  const shown = cardsFor(locale).length > 0 ? t : { ...t, cityText: t.cityTextNoGuides, cityLink: t.cityLinkNoGuides };
  return (
    <>
      <a className="skip" href="#main">{m.skipToContent}</a>
      <header className="top">
        <p className="brand">
          {BRAND.name}
          {locale === 'vi' ? <span className="brand-vi"> · {BRAND.nameVi}</span> : null}
        </p>
        <a href={localePath(other, 'readiness/')} hrefLang={other} lang={other}>
          {m.otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <p>{t.scoreNote}</p>
        <p>{t.planningAid}</p>
        <ReadinessCheck text={shown} emergencyHref={localePath(locale, 'emergency/')} />
        <section aria-labelledby="risks-title">
          <h2 id="risks-title">{t.risksTitle}</h2>
          <ul>
            {t.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
        <p><a href={localePath(locale)}>{m.helpBackHome}</a></p>
      </main>
    </>
  );
}
