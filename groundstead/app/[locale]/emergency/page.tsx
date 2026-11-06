import { BRAND } from '../../../lib/brand.ts';
import { buildDate, getContent } from '../../../lib/content/load.ts';
import { cardsFor } from '../../../lib/emergency/cards.ts';
import { isLocale, LOCALES, localePath, type Locale } from '../../../lib/i18n/locales.ts';
import { MESSAGES } from '../../../lib/i18n/messages.ts';
import { NetworkStatus } from '../../../components/NetworkStatus.tsx';
import { OfflinePack } from '../../../components/OfflinePack.tsx';
import { OFFLINE } from '../../../lib/offline/text.ts';

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

type Params = { params: Promise<{ locale: string }> };

export default async function EmergencyIndex({ params }: Params) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  const cards = cardsFor(locale);
  return (
    <>
      <a className="skip" href="#main">{m.skipToContent}</a>
      <header className="top">
        <p className="brand">
          {BRAND.name}
          {locale === 'vi' ? <span className="brand-vi"> · {BRAND.nameVi}</span> : null}
        </p>
        <a href={localePath(other, 'emergency/')} hrefLang={other} lang={other}>
          {MESSAGES[other].otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <p><a href={localePath(locale)}>{m.helpBackHome}</a></p>
        <h1>{m.emergencyTitle}</h1>
        <p>{m.emergencyLead}</p>
        <NetworkStatus
          labels={{ checking: m.emergencyNetChecking, online: m.emergencyNetOnline, offline: m.emergencyNetOffline }}
        />
        <OfflinePack locale={locale} labels={OFFLINE[locale]} />
        <p className="footnote">{m.emergencyUpdated}: {buildDate()}</p>
        <section aria-labelledby="cards-title">
          <h2 id="cards-title">{m.emergencyCardsTitle}</h2>
          <ul className="situations">
            {cards.map((v) => (
              <li key={v.item.data.id}>
                <a href={localePath(locale, `emergency/${v.item.data.id}/`)}>{v.item.data.title}</a>
                <br />
                <span>{v.item.data.first_action}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="help-title">
          <h2 id="help-title">{m.emergencyHelpTitle}</h2>
          {getContent().countries.map((c) => {
            const pack = c.data;
            const name = locale === 'vi' ? (pack.name.vi ?? pack.name.en) : pack.name.en;
            return (
              <div key={pack.code} className="country-help">
                <h3>{name}</h3>
                {pack.emergency_numbers.length > 0 ? (
                  <ul>
                    {pack.emergency_numbers.map((n) => (
                      <li key={`${n.service}-${n.number}`}>
                        <a href={`tel:${n.number}`}>{m.emergencyCallNumber} {n.number}</a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{m.emergencyNoVerifiedNumbers}</p>
                )}
                {pack.status === 'partial' && pack.pending ? <p className="notice">{pack.pending[locale]}</p> : null}
                <p><a href={localePath(locale, `help/${pack.code.toLowerCase()}/`)}>{m.emergencyOpenDirectory}</a></p>
              </div>
            );
          })}
        </section>
        <p className="notice">{m.emergencyNoRescue}</p>
      </main>
    </>
  );
}
