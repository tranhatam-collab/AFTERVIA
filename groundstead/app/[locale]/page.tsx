import { BRAND } from '../../lib/brand.ts';
import { isLocale, localePath, type Locale } from '../../lib/i18n/locales.ts';
import { LANDING, MESSAGES } from '../../lib/i18n/messages.ts';
import { jsonLd, organizationLd } from '../../lib/seo/jsonld.ts';

type Params = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = { ...MESSAGES[locale], ...LANDING[locale] };
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
        <p className="lead">{m.positioning}</p>
        <section className="notice" aria-labelledby="status-title">
          <h2 id="status-title">{m.statusTitle}</h2>
          <p>{m.statusBody}</p>
        </section>
        <section aria-labelledby="start-title">
          <h2 id="start-title">{m.startTitle}</h2>
          <p className="tag">{m.modeStatus}</p>
          <p>{m.startBody}</p>
          <p><a href={localePath(locale, 'emergency/')}>{m.homeEmergencyLink}</a></p>
          <p><a href={localePath(locale, 'help/')}>{m.homeHelpLink}</a></p>
        </section>
        <section aria-labelledby="pillars-title">
          <h2 id="pillars-title">{m.pillarsTitle}</h2>
          <p>{m.pillarsIntro}</p>
          <ul className="pillars">
            {m.pillars.map((p) => (
              <li key={p.name}><strong>{p.name}.</strong> {p.text}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="path-title">
          <h2 id="path-title">{m.pathTitle}</h2>
          <p>{m.pathIntro}</p>
          <ol className="path" start={0}>
            {m.path.map((s) => (
              <li key={s.name}><strong>{s.name}.</strong> {s.text}</li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="dont-title">
          <h2 id="dont-title">{m.dontTitle}</h2>
          <ul>
            {m.dont.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="signup-title">
          <h2 id="signup-title">{m.signupTitle}</h2>
          <p>{m.signupBody}</p>
        </section>
        <p className="footnote">{m.footerNotice}</p>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationLd(BRAND.siteUrl, locale)) }} />
      </main>
    </>
  );
}
