import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { BRAND } from '../lib/brand.ts';
import { DEFAULT_CONTENT_DIR, loadContent } from '../lib/content/validate.ts';
import { reviewLabel } from '../lib/content/review.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';
import { OUT, elements, readOut, visibleText } from './helpers.ts';

// Built-output tests for the production channel (G-07). They run only on a build made with GS_CHANNEL unset, through
// `npm run check:production`: the `test` script runs on the preview build, so these files are not in it.
const real = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: '2026-11-06' });
const LOCALES = ['en', 'vi'] as const;

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

const allHtml = () => htmlFiles(OUT).map((file) => ({ rel: relative(OUT, file).split(sep).join('/'), html: readFileSync(file, 'utf8') }));

test('G-07 a production build publishes no card: no card page exists, and the emergency index links to none', () => {
  for (const { data } of real.cards) {
    assert.equal(existsSync(join(OUT, data.locale, 'emergency', data.id, 'index.html')), false, `${data.locale}/${data.id} is not built`);
  }
  for (const locale of LOCALES) {
    const html = readOut(`${locale}/emergency/index.html`);
    const hrefs = elements(html, 'a').map((a) => a.href ?? '');
    assert.ok(!hrefs.some((h) => h.includes('/emergency/flood-safety/') || h.includes('/emergency/heat-safety/')), `${locale} index links to no card`);
    assert.ok(visibleText(html).includes(MESSAGES[locale].emergencyNoPublished), `${locale} index says nothing is published yet`);
  }
});

test('G-07 a production build carries no draft label, no preview banner and no HowTo anywhere in its pages', () => {
  const drafts = LOCALES.map((locale) => reviewLabel(locale, { status: 'AI_DRAFT' }));
  const banners = LOCALES.map((locale) => MESSAGES[locale].previewBanner);
  const pages = allHtml();
  assert.ok(pages.length >= 10, 'the pages are found');
  for (const { rel, html } of pages) {
    for (const text of [...drafts, ...banners]) assert.ok(!html.includes(text), `${rel} carries no draft label or banner`);
    assert.ok(!html.includes('"@type":"HowTo"'), `${rel} has no HowTo`);
  }
});

test('G-07 a production build labels no structured data as preview and keeps the organisation as written', () => {
  for (const locale of LOCALES) {
    const html = readOut(`${locale}/index.html`);
    assert.ok(html.includes(JSON.stringify(BRAND.tagline[locale]).slice(1, -1)), `${locale} home keeps the tagline`);
    for (const label of LOCALES.map((l) => MESSAGES[l].previewLabel)) assert.ok(!html.includes(label), `${locale} home has no preview label`);
  }
});

test('G-07 the offline pack of a production build holds no card page', () => {
  for (const locale of LOCALES) {
    const manifest = JSON.parse(readOut(`offline/${locale}.json`)) as { files: { path: string }[] };
    for (const { data } of real.cards.filter((c) => c.data.locale === locale)) {
      assert.ok(!manifest.files.some((f) => f.path.includes(`/emergency/${data.id}/`)), `${locale} pack has no ${data.id} page`);
    }
  }
});
