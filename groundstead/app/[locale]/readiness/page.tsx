import { BRAND } from '../../../lib/brand.ts';
import { isLocale, localePath, type Locale } from '../../../lib/i18n/locales.ts';
import { MESSAGES } from '../../../lib/i18n/messages.ts';
import { READINESS } from '../../../lib/readiness/text.ts';
import ReadinessCheck from '../../../components/ReadinessCheck.tsx';

type Params = { params: Promise<{ locale: string }> };

export default async function Readiness({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  const t = READINESS[locale];
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
        <ReadinessCheck text={t} emergencyHref={localePath(locale, 'emergency/')} />
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
