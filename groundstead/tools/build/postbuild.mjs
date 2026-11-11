#!/usr/bin/env node
// Writes per-locale sitemaps, the sitemap index and the offline pack manifests into the static export (out/).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../../lib/brand.ts';
import { buildDate } from '../../lib/content/load.ts';
import { LOCALES } from '../../lib/i18n/locales.ts';
import { assetRefs, buildManifest, inPack, signManifest } from '../../lib/offline/pack.ts';
import { PUBLIC_PATHS } from '../../lib/routes.ts';
import { localeSitemapXml, sitemapIndexXml } from '../../lib/seo/sitemap.ts';
import { robotsTxt } from '../../lib/seo/robots.ts';
import { allowIndexing } from '../../lib/site.ts';

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
writeFileSync(resolve(out, 'robots.txt'), robotsTxt(BRAND.siteUrl, allowIndexing()));
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

async function packFor(locale, issued) {
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
  return buildManifest(locale, files, buildDate(), issued);
}

mkdirSync(join(out, 'offline'), { recursive: true });
// Signing (GS-022): the private key comes only from the environment. Set both keys or neither. A pack signed with a
// key the site does not trust is never accepted, so a mismatch stops the build instead of failing silently later.
const privateKey = process.env.GROUNDSTEAD_PACK_PRIVATE_KEY ?? '';
const publicKey = process.env.NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY ?? '';
if (Boolean(privateKey) !== Boolean(publicKey)) {
  console.error('postbuild: set both GROUNDSTEAD_PACK_PRIVATE_KEY and NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY, or neither');
  process.exit(1);
}
// The signed issue time (G-19): one per build. A manifest older than the installed one is refused by the reader.
const issued = new Date().toISOString();
// Test builds only (see tools/build/with-test-pack-key.mjs): an older, validly signed manifest for the rollback test.
const olderDir = resolve(root, '.loop', 'offline-older');
rmSync(olderDir, { recursive: true, force: true });
for (const locale of LOCALES) {
  const unsigned = await packFor(locale, issued);
  let manifest = unsigned;
  if (privateKey) {
    manifest = signManifest(unsigned, privateKey);
    if (manifest.publicKey !== publicKey) {
      console.error('postbuild: the signing key does not match NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY');
      process.exit(1);
    }
  }
  writeFileSync(join(out, 'offline', `${locale}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  if (privateKey && process.env.GROUNDSTEAD_TEST_PACK_FIXTURES === '1') {
    const earlier = new Date(Date.parse(issued) - 60 * 60 * 1000).toISOString();
    mkdirSync(olderDir, { recursive: true });
    const older = signManifest({ ...unsigned, issued: earlier }, privateKey);
    writeFileSync(join(olderDir, `${locale}.json`), `${JSON.stringify(older, null, 2)}\n`);
  }
  const state = privateKey ? 'signed' : 'UNSIGNED (no signing key: readers will not accept this pack)';
  console.log(`postbuild: offline pack ${locale}: ${manifest.files.length} file(s), version ${manifest.version}, ${state}`);
}

// The worker checks each stored file against the signed manifest with the same trusted key the pages use (G-18). The
// key is written into the worker here. With no key the worker keeps an empty key and serves no stored copy.
const SW_PLACEHOLDER = "const TRUSTED_KEY = '';";
const swPath = join(out, 'sw.js');
const swSource = readFileSync(swPath, 'utf8');
if (swSource.split(SW_PLACEHOLDER).length !== 2) {
  console.error('postbuild: out/sw.js must hold the trusted key placeholder exactly once');
  process.exit(1);
}
if (publicKey && !/^[A-Za-z0-9+/]+={0,2}$/.test(publicKey)) {
  console.error('postbuild: NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY must be base64');
  process.exit(1);
}
writeFileSync(swPath, swSource.replace(SW_PLACEHOLDER, `const TRUSTED_KEY = '${publicKey}';`));
console.log(`postbuild: sw.js trusted key ${publicKey ? 'set' : 'empty (no stored copy is served)'}`);
