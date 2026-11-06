import type { Alert } from './model.ts';

// Translators from each source's records into the common alert model (GS-050, GS-053). A record without an identifier,
// a time or the fields that make it an alert is skipped; a feed of the wrong shape gives no alerts. Nothing is guessed.
//
// GDACS: the field names below are those of the live GDACS RSS feed (https://www.gdacs.org/xml/rss.xml), checked on
// 06/11/2026 for structure only. GDACS's rights flags in content/sources.json are "quote: false, summarize: false": the
// headline here is composed from structured fields and never copies the feed's title or description text.
// USGS: the GeoJSON summary feed fields are not yet checked against the live host (blocked by the sandbox proxy; see
// docs/evidence/GS-053.md).

// A UTC ISO 8601 time from a number (milliseconds) or a text. A text with a zone (Z, GMT, UTC or an offset) keeps it;
// a text without one is read as UTC.
export function toIso(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const text = value.trim();
  const hasZone = /(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/i.test(text);
  const time = Date.parse(hasZone ? text : `${text}Z`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function featuresOf(feed: unknown): Record<string, unknown>[] {
  const list = (feed as { features?: unknown } | null)?.features;
  if (!Array.isArray(list)) return [];
  return list.filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null);
}

// Earthquakes from the USGS GeoJSON summary feed. A quake is an observation: it reports what was measured and is not
// an order. Any tsunami or alert flag in the record is not turned into a warning here.
export function fromUsgs(feed: unknown, receivedAt: string): Alert[] {
  const alerts: Alert[] = [];
  for (const feature of featuresOf(feed)) {
    const p = (feature.properties ?? {}) as Record<string, unknown>;
    const id = typeof feature.id === 'string' ? feature.id : '';
    const headline = typeof p.title === 'string' ? p.title : '';
    const sent = toIso(p.updated);
    const effective = toIso(p.time);
    if (!id || !headline || !sent || !effective) continue;
    const coords = (feature.geometry as { coordinates?: unknown } | undefined)?.coordinates;
    const where =
      Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number'
        ? { lat: coords[1], lon: coords[0] }
        : undefined;
    const url = typeof p.url === 'string' && p.url !== '' ? p.url : undefined;
    alerts.push({
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
    });
  }
  return alerts;
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

// Disaster events from the GDACS RSS feed. A current event is a warning. An event that is no longer current is sent as a
// Cancel of itself, so it is not shown. Only events whose access level is Public may be shown to the public.
export function fromGdacsRss(xml: string, receivedAt: string): Alert[] {
  const alerts: Alert[] = [];
  for (const item of rssItems(xml)) {
    const type = tagText(item, 'gdacs:eventtype') ?? '';
    const eventId = tagText(item, 'gdacs:eventid') ?? '';
    const sent = toIso(tagText(item, 'gdacs:datemodified'));
    const effective = toIso(tagText(item, 'gdacs:fromdate'));
    if (type === '' || eventId === '' || !sent || !effective) continue;
    const id = `${type}${eventId}`;
    const level = tagText(item, 'gdacs:alertlevel') ?? '';
    const name = tagText(item, 'gdacs:eventname') ?? '';
    const current = (tagText(item, 'gdacs:iscurrent') ?? '').toLowerCase() === 'true';
    const access = tagText(item, 'gdacs:accesslevel') ?? '';
    const lat = numberOf(tagText(item, 'geo:lat'));
    const lon = numberOf(tagText(item, 'geo:long'));
    const link = tagText(item, 'link') ?? '';
    alerts.push({
      source: 'gdacs',
      id,
      sender: 'GDACS',
      status: 'Actual',
      msgType: current ? 'Alert' : 'Cancel',
      scope: access === 'Public' ? 'Public' : 'Restricted',
      kind: 'warning',
      headline: composeHeadline(type, level, name),
      hazard: GDACS_HAZARD[type] ?? '',
      sent,
      received: receivedAt,
      effective,
      references: current ? [] : [`gdacs:${id}`],
      ...(lat !== null && lon !== null ? { where: { lat, lon } } : {}),
      ...(link !== '' ? { url: link } : {}),
    });
  }
  return alerts;
}
