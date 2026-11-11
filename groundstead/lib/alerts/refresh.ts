import { groupEvents, notYetPushed, type AlertEvent } from './dedupe.ts';
import { buildSnapshot, type Snapshot, type SourceRun } from './snapshot.ts';
import { readGdacs, readUsgs, type Reading } from './transform.ts';

// One refresh of the alert snapshot (GS-053). Each fetcher returns the feed body and rejects when the source cannot be
// read. A body of the wrong shape is a failed read, never an empty feed: "no alerts" must not be inferred from an error.

export type Fetchers = { usgs: () => Promise<unknown>; gdacs: () => Promise<unknown> };

// A USGS body must be a GeoJSON object with a features list.
export function usgsBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !Array.isArray((body as { features?: unknown }).features)) {
    throw new Error('the USGS feed is not the expected GeoJSON');
  }
  return body;
}

// A GDACS body must be an RSS document with a channel. An HTML error page is a failed read.
export function gdacsBody(body: unknown): string {
  if (typeof body !== 'string' || !/<rss[\s>]/i.test(body) || !/<channel[\s>]/i.test(body)) {
    throw new Error('the GDACS feed is not the expected RSS');
  }
  return body;
}

async function runOne(
  source: string,
  read: () => Promise<unknown>,
  translate: (body: unknown) => Reading,
  now: Date,
): Promise<SourceRun> {
  try {
    const { alerts, skipped } = translate(await read());
    // A feed whose every record was malformed gave nothing that could be read. That is a failed read, not "no alerts" (G-13).
    if (alerts.length === 0 && skipped > 0) throw new Error('no record of the feed could be read');
    return { source, ok: true, fetchedAt: now.toISOString(), alerts, skipped };
  } catch {
    return { source, ok: false, fetchedAt: null, alerts: [] };
  }
}

// Reads every source, translates what it gave, and builds the snapshot. A failed source does not stop the others.
export async function refreshAll(input: { fetchers: Fetchers; now: Date; previous: Snapshot | null }): Promise<Snapshot> {
  const receivedAt = input.now.toISOString();
  const usgs = await runOne('usgs', input.fetchers.usgs, (body) => readUsgs(usgsBody(body), receivedAt), input.now);
  const gdacs = await runOne(
    'gdacs',
    input.fetchers.gdacs,
    (body) => readGdacs(gdacsBody(body), receivedAt),
    input.now,
  );
  return buildSnapshot([usgs, gdacs], input.now, input.previous);
}

// The events in a snapshot that have not been pushed yet (GT16). The caller keeps the keys it has pushed.
export function eventsToPush(snapshot: Snapshot, pushed: ReadonlySet<string>): AlertEvent[] {
  return notYetPushed(groupEvents(snapshot.alerts), pushed);
}
