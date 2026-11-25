import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedUrlProblem, FeedRefused, MAX_FEED_BYTES, readFeed } from '../lib/alerts/fetch.ts';
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

// G-16: a redirect is followed one hop at a time, and each hop is checked with the same https rule before it is requested.
// The table answers each address. A redirect comes back as it is when the request asks for redirect "manual", and is
// followed to its Location otherwise, as fetch does by default. Every address asked for is recorded.
type Route = { status: number; location: string } | { body: string };
function routedFetch(table: Record<string, Route>): { fetch: (url: string, init: RequestInit) => Promise<Response>; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetch: async (url: string, init: RequestInit): Promise<Response> => {
      let current = url;
      for (;;) {
        calls.push(current);
        if (calls.length > 40) return new Response('a loop', { status: 500 }); // a loop that is never followed cannot hang the test
        const route = table[current];
        if (route === undefined) return new Response('no such address', { status: 404 });
        if (!('body' in route)) {
          if (init.redirect === 'manual') return new Response(null, { status: route.status, headers: { location: route.location } });
          current = route.location;
          continue;
        }
        return new Response(route.body, { status: 200 });
      }
    },
  };
}

test('G-16 a redirect from https to an http address is refused with a reason, and the http address is never requested', async () => {
  const routes = routedFetch({
    'https://feed.test/summary.geojson': { status: 302, location: 'http://feed.test/moved.geojson' },
    'http://feed.test/moved.geojson': { body: GEO },
  });
  await assert.rejects(
    readFeed({ url: 'https://feed.test/summary.geojson', format: 'geojson', fetch: routes.fetch }),
    (error: unknown) => error instanceof FeedRefused && /https/.test(error.reason),
    'a redirect to http must be refused with a reason that names https',
  );
  assert.deepEqual(routes.calls, ['https://feed.test/summary.geojson'], 'the http address is never requested');
});

for (const location of ['ftp://feed.test/summary.geojson', 'file:///etc/passwd']) {
  const scheme = location.slice(0, location.indexOf(':') + 1);
  test(`G-16 a redirect to the ${scheme} scheme is refused with a reason, and that address is never requested`, async () => {
    const routes = routedFetch({
      'https://feed.test/summary.geojson': { status: 307, location },
      [location]: { body: GEO },
    });
    await assert.rejects(
      readFeed({ url: 'https://feed.test/summary.geojson', format: 'geojson', fetch: routes.fetch }),
      (error: unknown) => error instanceof FeedRefused && /https/.test(error.reason),
      `a redirect to ${scheme} must be refused with a reason that names https`,
    );
    assert.deepEqual(routes.calls, ['https://feed.test/summary.geojson'], 'the redirect target is never requested');
  });
}

test('G-16 a redirect from https to https is followed, and the body at its address is read', async () => {
  const routes = routedFetch({
    'https://feed.test/summary.geojson': { status: 301, location: 'https://feed.test/moved/summary.geojson' },
    'https://feed.test/moved/summary.geojson': { body: GEO },
  });
  const body = await readFeed({ url: 'https://feed.test/summary.geojson', format: 'geojson', fetch: routes.fetch });
  assert.deepEqual(routes.calls, ['https://feed.test/summary.geojson', 'https://feed.test/moved/summary.geojson']);
  assert.deepEqual(body, { type: 'FeatureCollection', features: [] });
});

test('G-16 a redirect loop is refused with the reason "too many redirects" once the hop limit is passed', async () => {
  const routes = routedFetch({ 'https://feed.test/loop.geojson': { status: 302, location: 'https://feed.test/loop.geojson' } });
  await assert.rejects(
    readFeed({ url: 'https://feed.test/loop.geojson', format: 'geojson', fetch: routes.fetch }),
    (error: unknown) => error instanceof FeedRefused && error.reason === 'too many redirects',
  );
  assert.ok(routes.calls.length <= 21, `the hop limit is 20 redirects, got ${routes.calls.length} requests`);
});

test('G-16 every configured feed address is https, and an address that is not a URL is refused with a reason', () => {
  for (const [id, feed] of Object.entries(FEEDS)) assert.equal(feedUrlProblem(feed.url), null, `${id} must be an https address`);
  assert.match(feedUrlProblem('not a url') ?? '', /valid URL/);
});

// G-17: a feed body over the size limit is refused. The source is marked failed with the reason "too large". The body is
// counted while it streams, so reading stops past the limit and is never held in memory beyond it.
const KIB = 1024;
const CHUNK = 64 * KIB;
const DEFAULT_LIMIT_BYTES = 5 * KIB * KIB; // the limit a feed read has when none is given
assert.equal(MAX_FEED_BYTES, DEFAULT_LIMIT_BYTES, 'the configured default limit is 5 MiB');
const reasonIs = (reason: string) => (error: unknown): boolean => error instanceof FeedRefused && error.reason === reason;

// A body that streams CHUNK-sized pieces until `total` bytes were produced. It records how much was produced and whether
// the reader cancelled it.
function streamingBody(total: number): { stream: ReadableStream<Uint8Array>; produced: () => number; cancelled: () => boolean } {
  let produced = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (produced >= total) {
        controller.close();
        return;
      }
      const size = Math.min(CHUNK, total - produced);
      produced += size;
      controller.enqueue(new Uint8Array(size).fill(0x61));
    },
    cancel() {
      cancelled = true;
    },
  }, { highWaterMark: 0 }); // nothing is produced until the reader asks, so the count is what was read
  return { stream, produced: () => produced, cancelled: () => cancelled };
}

test('G-17 a body over the size limit is refused with the reason "too large"', async () => {
  const body = streamingBody(10 * CHUNK);
  await assert.rejects(
    readFeed({ url: 'https://feed.test/x.xml', format: 'rss', fetch: async () => new Response(body.stream), maxBytes: 256 * KIB }),
    reasonIs('too large'),
  );
});

test('G-17 the body is counted while it streams: reading stops past the limit and the stream is cancelled', async () => {
  const body = streamingBody(160 * CHUNK); // 10 MiB, far past the limit
  await assert.rejects(
    readFeed({ url: 'https://feed.test/x.xml', format: 'rss', fetch: async () => new Response(body.stream), maxBytes: 256 * KIB }),
    reasonIs('too large'),
  );
  assert.equal(body.cancelled(), true, 'the stream is cancelled once the limit is passed');
  assert.ok(body.produced() <= 256 * KIB + 4 * CHUNK, `only a few chunks past the limit were produced, got ${body.produced()} bytes`);
});

test('G-17 a body exactly at the limit is read; one byte more is refused', async () => {
  const atLimit = streamingBody(256 * KIB);
  const text = await readFeed({ url: 'https://feed.test/x.xml', format: 'rss', fetch: async () => new Response(atLimit.stream), maxBytes: 256 * KIB });
  assert.equal(typeof text === 'string' && text.length, 256 * KIB, 'a body at the limit is kept whole');
  const overByOne = streamingBody(256 * KIB + 1);
  await assert.rejects(
    readFeed({ url: 'https://feed.test/x.xml', format: 'rss', fetch: async () => new Response(overByOne.stream), maxBytes: 256 * KIB }),
    reasonIs('too large'),
  );
});

test('G-17 a declared length over the limit is refused before any byte is read', async () => {
  const body = streamingBody(10 * 1024 * KIB);
  const response = new Response(body.stream, { headers: { 'content-length': String(10 * 1024 * KIB) } });
  await assert.rejects(
    readFeed({ url: 'https://feed.test/x.xml', format: 'rss', fetch: async () => response, maxBytes: 256 * KIB }),
    reasonIs('too large'),
  );
  assert.equal(body.produced(), 0, 'nothing was read from the body');
});

test('G-17 a snapshot marks a source whose body is over the default limit failed, with the reason "too large"', async () => {
  const oversize = JSON.stringify({ type: 'FeatureCollection', features: [], pad: 'x'.repeat(DEFAULT_LIMIT_BYTES) });
  const snap = await refreshAll({
    fetchers: {
      usgs: () => readFeed({ url: 'https://feed.test/summary.geojson', format: 'geojson', fetch: async () => new Response(oversize) }),
      gdacs: async () => GDACS_SAMPLE,
    },
    now: NOW,
    previous: null,
  });
  const usgs = snap.sources.find((s) => s.source === 'usgs');
  assert.equal(usgs?.state, 'failed', 'an oversize body is a failed read');
  assert.equal(usgs?.reason, 'too large');
});
