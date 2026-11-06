import { notFound } from 'next/navigation';
import { BRAND } from '../../../../lib/brand.ts';
import { buildDate, getContent } from '../../../../lib/content/load.ts';
import type { CountryPack } from '../../../../lib/content/types.ts';
import { directoryStatus, type DirectoryState } from '../../../../lib/help/directory.ts';
import { isLocale, LOCALES, localePath, type Locale } from '../../../../lib/i18n/locales.ts';
import { MESSAGES, type Messages } from '../../../../lib/i18n/messages.ts';

type TextKey = Exclude<keyof Messages, 'coming'>;

const SERVICE_KEY: Record<CountryPack['emergency_numbers'][number]['service'], TextKey> = {
  general: 'helpServiceGeneral',
  police: 'helpServicePolice',
  fire: 'helpServiceFire',
  ambulance: 'helpServiceAmbulance',
  disaster: 'helpServiceDisaster',
  poison: 'helpServicePoison',
};

const ROLE_KEY: Record<CountryPack['authorities'][number]['role'], TextKey> = {
  'disaster-agency': 'helpRoleDisaster',
  'weather-service': 'helpRoleWeather',
  'red-cross': 'helpRoleRedCross',
  'health-ministry': 'helpRoleHealth',
  other: 'helpRoleOther',
};

const STATE_KEY: Record<DirectoryState, TextKey> = {
  current: 'helpStateCurrent',
  stale: 'helpStateStale',
  unknown: 'helpStateUnknown',
};

export const dynamicParams = false;

export function generateStaticParams(): { locale: Locale; country: string }[] {
  return LOCALES.flatMap((locale) =>
    getContent().countries.map((c) => ({ locale, country: c.data.code.toLowerCase() })),
  );
}

type Params = { params: Promise<{ locale: string; country: string }> };

export default async function CountryHelp({ params }: Params) {
  const { locale: rawLocale, country } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  const m = MESSAGES[locale];
  const content = getContent();
  const item = content.countries.find((c) => c.data.code.toLowerCase() === country);
  if (!item) notFound();
  const pack = item.data;
  const today = buildDate();
  const sources = new Map(content.sources.map((s) => [s.id, s] as const));
  const name = locale === 'vi' ? (pack.name.vi ?? pack.name.en) : pack.name.en;
  const packState = directoryStatus(pack.checked_on, today);
  return (
    <>
      <a className="skip" href="#main">{m.skipToContent}</a>
      <header className="top">
        <p className="brand">
          {BRAND.name}
          {locale === 'vi' ? <span className="brand-vi"> · {BRAND.nameVi}</span> : null}
        </p>
        <a href={localePath(other, `help/${pack.code.toLowerCase()}/`)} hrefLang={other} lang={other}>
          {MESSAGES[other].otherLanguageLabel}
        </a>
      </header>
      <main id="main">
        <p><a href={localePath(locale)}>{m.helpBackHome}</a></p>
        <h1>{m.helpTitle}: {name}</h1>
        <p>{m.helpPackChecked} {pack.checked_on}.</p>
        {packState === 'stale' ? <p className="notice">{m.helpStaleNotice}</p> : null}
        <section aria-labelledby="numbers-title">
          <h2 id="numbers-title">{m.helpNumbers}</h2>
          {pack.status === 'partial' && pack.pending ? <p className="notice">{pack.pending[locale]}</p> : null}
          {pack.emergency_numbers.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">{m.helpService}</th>
                  <th scope="col">{m.helpNumber}</th>
                  <th scope="col">{m.helpSourceLabel}</th>
                  <th scope="col">{m.helpCheckedOn}</th>
                </tr>
              </thead>
              <tbody>
                {pack.emergency_numbers.map((n) => {
                  const src = sources.get(n.source);
                  return (
                    <tr key={`${n.service}-${n.number}`}>
                      <td>{m[SERVICE_KEY[n.service]]}</td>
                      <td><a href={`tel:${n.number}`}>{n.number}</a></td>
                      <td>{src ? <a href={src.url}>{src.organization}</a> : n.source}</td>
                      <td>{n.checked_on}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </section>
        <section aria-labelledby="authorities-title">
          <h2 id="authorities-title">{m.helpAuthorities}</h2>
          <ul className="contacts">
            {pack.authorities.map((a) => {
              const src = sources.get(a.source);
              const state = directoryStatus(a.checked_on, today);
              return (
                <li key={a.url}>
                  <p><strong>{a.name}</strong> · {m[ROLE_KEY[a.role]]}</p>
                  <p><a href={a.url}>{a.url}</a></p>
                  <p>
                    {m.helpSourceLabel}: {src ? <a href={src.url}>{src.organization}</a> : a.source} · {m.helpCheckedOn}: {a.checked_on} · {m[STATE_KEY[state]]}
                  </p>
                  {state === 'stale' ? <p className="notice">{m.helpStaleNotice}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
        <p className="footnote">{m.helpFooter}</p>
      </main>
    </>
  );
}
