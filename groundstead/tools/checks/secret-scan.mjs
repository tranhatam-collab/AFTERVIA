#!/usr/bin/env node
// Lightweight secret scan. Prints file:line and rule names only, never the matched value.
// Default scope: tracked and not-ignored files. Specification documents are excluded because they
// describe secret names without holding values. `--files a b c` scans explicit paths (used by tests).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULES = [
  { name: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'stripe-live-key', re: /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/ },
  { name: 'jwt-like-token', re: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'assigned-secret-literal', re: /\b(?:api[_-]?key|secret|token|password|service[_-]?role[_-]?key)\s*[:=]\s*["'][^"'\s]{12,}["']/i },
];

const SKIP = [/^package-lock\.json$/];

export function scanText(file, text) {
  const findings = [];
  if (text.includes('\u0000')) return findings;
  text.split(/\r?\n/).forEach((line, index) => {
    for (const rule of RULES) if (rule.re.test(line)) findings.push({ file, line: index + 1, rule: rule.name });
  });
  return findings;
}

export function scanFiles(root, files) {
  const findings = [];
  for (const file of files) {
    const full = resolve(root, file);
    if (existsSync(full)) findings.push(...scanText(file, readFileSync(full, 'utf8')));
  }
  return findings;
}

function trackedFiles(root) {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !SKIP.some((re) => re.test(f)));
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const explicit = argv[0] === '--files' ? argv.slice(1) : null;
  const files = explicit ?? trackedFiles(root);
  const findings = scanFiles(explicit ? process.cwd() : root, files);
  if (findings.length > 0) {
    console.error(`secret scan found ${findings.length} location(s):`);
    for (const f of findings) console.error(`${f.file}:${f.line} ${f.rule}`);
    process.exit(1);
  }
  console.log(`secret scan OK: ${files.length} files, ${RULES.length} rules`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
