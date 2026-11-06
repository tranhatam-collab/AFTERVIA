#!/usr/bin/env node
// Scans the built client output (default: out/) for secret-shaped values and for names of
// server-only variables. Prints file:line and rule names only, never the matched value.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText } from './secret-scan.mjs';

const TEXT_EXT = new Set(['.js', '.mjs', '.html', '.json', '.txt', '.css', '.xml', '.map', '.webmanifest']);
// Server-only names that must never reach the browser bundle.
export const SERVER_ONLY_NAMES = ['SUPABASE_SERVICE_ROLE_KEY', 'GS_SIGNING_PRIVATE_KEY', 'VAPID_PRIVATE_KEY', 'AFFILIATE_API_SECRET'];

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
