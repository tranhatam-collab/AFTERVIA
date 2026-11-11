import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { DEFAULT_CONTENT_DIR, loadContent } from '../lib/content/validate.ts';
import { reviewLabel } from '../lib/content/review.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';
import { OUT, readOut, visibleText } from './helpers.ts';

// Built-output tests for the preview channel (G-07). `npm run build:test` builds this channel; the e2e suite runs on it.
const real = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: '2026-11-06' });

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

// Next's built-in not-found pages are not this site's pages, so they are not checked for the site banner.
const sitePages = () =>
  htmlFiles(OUT)
    .map((file) => ({ rel: relative(OUT, file).split(sep).join('/'), file }))
    .filter(({ rel }) => !/^(404|_not-found)/.test(rel));

// The JSON-LD objects written into a built page.
function jsonLdOf(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1] ?? '{}') as Record<string, unknown>,
  );
}

test('G-07 a preview build shows the banner on every site page, in the page language', () => {
  const pages = sitePages();
  assert.ok(pages.length >= 10, 'the site pages are found');
  for (const { rel, file } of pages) {
    const locale = rel.startsWith('vi/') ? 'vi' : 'en';
    assert.ok(visibleText(readFileSync(file, 'utf8')).includes(MESSAGES[locale].previewBanner), `${rel} shows the preview banner`);
  }
});

test('G-07 a preview build shows every card with its review label, and labels its HowTo structured data', () => {
  for (const card of real.cards) {
    const { data } = card;
    const html = readOut(`${data.locale}/emergency/${data.id}/index.html`);
    assert.ok(visibleText(html).includes(reviewLabel(data.locale, data.review)), `${data.locale}/${data.id} shows its review label`);
    const howTo = jsonLdOf(html).find((o) => o['@type'] === 'HowTo');
    assert.ok(howTo, `${data.locale}/${data.id} has a HowTo`);
    assert.ok(String(howTo.name).startsWith(MESSAGES[data.locale].previewLabel), `${data.locale}/${data.id} HowTo name is labelled`);
  }
});

test('G-07 a preview build labels the organisation structured data on each home page', () => {
  for (const locale of ['en', 'vi'] as const) {
    const org = jsonLdOf(readOut(`${locale}/index.html`)).find((o) => o['@type'] === 'Organization');
    assert.ok(org, `${locale} home has an Organization`);
    assert.ok(String(org.description).startsWith(MESSAGES[locale].previewLabel), `${locale} organisation is labelled`);
  }
  assert.ok(existsSync(join(OUT, 'en', 'emergency', 'index.html')), 'the emergency index is built');
});
