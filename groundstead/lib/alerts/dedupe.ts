import { distanceKm } from './location.ts';
import { keyOf, SEVERITY_RANK, type Alert } from './model.ts';

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

// G-11: the highest severity rank each key was pushed at, keyed by event key and alert key. A rank of 0 means the
// cluster was pushed with no known severity.
export type PushedRanks = ReadonlyMap<string, number>;

// How serious an alert says it is, as a rank in CAP's order. An alert with no severity ranks 0.
export function rankOf(alert: Alert): number {
  return alert.severity === undefined ? 0 : SEVERITY_RANK[alert.severity];
}

function eventRank(event: AlertEvent): number {
  return Math.max(0, ...event.alerts.map(rankOf));
}

// The highest rank this event was pushed at, or null when none of its keys was pushed.
function pushedRank(event: AlertEvent, pushed: PushedRanks): number | null {
  const ranks = [event.key, ...event.alerts.map(keyOf)]
    .map((key) => pushed.get(key))
    .filter((rank): rank is number => rank !== undefined);
  return ranks.length === 0 ? null : Math.max(...ranks);
}

// The events to push: never pushed before, or pushed before and now stronger (G-11). A cluster is stronger only when it
// was pushed at a known severity and now has a higher one; a cluster pushed with no known severity is not pushed again,
// so a second source that reports the same event without a level cannot repeat it (GT16). An event counts as pushed when
// any of its alerts was pushed before, so a second source that reports it later, with an earlier time, does not push it
// again (GSL-F02).
export function notYetPushed(events: AlertEvent[], pushed: PushedRanks): AlertEvent[] {
  return events.filter((event) => {
    const before = pushedRank(event, pushed);
    if (before === null) return true;
    return before > 0 && eventRank(event) > before;
  });
}

// Records every alert of the pushed events, not only the event key, at the rank the event was pushed at (G-11).
export function markPushed(pushed: PushedRanks, events: AlertEvent[]): Map<string, number> {
  const next = new Map(pushed);
  for (const event of events) {
    const rank = eventRank(event);
    for (const key of [event.key, ...event.alerts.map(keyOf)]) {
      next.set(key, Math.max(rank, next.get(key) ?? 0));
    }
  }
  return next;
}
