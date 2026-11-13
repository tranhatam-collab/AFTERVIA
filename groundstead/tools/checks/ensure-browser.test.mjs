// CI incident 13/11/2026: the e2e tests need the exact Chromium revision of the pinned Playwright (1.63.0 needs 1243),
// but the CI step that installed a browser ran from the repo root and fetched the newest Playwright's revision (1254),
// so 41 tests failed in their `before` hook. `ensure-browser.mjs` makes the gate check, and if needed install, the
// browser the pinned Playwright needs. These tests use a stand-in for the Playwright CLI so nothing is downloaded.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), 'ensure-browser.mjs');
const dir = mkdtempSync(join(tmpdir(), 'gs-browser-'));
after(() => rmSync(dir, { recursive: true, force: true }));

// A stand-in CLI: it records how it was called and installs nothing.
function standIn(name) {
  const log = join(dir, `${name}.log`);
  const cli = join(dir, `${name}-cli.mjs`);
  writeFileSync(
    cli,
    ["import { appendFileSync } from 'node:fs';", `appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(' ') + '\\n');`, ''].join('\n'),
  );
  return { cli, log };
}

function runScript(env) {
  const clean = { ...process.env };
  delete clean.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env: { ...clean, ...env } });
}

test('CI-browser a machine without the pinned browser gets one `playwright install chromium`, and a clear failure if it is still missing', () => {
  const empty = mkdtempSync(join(dir, 'empty-browsers-'));
  const { cli, log } = standIn('missing');

  const run = runScript({ PLAYWRIGHT_BROWSERS_PATH: empty, GS_PLAYWRIGHT_CLI: cli });

  assert.equal(readFileSync(log, 'utf8'), 'install chromium\n', 'the CLI was called exactly once, to install chromium');
  assert.equal(run.status, 1, 'the stand-in installed nothing, so the gate fails instead of letting 41 tests fail later');
  const output = `${run.stdout}${run.stderr}`;
  assert.ok(output.includes('still cannot start'), 'the failure says the browser still cannot start');
});

test('CI-browser a machine that already has the pinned browser installs nothing', () => {
  const { cli, log } = standIn('present');

  const run = runScript({ GS_PLAYWRIGHT_CLI: cli });

  assert.equal(run.status, 0, `the gate passes: ${run.stdout}${run.stderr}`);
  assert.equal(existsSync(log), false, 'the CLI was not called');
  assert.ok(`${run.stdout}${run.stderr}`.includes('browser ready'), 'the output says the browser is ready');
});
