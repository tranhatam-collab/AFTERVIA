import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, elements, readOut } from './helpers.ts';

// GT12: the emergency guidance and the contact list stay separate from anything commercial, so a failed shop,
// supplier or payment service cannot break them. This guard stops a future import from crossing that line.
const GUARDED = [
  'app/[locale]/emergency',
  'app/[locale]/help',
  'lib/emergency',
  'lib/help',
  'components/NetworkStatus.tsx',
];
const FORBIDDEN = /(commerce|shop|checkout|payment|affiliate|supplier|stripe|cart)/i;
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function sourceFiles(dir: string): string[] {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => sourceFiles(join(dir, name)));
}

test('GT12 the emergency and contact code never imports commerce, payment or supplier modules', () => {
  const files = GUARDED.flatMap((dir) => sourceFiles(dir)).filter((f) => /\.(ts|tsx|mjs|js)$/.test(f));
  assert.ok(files.length >= 5, 'the guarded source files are found');
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(IMPORT)) {
      const spec = match[1] ?? match[2] ?? '';
      assert.doesNotMatch(spec, FORBIDDEN, `${relative(ROOT, file)} imports ${spec}`);
    }
  }
});

test('GT12 the emergency and contact pages load only same-origin scripts and stylesheets, so no outside service is needed', () => {
  const pages = [
    'en/emergency/index.html',
    'en/emergency/flood-safety/index.html',
    'vi/emergency/heat-safety/index.html',
    'en/help/us/index.html',
    'vi/help/vn/index.html',
  ];
  for (const page of pages) {
    const html = readOut(page);
    for (const script of elements(html, 'script')) {
      if (script.src) assert.ok(script.src.startsWith('/'), `${page} loads ${script.src}`);
    }
    for (const link of elements(html, 'link')) {
      if (link.rel === 'stylesheet' && link.href) assert.ok(link.href.startsWith('/'), `${page} styles ${link.href}`);
    }
  }
});
