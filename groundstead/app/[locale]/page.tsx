import { BRAND } from '../../lib/brand.ts';
import { isLocale, localePath, type Locale } from '../../lib/i18n/locales.ts';
import { MESSAGES } from '../../lib/i18n/messages.ts';

type Params = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
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
        <a href={localePath(other)} hrefLang={other} lang={other}>
          {m.otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <h1>{BRAND.tagline[locale]}</h1>
        <section className="notice" aria-labelledby="status-title">
          <h2 id="status-title">{m.statusTitle}</h2>
          <p>{m.statusBody}</p>
        </section>
        <section aria-labelledby="coming-title">
          <h2 id="coming-title">{m.comingTitle}</h2>
          <ul>
            {m.coming.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <p><a href={localePath(locale, 'help/')}>{m.homeHelpLink}</a></p>
      </main>
    </>
  );
}
