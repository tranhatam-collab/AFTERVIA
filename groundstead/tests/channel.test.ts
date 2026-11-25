import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND } from '../lib/brand.ts';
import { cardsFor } from '../lib/emergency/cards.ts';
import { DEFAULT_CONTENT_DIR, loadContent } from '../lib/content/validate.ts';
import type { Card, Item, LoadedContent, Review } from '../lib/content/types.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';
import { howToLd, organizationLd } from '../lib/seo/jsonld.ts';

const TODAY = '2026-11-06';
const real = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY });
const LOCALES = ['en', 'vi'] as const;

// A copy of the real content with one card changed in memory. Nothing is written to disk.
function withCard(content: LoadedContent, id: string, locale: 'en' | 'vi', change: (c: Item<Card>) => Item<Card>): LoadedContent {
  return { ...content, cards: content.cards.map((c) => (c.data.id === id && c.data.locale === locale ? change(c) : c)) };
}

const checked: Review = { status: 'EXPERT_REVIEWED', reviewer: { name: 'Test Reviewer', expertise: 'first aid' }, reviewed_on: '2026-11-01' };

test('G-07 production lists no card that nobody has checked: every shipped card is AI_DRAFT, so none shows', () => {
  for (const locale of LOCALES) assert.deepEqual(cardsFor(locale, 'production', real), []);
});

test('G-07 preview lists every card, drafts included, so the drafts can be read before they are checked', () => {
  for (const locale of LOCALES) {
    assert.equal(cardsFor(locale, 'preview', real).length, real.cards.filter((c) => c.data.locale === locale).length);
  }
});

test('G-07 production shows a card once it is checked, and keeps a translation hidden while it is STALE', () => {
  const fixed = withCard(real, 'flood-safety', 'en', (c) => ({ ...c, data: { ...c.data, review: checked } }));
  assert.deepEqual(cardsFor('en', 'production', fixed).map((v) => v.item.data.id), ['flood-safety']);
  // The Vietnamese copy is checked, but its original has moved on to a newer version, so its effective review is STALE.
  const stale = withCard(
    withCard(real, 'flood-safety', 'vi', (c) => ({ ...c, data: { ...c.data, review: checked } })),
    'flood-safety',
    'en',
    (c) => ({ ...c, data: { ...c.data, version: c.data.version + 1 } }),
  );
  assert.equal(cardsFor('vi', 'production', stale).some((v) => v.item.data.id === 'flood-safety'), false);
});

test('G-07 preview structured data carries the preview label; production structured data is the card and the site as written', () => {
  const [first] = cardsFor('en', 'preview', real);
  assert.ok(first, 'a preview card exists');
  const card = first.item.data;
  const url = `${BRAND.siteUrl}/en/emergency/${card.id}/`;
  const label = MESSAGES.en.previewLabel;

  const prod = howToLd(card, 'en', url, 'production');
  assert.equal(prod.name, card.title);
  assert.equal(prod.description, card.first_action);

  const prev = howToLd(card, 'en', url, 'preview');
  assert.ok(String(prev.name).startsWith(label) && String(prev.name).includes(card.title), 'the preview HowTo name is labelled');
  assert.ok(String(prev.description).startsWith(label), 'the preview HowTo description is labelled');

  assert.equal(organizationLd(BRAND.siteUrl, 'en', 'production').description, BRAND.tagline.en);
  assert.ok(String(organizationLd(BRAND.siteUrl, 'en', 'preview').description).startsWith(label), 'the preview organisation is labelled');
});

test('G-07 the preview label and banner exist in both languages and say the content is not published', () => {
  for (const locale of LOCALES) {
    assert.ok(MESSAGES[locale].previewBanner.length > 20, `${locale} banner text`);
    assert.ok(MESSAGES[locale].previewLabel.length > 5, `${locale} label text`);
    assert.ok(MESSAGES[locale].emergencyNoPublished.length > 5, `${locale} empty-state text`);
  }
});
