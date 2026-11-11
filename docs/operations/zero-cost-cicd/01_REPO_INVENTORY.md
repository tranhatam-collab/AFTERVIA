# 01 Repo inventory

Status: BLOCKED (see 13). Branch: ops/zero-cost-cicd-20261111 (no upstream). Base: 6d3a7fc83d1d17e529a09b11c9c43c4cefc7f2db.

Evidence tags used in this folder:
- [V] verified by a command or API call in this session (named inline).
- [I] taken from the workflow input, not re-fetched.
- [U] UNVERIFIED (claim not checked, or the check was blocked).
- [P] PENDING (needs an owner action or a system this session cannot reach).

## Remote state at check time [V]

| Ref | SHA | Check |
|---|---|---|
| ccr-4544c9f7-b1t50m (default branch) | 2759b23ff07eed9ad51dbcd1737adbf2da065c4a | `git ls-remote origin`, exit 0 |
| main | b809781cd8f2894837310320d1c09d7686f0f4da | ls-remote; `git cat-file -t` = commit; `git ls-tree -r` = 0 files |
| ccr-8dbbf147-1ge7hc (PR #2 head) | cb3d5e4bd79eead217f38a79b8c39fe7683d8478 | ls-remote |
| ops/zero-cost-cicd-20261111 | not on remote | ls-remote grep, empty |
| local worktree HEAD | 6d3a7fc83d1d17e529a09b11c9c43c4cefc7f2db | `git rev-parse HEAD` |

The brief said the default head was 6d3a7fc and PR #2 was at 1c55ef7. Both have moved since the brief was written. The object for 2759b23 is not in the local object database, so its ancestry relative to 6d3a7fc was not checked. No fetch was run, because a fetch writes remote-tracking refs that the main checkout also reads.

## Pull requests [V]

- PR #1: open, draft, base `main` (b809781), head `ccr-4544c9f7-b1t50m` (2759b23). 142 commits, 597 changed files, +85450 lines, mergeable_state `clean`, updated 2026-11-11T07:57:20Z. The brief gave the head as 6d3a7fc.
- PR #2: open, draft, base `ccr-4544c9f7-b1t50m` (e447c3e16d570e4648aade094a9b0321b37ccfd0), head `ccr-8dbbf147-1ge7hc` (cb3d5e4). 61 commits, 158 changed files, updated 2026-11-11T07:55:42Z.
- PR #2 body states that the groundstead project is temporary inside AFTERVIA, that it should not be merged into AFTERVIA, and that it is planned to move to a separate repository (decision D-01). This is the author's text [I].

## Overlapping docs path on the default branch [V]

The head commit of 2759b23 (run 42983260429, listed by `mcp__github__actions_list`) says it adds 14 files under `docs/operations/zero-cost-cicd/`. The saved `get_files` output for PR #1 (grep, not printed in full) names these files:

01_README.md, 02_AUDIT.md, 03_BILLING_EVIDENCE.md, 04_ROUTE_DECISION.md, 05_CI_INVENTORY.md, 06_CI_OPTIMIZATION_PLAN.md, 07_SAFE_TEST_AREA.md, 08_TEST_RESULTS.md, 09_CONTROLLED_SWITCH.md, 10_DEPLOY_PROCESS.md, 11_ROLLBACK.md, 12_OWNER_APPROVALS.md, 13_ACCEPTANCE.md, 14_FINAL_REPORT.md.

These names do not match the 14 names in this folder. If this branch is merged into the default branch, two different sets would sit in one directory. Which set is canonical is an owner decision. This writer did not change the other set.

## Components

| Component | Path | Facts | Notes |
|---|---|---|---|
| Root monorepo | `package.json`, `.nvmrc` | engines `node >=22.12 <23` [V]; `.nvmrc` = 22 [V]; `verify` = check:bundle, check:secrets, typecheck, typecheck:mobile, build:landing, build:web, test, test:loop [V]; `check:mobile-bundle` = `node tools/checks/mobile-bundle.mjs`, not in `verify` [V] | Local node v22.23.4 [V] |
| apps/web (Web Desk) | `apps/web/public/_headers` | file present [V]; CSP line includes `default-src 'none'` and `connect-src 'self'` [V] | Production API origin not in repo [I] |
| apps/landing | `apps/landing/README.md`, `apps/landing/public/_headers` | both present [V] | Build via `apps/landing/build.mjs` [I]; WEB-02 blocked [I] |
| apps/mobile (Expo) | `apps/mobile` | no `eas.json`, no react-native-web [I] | No web target [I] |
| services/api | `services/api` | node:http on pg driver [I] | No production deploy config [I] |
| supabase | `supabase/migrations` | 33 entries at 6d3a7fc [V, ls-tree count] | Range 0000 to 0032 [I]; production project not in repo [I] |
| packages/domain, packages/i18n, packs/countries, tools/, tests/ | as named | consumed as source [I] | Covered by the root verify gate |
| groundstead | `groundstead/` | absent at 6d3a7fc [V, `ls-tree -d` count 0]. On PR #2 head cb3d5e4: `groundstead/next.config.ts` sets `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true` [V] | Not on the default branch [V] |

Decision IDs (D14, D15, D20, D21, D22) cited in the input: a pattern search of `docs/plan/06_DECISIONS_DELEGATED.md` at 6d3a7fc found no matches [V]. The numbering scheme of that file was not established. Treat these IDs as [U]. The file does say that Cloudflare Pages and `aftervia.iai.one` are allowed only after the content is approved, with lawyer review (HUM-WEB-03) [V, line 47].

## Workflows [V]

- `list_workflows` returns total_count 1: `ci` (id 402791759, active, path `.github/workflows/ci.yml`).
- Workflow id 414146482 (path `BuildFailed`) does not appear in `list_workflows`, but it has 38 runs. See 02.
- `.github` tree at 6d3a7fc holds one file: `.github/workflows/ci.yml`, blob ff44185d99f4111eff5275c56869e9d8891568bc.
- Latest `.github` commit in local history: 7c852c9 (2026-11-10 10:42:54 +0000). Earlier: 79c6273 (2026-11-01), 4b5db22 (2026-10-31).
- `ci.yml` triggers: `pull_request` with no filter; `push` on branch `main` only.
- `ci.yml` jobs: `verify`, `e2e-web`, `groundstead-verify`. All on `ubuntu-latest`. Top-level `permissions: contents: read`. No `timeout-minutes`, no `concurrency`, no `workflow_dispatch`. No `secrets.` references (grep count 0).
- Action pins: `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` and `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`, each with the comment "tag v4". The tag-to-SHA mapping is [U].
- `ci.yml` has 100 lines [V, Read tool].

## Names only

Secrets and variables are listed by name in 10_SECURITY_AND_SECRETS_AUDIT.md. No values appear in this folder.
