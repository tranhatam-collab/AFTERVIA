import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
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

// G-21 remainder: private JWK parameter d and raw Ed25519 seed material. Every key value below is generated at run time
// and written to a temp directory. The PKCS#8 header is the public ASN.1 prefix of an Ed25519 private key, not a secret.
const ED25519_PKCS8_HEADER_HEX = '302e020100300506032b657004220420';

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'gs-bundle-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

function ruleLines(dir: string): string[] {
  return scanDir(dir).map((f: { file: string; rule: string }) => `${f.file} ${f.rule}`).sort();
}

test('G-21 a private JWK d member is rejected in JSON and in JS object form', () => {
  const d = randomBytes(32).toString('base64url');
  const x = randomBytes(32).toString('base64url');
  const dir = fixture({
    'json-form.js': `var k=${JSON.stringify({ kty: 'OKP', crv: 'Ed25519', d, x })};\n`,
    'js-form.js': `var k={kty:"OKP",crv:"Ed25519",x:"${x}",d:"${d}"};\n`,
    'pretty.json': JSON.stringify({ kty: 'OKP', crv: 'Ed25519', d, x }, null, 2),
  });
  assert.deepEqual(ruleLines(dir), ['js-form.js jwk-private-d', 'json-form.js jwk-private-d', 'pretty.json jwk-private-d']);
});

test('G-21 a public JWK without a d member is not flagged', () => {
  const x = randomBytes(32).toString('base64url');
  const dir = fixture({ 'public.json': JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x }) });
  assert.deepEqual(ruleLines(dir), []);
});

test('G-21 raw 32-byte Ed25519 seed in base64 or hex under a seed or private-key name is rejected', () => {
  const seed = randomBytes(32);
  const dir = fixture({
    'hex.js': `var GROUNDSTEAD_SEED_HEX="${seed.toString('hex')}";\n`,
    'b64.js': `const signingSeed = "${seed.toString('base64')}";\n`,
    'named.js': `export const cfg = { privateKeySeed: '${seed.toString('base64url')}' };\n`,
  });
  assert.deepEqual(ruleLines(dir), ['b64.js raw-seed-assigned', 'hex.js raw-seed-assigned', 'named.js raw-seed-assigned']);
});

test('G-21 an Ed25519 PKCS#8 wrapper around a seed is rejected in base64 and hex even without a name', () => {
  const der = Buffer.concat([Buffer.from(ED25519_PKCS8_HEADER_HEX, 'hex'), randomBytes(32)]);
  const dir = fixture({
    'wrap-b64.js': `var w="${der.toString('base64')}";\n`,
    'wrap-hex.js': `var w="${der.toString('hex')}";\n`,
  });
  assert.deepEqual(ruleLines(dir), ['wrap-b64.js ed25519-pkcs8-seed', 'wrap-hex.js ed25519-pkcs8-seed']);
});

test('G-21 the trusted public key and SHA-256 digests that the export carries are not flagged as seed material', () => {
  const pub = randomBytes(32).toString('base64');
  const digest = createHash('sha256').update(randomBytes(16)).digest('hex');
  const dir = fixture({
    'sw.js': `const TRUSTED_KEY = '${pub}';\n`,
    'env.js': `var k=process.env.NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY||"${pub}";\n`,
    'manifest.json': JSON.stringify({ files: [{ path: 'a.html', sha256: digest }] }),
  });
  assert.deepEqual(ruleLines(dir), []);
});

test('GT01 the real static export contains no secrets and no server-only names', () => {
  assert.deepEqual(scanDir(OUT), []);
});
