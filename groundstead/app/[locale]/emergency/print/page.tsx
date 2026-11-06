import type { Metadata } from 'next';
import { BRAND } from '../../../../lib/brand.ts';
import { buildDate, getContent } from '../../../../lib/content/load.ts';
import { reviewLabel } from '../../../../lib/content/review.ts';
import { cardsFor } from '../../../../lib/emergency/cards.ts';
import { isLocale, LOCALES, localePath, type Locale } from '../../../../lib/i18n/locales.ts';
import { MESSAGES } from '../../../../lib/i18n/messages.ts';
import { PRINT } from '../../../../lib/print/text.ts';
import { PrintButton } from '../../../../components/PrintButton.tsx';
import { pageMetadata } from '../../../../lib/seo/page.ts';

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

// A printed copy is not a search result: it duplicates the web pages on purpose, so it is not indexed.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  return pageMetadata({
    locale,
    path: 'emergency/print/',
    title: `${PRINT[locale].title} · ${BRAND.name}`,
    description: PRINT[locale].lead,
    index: false,
  });
}

type Params = { params: Promise<{ locale: string }> };

export default async function PrintEmergency({ params }: Params) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  const p = PRINT[locale];
  const cards = cardsFor(locale);
  const content = getContent();
  const sources = new Map(content.sources.map((s) => [s.id, s] as const));
  return (
    <>
      <a className="skip" href="#main">{m.skipToContent}</a>
      <header className="top noprint">
        <p className="brand">
          {BRAND.name}
          {locale === 'vi' ? <span className="brand-vi"> · {BRAND.nameVi}</span> : null}
        </p>
        <a href={localePath(other, 'emergency/print/')} hrefLang={other} lang={other}>
          {MESSAGES[other].otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <p className="noprint"><a href={localePath(locale, 'emergency/')}>{m.emergencyBackEmergency}</a></p>
        <h1>{p.title}</h1>
        <p>{p.lead}</p>
        <p className="footnote">{m.emergencyUpdated}: {buildDate()}</p>
        <p className="noprint"><PrintButton label={p.button} /></p>
        {cards.map((v) => {
          const c = v.item.data;
          return (
            <section key={c.id} aria-labelledby={`card-${c.id}`}>
              <h2 id={`card-${c.id}`}>{c.title}</h2>
              <p><strong>{m.emergencyFirstAction}:</strong> {c.first_action}</p>
              <h3>{m.emergencyAvoid}</h3>
              <ul>
                {c.avoid.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
              <h3>{m.emergencySteps}</h3>
              <ol>
                {c.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <h3>{m.emergencyLimits}</h3>
              <p>{c.limits}</p>
              <p className="notice">{reviewLabel(locale, v.review)}</p>
              <h3>{m.emergencySources}</h3>
              <ul>
                {c.sources.map((ref) => {
                  const src = sources.get(ref.id);
                  return (
                    <li key={ref.id}>
                      {src ? src.organization : ref.id}
                      {ref.note ? ` · ${ref.note}` : ''}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <section aria-labelledby="print-help">
          <h2 id="print-help">{m.emergencyHelpTitle}</h2>
          {content.countries.map((country) => {
            const pack = country.data;
            const name = locale === 'vi' ? (pack.name.vi ?? pack.name.en) : pack.name.en;
            return (
              <div key={pack.code}>
                <h3>{name}</h3>
                {pack.emergency_numbers.length > 0 ? (
                  <ul>
                    {pack.emergency_numbers.map((n) => (
                      <li key={`${n.service}-${n.number}`}>
                        {m.emergencyCallNumber} {n.number}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{m.emergencyNoVerifiedNumbers}</p>
                )}
                {pack.status === 'partial' && pack.pending ? <p className="notice">{pack.pending[locale]}</p> : null}
              </div>
            );
          })}
        </section>
        <p className="notice">{m.emergencyNoRescue}</p>
        <p className="footnote">{p.footer}</p>
      </main>
    </>
  );
}
