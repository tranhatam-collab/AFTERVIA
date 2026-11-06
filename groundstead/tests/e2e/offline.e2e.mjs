// Offline pack checks in Chromium (GS-021: GT06, GT07, GT08). The offline visit runs after the test server has been
// stopped, so the requests really fail. Each test has its own browser context, so its cache starts empty.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startServer } from './server.mjs';
import { OFFLINE } from '../../lib/offline/text.ts';

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
