import { distanceKm } from './location.ts';
import { keyOf, type Alert } from './model.ts';

// One real-world event can arrive from more than one source (GT16). Two alerts are the same event when they name the
// same hazard, were sent within SAME_EVENT_HOURS of each other, and are within SAME_EVENT_KM. Without a position on both
// sides nothing is joined: showing two entries is safer than hiding one.
export const SAME_EVENT_HOURS = 6;
export const SAME_EVENT_KM = 100;

export type AlertEvent = { key: string; hazard: string; sources: string[]; alerts: Alert[] };

function sameEvent(a: Alert, b: Alert): boolean {
  if (a.hazard === '' || a.hazard !== b.hazard) return false;
  if (!a.where || !b.where) return false;
  const hours = Math.abs(Date.parse(a.sent) - Date.parse(b.sent)) / 3_600_000;
  return hours <= SAME_EVENT_HOURS && distanceKm(a.where, b.where) <= SAME_EVENT_KM;
}

// Groups alerts into events. An alert joins the first event that it matches; an event's key is the key of its earliest
// alert, so the same event keeps the same key when another source reports it.
export function groupEvents(alerts: Alert[]): AlertEvent[] {
  const events: AlertEvent[] = [];
  for (const alert of alerts) {
    const home = events.find((event) => event.alerts.some((other) => sameEvent(alert, other)));
    if (home) home.alerts.push(alert);
    else events.push({ key: '', hazard: alert.hazard, sources: [], alerts: [alert] });
  }
  for (const event of events) {
    event.alerts.sort((a, b) => Date.parse(a.sent) - Date.parse(b.sent));
    const first = event.alerts[0];
    event.key = first ? keyOf(first) : '';
    event.sources = [...new Set(event.alerts.map((a) => a.source))].sort();
  }
  return events;
}

// The events not yet pushed. The caller keeps the keys it has pushed and adds the new ones with markPushed, so each
// event is pushed once, however many sources or runs report it (GT16).
export function notYetPushed(events: AlertEvent[], pushed: ReadonlySet<string>): AlertEvent[] {
  return events.filter((event) => !pushed.has(event.key));
}

export function markPushed(pushed: ReadonlySet<string>, events: AlertEvent[]): Set<string> {
  return new Set([...pushed, ...events.map((event) => event.key)]);
}
