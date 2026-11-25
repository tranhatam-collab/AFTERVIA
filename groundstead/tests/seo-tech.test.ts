import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../lib/brand.ts';
import { cardsFor } from '../lib/emergency/cards.ts';
import { getContent } from '../lib/content/load.ts';
import { LOCALES } from '../lib/i18n/locales.ts';
import { howToLd, jsonLd, organizationLd } from '../lib/seo/jsonld.ts';
import { pageMetadata } from '../lib/seo/page.ts';
import { robotsTxt } from '../lib/seo/robots.ts';
import { allowIndexing } from '../lib/site.ts';
import { elements, readOut } from './helpers.ts';

const SITE = BRAND.siteUrl.replace(/\/+$/, '');

// The JSON-LD objects written into a built page.
function jsonLdOf(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1] ?? '{}') as Record<string, unknown>,
  );
}

// Every page of the site that this check covers, as the path under its locale ('' is the home page).
function pagesOf(locale: (typeof LOCALES)[number]): string[] {
  return [
    '',
    'emergency/',
    'emergency/print/',
    'help/',
    'readiness/',
    ...getContent().countries.map((c) => `help/${c.data.code.toLowerCase()}/`),
    ...cardsFor(locale, 'preview').map((v) => `emergency/${v.item.data.id}/`),
  ];
}

test('GT31 a page names its own canonical, and lists only the locales that have it', () => {
  const onlyVi = pageMetadata({
    locale: 'vi',
    path: 'emergency/flood-safety/',
    title: 't',
    description: 'd',
    available: ['vi'],
  });
  assert.equal(onlyVi.alternates?.canonical, `${SITE}/vi/emergency/flood-safety/`);
  assert.deepEqual(Object.keys(onlyVi.alternates?.languages ?? {}), ['vi'], 'no x-default without the default locale');
  const both = pageMetadata({ locale: 'vi', path: 'emergency/', title: 't', description: 'd' });
  assert.deepEqual(Object.keys(both.alternates?.languages ?? {}).sort(), ['en', 'vi', 'x-default']);
  assert.equal(both.openGraph?.url, `${SITE}/vi/emergency/`);
});

test('GT31 built pages: the canonical link of every page is that page, not the home page', () => {
  for (const locale of LOCALES) {
    for (const path of pagesOf(locale)) {
      const html = readOut(`${locale}/${path}index.html`);
      const canonical = elements(html, 'link').filter((l) => l.rel === 'canonical');
      assert.equal(canonical.length, 1, `${locale}/${path} has one canonical link`);
      assert.equal(canonical[0]?.href, `${SITE}/${locale}/${path}`, `${locale}/${path}`);
    }
  }
});

test('GT31 built pages: hreflang lists each locale that has the page, with x-default on the English page', () => {
  const flood = readOut('vi/emergency/flood-safety/index.html');
  const alternates = elements(flood, 'link').filter((l) => l.rel === 'alternate' && l.hreflang);
  assert.deepEqual(
    alternates.map((l) => l.hreflang).sort(),
    ['en', 'vi', 'x-default'],
  );
  assert.equal(alternates.find((l) => l.hreflang === 'x-default')?.href, `${SITE}/en/emergency/flood-safety/`);
});

test('GT31 built pages carry Open Graph tags that name the page, its language and the site', () => {
  const html = readOut('vi/emergency/index.html');
  const meta = elements(html, 'meta');
  const og = (property: string): string | undefined => meta.find((m) => m.property === property)?.content;
  assert.equal(og('og:url'), `${SITE}/vi/emergency/`);
  assert.equal(og('og:locale'), 'vi_VN');
  assert.equal(og('og:site_name'), BRAND.name);
  assert.ok(og('og:title'), 'og:title is set');
  assert.ok(og('og:description'), 'og:description is set');
});

test('GT31 structured data: the home page has an Organization, and each safety card has a HowTo whose steps keep their order', () => {
  for (const locale of LOCALES) {
    const home = jsonLdOf(readOut(`${locale}/index.html`));
    const org = home.find((d) => d['@type'] === 'Organization');
    assert.equal(org?.name, BRAND.name);
    assert.equal(org?.url, `${SITE}/${locale}/`);
    for (const card of cardsFor(locale, 'preview')) {
      const html = readOut(`${locale}/emergency/${card.item.data.id}/index.html`);
      const howTo = jsonLdOf(html).find((d) => d['@type'] === 'HowTo');
      assert.ok(howTo, `${locale} ${card.item.data.id} has a HowTo`);
      const steps = (howTo?.step as { position: number; text: string }[] | undefined) ?? [];
      assert.deepEqual(steps.map((s) => s.text), card.item.data.steps, `${locale} ${card.item.data.id} steps`);
      assert.deepEqual(steps.map((s) => s.position), steps.map((_, i) => i + 1));
    }
  }
});

test('GT31 JSON-LD cannot end its script element early, whatever its values', () => {
  const text = jsonLd({ name: '</script><b>x</b>', url: `${SITE}/en/` });
  assert.equal(text.includes('</script'), false);
  assert.deepEqual(JSON.parse(text), { name: '</script><b>x</b>', url: `${SITE}/en/` });
  const card = cardsFor('en', 'preview')[0];
  if (!card) throw new Error('no English card to test');
  const howTo = howToLd(card.item.data, 'en', `${SITE}/en/emergency/${card.item.data.id}/`, 'production');
  assert.equal(howTo['@type'], 'HowTo');
  assert.equal(organizationLd(SITE, 'en', 'production')['@type'], 'Organization');
});

test('GT31 robots.txt blocks everything unless indexing is allowed, and then names the sitemap', () => {
  assert.equal(robotsTxt(SITE, false), 'User-agent: *\nDisallow: /\n');
  assert.match(robotsTxt(SITE, true), new RegExp(`Sitemap: ${SITE}/sitemap\\.xml`));
  assert.equal(readOut('robots.txt'), robotsTxt(SITE, allowIndexing()), 'the build writes the file for its own setting');
});
