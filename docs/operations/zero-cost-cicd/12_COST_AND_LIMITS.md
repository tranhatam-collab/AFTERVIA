# 12 Cost and limits

Status: BILLING_UNVERIFIED. No cost figure is stated in this folder.

## Cost facts

- No billing tool is available in this session [V, none in the tool list used].
- Observed usage for run 130: billable UBUNTU total_ms 0, 3 jobs, run_duration_ms 5000 [V]. This does not separate a block from a normal run. Run 123 also shows 0 [I].
- No USD budget figure exists in the repo [V, see 03]. The "65" in the brief is `iteration_budget` 65 in `docs/plan/05_AUTONOMY_STATUS.md` line 61. That is an autonomy-loop count, not money [V]. `docs/plan/backlog.json` line 7 says 126 [V]. The two disagree and neither is a currency amount.
- The 65 USD figure in the brief is not supported by any file read here [V].

## Limits that bound this audit

- No Cloudflare account or tool (05).
- No billing or plan tool (03).
- No ruleset or branch protection reader. Required checks are UNKNOWN.
- No GitHub Environments reader. Environment secrets and protection rules are UNKNOWN.
- CI job logs for run 130 return HTTP 404 [I].
- Network policy blocks `developers.cloudflare.com` (curl exit 56, 403 at CONNECT) [V] and `cdn.playwright.dev` (403) [V]. Not routed around.
- Chromium revision 1254 is not installed in the session (04 log) [V].
- This session did not run `git fetch`, so refs were read as they stood locally. The remote has moved since the brief (see 01).

## Unknowns that affect cost

- Repository visibility (public or private).
- The Actions minutes quota of the owning account or organization.
- Spending limit and payment status.
- Artifact storage quota, if P5 in 06 is ever applied.
- Cloudflare plan limits for Pages builds and any Workers use: UNVERIFIED.
- Supabase plan and production project size: UNKNOWN.

## What would close BILLING_UNVERIFIED

Settings > Billing and plans for the owning account, read by the owner: Actions usage, spending limit, failed-payment notice. Record the figures in a new file. This folder does not state them.
