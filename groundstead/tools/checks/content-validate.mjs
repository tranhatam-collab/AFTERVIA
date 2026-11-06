#!/usr/bin/env node
// Fails the build when any card, article, source or country pack breaks the content rules.
// Usage: node tools/checks/content-validate.mjs [--content <dir>]
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONTENT_DIR, validateContent } from '../../lib/content/validate.ts';

const flag = process.argv.indexOf('--content');
const contentDir = flag >= 0 ? resolve(process.argv[flag + 1] ?? '') : DEFAULT_CONTENT_DIR;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const report = validateContent({ contentDir });

for (const w of report.warnings) console.warn(`WARN  ${w.file}: ${w.message}`);
if (report.errors.length > 0) {
  for (const e of report.errors) console.error(`ERROR ${e.file}: ${e.message}`);
  console.error(`content check failed: ${report.errors.length} error(s) in ${contentDir.startsWith(root) ? contentDir.slice(root.length + 1) : contentDir}`);
  process.exit(1);
}
const c = report.counts;
console.log(`content OK: ${c.sources} source(s), ${c.cards} card(s), ${c.articles} article(s), ${c.countries} country pack(s), ${report.warnings.length} warning(s)`);
