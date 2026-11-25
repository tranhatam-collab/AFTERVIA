import { LOCALES, type Locale } from '../i18n/locales.ts';
import { buildAlternates } from './alternates.ts';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// One sitemap per locale. Each <url> carries xhtml:link alternates for every locale and x-default.
export function localeSitemapXml(siteUrl: string, locale: Locale, paths: readonly string[]): string {
  const urls = paths.map((path) => {
    const alt = buildAlternates(siteUrl, locale, path);
    const links = Object.entries(alt.languages)
      .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${esc(lang)}" href="${esc(href)}"/>`)
      .join('\n');
    return `  <url>\n    <loc>${esc(alt.canonical)}</loc>\n${links}\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function sitemapIndexXml(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  const entries = LOCALES.map((l) => `  <sitemap><loc>${esc(`${base}/sitemap-${l}.xml`)}</loc></sitemap>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</sitemapindex>',
    '',
  ].join('\n');
}
