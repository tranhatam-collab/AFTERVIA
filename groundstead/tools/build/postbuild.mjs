#!/usr/bin/env node
// Writes per-locale sitemaps, the sitemap index and the offline pack manifests into the static export (out/).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../../lib/brand.ts';
import { buildDate } from '../../lib/content/load.ts';
import { LOCALES } from '../../lib/i18n/locales.ts';
import { assetRefs, buildManifest, inPack } from '../../lib/offline/pack.ts';
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

// Offline packs (GS-021). A pack is the pages of one locale that hold emergency content, every file those pages
// name (scripts, styles, payloads, fonts), and a manifest with each file's SHA-256 and size.
const SCANNED = /\.(?:html|txt|js|css)$/;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// The URL path a browser asks for: index.html is served at its directory.
function urlPathOf(file) {
  const rel = relative(out, file).split(sep).join('/');
  return rel.endsWith('index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
}

function fileOf(urlPath) {
  return urlPath.endsWith('/') ? join(out, urlPath, 'index.html') : join(out, urlPath);
}

const pageUrls = walk(out)
  .filter((file) => basename(file) === 'index.html')
  .map(urlPathOf);

async function packFor(locale) {
  const queue = [];
  const seen = new Set();
  const add = (urlPath) => {
    if (seen.has(urlPath) || !existsSync(fileOf(urlPath))) return;
    seen.add(urlPath);
    queue.push(urlPath);
  };
  for (const page of pageUrls.filter((url) => inPack(url, locale))) {
    add(page);
    add(`${page}index.txt`);
  }
  for (let i = 0; i < queue.length; i += 1) {
    const urlPath = queue[i];
    if (!urlPath.endsWith('/') && !SCANNED.test(urlPath)) continue;
    for (const ref of assetRefs(readFileSync(fileOf(urlPath), 'utf8'))) add(ref);
  }
  const files = queue.map((path) => ({ path, bytes: readFileSync(fileOf(path)) }));
  return buildManifest(locale, files, buildDate());
}

mkdirSync(join(out, 'offline'), { recursive: true });
for (const locale of LOCALES) {
  const manifest = await packFor(locale);
  writeFileSync(join(out, 'offline', `${locale}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`postbuild: offline pack ${locale}: ${manifest.files.length} file(s), version ${manifest.version}`);
}
