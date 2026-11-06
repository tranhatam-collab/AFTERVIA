// Browser checks on the built site (out/). Uses the Chromium already installed on this machine through the
// Playwright library, so no browser is downloaded. Each test title starts with the acceptance id it covers.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANDING, MESSAGES } from '../../lib/i18n/messages.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'out');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

let server;
let browser;
let base;

before(async () => {
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    let file = resolve(OUT, `.${path}`);
    if (!file.startsWith(OUT)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(path) {
  const page = await browser.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(msg.text());
  });
  const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
  return { page, problems, status: response?.status() };
}

test('GT34 a visitor reaches the Vietnamese directory from the home page and sees its contacts', async () => {
  const { page, problems, status } = await open('/vi/');
  try {
    assert.equal(status, 200);
    await page.click('a[href="/vi/help/"]');
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/vi/help/');
    assert.equal(await page.textContent('h1'), MESSAGES.vi.helpTitle);
    await page.click('a[href="/vi/help/vn/"]');
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/vi/help/vn/');
    const text = await page.textContent('main');
    assert.ok(text.includes(MESSAGES.vi.helpFooter), 'the footer is shown');
    assert.ok(await page.locator('a[href^="https://redcross.org.vn"]').count() > 0, 'the Red Cross entry links to its own site');
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('GT31 switching language on the US directory keeps the same page in the other language', async () => {
  const { page, problems } = await open('/en/help/us/');
  try {
    await page.click('header a[hreflang="vi"]');
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/vi/help/us/');
    assert.ok((await page.textContent('h1')).includes('Hoa Kỳ'));
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

for (const path of ['/en/', '/vi/', '/en/help/', '/vi/help/', '/en/help/us/', '/vi/help/vn/']) {
  test(`GT34 ${path} loads with status 200 and no browser errors`, async () => {
    const { page, problems, status } = await open(path);
    try {
      assert.equal(status, 200);
      assert.equal(await page.locator('h1').count(), 1);
      assert.deepEqual(problems, []);
    } finally {
      await page.close();
    }
  });
}

test('GT09 E2E: a visitor reaches a situation in two clicks from the home page and sees its first action at once', async () => {
  const { page, problems, status } = await open('/en/');
  try {
    assert.equal(status, 200);
    await page.click('a[href="/en/emergency/"]');
    await page.waitForLoadState('load');
    await page.click('a[href="/en/emergency/flood-safety/"]');
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/en/emergency/flood-safety/');
    const first = (await page.textContent('.firstaction')) ?? '';
    assert.ok(first.length > 10, 'the first action is shown without any other click');
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('GT11 E2E: the emergency page reports the browser connection and changes when the connection drops', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${base}/en/emergency/`, { waitUntil: 'load' });
    await page.waitForSelector('[data-network="online"]', { timeout: 10000 });
    await context.setOffline(true);
    await page.waitForSelector('[data-network="offline"]', { timeout: 10000 });
    assert.match((await page.textContent('[role="status"]')) ?? '', /no connection/);
  } finally {
    await context.close();
  }
});

test('GS-013 E2E: the English landing shows the preview notice and seven pillars, has no sign-up form, and reaches emergency guidance in one click', async () => {
  const { page, problems, status } = await open('/en/');
  try {
    assert.equal(status, 200);
    const main = (await page.textContent('main')) ?? '';
    assert.ok(main.includes(LANDING.en.statusTitle), 'the preview notice is shown');
    assert.equal(await page.locator('main ul.pillars li').count(), 7, 'all seven pillars are listed');
    assert.equal(await page.locator('main form, main input').count(), 0, 'early sign-up is off: no form on the page');
    await page.click('a[href="/en/emergency/"]');
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/en/emergency/');
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});

test('GT21 E2E: the readiness check scores seven pillars on the device, shows no overall grade, sends nothing, and keeps a label the reader can change', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/i.test(msg.text())) problems.push(msg.text());
  });
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  try {
    const response = await page.goto(`${base}/en/readiness/`, { waitUntil: 'load' });
    assert.equal(response?.status(), 200);
    for (let i = 1; i <= 12; i += 1) {
      const name = `q${String(i).padStart(2, '0')}`;
      await page.locator(`input[name="${name}"]`).nth(1).check();
    }
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-pillar="community"]', { timeout: 10000 });
    assert.equal(await page.locator('[data-pillar]').count(), 7, 'seven pillar scores are shown');
    const main = (await page.textContent('main')) ?? '';
    assert.doesNotMatch(main, /overall|total score/i, 'no single overall grade');
    await page.selectOption('#interest', 'high');
    assert.equal(await page.inputValue('#interest'), 'high');
    await page.click('button:has-text("Save on this device")');
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-pillar="community"]', { timeout: 10000 });
    assert.equal(await page.inputValue('#interest'), 'high', 'the changed label is kept after a reload');
    const external = requests.filter((u) => !u.startsWith(base));
    assert.deepEqual(external, [], 'the page makes no requests outside this site');
    assert.deepEqual(problems, []);
  } finally {
    await context.close();
  }
});

test('GS-013 E2E: the Vietnamese landing switches to the same page in English', async () => {
  const { page, problems, status } = await open('/vi/');
  try {
    assert.equal(status, 200);
    await page.click('header a[hreflang="en"]');
    await page.waitForLoadState('load');
    assert.equal(new URL(page.url()).pathname, '/en/');
    assert.equal(await page.locator('h1').count(), 1);
    assert.deepEqual(problems, []);
  } finally {
    await page.close();
  }
});
