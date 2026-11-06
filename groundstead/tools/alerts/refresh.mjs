#!/usr/bin/env node
// Refreshes the alert snapshot from the feeds named in lib/alerts/feeds.ts (GS-053).
// It does not decide how often it runs: that is owner decision D-36. A failed source never stops the run; it is written
// into the snapshot as that source's state, with the time of its last good update.
// Usage: node tools/alerts/refresh.mjs [--out <path>]   (default: .loop/alerts-snapshot.json, which git ignores)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEDS } from '../../lib/alerts/feeds.ts';
import { refreshAll } from '../../lib/alerts/refresh.ts';
import { parseSnapshot } from '../../lib/alerts/snapshot.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const out = resolve(root, outFlag >= 0 && args[outFlag + 1] ? args[outFlag + 1] : '.loop/alerts-snapshot.json');
const TIMEOUT_MS = 20_000;
const USER_AGENT = 'groundstead-alert-refresh/0.1';

async function fetchFeed(id) {
  const feed = FEEDS[id];
  const geojson = feed.format === 'geojson';
  const response = await fetch(feed.url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: geojson ? 'application/geo+json, application/json' : 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
  return geojson ? response.json() : response.text();
}

let previous = null;
if (existsSync(out)) {
  try {
    previous = parseSnapshot(JSON.parse(readFileSync(out, 'utf8')));
  } catch (error) {
    console.warn(`previous snapshot not used: ${error.message}`);
  }
}

const snapshot = await refreshAll({
  fetchers: { usgs: () => fetchFeed('usgs'), gdacs: () => fetchFeed('gdacs') },
  now: new Date(),
  previous,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
for (const s of snapshot.sources) {
  const when = s.lastUpdated ? `last updated ${s.lastUpdated}` : 'no successful update yet';
  console.log(`${s.source}: ${s.state} (${when})`);
}
console.log(`public alerts in force: ${snapshot.alerts.length}; snapshot written to ${out}`);
