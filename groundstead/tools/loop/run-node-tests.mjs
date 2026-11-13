#!/usr/bin/env node
// Runs node:test files and writes a Vitest-shaped JSON report so tools/loop/matrix.mjs can read GT ids
// from real runs of the loop/check tooling (before Vitest exists, and for .mjs tools afterwards).
// Usage: node tools/loop/run-node-tests.mjs --out .loop/node-tests.json <test files...>
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { run } from 'node:test';

// The real message of a failed test, as written by the test (G-25). Never replaced by a generic placeholder
// when the test gave one.
function oneMessage(error) {
  if (error && typeof error === 'object' && typeof error.message === 'string') return error.message;
  return error === undefined ? 'failed without an error message' : String(error);
}

// node:test reports a failed `before` hook as the generic "failed running before hook" and keeps the real error in
// `cause`. Follow the chain (bounded, cycle-safe) so the log says why, e.g. that the browser could not start.
function failureMessage(error) {
  const lines = [oneMessage(error)];
  const seen = new Set();
  let cause = error && typeof error === 'object' ? error.cause : undefined;
  while (cause !== undefined && cause !== null && !seen.has(cause) && seen.size < 5) {
    seen.add(cause);
    lines.push(`caused by: ${oneMessage(cause)}`);
    cause = typeof cause === 'object' ? cause.cause : undefined;
  }
  return lines.join('\n');
}

export async function collect(files) {
  const results = [];
  const stream = run({ files: files.map((f) => resolve(f)) });
  for await (const event of stream) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    if (event.data.details?.type === 'suite') continue;
    const skipped = Boolean(event.data.skip || event.data.todo);
    const status = skipped ? 'skipped' : event.type === 'test:pass' ? 'passed' : 'failed';
    const failureMessages = status === 'failed' ? [failureMessage(event.data.details?.error)] : [];
    results.push({ title: event.data.name, status, file: event.data.file ?? '', failureMessages });
  }
  return results;
}

async function main(argv) {
  const outIndex = argv.indexOf('--out');
  const out = outIndex >= 0 ? argv[outIndex + 1] : '.loop/node-tests.json';
  const files = argv.filter((a, i) => a !== '--out' && i !== outIndex + 1);
  const results = await collect(files);
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const report = {
    numTotalTests: results.length,
    numPassedTests: passed,
    numFailedTests: failed,
    numPendingTests: skipped,
    success: failed === 0 && results.length > 0,
    testResults: [
      {
        name: 'node:test',
        assertionResults: results.map(({ title, status, failureMessages }) => ({ title, status, failureMessages })),
      },
    ],
  };
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  for (const r of results.filter((x) => x.status === 'failed')) {
    console.error(`FAIL ${r.title} (${r.file})`);
    for (const message of r.failureMessages) console.error(message.split('\n').map((line) => `  ${line}`).join('\n'));
  }
  console.log(`node tests: ${passed} passed, ${failed} failed, ${skipped} skipped → ${out}`);
  if (!report.success) process.exit(1);
}

main(process.argv.slice(2));
