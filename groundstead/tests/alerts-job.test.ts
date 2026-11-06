import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventsToPush, gdacsBody, refreshAll, usgsBody } from '../lib/alerts/refresh.ts';
import { parseSnapshot, type Snapshot } from '../lib/alerts/snapshot.ts';
import { GDACS_SAMPLE, QUAKE_HANOI_GDACS } from './alerts-fixtures.ts';

const NOW = new Date('2026-11-06T10:00:00.000Z');

// The same quake the GDACS sample reports near Hanoi, as the USGS summary feed reports it.
const USGS_FEED = {
  features: [
    {
      id: 'us1',
      geometry: { coordinates: [105.85, 21.03, 10] },
      properties: {
        title: 'M 4.8 - near Hanoi',
        time: Date.parse('2026-11-06T09:00:00Z'),
        updated: Date.parse('2026-11-06T09:10:00Z'),
      },
    },
  ],
};

const okUsgs = async (): Promise<unknown> => USGS_FEED;
const failUsgs = async (): Promise<unknown> => {
  throw new Error('connection refused');
};
const okGdacs = async (): Promise<unknown> => GDACS_SAMPLE;

test('GT14 a failed source is shown as failed, never as no alerts; the other source still counts', async () => {
  const snap = await refreshAll({ fetchers: { usgs: failUsgs, gdacs: okGdacs }, now: NOW, previous: null });
  const usgs = snap.sources.find((s) => s.source === 'usgs');
  const gdacs = snap.sources.find((s) => s.source === 'gdacs');
  assert.equal(usgs?.state, 'failed');
  assert.equal(usgs?.lastUpdated, null, 'no good update yet');
  assert.equal(gdacs?.state, 'ok');
  assert.equal(gdacs?.lastUpdated, NOW.toISOString());
  assert.deepEqual(snap.alerts.map((a) => a.id), ['FL1001']);
});

test('GT14 a source that fails now keeps the time of its last good update, so the page can say when it was current', async () => {
  const earlier = await refreshAll({
    fetchers: { usgs: okUsgs, gdacs: okGdacs },
    now: new Date('2026-11-06T09:00:00.000Z'),
    previous: null,
  });
  const later = await refreshAll({ fetchers: { usgs: failUsgs, gdacs: okGdacs }, now: NOW, previous: earlier });
  const usgs = later.sources.find((s) => s.source === 'usgs');
  assert.equal(usgs?.state, 'failed');
  assert.equal(usgs?.lastUpdated, '2026-11-06T09:00:00.000Z');
});

test('GT14 a body of the wrong shape is a failed read, not an empty feed', async () => {
  const snap = await refreshAll({
    fetchers: { usgs: async () => '<html>blocked</html>', gdacs: async () => '<html><body>error</body></html>' },
    now: NOW,
    previous: null,
  });
  assert.deepEqual(snap.sources.map((s) => s.state), ['failed', 'failed']);
  assert.equal(snap.alerts.length, 0);
  assert.throws(() => usgsBody({ features: 'x' }), /not the expected GeoJSON/);
  assert.throws(() => gdacsBody('<html></html>'), /not the expected RSS/);
});

test('GT13 the snapshot holds only public alerts still in force: restricted and cancelled GDACS items are left out', async () => {
  const snap = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: okGdacs }, now: NOW, previous: null });
  assert.deepEqual(snap.alerts.map((a) => `${a.source}:${a.id}`).sort(), ['gdacs:FL1001', 'usgs:us1']);
});

test('GT16 the same quake from two sources is one event, pushed once; a second run with the same feeds pushes nothing', async () => {
  const first = await refreshAll({
    fetchers: { usgs: okUsgs, gdacs: async () => QUAKE_HANOI_GDACS },
    now: NOW,
    previous: null,
  });
  const pushed = new Set(eventsToPush(first, new Set()).map((e) => e.key));
  assert.equal(pushed.size, 1, 'the quake from both sources is one event');
  const second = await refreshAll({
    fetchers: { usgs: okUsgs, gdacs: async () => QUAKE_HANOI_GDACS },
    now: new Date('2026-11-06T10:05:00.000Z'),
    previous: first,
  });
  assert.equal(eventsToPush(second, pushed).length, 0);
});

test('GT14 a snapshot file is read only when its shape is right; a round trip keeps it exactly', async () => {
  const snap: Snapshot = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: okGdacs }, now: NOW, previous: null });
  assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(snap))), snap);
  assert.throws(() => parseSnapshot({ generatedAt: 'x', sources: [], alerts: [] }), /generatedAt/);
  assert.throws(
    () => parseSnapshot({ generatedAt: NOW.toISOString(), sources: [{ source: 'usgs', state: 'safe', lastUpdated: null }], alerts: [] }),
    /unknown state/,
  );
  assert.throws(() => parseSnapshot({ generatedAt: NOW.toISOString(), sources: [], alerts: [{ source: 'usgs' }] }), /missing a field/);
});
