import { distanceKm } from './location.ts';
import { keyOf, type Alert } from './model.ts';

// One real-world event can arrive from more than one source (GT16). Two alerts are the same event when they name the
// same hazard, took effect within SAME_EVENT_HOURS of each other, and are within SAME_EVENT_KM. Without a position on both
// sides nothing is joined: showing two entries is safer than hiding one.
//
// The time compared is `effective` (when the event took effect), not `sent`: a source's update time moves each time it
// revises its record, and the same event must stay the same event (GSL-F02).
export const SAME_EVENT_HOURS = 6;
export const SAME_EVENT_KM = 100;

export type AlertEvent = { key: string; hazard: string; sources: string[]; alerts: Alert[] };

function sameEvent(a: Alert, b: Alert): boolean {
  if (a.hazard === '' || a.hazard !== b.hazard) return false;
  if (!a.where || !b.where) return false;
  const hours = Math.abs(Date.parse(a.effective) - Date.parse(b.effective)) / 3_600_000;
  return hours <= SAME_EVENT_HOURS && distanceKm(a.where, b.where) <= SAME_EVENT_KM;
}

// Earliest effective time first; the key breaks ties, so the order never depends on how the alerts arrived.
function byEffective(a: Alert, b: Alert): number {
  return Date.parse(a.effective) - Date.parse(b.effective) || (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0);
}

// Groups alerts into events. An alert joins the first event whose every alert it matches, so events do not chain
// through a middle alert: a quake 10 hours after another is not hidden behind one that falls between them (GST-F03).
// An event's key is the key of its earliest alert.
export function groupEvents(alerts: Alert[]): AlertEvent[] {
  const events: AlertEvent[] = [];
  for (const alert of [...alerts].sort(byEffective)) {
    const home = events.find((event) => event.alerts.every((other) => sameEvent(alert, other)));
    if (home) home.alerts.push(alert);
    else events.push({ key: '', hazard: alert.hazard, sources: [], alerts: [alert] });
  }
  for (const event of events) {
    const first = event.alerts[0];
    event.key = first ? keyOf(first) : '';
    event.sources = [...new Set(event.alerts.map((a) => a.source))].sort();
  }
  return events;
}

// The events not yet pushed. The caller keeps the keys it has pushed and adds the new ones with markPushed, so each
// event is pushed once, however many sources or runs report it (GT16). An event counts as pushed when any of its alerts
// was pushed before, so a second source that reports it later, with an earlier time, does not push it again (GSL-F02).
export function notYetPushed(events: AlertEvent[], pushed: ReadonlySet<string>): AlertEvent[] {
  return events.filter((event) => !pushed.has(event.key) && !event.alerts.some((alert) => pushed.has(keyOf(alert))));
}

// Records every alert of the pushed events, not only the event key.
export function markPushed(pushed: ReadonlySet<string>, events: AlertEvent[]): Set<string> {
  return new Set([...pushed, ...events.flatMap((event) => [event.key, ...event.alerts.map(keyOf)])]);
}
