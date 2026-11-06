import { notFound } from 'next/navigation';
import { BRAND } from '../../../../lib/brand.ts';
import { getContent } from '../../../../lib/content/load.ts';
import { reviewLabel } from '../../../../lib/content/review.ts';
import { cardsFor } from '../../../../lib/emergency/cards.ts';
import { isLocale, LOCALES, localePath, type Locale } from '../../../../lib/i18n/locales.ts';
import { MESSAGES } from '../../../../lib/i18n/messages.ts';
import { howToLd, jsonLd } from '../../../../lib/seo/jsonld.ts';
import { pageMetadata } from '../../../../lib/seo/page.ts';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams(): { locale: Locale; card: string }[] {
  return LOCALES.flatMap((locale) => cardsFor(locale).map((v) => ({ locale, card: v.item.data.id })));
}

type Params = { params: Promise<{ locale: string; card: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw, card } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const view = cardsFor(locale).find((v) => v.item.data.id === card);
  if (!view) return {};
  const hasOther = cardsFor(other).some((v) => v.item.data.id === card);
  return pageMetadata({
    locale,
    path: `emergency/${card}/`,
    title: `${view.item.data.title} · ${BRAND.name}`,
    description: view.item.data.first_action,
    available: hasOther ? [locale, other] : [locale],
  });
}

export default async function CardPage({ params }: Params) {
  const { locale: rawLocale, card } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  const view = cardsFor(locale).find((v) => v.item.data.id === card);
  if (!view) notFound();
  const c = view.item.data;
  const sources = new Map(getContent().sources.map((s) => [s.id, s] as const));
  const hasOther = cardsFor(other).some((v) => v.item.data.id === card);
  return (
    <>
      <a className="skip" href="#main">{m.skipToContent}</a>
      <header className="top">
        <p className="brand">
          {BRAND.name}
          {locale === 'vi' ? <span className="brand-vi"> · {BRAND.nameVi}</span> : null}
        </p>
        <a
          href={hasOther ? localePath(other, `emergency/${card}/`) : localePath(other, 'emergency/')}
          hrefLang={other}
          lang={other}
        >
          {MESSAGES[other].otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <p><a href={localePath(locale, 'emergency/')}>{m.emergencyBackEmergency}</a></p>
        <h1>{c.title}</h1>
        <p className="firstaction"><strong>{m.emergencyFirstAction}:</strong> {c.first_action}</p>
        <h2>{m.emergencyAvoid}</h2>
        <ul>
          {c.avoid.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
        <h2>{m.emergencySteps}</h2>
        <ol>
          {c.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <h2>{m.emergencyLimits}</h2>
        <p>{c.limits}</p>
        <p className="notice">{reviewLabel(locale, view.review)}</p>
        <h2>{m.emergencySources}</h2>
        <ul>
          {c.sources.map((ref) => {
            const src = sources.get(ref.id);
            return (
              <li key={ref.id}>
                {src ? <a href={src.url}>{src.organization}</a> : ref.id}
                {ref.note ? ` · ${ref.note}` : ''}
              </li>
            );
          })}
        </ul>
        <p className="footnote">{m.emergencyUpdated}: {c.updated}</p>
        <p><a href={localePath(locale, 'help/')}>{m.homeHelpLink}</a></p>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(howToLd(c, locale, `${BRAND.siteUrl.replace(/\/+$/, '')}${localePath(locale, `emergency/${card}/`)}`)),
          }}
        />
      </main>
    </>
  );
}
