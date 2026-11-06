import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../lib/brand.ts';
import { LOCALES } from '../lib/i18n/locales.ts';
import { buildAlternates } from '../lib/seo/alternates.ts';
import { localeSitemapXml, sitemapIndexXml } from '../lib/seo/sitemap.ts';
import { allowIndexing } from '../lib/site.ts';
import { elements, readOut } from './helpers.ts';

const SITE = BRAND.siteUrl;

test('GT31 alternates list every locale plus x-default=/en/ as absolute URLs', () => {
  const alt = buildAlternates(`${SITE}/`, 'vi', 'emergency/');
  assert.equal(alt.canonical, `${SITE}/vi/emergency/`);
  assert.deepEqual(alt.languages, {
    en: `${SITE}/en/emergency/`,
    vi: `${SITE}/vi/emergency/`,
    'x-default': `${SITE}/en/emergency/`,
  });
});

test('GT31 locale sitemap has one <url> per path with xhtml alternates, and the index lists each locale', () => {
  const xml = localeSitemapXml(SITE, 'vi', ['', 'emergency/']);
  assert.equal((xml.match(/<url>/g) ?? []).length, 2);
  assert.match(xml, new RegExp(`<loc>${SITE}/vi/emergency/</loc>`));
  assert.match(xml, /hreflang="x-default" href="https:\/\/groundstead\.iai\.one\/en\/emergency\/"/);
  const index = sitemapIndexXml(SITE);
  for (const l of LOCALES) assert.match(index, new RegExp(`<loc>${SITE}/sitemap-${l}\\.xml</loc>`));
});

test('GT31 sitemap escapes XML special characters', () => {
  assert.match(localeSitemapXml('https://x.test', 'en', ['a&b/']), /<loc>https:\/\/x\.test\/en\/a&amp;b\/<\/loc>/);
});

for (const locale of LOCALES) {
  test(`GT31 built /${locale}/ page declares lang, canonical and hreflang for every locale and x-default`, () => {
    const html = readOut(`${locale}/index.html`);
    assert.equal(elements(html, 'html')[0]?.lang, locale);
    const links = elements(html, 'link');
    const canonical = links.find((l) => l.rel === 'canonical');
    assert.equal(canonical?.href, `${SITE}/${locale}/`);
    const alternates = Object.fromEntries(links.filter((l) => l.rel === 'alternate' && l.hreflang).map((l) => [l.hreflang, l.href]));
    assert.deepEqual(alternates, { en: `${SITE}/en/`, vi: `${SITE}/vi/`, 'x-default': `${SITE}/en/` });
  });
}

test('GT31 build writes a sitemap index and one sitemap per locale', () => {
  assert.match(readOut('sitemap.xml'), /<sitemapindex/);
  for (const l of LOCALES) assert.match(readOut(`sitemap-${l}.xml`), new RegExp(`<loc>${SITE}/${l}/</loc>`));
});

test('indexing is off unless GS_ALLOW_INDEXING=1, and the default build says noindex', () => {
  assert.equal(allowIndexing({}), false);
  assert.equal(allowIndexing({ GS_ALLOW_INDEXING: 'true' }), false);
  assert.equal(allowIndexing({ GS_ALLOW_INDEXING: '1' }), true);
  for (const l of LOCALES) {
    const robots = elements(readOut(`${l}/index.html`), 'meta').find((m) => m.name === 'robots');
    assert.match(robots?.content ?? '', /noindex/);
  }
});

test('root "/" is a noindex language chooser linking to every locale', () => {
  const html = readOut('index.html');
  const robots = elements(html, 'meta').find((m) => m.name === 'robots');
  assert.match(robots?.content ?? '', /noindex/);
  const hrefs = elements(html, 'a').map((a) => a.href);
  for (const l of LOCALES) assert.ok(hrefs.includes(`/${l}/`), `missing link to /${l}/`);
});
