import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedUrlProblem, FeedRefused, readFeed } from '../lib/alerts/fetch.ts';
import { FEEDS } from '../lib/alerts/feeds.ts';
import { refreshAll } from '../lib/alerts/refresh.ts';
import { GDACS_SAMPLE } from './alerts-fixtures.ts';

const NOW = new Date('2026-11-06T10:00:00.000Z');

// A fetch that records every address it is asked for and answers with a valid GeoJSON body.
const GEO = '{"type":"FeatureCollection","features":[]}';
function spyFetch(): { fetch: (url: string) => Promise<Response>; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetch: async (url: string): Promise<Response> => {
      calls.push(url);
      return new Response(GEO, { status: 200 });
    },
  };
}

// G-16: only https feed addresses are read. Every other scheme is refused with a reason before any request is made.
const REFUSED_ADDRESSES = [
  'http://feed.test/summary.geojson',
  'file:///etc/passwd',
  'data:application/json,{"type":"FeatureCollection","features":[]}',
  'ftp://feed.test/summary.geojson',
  'ws://feed.test/summary.geojson',
  'javascript:alert(1)',
];

for (const url of REFUSED_ADDRESSES) {
  const scheme = url.slice(0, url.indexOf(':') + 1);
  test(`G-16 a feed address with the ${scheme} scheme is refused with a reason, and nothing is fetched`, async () => {
    const spy = spyFetch();
    await assert.rejects(
      readFeed({ url, format: 'geojson', fetch: spy.fetch }),
      (error: unknown) => error instanceof FeedRefused && /https/.test(error.reason),
      `${scheme} must be refused with a reason that names https`,
    );
    assert.deepEqual(spy.calls, [], 'the address is refused before any request is sent');
  });
}

test('G-16 an https feed address is read, and its body is parsed', async () => {
  const spy = spyFetch();
  const body = await readFeed({ url: 'https://feed.test/summary.geojson', format: 'geojson', fetch: spy.fetch });
  assert.deepEqual(spy.calls, ['https://feed.test/summary.geojson']);
  assert.deepEqual(body, { type: 'FeatureCollection', features: [] });
});

// G-16: the job marks a refused source failed, and the snapshot says why.
test('G-16 a refused feed marks its source failed, with the reason, in the snapshot', async () => {
  const spy = spyFetch();
  const snap = await refreshAll({
    fetchers: {
      usgs: () => readFeed({ url: 'http://feed.test/summary.geojson', format: 'geojson', fetch: spy.fetch }),
      gdacs: async () => GDACS_SAMPLE,
    },
    now: NOW,
    previous: null,
  });
  const usgs = snap.sources.find((s) => s.source === 'usgs');
  assert.equal(usgs?.state, 'failed', 'a refused address is a failed read, never ok with no alerts');
  assert.match(usgs?.reason ?? '', /https/, 'the snapshot carries the reason');
  assert.deepEqual(spy.calls, [], 'nothing was fetched');
});

test('G-16 every configured feed address is https, and an address that is not a URL is refused with a reason', () => {
  for (const [id, feed] of Object.entries(FEEDS)) assert.equal(feedUrlProblem(feed.url), null, `${id} must be an https address`);
  assert.match(feedUrlProblem('not a url') ?? '', /valid URL/);
});
