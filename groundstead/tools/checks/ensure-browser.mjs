#!/usr/bin/env node
// Makes sure the Chromium that the pinned Playwright launches exists on this machine, before the browser tests run.
//
// Why: Playwright pins one Chromium revision per version (1.63.0 needs 1243). A browser installed by another
// Playwright version (for example `npx playwright install` run from a different folder, which fetches the newest one)
// is the wrong revision, and every e2e test then fails in its `before` hook with "Executable doesn't exist". This check
// asks the pinned Playwright itself whether it can start, and installs only when the one reason is a missing download.
// A machine that already has the browser downloads nothing.
//
// GS_PLAYWRIGHT_CLI replaces the Playwright CLI; it exists so the test can run without downloading anything.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

async function launchError() {
  try {
    const browser = await chromium.launch();
    await browser.close();
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

const first = await launchError();
if (first === null) {
  console.log('browser ready: the pinned Playwright can start Chromium');
  process.exit(0);
}
if (!/Executable doesn't exist/.test(first.message)) {
  console.error(`browser check failed, and not because a download is missing:\n${first.message}`);
  process.exit(1);
}

console.log("browser missing: the Chromium revision of the pinned Playwright is not on this machine; running 'playwright install chromium'");
const cli = process.env.GS_PLAYWRIGHT_CLI ?? join(dirname(require.resolve('playwright/package.json')), 'cli.js');
const install = spawnSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' });

const second = await launchError();
if (second === null) {
  console.log('browser ready: installed the Chromium revision the pinned Playwright needs');
  process.exit(0);
}
console.error(`The browser still cannot start after 'playwright install chromium' (exit ${install.status}):\n${second.message}`);
process.exit(1);
