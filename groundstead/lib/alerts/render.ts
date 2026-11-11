import type { Alert } from './model.ts';
import { ALERT_TEXT, type AlertLocale, type SourceState } from './text.ts';

export type Fact = { label: string; value: string };

// The facts every public alert shows (GT15): the issuing agency, when it was sent, when this product received it, when
// it takes effect, and what kind of message it is. An alert whose source gave no access level also says so (G-08).
export function alertFacts(alert: Alert, locale: AlertLocale): Fact[] {
  const t = ALERT_TEXT[locale];
  const facts: Fact[] = [
    { label: t.sender, value: alert.sender },
    { label: t.sent, value: alert.sent },
    { label: t.received, value: alert.received },
    { label: t.effective, value: alert.effective },
    { label: t.kind, value: t.kinds[alert.kind] },
  ];
  if (alert.scope === 'Unstated') facts.push({ label: t.access, value: t.noAccess });
  return facts;
}

// The note under a source. It says what is not known; it never says that an area is safe (GT14).
export function coverageNote(state: SourceState, lastUpdated: string | null, locale: AlertLocale): string {
  return ALERT_TEXT[locale].notes[state].replace('{time}', lastUpdated ?? '');
}

// The last-update line every source shows (GT14): the time it last updated, or that it has not updated yet.
export function lastUpdatedLine(lastUpdated: string | null, locale: AlertLocale): string {
  const t = ALERT_TEXT[locale];
  return lastUpdated === null ? t.noUpdate : t.lastUpdated.replace('{time}', lastUpdated);
}
