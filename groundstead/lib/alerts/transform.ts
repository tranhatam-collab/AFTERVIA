import type { Alert } from './model.ts';

// Translators from each source's records into the common alert model (GS-050, GS-053). A record without an identifier,
// a time or the fields that make it an alert is skipped and counted (G-13), so one bad record never drops the feed.
// A feed of the wrong shape is refused before this file (refresh.ts). Nothing is guessed.
//
// GDACS: the field names below are those of the live GDACS RSS feed (https://www.gdacs.org/xml/rss.xml), checked on
// 06/11/2026 for structure only. GDACS's rights flags in content/sources.json are "quote: false, summarize: false": the
// headline here is composed from structured fields and never copies the feed's title or description text.
// USGS: the GeoJSON summary feed fields are not yet checked against the live host (blocked by the sandbox proxy; see
// docs/evidence/GS-053.md).

// What a translator read from one feed: the alerts it translated, and how many records it skipped as malformed (G-13).
export type Reading = { alerts: Alert[]; skipped: number };

// A UTC ISO 8601 time from a number (milliseconds) or a text. A text with a zone (Z, GMT, UTC or an offset) keeps it;
// a text without one is read as UTC. A number outside the range of a date is not a time (G-13).
export function toIso(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== 'string' || value.trim() === '') return null;
  const text = value.trim();
  const hasZone = /(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/i.test(text);
  const time = Date.parse(hasZone ? text : `${text}Z`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// The features of a GeoJSON body, each left as it came: a record is read on its own (G-13).
function featuresOf(feed: unknown): unknown[] {
  const list = (feed as { features?: unknown } | null)?.features;
  return Array.isArray(list) ? list : [];
}

// A record that throws while it is read is malformed: it gives no alert, the same as one missing a field (G-13).
function readOne(read: () => Alert | null): Alert | null {
  try {
    return read();
  } catch {
    return null;
  }
}

// One USGS record as an alert, or null when it lacks what makes it an alert.
function usgsAlert(feature: unknown, receivedAt: string): Alert | null {
  if (typeof feature !== 'object' || feature === null) return null;
  const f = feature as Record<string, unknown>;
  const p = (f.properties ?? {}) as Record<string, unknown>;
  const id = typeof f.id === 'string' ? f.id : '';
  const headline = typeof p.title === 'string' ? p.title : '';
  const sent = toIso(p.updated);
  const effective = toIso(p.time);
  if (!id || !headline || !sent || !effective) return null;
  // USGS sends the flag as 1 or 0; a record that gives neither carries no flag rather than a guessed one.
  const tsunami = p.tsunami === 1 || p.tsunami === true ? true : p.tsunami === 0 || p.tsunami === false ? false : undefined;
  const coords = (f.geometry as { coordinates?: unknown } | undefined)?.coordinates;
  const where =
    Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number'
      ? { lat: coords[1], lon: coords[0] }
      : undefined;
  const url = typeof p.url === 'string' && p.url !== '' ? p.url : undefined;
  return {
    source: 'usgs',
    id,
    sender: 'USGS',
    status: 'Actual',
    msgType: 'Alert',
    scope: 'Public',
    kind: 'observation',
    headline,
    hazard: 'earthquake',
    sent,
    received: receivedAt,
    effective,
    references: [],
    ...(where ? { where } : {}),
    ...(url ? { url } : {}),
    ...(tsunami !== undefined ? { tsunami } : {}),
  };
}

// Earthquakes from the USGS GeoJSON summary feed. A quake is an observation: it reports what was measured and is not
// an order. The tsunami flag is carried on the alert as data (G-12); it does not turn the quake into a warning.
export function readUsgs(feed: unknown, receivedAt: string): Reading {
  const alerts: Alert[] = [];
  let skipped = 0;
  for (const feature of featuresOf(feed)) {
    const alert = readOne(() => usgsAlert(feature, receivedAt));
    if (alert) alerts.push(alert);
    else skipped += 1;
  }
  return { alerts, skipped };
}

export function fromUsgs(feed: unknown, receivedAt: string): Alert[] {
  return readUsgs(feed, receivedAt).alerts;
}

// ---- GDACS RSS -------------------------------------------------------------------------------------------------------

const GDACS_HAZARD: Record<string, string> = {
  EQ: 'earthquake',
  TC: 'cyclone',
  FL: 'flood',
  VO: 'volcano',
  DR: 'drought',
  WF: 'wildfire',
  TS: 'tsunami',
};

const GDACS_LABEL: Record<string, string> = {
  EQ: 'earthquake',
  TC: 'tropical cyclone',
  FL: 'flood',
  VO: 'volcano',
  DR: 'drought',
  WF: 'wildfire',
  TS: 'tsunami',
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

// Text of an XML value: CDATA is unwrapped and character references are decoded.
function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_all, ref: string) => {
      if (ref.startsWith('#x') || ref.startsWith('#X')) return String.fromCodePoint(parseInt(ref.slice(2), 16));
      if (ref.startsWith('#')) return String.fromCodePoint(parseInt(ref.slice(1), 10));
      return ENTITIES[ref.toLowerCase()] ?? '';
    })
    .trim();
}

// The items of an RSS document, as the text between their tags.
function rssItems(xml: string): string[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)].map((m) => m[1] ?? '');
}

// The text of the first element with this name in one item. Namespaced names (gdacs:eventtype) match exactly.
function tagText(item: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = item.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`));
  return match ? decode(match[1] ?? '') : null;
}

// A number from an element's text; a missing or empty value is null, not 0.
function numberOf(text: string | null): number | null {
  if (text === null || text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

// The headline is composed here from structured fields. It is not the feed's own text.
function composeHeadline(type: string, level: string, name: string): string {
  const label = GDACS_LABEL[type] ?? type;
  return [`${label} alert level ${level || 'unknown'}`, name].filter((part) => part !== '').join(' · ');
}

// One GDACS item as an alert, or null when it lacks what makes it an alert.
function gdacsAlert(item: string, receivedAt: string): Alert | null {
  const type = tagText(item, 'gdacs:eventtype') ?? '';
  const eventId = tagText(item, 'gdacs:eventid') ?? '';
  const sent = toIso(tagText(item, 'gdacs:datemodified'));
  const effective = toIso(tagText(item, 'gdacs:fromdate'));
  if (type === '' || eventId === '' || !sent || !effective) return null;
  const id = `${type}${eventId}`;
  const level = tagText(item, 'gdacs:alertlevel') ?? '';
  const name = tagText(item, 'gdacs:eventname') ?? '';
  // Only an explicit "false" ends an event (GSL-F05). A missing or unreadable flag is not a Cancel: hiding an alert
  // that may still be in force is worse than showing one that has just ended.
  const current = (tagText(item, 'gdacs:iscurrent') ?? '').toLowerCase() !== 'false';
  // A missing access level is "Unstated", shown with a note (G-08). Any other value that is not "Public" is Restricted.
  const access = tagText(item, 'gdacs:accesslevel') ?? '';
  const lat = numberOf(tagText(item, 'geo:lat'));
  const lon = numberOf(tagText(item, 'geo:long'));
  const link = tagText(item, 'link') ?? '';
  return {
    source: 'gdacs',
    id,
    sender: 'GDACS',
    status: 'Actual',
    msgType: current ? 'Alert' : 'Cancel',
    scope: access === 'Public' ? 'Public' : access === '' ? 'Unstated' : 'Restricted',
    kind: 'warning',
    headline: composeHeadline(type, level, name),
    hazard: GDACS_HAZARD[type] ?? '',
    sent,
    received: receivedAt,
    effective,
    references: current ? [] : [`gdacs:${id}`],
    ...(lat !== null && lon !== null ? { where: { lat, lon } } : {}),
    ...(link !== '' ? { url: link } : {}),
  };
}

// Disaster events from the GDACS RSS feed. A current event is a warning. An event marked as no longer current
// (gdacs:iscurrent "false") is sent as a Cancel of itself, so it is not shown. Only events whose access level is Public may be shown to the public.
// Each item is read on its own: one that cannot be read is skipped and counted (G-13).
export function readGdacs(xml: string, receivedAt: string): Reading {
  const alerts: Alert[] = [];
  let skipped = 0;
  for (const item of rssItems(xml)) {
    const alert = readOne(() => gdacsAlert(item, receivedAt));
    if (alert) alerts.push(alert);
    else skipped += 1;
  }
  return { alerts, skipped };
}

export function fromGdacsRss(xml: string, receivedAt: string): Alert[] {
  return readGdacs(xml, receivedAt).alerts;
}
