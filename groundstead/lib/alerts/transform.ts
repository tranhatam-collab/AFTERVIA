import type { Alert } from './model.ts';

// Translators from each source's records into the common alert model (GS-050). Records that lack an identifier, a
// time or a headline are skipped, and a feed that is not the expected shape gives no alerts. Nothing here guesses.
// The field names follow the sample records in tests/alerts.test.ts; check them against the live feeds before use
// (GS-053 reads the live feeds through a job).

// A UTC ISO 8601 time from a number (milliseconds) or a text. A text without a zone is read as UTC.
export function toIso(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const text = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
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
    const where = Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number'
      ? { lat: coords[1], lon: coords[0] }
      : undefined;
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
    });
  }
  return alerts;
}

// A position from a record's lat and lon fields, when both are numbers (the sample records use these field names).
function placeOf(p: Record<string, unknown>): { where?: { lat: number; lon: number } } {
  return typeof p.lat === 'number' && typeof p.lon === 'number' ? { where: { lat: p.lat, lon: p.lon } } : {};
}

const GDACS_HAZARD: Record<string, string> = {
  EQ: 'earthquake',
  TC: 'cyclone',
  FL: 'flood',
  VO: 'volcano',
  DR: 'drought',
  WF: 'wildfire',
};

// Disaster events from GDACS. A current event is a warning. An event that is no longer current is sent as a Cancel of
// itself, so it is not shown.
export function fromGdacs(feed: unknown, receivedAt: string): Alert[] {
  const alerts: Alert[] = [];
  for (const feature of featuresOf(feed)) {
    const p = (feature.properties ?? {}) as Record<string, unknown>;
    const type = typeof p.eventtype === 'string' ? p.eventtype : '';
    const eventId = p.eventid;
    const id = type !== '' && (typeof eventId === 'number' || typeof eventId === 'string') ? `${type}${eventId}` : '';
    const headline = typeof p.name === 'string' ? p.name : '';
    const sent = toIso(p.datemodified);
    const effective = toIso(p.fromdate);
    if (!id || !headline || !sent || !effective) continue;
    const current = String(p.iscurrent).toLowerCase() === 'true';
    alerts.push({
      source: 'gdacs',
      id,
      sender: 'GDACS',
      status: 'Actual',
      msgType: current ? 'Alert' : 'Cancel',
      scope: 'Public',
      kind: 'warning',
      headline,
      hazard: GDACS_HAZARD[type] ?? '',
      sent,
      received: receivedAt,
      effective,
      references: current ? [] : [`gdacs:${id}`],
      ...placeOf(p),
    });
  }
  return alerts;
}
