// Accessibility checks on the built site with axe-core (pinned, installed locally). Fails on serious or
// critical violations against WCAG 2.0/2.1/2.2 AA rules. Moderate and minor findings are printed, not hidden.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { startServer, OUT } from './server.mjs';
import { MESSAGES } from '../../lib/i18n/messages.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = join(OUT, '..', 'node_modules', 'axe-core', 'axe.min.js');

const PAGES = [
  '/en/',
  '/vi/',
  '/en/help/',
  '/vi/help/vn/',
  '/en/help/us/',
  '/vi/help/us/',
  '/en/emergency/',
  '/vi/emergency/',
  '/en/emergency/heat-safety/',
  '/vi/emergency/flood-safety/',
  '/en/readiness/',
  '/vi/readiness/',
];

let server;
let browser;
let base;

before(async () => {
  server = await startServer();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

for (const path of PAGES) {
  test(`GT32 ${path} has no serious or critical accessibility violations (axe, WCAG 2.2 AA)`, async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
      assert.equal(response?.status(), 200);
      await page.addScriptTag({ path: AXE });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
      });
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      const minor = violations.filter((v) => v.impact !== 'serious' && v.impact !== 'critical');
      if (minor.length > 0) console.log(`  ${path}: non-blocking: ${JSON.stringify(minor)}`);
      assert.deepEqual(blocking, [], `${path} blocking violations`);
    } finally {
      await page.close();
    }
  });
}

test('GT32 keyboard: the skip link is the first stop on the home page and moves focus to the content', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/en/`, { waitUntil: 'load' });
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({ cls: document.activeElement?.className, text: document.activeElement?.textContent }));
    assert.equal(focused.cls, 'skip');
    assert.equal(focused.text, MESSAGES.en.skipToContent);
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => location.hash), '#main');
  } finally {
    await page.close();
  }
});

test('GT32 self-check: axe reports a missing image alt when one is added to the page, so a clean result means something', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/en/`, { waitUntil: 'load' });
    await page.addScriptTag({ path: AXE });
    await page.evaluate(() => {
      const img = document.createElement('img');
      img.src = '/favicon-missing.png';
      document.querySelector('main').appendChild(img);
    });
    const ids = await page.evaluate(async () =>
      (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map((v) => v.id),
    );
    assert.ok(ids.includes('image-alt'), `axe must report image-alt, got ${JSON.stringify(ids)}`);
  } finally {
    await page.close();
  }
});
