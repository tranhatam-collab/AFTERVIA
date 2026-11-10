import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

// Loads sw.js with fake globals and returns the 'fetch' listener.
function load({ networkResponse, networkError, stored }) {
  const listeners = {};
  const self = {
    location: { origin: 'https://example.test' },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting() {},
    clients: { claim() {} },
  };
  const cache = { match: async () => stored ?? undefined };
  const caches = { keys: async () => (stored ? ['groundstead-pack-en'] : []), open: async () => cache };
  const fetch = async () => {
    if (networkError) throw networkError;
    return networkResponse;
  };
  vm.runInNewContext(source, { self, caches, fetch, setTimeout, clearTimeout, URL });
  return listeners.fetch;
}

async function ask(env) {
  const listener = load(env);
  let answered;
  listener({ request: { method: 'GET', url: 'https://example.test/en/' }, respondWith: (p) => { answered = p; } });
  return answered;
}

const STORED = { ok: true, tag: 'stored' };

test('SW-01 a 500 from the network returns the stored copy', async () => {
  assert.equal(await ask({ networkResponse: { ok: false, status: 500, tag: 'net' }, stored: STORED }), STORED);
});

test('SW-01 a 200 from the network is returned instead of the stored copy', async () => {
  const net = { ok: true, status: 200, tag: 'net' };
  assert.equal(await ask({ networkResponse: net, stored: STORED }), net);
});

test('SW-01 a network failure still returns the stored copy', async () => {
  assert.equal(await ask({ networkError: new Error('offline'), stored: STORED }), STORED);
});

test('SW-01 with no stored copy a 500 passes through', async () => {
  const net = { ok: false, status: 500, tag: 'net' };
  assert.equal(await ask({ networkResponse: net, stored: null }), net);
});
