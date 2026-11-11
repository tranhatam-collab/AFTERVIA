# 03 Actions usage audit

Status: BLOCKED (see 13). Cost: BILLING_UNVERIFIED.

## Sample

- The brief used a sample of 30 of 160 runs. That is now out of date.
- This session's listing shows 168 workflow runs in total [V, `total_count` 168 on the unfiltered run list]. That equals ci.yml 130 plus BuildFailed 38 [V, both `total_count` values].
- All 38 BuildFailed runs were listed and grouped [V].
- The three newest ci.yml runs (128, 129, 130) were read [V].
- The per-run conclusions for all 130 ci.yml runs come from the input, not re-counted here: failure 78, success 52 [I].

## Usage data

- Run 130 (42870398639): `get_workflow_run_usage` returns billable UBUNTU total_ms 0, jobs 3, run_duration_ms 5000 [V].
- Run 123 (green): the input says its usage also reports total_ms 0 [I]. Zero billable time does not prove that nothing was charged, and it does not prove a block.
- No runner was assigned to run 130 jobs (runner_id 0, empty runner_name) [I].

## Cost

- BILLING_UNVERIFIED. No billing tool is available in this session. No cost figure is stated.
- No USD budget appears in the repo. A grep of `docs/plan` at 6d3a7fc for `USD` finds only a valuation scenario in `docs/plan/03_BUNDLE_AUDIT.md` (lines 12 and 37), which is not a budget [V].
- The "65" in the brief refers to `iteration_budget` 65 in `docs/plan/05_AUTONOMY_STATUS.md` line 61. That is an autonomy-loop count, not money [V].
- `docs/plan/backlog.json` line 7 has `iteration_budget` 126 at 6d3a7fc [V]. The two values disagree. Neither is a USD figure.

## Unknowns

- Repository visibility (public or private): UNKNOWN.
- Actions minutes quota and any spending limit: UNKNOWN.
- Artifact storage: none is used by ci.yml [V, no upload step]. Storage quota: UNKNOWN.
- Playwright browsers are downloaded on every e2e-web and groundstead-verify run and are not cached [V, ci.yml lines 66 to 67 and 89 to 91].

## What the owner must read

Settings > Billing and plans for the owning account: Actions usage, spending limit, any failed-payment notice. Until this is read, any cost statement stays BILLING_UNVERIFIED.
