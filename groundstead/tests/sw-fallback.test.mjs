import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import vm from 'node:vm';
import { buildManifest, signManifest } from '../lib/offline/pack.ts';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://example.test';
const PAGE = `${ORIGIN}/en/`;
const MANIFEST = `${ORIGIN}/offline/en.json`;
const PLACEHOLDER = "const TRUSTED_KEY = '';";
const encode = (text) => new TextEncoder().encode(text);

// A new Ed25519 pair for one test, created in memory. Nothing is stored.
function testKey() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    pem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKey: Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url').toString('base64'),
  };
}

const TRUSTED = testKey();
const OTHER = testKey();

// A pack of one page ('page a'), signed with `key`. The manifest is what the page stores at /offline/en.json.
async function signedPack(key) {
  const manifest = await buildManifest('en', [{ path: '/en/', bytes: encode('page a') }], '2026-11-11', '2026-11-11T08:00:00Z');
  return JSON.stringify(signManifest(manifest, key.pem));
}

// The cache a device holds: the manifest and the stored copy of the page, as the text the copy holds.
function packCache(manifestJson, pageText = 'page a') {
  return new Map([
    [MANIFEST, manifestJson],
    [PAGE, pageText],
  ]);
}

// Loads sw.js with fake globals and returns the 'fetch' listener. `trusted` is the key the worker is built with ('' for
// an unsigned build). `cache` maps URLs to the text the fake cache holds; `networkResponse` or `networkError` is what the
// network does.
function load({ trusted = '', cache = null, networkResponse, networkError }) {
  const src = trusted ? source.replace(PLACEHOLDER, `const TRUSTED_KEY = '${trusted}';`) : source;
  const listeners = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
    skipWaiting() {},
    clients: { claim() {} },
  };
  const entries = cache ?? new Map();
  const store = {
    match: async (request) => {
      const url = typeof request === 'string' ? request : request.url;
      const text = entries.get(url);
      return text === undefined ? undefined : new Response(text, { headers: { 'content-type': 'text/plain' } });
    },
  };
  const caches = { keys: async () => (cache ? ['groundstead-pack-en-test'] : []), open: async () => store };
  const fetch = async () => {
    if (networkError) throw networkError;
    return networkResponse;
  };
  vm.runInNewContext(src, {
    self,
    caches,
    fetch,
    setTimeout,
    clearTimeout,
    URL,
    Response,
    TextEncoder,
    atob,
    crypto: globalThis.crypto,
  });
  return listeners.fetch;
}

async function ask(env, url = PAGE) {
  const listener = load(env);
  let answered;
  listener({ request: { method: 'GET', url }, respondWith: (p) => { answered = p; } });
  return answered;
}

// The text of the copy the worker served, or null when it served no copy (a network answer, or a failure).
async function servedText(promise) {
  try {
    const response = await promise;
    return typeof response?.text === 'function' ? await response.text() : null;
  } catch {
    return null;
  }
}

test('SW-01 a 500 from the network returns the stored copy', async () => {
  const manifest = await signedPack(TRUSTED);
  const text = await servedText(
    ask({ trusted: TRUSTED.publicKey, cache: packCache(manifest), networkResponse: { ok: false, status: 500 } }),
  );
  assert.equal(text, 'page a');
});

test('SW-01 a 200 from the network is returned instead of the stored copy', async () => {
  const manifest = await signedPack(TRUSTED);
  const net = { ok: true, status: 200, tag: 'net' };
  assert.equal(await ask({ trusted: TRUSTED.publicKey, cache: packCache(manifest), networkResponse: net }), net);
});

test('SW-01 a network failure still returns the stored copy', async () => {
  const manifest = await signedPack(TRUSTED);
  const text = await servedText(
    ask({ trusted: TRUSTED.publicKey, cache: packCache(manifest), networkError: new Error('offline') }),
  );
  assert.equal(text, 'page a');
});

test('SW-01 with no stored copy a 500 passes through', async () => {
  const net = { ok: false, status: 500, tag: 'net' };
  assert.equal(await ask({ trusted: TRUSTED.publicKey, cache: null, networkResponse: net }), net);
});

test('SW-02 a stored page whose bytes no longer match the signed manifest is not served (G-18)', async () => {
  const manifest = await signedPack(TRUSTED);
  // Same length as 'page a', so only the SHA-256 check can refuse it.
  const text = await servedText(
    ask({
      trusted: TRUSTED.publicKey,
      cache: packCache(manifest, 'page b'),
      networkError: new Error('offline'),
    }),
  );
  assert.equal(text, null, 'a changed copy is not served from the device');
});

test('SW-03 a pack whose manifest is not signed by the key the worker was built with serves nothing (G-18)', async () => {
  const manifest = await signedPack(OTHER);
  const text = await servedText(
    ask({ trusted: TRUSTED.publicKey, cache: packCache(manifest), networkError: new Error('offline') }),
  );
  assert.equal(text, null, 'a pack signed by another key is not served');
});

test('SW-04 a stored file that the signed manifest does not list is not served (G-18)', async () => {
  const manifest = await signedPack(TRUSTED);
  const cache = packCache(manifest);
  cache.set(`${ORIGIN}/en/extra/`, 'extra');
  const text = await servedText(
    ask({ trusted: TRUSTED.publicKey, cache, networkError: new Error('offline') }, `${ORIGIN}/en/extra/`),
  );
  assert.equal(text, null, 'an unlisted file is not served');
});

test('SW-05 a worker built without a trusted key serves no stored copy (G-18)', async () => {
  const manifest = await signedPack(TRUSTED);
  const text = await servedText(ask({ trusted: '', cache: packCache(manifest), networkError: new Error('offline') }));
  assert.equal(text, null, 'an unsigned build serves nothing from the device');
});

test('SW-06 a stored page that matches its signed manifest is served offline (G-18)', async () => {
  const manifest = await signedPack(TRUSTED);
  const text = await servedText(
    ask({ trusted: TRUSTED.publicKey, cache: packCache(manifest), networkError: new Error('offline') }),
  );
  assert.equal(text, 'page a');
});
