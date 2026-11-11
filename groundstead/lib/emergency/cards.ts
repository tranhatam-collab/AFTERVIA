import { currentChannel, type Channel } from '../channel.ts';
import { getContent } from '../content/load.ts';
import { effectiveReview, publishable } from '../content/review.ts';
import type { Card, Item, LoadedContent } from '../content/types.ts';
import type { Locale } from '../i18n/locales.ts';

export type CardView = {
  item: Item<Card>;
  // The label decides on this: a translation whose original has moved on shows as STALE.
  review: ReturnType<typeof effectiveReview>;
};

// Safety cards in one language, by title. A card with no translation simply does not appear in that language.
// On the production channel only a checked card is listed (G-07); preview lists every card, drafts included.
export function cardsFor(locale: Locale, channel: Channel = currentChannel(), content: LoadedContent = getContent()): CardView[] {
  const all = content.cards;
  return all
    .filter((c) => c.data.locale === locale)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((item) => {
      const originalLocale = item.data.based_on?.locale ?? 'en';
      const original = all.find((c) => c.data.locale === originalLocale && c.data.id === item.data.id);
      return { item, review: effectiveReview(item.data, original?.data) };
    })
    .filter((view) => channel === 'preview' || publishable(view.review));
}
