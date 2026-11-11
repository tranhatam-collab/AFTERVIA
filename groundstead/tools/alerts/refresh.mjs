#!/usr/bin/env node
// Refreshes the alert snapshot from the feeds named in lib/alerts/feeds.ts (GS-053).
// It does not decide how often it runs: that is owner decision D-36. A failed source never stops the run; it is written
// into the snapshot as that source's state, with the time of its last good update.
// Usage: node tools/alerts/refresh.mjs [--out <path>]   (default: .loop/alerts-snapshot.json, which git ignores)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFeed } from '../../lib/alerts/fetch.ts';
import { FEEDS } from '../../lib/alerts/feeds.ts';
import { refreshAll } from '../../lib/alerts/refresh.ts';
import { parseSnapshot } from '../../lib/alerts/snapshot.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const out = resolve(root, outFlag >= 0 && args[outFlag + 1] ? args[outFlag + 1] : '.loop/alerts-snapshot.json');
let previous = null;
if (existsSync(out)) {
  try {
    previous = parseSnapshot(JSON.parse(readFileSync(out, 'utf8')));
  } catch (error) {
    console.warn(`previous snapshot not used: ${error.message}`);
  }
}

const snapshot = await refreshAll({
  // Every read goes through readFeed, which refuses an address that is not https (G-16) and a body that is too large (G-17).
  fetchers: {
    usgs: () => readFeed({ url: FEEDS.usgs.url, format: FEEDS.usgs.format }),
    gdacs: () => readFeed({ url: FEEDS.gdacs.url, format: FEEDS.gdacs.format }),
  },
  now: new Date(),
  previous,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
for (const s of snapshot.sources) {
  const when = s.lastUpdated ? `last updated ${s.lastUpdated}` : 'no successful update yet';
  // G-13: a malformed record is left out of the snapshot, and the count is shown so the loss is visible.
  const skipped = s.skipped ? `; ${s.skipped} malformed record(s) left out` : '';
  console.log(`${s.source}: ${s.state} (${when})${skipped}`);
}
console.log(`public alerts in force: ${snapshot.alerts.length}; snapshot written to ${out}`);
