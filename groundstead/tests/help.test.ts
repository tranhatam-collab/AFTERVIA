import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONTENT_DIR, loadContent } from '../lib/content/validate.ts';
import { directoryStatus, STALE_AFTER_DAYS } from '../lib/help/directory.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';
import { elements, readOut, visibleText } from './helpers.ts';

const TODAY = '2026-11-06';

test('GT34 a contact is current up to 92 days, stale after that, and unknown when the date is missing or in the future', () => {
  assert.equal(STALE_AFTER_DAYS, 92);
  assert.equal(directoryStatus('2026-11-06', TODAY), 'current');
  assert.equal(directoryStatus('2026-08-06', TODAY), 'current');
  assert.equal(directoryStatus('2026-08-05', TODAY), 'stale');
  assert.equal(directoryStatus(undefined, TODAY), 'unknown');
  assert.equal(directoryStatus('2026-12-01', TODAY), 'unknown');
  assert.equal(directoryStatus('not a date', TODAY), 'unknown');
});

test('GT34 the real country packs are honest: a partial pack says in both languages what is still unverified', () => {
  const { countries } = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY });
  assert.deepEqual(countries.map((c) => c.data.code).sort(), ['US', 'VN']);
  for (const { data: pack } of countries) {
    if (pack.status === 'partial') assert.ok(pack.pending?.en && pack.pending?.vi, `${pack.code} must say what is unverified`);
    for (const a of pack.authorities) assert.ok(a.url.startsWith('https://'), `${pack.code} authority ${a.name} must use https`);
  }
});

const PAGES = [
  { locale: 'en', path: 'en/help/index.html', country: false },
  { locale: 'vi', path: 'vi/help/index.html', country: false },
  { locale: 'en', path: 'en/help/us/index.html', country: true },
  { locale: 'vi', path: 'vi/help/vn/index.html', country: true },
] as const;

for (const page of PAGES) {
  test(`GT34 ${page.path} lists its contacts with a source link, a check date and the no-rescue footer`, () => {
    const html = readOut(page.path);
    const text = visibleText(html);
    const m = MESSAGES[page.locale];
    assert.equal(elements(html, 'html')[0]?.lang, page.locale);
    assert.ok(text.includes(m.helpFooter), 'the footer must say the page does not send rescue requests');
    assert.equal(elements(html, 'form').length, 0, 'the directory has no form');
    const links = elements(html, 'a').map((a) => a.href ?? '');
    assert.ok(!links.some((h) => /\/go\/|affiliate/i.test(h)), 'the directory has no commerce links');
    if (page.country) {
      assert.ok(text.includes(m.helpPackChecked), 'the country page states when it was checked');
      assert.match(text, /2026-11-06/, 'the check date is printed');
      assert.ok(links.filter((h) => h.startsWith('https://')).length >= 2, 'each contact links to its own page and its source');
    }
  });
}
