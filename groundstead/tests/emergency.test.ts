import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONTENT_DIR, loadContent } from '../lib/content/validate.ts';
import { reviewLabel } from '../lib/content/review.ts';
import { LOCALES } from '../lib/i18n/locales.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';
import { elements, readOut, visibleText } from './helpers.ts';

const TODAY = '2026-11-06';
const real = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY });

// Hrefs from the rendered HTML, minus the page's own language switch.
const hrefs = (html: string): string[] => elements(html, 'a').map((a) => a.href ?? '');

for (const locale of LOCALES) {
  test(`GT09 the ${locale} emergency index links to every situation, each one reachable in one click`, () => {
    const index = readOut(`${locale}/emergency/index.html`);
    const cards = real.cards.filter((c) => c.data.locale === locale);
    assert.ok(cards.length >= 2, `${locale} needs at least two situations`);
    for (const c of cards) {
      assert.ok(hrefs(index).includes(`/${locale}/emergency/${c.data.id}/`), `index links to ${c.data.id}`);
      const page = visibleText(readOut(`${locale}/emergency/${c.data.id}/index.html`));
      assert.ok(page.includes(c.data.first_action), `${c.data.id} shows its first action at once`);
    }
    // home -> emergency -> situation is at most three clicks
    const home = readOut(`${locale}/index.html`);
    assert.ok(hrefs(home).includes(`/${locale}/emergency/`), 'the home page links to the emergency guidance');
  });

  test(`GT10 the ${locale} emergency pages have no sign-in, cart, checkout, form or purchase links`, () => {
    const pages = [`${locale}/emergency/index.html`, ...real.cards.filter((c) => c.data.locale === locale).map((c) => `${locale}/emergency/${c.data.id}/index.html`)];
    for (const path of pages) {
      const html = readOut(path);
      assert.equal(elements(html, 'form').length, 0, `${path} has no form`);
      assert.equal(elements(html, 'input').filter((i) => i.type === 'password').length, 0, `${path} has no password field`);
      assert.ok(!hrefs(html).some((h) => /login|signin|sign-in|checkout|cart|\/go\//i.test(h)), `${path} has no account or shop link`);
      assert.doesNotMatch(visibleText(html), /đăng nhập|sign in|buy now|mua ngay/i, `${path} shows no sign-in or buy text`);
    }
  });

  test(`GT11 the ${locale} emergency index shows a tel: link only for numbers that are listed in a country pack, and says it does not send rescue requests`, () => {
    const html = readOut(`${locale}/emergency/index.html`);
    const text = visibleText(html);
    assert.ok(text.includes(MESSAGES[locale].emergencyNoRescue), 'the no-rescue sentence is visible');
    const tel = hrefs(html).filter((h) => h.startsWith('tel:'));
    const listed = real.countries.reduce((n, c) => n + c.data.emergency_numbers.length, 0);
    assert.equal(tel.length, listed, 'every tel: link is a number listed in a pack, and every listed number has one');
    for (const { data: pack } of real.countries) {
      if (pack.status === 'partial' && pack.pending) assert.ok(text.includes(pack.pending[locale]), `${pack.code} shows its unverified notice`);
      for (const n of pack.emergency_numbers) assert.ok(tel.includes(`tel:${n.number}`), `${pack.code} ${n.number} is linked`);
    }
  });
}

test('GT04 every situation card states its review status in its own language, and its sources are linked', () => {
  for (const { data: card } of real.cards) {
    const page = visibleText(readOut(`${card.locale}/emergency/${card.id}/index.html`));
    const label = reviewLabel(card.locale, card.review);
    assert.ok(page.includes(label), `${card.locale}/${card.id} shows the review label "${label}"`);
    assert.ok(page.includes(card.limits), `${card.locale}/${card.id} shows its limits`);
    for (const ref of card.sources) {
      const src = real.sources.find((s) => s.id === ref.id);
      assert.ok(src, `${card.id} cites a known source`);
      assert.ok(hrefs(readOut(`${card.locale}/emergency/${card.id}/index.html`)).includes(src.url), `${card.id} links to ${src.url}`);
    }
  }
});
