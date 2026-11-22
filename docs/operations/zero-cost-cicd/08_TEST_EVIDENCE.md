# 08 Test evidence (local)

Status: local verify PASS at the base commit. e2e:web parity PENDING (environment). Remote CI: no run since 2026-11-10T17:58:37Z (see 02).

Logs live in `/tmp/claude-0/-home-user-AFTERVIA/b72e1827-9f46-5de2-9549-972682d822de/scratchpad/ci-parity-logs/`. The logs were reviewed with database URLs redacted. No credential appears in this file.

Code under test: the ops worktree at 6d3a7fc83d1d17e529a09b11c9c43c4cefc7f2db [I, the run was made there per input; the worktree is clean and at that SHA now, V].

## Results

| Step | Command | Exit | Evidence | Label |
|---|---|---|---|---|
| Runtime | `node -v` | n/a | v22.23.4, inside engines `>=22.12 <23` [V] | PASS |
| Install | `npm ci` | 0 | `01-npm-ci.log`: "added 609 packages" and `NPM_CI_EXIT=0` [V] | PASS |
| Verify gate | `TEST_DATABASE_URL=<aftervia_test> npm run verify` | 0 | `02-verify.log` ends with `VERIFY_EXIT=0` [V] | PASS |
| Audit (production, high) | `npm audit --omit=dev --audit-level=high` | 0 [I] | `03-audit-prod-high.log` shows "5 moderate severity vulnerabilities" and no high. The log has no exit marker [V] | UNVERIFIED: exit 0 comes from the input, and the log has no exit marker |
| e2e:web | `npm run e2e:web` with `TEST_DATABASE_URL` set | 1 | `04-e2e-web.log`: "Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1254"; `E2E_EXIT=1` [V] | PENDING, environment |
| Browser install | `npx playwright install chromium` (scratchpad path) | 1 | `05-pw-install.log`: HTTP 403, "request blocked: no rule or allowlist entry allows host cdn.playwright.dev"; `PW_INSTALL_EXIT=1` [V] | environment, policy denial, not routed around |
| e2e diagnostic | same e2e, with a substitute browser (symlink shim) | 0 | `06-e2e-web-diag-substitute-browser.log` reports the steps ok and `E2E_DIAG_EXIT=0` [V] | DIAGNOSTIC ONLY, NOT A PASS |

## What the verify run covered (from `02-verify.log`) [V]

- `check:bundle`: "bundle OK: 69 files match 04_SHA256SUMS.txt".
- `check:secrets`: "secret scan OK: 582 files, 6 rules".
- `typecheck`, `typecheck:mobile`, `build:landing`, `build:web`: ran inside the verify chain, which exited 0.
- `test`: Vitest "Test Files 90 passed | 1 skipped (91)" and "Tests 696 passed | 1 skipped (697)".
- `test:loop`: "# tests 27, # pass 27, # fail 0".

The one skipped test file is `tests/perf/p95-local-run.test.ts`, gated on `AFTERVIA_PERF_RUN=1` [I]. No database-backed test was skipped [I].

## Failures and labels

- No failure in the verify chain at 6d3a7fc. PRE-EXISTING: none established.
- e2e:web exit 1 is ENVIRONMENT. Chromium revision 1254 is absent, and its download is blocked by the proxy policy [V]. This session did not route around the block. Parity for this step is PENDING. To close it, run e2e:web on a machine that can fetch the pinned browser, or use the GitHub e2e-web job once it can start.
- Postgres was not running when the run began, per input. It was started and then accepted connections [I]. The DB guard required the `_test` suffix; the database used was `aftervia_test` [I].

## Remote versus local

- Local verify exit 0 at 6d3a7fc does not explain the remote failures. The remote runs failed in 3 to 7 s with no steps [V for run 130 duration; I for steps]. The cause is UNKNOWN (see 02).
- The head commit of run 130 (cfd371c) claims "verify exit 0 (681 pass / 1 skipped); e2e:web exit 0" [I]. This is a commit message, not a CI result, and it was not checked here.
- PR #1 body claims CI `verify` was green on 5b8b870 (run 41229554503) [I]. Not checked here; it is an author statement and it is not a result for any current head.

## Not run

- `npm run check:mobile-bundle` is not in `verify` [V, package.json] and was not run. It needs the Android bundle step (see D20 in 01).
- Remote CI on any head since 2026-11-10 17:58 UTC: none exists [V].
