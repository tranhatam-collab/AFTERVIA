#!/usr/bin/env node
// Writes per-locale sitemaps and a sitemap index into the static export (out/).
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../../lib/brand.ts';
import { LOCALES } from '../../lib/i18n/locales.ts';
import { PUBLIC_PATHS } from '../../lib/routes.ts';
import { localeSitemapXml, sitemapIndexXml } from '../../lib/seo/sitemap.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = resolve(root, 'out');
if (!existsSync(out)) {
  console.error('out/ is missing: run `next build` first');
  process.exit(1);
}
for (const locale of LOCALES) {
  writeFileSync(resolve(out, `sitemap-${locale}.xml`), localeSitemapXml(BRAND.siteUrl, locale, PUBLIC_PATHS));
}
writeFileSync(resolve(out, 'sitemap.xml'), sitemapIndexXml(BRAND.siteUrl));
console.log(`postbuild: sitemap.xml + ${LOCALES.length} locale sitemaps, ${PUBLIC_PATHS.length} path(s) each`);
