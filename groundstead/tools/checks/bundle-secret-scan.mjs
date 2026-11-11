#!/usr/bin/env node
// Scans the built client output (default: out/) for secret-shaped values and for names of
// server-only variables. Prints file:line and rule names only, never the matched value.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText } from './secret-scan.mjs';

const TEXT_EXT = new Set(['.js', '.mjs', '.html', '.json', '.txt', '.css', '.xml', '.map', '.webmanifest']);
// Server-only names that must never reach the browser bundle.
// GROUNDSTEAD_PACK_PRIVATE_KEY is the name postbuild.mjs reads (G-21). GS_SIGNING_PRIVATE_KEY was an earlier, unused name; it stays listed.
export const SERVER_ONLY_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROUNDSTEAD_PACK_PRIVATE_KEY',
  'GS_SIGNING_PRIVATE_KEY',
  'VAPID_PRIVATE_KEY',
  'AFFILIATE_API_SECRET',
];

// G-21 remainder: key material that is neither a PEM block nor a server-only name. Bundle-only; the repo-wide scan keeps its rules.
// A JWK object is flat (no nested braces). A private JWK has a kty member and a d member holding a base64url value.
const FLAT_OBJECT = /\{[^{}]*\}/g;
const JWK_KTY = /(?:"kty"|\bkty)\s*:/;
const JWK_PRIVATE_D = /(?:"d"|\bd)\s*:\s*["'`][A-Za-z0-9_-]{16,}["'`]/;
// A 32-byte seed (64 hex, or 43 or 44 base64) looks the same as the trusted public key and as a SHA-256 digest,
// and the export legitimately carries both. So this rule needs a name that says what the value is.
const RAW_SEED_ASSIGNED = /(?:seed|private[_-]?key)[\w"'-]*\s*[:=]\s*["'`](?:[0-9a-fA-F]{64}|[A-Za-z0-9+/]{43}=|[A-Za-z0-9_-]{43})["'`]/i;
// The PKCS#8 header that wraps a 32-byte Ed25519 seed. It is caught without a name, in aligned base64 or in hex.
const ED25519_PKCS8_SEED = [/MC4CAQAwBQYDK2VwBCIE/, /302e020100300506032b657004220420/i];

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scanKeyMaterial(file, text) {
  const findings = [];
  for (const m of text.matchAll(FLAT_OBJECT)) {
    if (JWK_KTY.test(m[0]) && JWK_PRIVATE_D.test(m[0])) findings.push({ file, line: lineOf(text, m.index), rule: 'jwk-private-d' });
  }
  text.split(/\r?\n/).forEach((line, i) => {
    if (RAW_SEED_ASSIGNED.test(line)) findings.push({ file, line: i + 1, rule: 'raw-seed-assigned' });
    if (ED25519_PKCS8_SEED.some((re) => re.test(line))) findings.push({ file, line: i + 1, rule: 'ed25519-pkcs8-seed' });
  });
  return findings;
}

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (TEXT_EXT.has(extname(name))) files.push(full);
  }
  return files;
}

export function scanDir(dir) {
  const findings = [];
  for (const file of walk(dir)) {
    const rel = relative(dir, file);
    const text = readFileSync(file, 'utf8');
    findings.push(...scanText(rel, text));
    findings.push(...scanKeyMaterial(rel, text));
    text.split(/\r?\n/).forEach((line, i) => {
      for (const name of SERVER_ONLY_NAMES) if (line.includes(name)) findings.push({ file: rel, line: i + 1, rule: `server-only-name:${name}` });
    });
  }
  return findings;
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const dir = resolve(root, argv[0] ?? 'out');
  const findings = scanDir(dir);
  if (findings.length > 0) {
    console.error(`bundle secret scan found ${findings.length} location(s):`);
    for (const f of findings) console.error(`${f.file}:${f.line} ${f.rule}`);
    process.exit(1);
  }
  console.log(`bundle secret scan OK: ${walk(dir).length} files in ${relative(root, dir) || '.'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
