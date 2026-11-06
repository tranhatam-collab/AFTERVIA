import type { Card } from '../content/types.ts';
import { BRAND } from '../brand.ts';
import type { Locale } from '../i18n/locales.ts';

// Serialises JSON-LD for a <script> element. "<" is escaped, so no value can end the element early.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// The organisation behind the site, on each home page (schema.org Organization).
export function organizationLd(siteUrl: string, locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    url: `${siteUrl.replace(/\/+$/, '')}/${locale}/`,
    description: BRAND.tagline[locale],
    inLanguage: locale,
  };
}

// A safety card as a HowTo (schema.org): its steps, in order. The card is a summary of official guidance, so the
// publisher is this site and the limits stay on the page; nothing here claims an official source.
export function howToLd(card: Card, locale: Locale, url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: card.title,
    description: card.first_action,
    inLanguage: locale,
    dateModified: card.updated,
    url,
    step: card.steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
  };
}
