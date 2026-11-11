import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { resolve } from 'node:path';
import { LOCALES, type Locale } from '../lib/i18n/locales.ts';
import { sha256Hex } from '../lib/offline/digest.ts';
import { base64ToBytes, verifySignature } from '../lib/offline/signature.ts';
import { assetRefs, buildManifest, inPack, signManifest } from '../lib/offline/pack.ts';
import { verifyPack, type PackManifest } from '../lib/offline/verify.ts';
import { elements, OUT, readOut, visibleText } from './helpers.ts';
import { cardsFor } from '../lib/emergency/cards.ts';
import { PRINT } from '../lib/print/text.ts';

const encode = (text: string) => new TextEncoder().encode(text);

function manifestOf(locale: Locale): PackManifest {
  const file = resolve(OUT, 'offline', `${locale}.json`);
  if (!existsSync(file)) throw new Error(`missing ${locale} pack manifest: run npm run build`);
  return JSON.parse(readFileSync(file, 'utf8')) as PackManifest;
}

// The file a browser gets for a path of the pack: a directory path is its index.html.
function fileOnDisk(path: string): string {
  return resolve(OUT, path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1));
}

test('GT07 a pack is ready only when every listed file was found with its SHA-256', async () => {
  const a = await sha256Hex(encode('page a'));
  const b = await sha256Hex(encode('page b'));
  const pack: PackManifest = {
    id: 'en',
    version: 'test',
    updated: '2026-11-06',
    files: [
      { path: '/a/', sha256: a, size: 6 },
      { path: '/b/', sha256: b, size: 6 },
    ],
  };
  assert.deepEqual(verifyPack(pack, { '/a/': a, '/b/': b }), { ready: true, problems: [] });
  assert.equal(verifyPack(pack, { '/a/': a, '/b/': b, '/left-over/': a }).ready, true, 'extra files do not matter');
});

test('GT07 a missing file, or a file with another SHA-256, makes the whole pack not ready', async () => {
  const a = await sha256Hex(encode('page a'));
  const b = await sha256Hex(encode('page b'));
  const pack: PackManifest = {
    id: 'en',
    version: 'test',
    updated: '2026-11-06',
    files: [
      { path: '/a/', sha256: a, size: 6 },
      { path: '/b/', sha256: b, size: 6 },
    ],
  };
  const missing = verifyPack(pack, { '/a/': a });
  assert.equal(missing.ready, false);
  assert.deepEqual(missing.problems, ['missing /b/']);
  const changed = verifyPack(pack, { '/a/': a, '/b/': a });
  assert.equal(changed.ready, false);
  assert.deepEqual(changed.problems, ['hash mismatch /b/']);
});

test('GT07 a pack with no files, or with a malformed hash, is never ready', () => {
  const empty = verifyPack({ id: 'en', version: 'v', updated: 'd', files: [] }, {});
  assert.equal(empty.ready, false);
  const malformed = verifyPack(
    { id: 'en', version: 'v', updated: 'd', files: [{ path: '/a/', sha256: 'not-a-hash', size: 1 }] },
    { '/a/': 'not-a-hash' },
  );
  assert.equal(malformed.ready, false);
  assert.deepEqual(malformed.problems, ['bad hash format for /a/']);
});

test('GT07 build output: every pack file exists with its listed size and SHA-256, and each pack is ready', async () => {
  for (const locale of LOCALES) {
    const manifest = manifestOf(locale);
    const found: Record<string, string> = {};
    for (const file of manifest.files) {
      const bytes = readFileSync(fileOnDisk(file.path));
      assert.equal(bytes.byteLength, file.size, `size of ${file.path}`);
      found[file.path] = await sha256Hex(bytes);
    }
    assert.deepEqual(verifyPack(manifest, found), { ready: true, problems: [] }, `${locale} pack`);
  }
});

test('GT06 each pack holds the home page, the emergency section and both help directories of its locale only', () => {
  for (const locale of LOCALES) {
    const paths = manifestOf(locale).files.map((file) => file.path);
    for (const required of [
      `/${locale}/`,
      `/${locale}/emergency/`,
      `/${locale}/emergency/flood-safety/`,
      `/${locale}/emergency/heat-safety/`,
      `/${locale}/help/`,
      `/${locale}/help/vn/`,
      `/${locale}/help/us/`,
    ]) {
      assert.ok(paths.includes(required), `${locale} pack lists ${required}`);
    }
    assert.ok(paths.some((p) => p.endsWith('.js')), `${locale} pack has scripts`);
    assert.ok(paths.some((p) => p.endsWith('.css')), `${locale} pack has styles`);
    assert.equal(new Set(paths).size, paths.length, `${locale} pack lists no path twice`);
    for (const other of LOCALES.filter((l) => l !== locale)) {
      assert.ok(!paths.some((p) => p.startsWith(`/${other}/`)), `${locale} pack has no ${other} page`);
    }
    assert.ok(!paths.includes(`/${locale}/readiness/`), 'the readiness tool is not part of the emergency pack');
  }
});

test('GT06 pack selection and asset references give fixed answers', () => {
  assert.equal(inPack('/en/', 'en'), true);
  assert.equal(inPack('/en/emergency/flood-safety/', 'en'), true);
  assert.equal(inPack('/en/help/vn/', 'en'), true);
  assert.equal(inPack('/vi/emergency/', 'en'), false);
  assert.equal(inPack('/en/readiness/', 'en'), false);
  assert.deepEqual(
    assetRefs(
      '<script src="/_next/static/chunks/a1.js"></script>' +
        '<link href="/_next/static/css/b2.css" rel="stylesheet">' +
        '<script src="https://example.com/x.js"></script>' +
        '<script src="/_next/static/chunks/data.json"></script>',
    ),
    ['/_next/static/chunks/a1.js', '/_next/static/css/b2.css'],
  );
});

test('GT06 buildManifest sorts its files, and its version changes when one byte changes', async () => {
  const first = await buildManifest(
    'en',
    [
      { path: '/b/', bytes: encode('2') },
      { path: '/a/', bytes: encode('1') },
    ],
    '2026-11-06',
  );
  assert.deepEqual(
    first.files.map((file) => file.path),
    ['/a/', '/b/'],
  );
  assert.equal(first.files[0]?.size, 1);
  const again = await buildManifest(
    'en',
    [
      { path: '/a/', bytes: encode('1') },
      { path: '/b/', bytes: encode('2') },
    ],
    '2026-11-06',
  );
  assert.equal(again.version, first.version, 'the same files give the same version');
  const changed = await buildManifest(
    'en',
    [
      { path: '/a/', bytes: encode('1') },
      { path: '/b/', bytes: encode('3') },
    ],
    '2026-11-06',
  );
  assert.notEqual(changed.version, first.version);
});

test('GT06 the service worker is served at /sw.js and never stores a response itself', () => {
  const sw = readOut('sw.js');
  assert.match(sw, /addEventListener\('fetch'/);
  assert.doesNotMatch(sw, /\.put\(|\.add\(|addAll\(/, 'only the page stores a file, after the check');
});

test('GT08 build output: each locale has a printable emergency page with its cards, numbers and sources, kept out of search', () => {
  for (const locale of LOCALES) {
    const html = readOut(`${locale}/emergency/print/index.html`);
    assert.equal(elements(html, 'html')[0]?.lang, locale);
    assert.equal(elements(html, 'h1').length, 1, 'one h1');
    const text = visibleText(html);
    assert.ok(text.includes(PRINT[locale].title), `${locale} print title`);
    assert.ok(text.includes(PRINT[locale].button), `${locale} print button`);
    for (const card of cardsFor(locale)) {
      assert.ok(text.includes(card.item.data.title), `${locale} print lists ${card.item.data.title}`);
      assert.ok(text.includes(card.item.data.first_action), `${locale} print gives the first action of ${card.item.data.title}`);
    }
    assert.ok(
      elements(html, 'meta').some((m) => m.name === 'robots' && (m.content ?? '').includes('noindex')),
      'the printed copy is not indexed',
    );
    const emergency = readOut(`${locale}/emergency/index.html`);
    assert.ok(emergency.includes(`/${locale}/emergency/print/`), 'the emergency page links to the printable copy');
  }
});

// A new Ed25519 pair for one test, created in memory. Nothing is stored.
function testKey(): { pem: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    pem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKey: Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url').toString('base64'),
  };
}

// Every JavaScript file the build wrote, as one string.
function readJavaScript(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .map((entry) => {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) return readJavaScript(path);
      return entry.name.endsWith('.js') ? readFileSync(path, 'utf8') : '';
    })
    .join('\n');
}

test('GT07 an Ed25519 signature verifies a manifest only under the key that made it, and only unchanged', async () => {
  const key = testKey();
  const manifest = await buildManifest('en', [{ path: '/a/', bytes: encode('page a') }], '2026-11-06');
  const signed = signManifest(manifest, key.pem);
  assert.equal(await verifySignature(signed, signed.signature, key.publicKey), true);
  assert.equal(await verifySignature(signed, signed.signature, testKey().publicKey), false, 'another key');
  const other = await sha256Hex(encode('other page'));
  const changedFile = { ...signed, files: signed.files.map((file) => ({ ...file, sha256: other })) };
  assert.equal(await verifySignature(changedFile, signed.signature, key.publicKey), false, 'a changed file');
  const changedVersion = { ...signed, version: 'other' };
  assert.equal(await verifySignature(changedVersion, signed.signature, key.publicKey), false, 'a changed version');
  assert.equal(await verifySignature(signed, null, key.publicKey), false, 'no signature');
  assert.equal(await verifySignature(signed, undefined, key.publicKey), false, 'no signature field');
  assert.equal(await verifySignature(signed, signed.signature, ''), false, 'no key');
  assert.equal(await verifySignature(signed, 'not base64!', key.publicKey), false, 'malformed signature');
  assert.equal(await verifySignature(signed, Buffer.alloc(64).toString('base64'), key.publicKey), false, 'zero signature');
  assert.equal(await verifySignature(signed, signed.signature, Buffer.alloc(31).toString('base64')), false, 'short key');
  assert.equal(base64ToBytes('AAE=')?.byteLength, 2);
  assert.equal(base64ToBytes('A'), null);
});

test('GT07 build output: every pack is signed, the signature verifies, and the site ships the public key that signed it', async () => {
  const bundle = readJavaScript(resolve(OUT, '_next', 'static'));
  for (const locale of LOCALES) {
    const manifest = manifestOf(locale);
    assert.ok(
      manifest.signature && manifest.publicKey,
      `${locale} pack is signed: build with npm run build:test, or set the signing keys for npm run build`,
    );
    assert.equal(await verifySignature(manifest, manifest.signature, manifest.publicKey), true, `${locale} signature`);
    assert.ok(bundle.includes(manifest.publicKey), `${locale}: the site's JavaScript contains that public key`);
  }
});

test('G-18 build output: the worker is built with the same trusted key as the pages, so it can check a stored file', () => {
  const sw = readOut('sw.js');
  assert.doesNotMatch(sw, /const TRUSTED_KEY = '';/, 'the key placeholder is replaced at build time');
  for (const locale of LOCALES) {
    const { publicKey } = manifestOf(locale);
    assert.ok(publicKey, `${locale} pack is signed`);
    assert.ok(sw.includes(`const TRUSTED_KEY = '${publicKey}';`), `${locale}: sw.js trusts the key that signed the pack`);
  }
});
