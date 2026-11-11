// Offline pack checks in Chromium (GS-021: GT06, GT07, GT08). The offline visit runs after the test server has been
// stopped, so the requests really fail. Each test has its own browser context, so its cache starts empty.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startServer } from './server.mjs';
import { OFFLINE } from '../../lib/offline/text.ts';
import { PRINT } from '../../lib/print/text.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

async function session() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(msg.text());
  });
  let running = true;
  const stopServer = () => {
    if (!running) return;
    running = false;
    server.closeAllConnections();
    server.close();
  };
  return {
    base,
    context,
    page,
    problems,
    stopServer,
    async close() {
      stopServer();
      await context.close();
    },
  };
}

const button = (page, label) => page.getByRole('button', { name: label });
const status = (page) => page.locator('[data-offline]').textContent();
const waitForStatus = (page, text) =>
  page.waitForFunction((t) => document.querySelector('[data-offline]')?.textContent === t, text);

async function packNames(page) {
  return page.evaluate(async () => (await caches.keys()).filter((name) => name.startsWith('groundstead-pack-')));
}

async function downloadEn(s) {
  await s.page.goto(`${s.base}/en/emergency/`, { waitUntil: 'load' });
  await button(s.page, OFFLINE.en.download).click();
  await s.page.waitForSelector('[data-offline="ready"]', { timeout: 20000 });
}

test('GT06 with the server stopped, a verified copy still opens the emergency index and a flood card', async () => {
  const s = await session();
  try {
    await s.page.goto(`${s.base}/en/emergency/flood-safety/`, { waitUntil: 'load' });
    const heading = await s.page.textContent('h1');
    await downloadEn(s);
    // The worker controls a page from its next load; reload so this page is one of them.
    await s.page.reload({ waitUntil: 'load' });
    await s.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await s.page.waitForSelector('[data-offline="ready"]');
    s.stopServer();
    await s.page.goto(`${s.base}/en/emergency/flood-safety/`, { waitUntil: 'load' });
    assert.equal(await s.page.textContent('h1'), heading);
    await s.page.goto(`${s.base}/en/emergency/`, { waitUntil: 'load' });
    await s.page.waitForSelector('[data-offline="ready"]');
    assert.deepEqual(s.problems, []);
  } finally {
    await s.close();
  }
});

test('GT07 a page whose bytes differ from the manifest is refused: no pack is stored and the status says so', async () => {
  const s = await session();
  try {
    await s.context.route('**/en/emergency/flood-safety/', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><h1>changed</h1>' }),
    );
    await s.page.goto(`${s.base}/en/emergency/`, { waitUntil: 'load' });
    await button(s.page, OFFLINE.en.download).click();
    await waitForStatus(s.page, OFFLINE.en.statusFailed);
    assert.deepEqual(await packNames(s.page), []);
  } finally {
    await s.close();
  }
});

test('GT07 a missing file or a missing manifest leaves no pack behind', async () => {
  for (const pattern of ['**/en/help/us/', '**/offline/en.json']) {
    const s = await session();
    try {
      await s.context.route(pattern, (route) => route.fulfill({ status: 404, body: 'not found' }));
      await s.page.goto(`${s.base}/en/emergency/`, { waitUntil: 'load' });
      await button(s.page, OFFLINE.en.download).click();
      await waitForStatus(s.page, OFFLINE.en.statusFailed);
      assert.deepEqual(await packNames(s.page), [], pattern);
    } finally {
      await s.close();
    }
  }
});

test('GT07 a manifest without a valid signature is refused, even when every file matches', async () => {
  const changes = [
    (manifest) => {
      manifest.signature = Buffer.alloc(64).toString('base64');
    },
    (manifest) => {
      manifest.signature = null;
    },
  ];
  for (const change of changes) {
    const s = await session();
    try {
      await s.context.route('**/offline/en.json', async (route) => {
        const response = await route.fetch();
        const manifest = await response.json();
        change(manifest);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
      });
      await s.page.goto(`${s.base}/en/emergency/`, { waitUntil: 'load' });
      await button(s.page, OFFLINE.en.download).click();
      await waitForStatus(s.page, OFFLINE.en.statusUnsigned);
      assert.deepEqual(await packNames(s.page), []);
    } finally {
      await s.close();
    }
  }
});

test('GT08 the printable copy opens offline, hides its controls on paper, and states the storage answer the browser gives', async () => {
  const s = await session();
  try {
    await downloadEn(s);
    const persisted = await s.page.evaluate(() => navigator.storage.persisted());
    const persist = s.page.locator('[data-persist]');
    assert.equal(await persist.getAttribute('data-persist'), persisted ? 'granted' : 'notGranted');
    assert.equal(await persist.textContent(), persisted ? OFFLINE.en.storageGranted : OFFLINE.en.storageNotGranted);
    await s.page.reload({ waitUntil: 'load' });
    await s.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await s.page.waitForSelector('[data-offline="ready"]');
    s.stopServer();
    await s.page.goto(`${s.base}/en/emergency/print/`, { waitUntil: 'load' });
    assert.equal(await s.page.textContent('h1'), PRINT.en.title);
    assert.equal(await button(s.page, PRINT.en.button).isVisible(), true);
    await s.page.emulateMedia({ media: 'print' });
    assert.equal(await button(s.page, PRINT.en.button).isVisible(), false, 'the print button is hidden on paper');
    assert.deepEqual(s.problems, []);
  } finally {
    await s.close();
  }
});

test('GT08 the emergency page shows the pack version and date, and the check button finds a changed stored file', async () => {
  const s = await session();
  try {
    await downloadEn(s);
    assert.match(await status(s.page), /version [0-9a-f]{12}, updated \d{4}-\d{2}-\d{2}\./);
    assert.equal(await button(s.page, OFFLINE.en.check).isEnabled(), true);
    await s.page.evaluate(async (path) => {
      const name = (await caches.keys()).find((n) => n.startsWith('groundstead-pack-en-'));
      await (await caches.open(name)).put(new URL(path, location.origin).href, new Response('damaged'));
    }, '/en/emergency/flood-safety/');
    await button(s.page, OFFLINE.en.check).click();
    await s.page.waitForSelector('[data-offline="notReady"]');
    assert.equal(await status(s.page), OFFLINE.en.statusNotReady);
    assert.deepEqual(await packNames(s.page), []);
  } finally {
    await s.close();
  }
});

test('G-18 a stored file that no longer matches its SHA-256 is not served when the server is down, the others still are', async () => {
  const s = await session();
  try {
    await downloadEn(s);
    await s.page.reload({ waitUntil: 'load' });
    await s.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await s.page.waitForSelector('[data-offline="ready"]');
    // One character changed, same length: only the SHA-256 check can tell the copy has changed.
    const edited = await s.page.evaluate(async (path) => {
      const name = (await caches.keys()).find((n) => n.startsWith('groundstead-pack-en-'));
      const cache = await caches.open(name);
      const url = new URL(path, location.origin).href;
      const text = await (await cache.match(url)).text();
      const changed = text.replace('<h1', '<H1');
      if (changed === text) throw new Error('the test page has no <h1 to change');
      await cache.put(url, new Response(changed, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
      return changed;
    }, '/en/emergency/flood-safety/');
    s.stopServer();
    const served = await s.page.evaluate(async () => {
      try {
        return { text: await (await fetch('/en/emergency/flood-safety/')).text() };
      } catch (error) {
        return { error: String(error) };
      }
    });
    assert.notEqual(served.text, edited, 'the changed copy is not served');
    const intact = await s.page.evaluate(async () => (await fetch('/en/emergency/heat-safety/')).ok);
    assert.equal(intact, true, 'a copy that still matches is served');
  } finally {
    await s.close();
  }
});

test('G-18 a failed write of a copy keeps the last good copy on this device', async () => {
  const s = await session();
  try {
    await downloadEn(s);
    await s.page.reload({ waitUntil: 'load' });
    await s.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await s.page.waitForSelector('[data-offline="ready"]');
    const before = await packNames(s.page);
    await s.page.evaluate(() => {
      Cache.prototype.put = () => Promise.reject(new Error('storage full'));
    });
    const manifest = s.page.waitForResponse((r) => r.url().endsWith('/offline/en.json'));
    await button(s.page, OFFLINE.en.download).click();
    await manifest;
    await s.page.waitForFunction(() => document.querySelector('[data-offline]')?.getAttribute('data-offline') !== 'busy');
    assert.equal(await s.page.locator('[data-offline]').getAttribute('data-offline'), 'ready', 'the last good copy is still in place');
    assert.equal(await status(s.page), OFFLINE.en.statusFailed);
    assert.deepEqual(await packNames(s.page), before);
    s.stopServer();
    const served = await s.page.evaluate(async () => (await fetch('/en/emergency/flood-safety/')).ok);
    assert.equal(served, true, 'the kept copy is still served offline');
  } finally {
    await s.close();
  }
});
