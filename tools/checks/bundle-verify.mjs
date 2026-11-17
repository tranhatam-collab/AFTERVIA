#!/usr/bin/env node
// Verifies the imported specification bundle against its own SHA-256 manifest.
// Every file in the bundle except the manifest itself must be listed, and every listed hash must match.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const bundle = join(root, 'docs/spec/AFTERVIA_AZ_2026-10-31');
const manifest = join(bundle, '04_SHA256SUMS.txt');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

if (!existsSync(manifest)) {
  console.error(`missing ${relative(root, manifest)}`);
  process.exit(1);
}

const listed = new Map();
for (const line of readFileSync(manifest, 'utf8').split(/\r?\n/)) {
  const match = /^([0-9a-f]{64})\s{2}(.+)$/.exec(line);
  if (match) listed.set(match[2], match[1]);
}

const failures = [];
for (const [path, expected] of listed) {
  const full = join(bundle, path);
  if (!existsSync(full)) {
    failures.push(`missing file ${path}`);
    continue;
  }
  const actual = createHash('sha256').update(readFileSync(full)).digest('hex');
  if (actual !== expected) failures.push(`hash mismatch ${path}`);
}

const onDisk = walk(bundle).map((p) => relative(bundle, p)).filter((p) => p !== '04_SHA256SUMS.txt');
for (const path of onDisk) if (!listed.has(path)) failures.push(`not in manifest ${path}`);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`bundle OK: ${listed.size} files match 04_SHA256SUMS.txt`);
