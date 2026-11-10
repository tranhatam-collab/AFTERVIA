import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanDir } from '../tools/checks/bundle-secret-scan.mjs';
import { OUT } from './helpers.ts';

test('GT01 bundle scan flags secret-shaped values and server-only names in client files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gs-bundle-'));
  mkdirSync(join(dir, '_next'));
  const pem = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
  writeFileSync(join(dir, '_next', 'chunk.js'), `var a=1;\nvar k="${pem}";\n`);
  writeFileSync(join(dir, 'index.html'), `<script>process.env.${['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')}</script>`);
  writeFileSync(join(dir, 'clean.js'), 'export const ok = true;\n');
  const rules = scanDir(dir).map((f: { file: string; rule: string }) => `${f.file} ${f.rule}`).sort();
  assert.deepEqual(rules, ['_next/chunk.js private-key-block', 'index.html server-only-name:SUPABASE_SERVICE_ROLE_KEY']);
});

test('G-21 the bundle scan flags the variable name the pack signing step really reads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gs-bundle-'));
  // The name is the one tools/build/postbuild.mjs reads. It is assembled here so this test file does not contain it.
  const name = ['GROUNDSTEAD', 'PACK', 'PRIVATE', 'KEY'].join('_');
  writeFileSync(join(dir, 'chunk.js'), `var k=process.env.${name};\n`);
  const rules = scanDir(dir).map((f: { file: string; rule: string }) => f.rule);
  assert.deepEqual(rules, [`server-only-name:${name}`]);
});

test('GT01 the real static export contains no secrets and no server-only names', () => {
  assert.deepEqual(scanDir(OUT), []);
});
