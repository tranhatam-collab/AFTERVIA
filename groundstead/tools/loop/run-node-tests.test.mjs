// G-25: the runner keeps the real error message of each failed test, in its console output and in the JSON report.
// The failing test is a temporary fixture in a new temp folder, so the repo never holds a failing test.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';

const RUNNER = resolve(dirname(fileURLToPath(import.meta.url)), 'run-node-tests.mjs');
const dir = mkdtempSync(join(tmpdir(), 'gs-runner-'));
after(() => rmSync(dir, { recursive: true, force: true }));

test('G-25 a failing test keeps its real message in the console output and in the JSON report', () => {
  // A random marker per run: the check proves this exact message travelled, not a fixed string.
  const marker = `G25-marker-${randomBytes(6).toString('hex')}`;
  const fixture = join(dir, 'fails-on-purpose.test.mjs');
  writeFileSync(
    fixture,
    [
      "import { test } from 'node:test';",
      "import assert from 'node:assert/strict';",
      `test('fails on purpose', () => { assert.equal('${marker}', 'other'); });`,
      '',
    ].join('\n'),
  );
  const report = join(dir, 'report.json');
  // node:test sets NODE_TEST_CONTEXT in the processes it starts; a nested run() then skips every file.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;

  const run = spawnSync(process.execPath, [RUNNER, '--out', report, fixture], { encoding: 'utf8', env });

  assert.equal(run.status, 1, 'the runner exits 1 when a test fails');
  assert.ok(`${run.stdout}${run.stderr}`.includes(marker), 'the console output shows the failure message');
  const json = JSON.parse(readFileSync(report, 'utf8'));
  const failed = json.testResults[0].assertionResults.find((r) => r.status === 'failed');
  assert.ok(failed, 'the JSON report lists the failed test');
  assert.ok(
    Array.isArray(failed.failureMessages) && failed.failureMessages.some((m) => m.includes(marker)),
    'the JSON report keeps the failure message in failureMessages',
  );
});

// A failing `before` hook is reported by node:test as the generic "failed running before hook"; the real error is its
// `cause`. In CI that hid why 41 browser tests failed (the browser could not start). The runner must show the cause.
test('G-25 a failing before hook shows its real cause, not only "failed running before hook"', () => {
  const marker = `G25-hook-${randomBytes(6).toString('hex')}`;
  const fixture = join(dir, 'hook-fails.test.mjs');
  writeFileSync(
    fixture,
    [
      "import { before, test } from 'node:test';",
      `before(() => { throw new Error('${marker}'); });`,
      "test('never gets to run', () => {});",
      '',
    ].join('\n'),
  );
  const report = join(dir, 'hook-report.json');
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;

  const run = spawnSync(process.execPath, [RUNNER, '--out', report, fixture], { encoding: 'utf8', env });

  assert.equal(run.status, 1, 'the runner exits 1 when a hook fails');
  assert.ok(`${run.stdout}${run.stderr}`.includes(marker), 'the console output shows the hook\'s real error');
  const json = JSON.parse(readFileSync(report, 'utf8'));
  const failed = json.testResults[0].assertionResults.find((r) => r.status === 'failed');
  assert.ok(failed, 'the JSON report lists the test the hook failed');
  assert.ok(failed.failureMessages.some((m) => m.includes(marker)), 'the JSON report keeps the hook\'s real error');
});
