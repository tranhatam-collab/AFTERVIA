import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../lib/brand.ts';
import { LOCALES } from '../lib/i18n/locales.ts';
import { LANDING, type Landing } from '../lib/i18n/messages.ts';
import { elements, readOut, visibleText } from './helpers.ts';

// Positive claims the landing must never make. A negated sentence ("has not been reviewed") does not match.
const OVERCLAIM =
  /\b(?:is|are|was|were|has been|have been) (?:fully )?(?:verified|reviewed|approved|certified)\b|expert-reviewed|guaranteed|100% safe|buy now|mua ngay|sign in|đăng nhập|checkout|add to cart|thêm vào giỏ|đã được duyệt|đã kiểm chứng|đủ 72 giờ/i;

// Every sentence the landing shows as its own claim. The commitments are left out on purpose: they quote the
// forbidden labels in order to refuse them.
function shownFields(m: Landing): string[] {
  return [
    m.statusTitle,
    m.statusBody,
    m.positioning,
    m.startTitle,
    m.modeStatus,
    m.startBody,
    m.pillarsTitle,
    m.pillarsIntro,
    m.pathTitle,
    m.pathIntro,
    m.signupTitle,
    m.signupBody,
    m.footerNotice,
    ...m.pillars.flatMap((p) => [p.name, p.text]),
    ...m.path.flatMap((p) => [p.name, p.text]),
  ];
}

for (const locale of LOCALES) {
  const html = readOut(`${locale}/index.html`);
  const text = visibleText(html);
  const m = LANDING[locale];

  test(`GT31 ${locale} landing declares its language, canonical URL and hreflang alternates`, () => {
    assert.equal(elements(html, 'html')[0]?.lang, locale);
    const links = elements(html, 'link');
    assert.equal(links.find((l) => l.rel === 'canonical')?.href, `${BRAND.siteUrl}/${locale}/`);
    const alternates = links.filter((l) => l.rel === 'alternate' && l.hreflang);
    for (const hreflang of ['en', 'vi', 'x-default']) {
      assert.ok(alternates.some((l) => l.hreflang === hreflang), `hreflang ${hreflang} is declared`);
    }
  });

  test(`GT32 ${locale} landing has exactly one h1, and it carries the tagline`, () => {
    assert.equal(elements(html, 'h1').length, 1);
    assert.ok(text.includes(BRAND.tagline[locale]), 'the tagline is shown');
    assert.ok(text.includes(m.positioning), 'the positioning sentence is shown');
  });

  test(`GT10 ${locale} landing has no form, input, select, textarea or button, so early sign-up stays off`, () => {
    for (const tag of ['form', 'input', 'select', 'textarea', 'button']) {
      assert.equal(elements(html, tag).length, 0, `no <${tag}> on the landing`);
    }
  });

  test(`GT09 ${locale} landing puts emergency guidance and the contact list one link away, and no account or shop link`, () => {
    const hrefs = elements(html, 'a').map((a) => a.href ?? '');
    assert.ok(hrefs.includes(`/${locale}/emergency/`), 'emergency guidance is one link away');
    assert.ok(hrefs.includes(`/${locale}/help/`), 'the contact list is one link away');
    assert.ok(!hrefs.some((h) => /login|signin|sign-in|checkout|cart|\/go\//i.test(h)), 'no account or shop link');
  });

  test(`GT04 ${locale} landing makes no positive claim that its content is reviewed, verified or complete`, () => {
    for (const s of shownFields(m)) assert.doesNotMatch(s, OVERCLAIM, s);
  });

  test(`GS-013 ${locale} landing shows the preview notice, the seven pillars, the path, the commitments and the closed sign-up`, () => {
    assert.ok(text.includes(m.statusTitle) && text.includes(m.statusBody), 'the preview notice is shown');
    assert.equal(m.pillars.length, 7, 'seven pillars');
    for (const p of [...m.pillars, ...m.path]) {
      assert.ok(text.includes(p.name) && text.includes(p.text), `"${p.name}" is shown in full`);
    }
    for (const item of m.dont) assert.ok(text.includes(item), `commitment shown: ${item.slice(0, 40)}`);
    assert.ok(text.includes(m.signupBody), 'the sign-up status is shown');
    assert.ok(text.includes(m.footerNotice), 'the safety notice is shown');
  });
}

test('GS-013 the English and Vietnamese landings line up: the same rows and the same numbers', () => {
  const en = LANDING.en;
  const vi = LANDING.vi;
  for (const k of ['pillars', 'path', 'dont'] as const) {
    assert.equal(vi[k].length, en[k].length, `${k} has the same number of rows in both languages`);
  }
  const numbers = (m: Landing) => [...shownFields(m), ...m.dont].join(' ').match(/\d+/g)?.sort() ?? [];
  assert.deepEqual(numbers(vi), numbers(en), 'the same numbers appear in both languages');
});
