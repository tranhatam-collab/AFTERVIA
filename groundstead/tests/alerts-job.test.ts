import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventsToPush, gdacsBody, refreshAll, usgsBody } from '../lib/alerts/refresh.ts';
import { CARRY_FORWARD_HOURS, parseSnapshot, type Snapshot } from '../lib/alerts/snapshot.ts';
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

test('GT14 a source that fails now keeps its alerts from the last good run until they expire (GSL-F01)', async () => {
  const earlier = await refreshAll({
    fetchers: { usgs: okUsgs, gdacs: okGdacs },
    now: new Date('2026-11-06T09:00:00.000Z'),
    previous: null,
  });
  const later = await refreshAll({ fetchers: { usgs: failUsgs, gdacs: okGdacs }, now: NOW, previous: earlier });
  assert.equal(later.sources.find((s) => s.source === 'usgs')?.state, 'failed');
  assert.deepEqual(later.alerts.map((a) => `${a.source}:${a.id}`).sort(), ['gdacs:FL1001', 'usgs:us1'], 'the quake is still shown');
  const carried = later.alerts.find((a) => a.source === 'usgs');
  assert.equal(carried?.received, '2026-11-06T09:00:00.000Z', 'a carried alert keeps the time it was last received');
  // Still failing a day later: the quake was last received more than CARRY_FORWARD_HOURS ago, so it has expired.
  const dayLater = new Date(Date.parse('2026-11-06T09:00:00.000Z') + (CARRY_FORWARD_HOURS + 1) * 3_600_000);
  const expired = await refreshAll({ fetchers: { usgs: failUsgs, gdacs: okGdacs }, now: dayLater, previous: later });
  assert.deepEqual(expired.alerts.map((a) => `${a.source}:${a.id}`), ['gdacs:FL1001'], 'the expired quake is removed');
});

test('GT14 a carried alert is only taken from the source that failed; a working source replaces its own list (GSL-F01)', async () => {
  const earlier = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: okGdacs }, now: NOW, previous: null });
  const later = await refreshAll({
    fetchers: { usgs: okUsgs, gdacs: async () => QUAKE_HANOI_GDACS },
    now: new Date('2026-11-06T10:05:00.000Z'),
    previous: earlier,
  });
  assert.deepEqual(later.alerts.map((a) => `${a.source}:${a.id}`).sort(), ['gdacs:EQ9', 'usgs:us1'], 'FL1001 is gone from a working GDACS');
});

test('GT16 a quake that USGS revises keeps its event key, so a caller that stores event keys does not push it again (GSL-F02)', async () => {
  const first = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: async () => QUAKE_HANOI_GDACS }, now: NOW, previous: null });
  const pushed = new Set(eventsToPush(first, new Set()).map((e) => e.key));
  const revised = structuredClone(USGS_FEED);
  const props = revised.features[0]?.properties;
  if (props) props.updated = Date.parse('2026-11-06T09:55:00Z');
  const second = await refreshAll({
    fetchers: { usgs: async () => revised, gdacs: async () => QUAKE_HANOI_GDACS },
    now: new Date('2026-11-06T10:05:00.000Z'),
    previous: first,
  });
  assert.equal(eventsToPush(second, pushed).length, 0);
});

test('G-08 the job keeps a GDACS record with no access level, with its source state, and the snapshot survives a round trip', async () => {
  const noAccess = GDACS_SAMPLE.replace('<gdacs:accesslevel>Public</gdacs:accesslevel>', '');
  const snap = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: async () => noAccess }, now: NOW, previous: null });
  assert.equal(snap.sources.find((s) => s.source === 'gdacs')?.state, 'ok');
  assert.ok(
    snap.alerts.some((a) => a.source === 'gdacs' && a.id === 'FL1001' && a.scope === 'Unstated'),
    'the record without an access level is in the snapshot',
  );
  assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(snap))), snap);
});

// G-13: one malformed record is skipped and counted; the rest of the feed is kept.
const goodQuake = (id: string) => ({
  id,
  properties: {
    title: `M 4.0 - ${id}`,
    time: Date.parse('2026-11-06T09:00:00Z'),
    updated: Date.parse('2026-11-06T09:10:00Z'),
  },
});
const gdacsItem = (type: string, id: string, name: string): string =>
  [
    '<item>',
    '<gdacs:datemodified>Fri, 06 Nov 2026 08:00:00 GMT</gdacs:datemodified>',
    '<gdacs:fromdate>Fri, 06 Nov 2026 06:00:00 GMT</gdacs:fromdate>',
    '<gdacs:iscurrent>true</gdacs:iscurrent>',
    `<gdacs:eventtype>${type}</gdacs:eventtype>`,
    `<gdacs:eventid>${id}</gdacs:eventid>`,
    '<gdacs:alertlevel>Orange</gdacs:alertlevel>',
    `<gdacs:eventname>${name}</gdacs:eventname>`,
    '<gdacs:accesslevel>Public</gdacs:accesslevel>',
    '</item>',
  ].join('\n');
const rssOf = (...items: string[]): string =>
  `<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0" xmlns:gdacs="http://www.gdacs.org"><channel>\n${items.join('\n')}\n</channel></rss>`;
const downGdacs = async (): Promise<unknown> => {
  throw new Error('down');
};

test('G-13 one malformed USGS record is skipped and counted; the two good records are kept', async () => {
  const feed = {
    features: [
      goodQuake('g1'),
      { id: 'bad', properties: { title: 'M 9.0 - time out of range', time: 1e20, updated: Date.parse('2026-11-06T09:10:00Z') } },
      goodQuake('g2'),
    ],
  };
  const snap = await refreshAll({ fetchers: { usgs: async () => feed, gdacs: downGdacs }, now: NOW, previous: null });
  const usgs = snap.sources.find((s) => s.source === 'usgs');
  assert.equal(usgs?.state, 'ok', 'one bad record does not fail the feed');
  assert.equal(usgs?.skipped, 1, 'the skipped record is counted on the source');
  assert.deepEqual(snap.alerts.map((a) => a.id).sort(), ['g1', 'g2']);
});

test('G-13 one malformed GDACS record (an invalid character reference) is skipped and counted; the two good records are kept', async () => {
  const feed = rssOf(
    gdacsItem('FL', '2001', 'First'),
    gdacsItem('EQ', '2002', 'Broken &#x110000; name'),
    gdacsItem('WF', '2003', 'Third'),
  );
  const snap = await refreshAll({ fetchers: { usgs: downGdacs, gdacs: async () => feed }, now: NOW, previous: null });
  const gdacs = snap.sources.find((s) => s.source === 'gdacs');
  assert.equal(gdacs?.state, 'ok', 'one bad record does not fail the feed');
  assert.equal(gdacs?.skipped, 1, 'the skipped record is counted on the source');
  assert.deepEqual(snap.alerts.map((a) => `${a.source}:${a.id}`).sort(), ['gdacs:FL2001', 'gdacs:WF2003']);
});

test('G-13 a feed whose every record is malformed is failed, not ok with no alerts', async () => {
  const usgsAllBad = { features: [{ id: 'x', properties: { title: 'no times' } }] };
  const gdacsAllBad = rssOf('<item><gdacs:eventtype>TC</gdacs:eventtype></item>');
  const snap = await refreshAll({
    fetchers: { usgs: async () => usgsAllBad, gdacs: async () => gdacsAllBad },
    now: NOW,
    previous: null,
  });
  assert.deepEqual(snap.sources.map((s) => s.state), ['failed', 'failed'], 'nothing could be read, so nothing is claimed');
  assert.equal(snap.alerts.length, 0);
});

// G-14: an RSS document with no item, or one cut short, is a failed read. It is never "no alerts".
const EMPTY_RSS = '<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0"><channel><title>GDACS</title></channel></rss>';
const CUT_SHORT_RSS =
  '<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0" xmlns:gdacs="http://www.gdacs.org"><channel>\n' +
  '<item><gdacs:eventtype>FL</gdacs:eventtype><gdacs:eventid>1</gdacs:eventid>';

test('G-14 an empty RSS document is failed, not ok with no alerts', async () => {
  const snap = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: async () => EMPTY_RSS }, now: NOW, previous: null });
  const gdacs = snap.sources.find((s) => s.source === 'gdacs');
  assert.equal(gdacs?.state, 'failed', 'an empty feed is not read as "no alerts"');
  assert.equal(gdacs?.lastUpdated, null, 'no good update was seen');
  assert.deepEqual(snap.alerts.map((a) => `${a.source}:${a.id}`), ['usgs:us1']);
});

test('G-14 an RSS document cut short is failed, not ok with no alerts', async () => {
  const snap = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: async () => CUT_SHORT_RSS }, now: NOW, previous: null });
  assert.equal(snap.sources.find((s) => s.source === 'gdacs')?.state, 'failed');
});

test('G-14 an empty RSS after a good run keeps the time of the good run and the alerts still in force', async () => {
  const earlier = await refreshAll({ fetchers: { usgs: okUsgs, gdacs: okGdacs }, now: NOW, previous: null });
  const later = await refreshAll({
    fetchers: { usgs: okUsgs, gdacs: async () => EMPTY_RSS },
    now: new Date('2026-11-06T10:05:00.000Z'),
    previous: earlier,
  });
  const gdacs = later.sources.find((s) => s.source === 'gdacs');
  assert.equal(gdacs?.state, 'failed');
  assert.equal(gdacs?.lastUpdated, NOW.toISOString(), 'the last good time is not moved forward');
  assert.ok(later.alerts.some((a) => a.source === 'gdacs' && a.id === 'FL1001'), 'an alert still in force is not erased');
});
