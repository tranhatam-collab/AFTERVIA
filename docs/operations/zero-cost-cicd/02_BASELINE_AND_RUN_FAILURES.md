# 02 Baseline and run failures

Status: BLOCKED (see 13). Root cause: UNKNOWN. No hypothesis is chosen as the cause.

## Summary

- The last `ci.yml` run that was created is run 130 (created 2026-11-10T17:58:37Z). Nothing has started a `ci.yml` job since then [V, `list_workflow_runs` for workflow 402791759 returns total_count 130, newest first].
- Runs under workflow id 414146482 (path `BuildFailed`) continue. The newest one seen was created 2026-11-11T07:57:23Z [V].
- No head has CI evidence. That includes the default head 2759b23, PR #1 head 2759b23 and PR #2 head db3c5b1 (snapshot at 08:07Z) [V].

Tags: [V] checked this session. [I] from the input, not re-fetched.

## Timeline

| Time (UTC) | Event | Run | Source |
|---|---|---|---|
| 2026-10-31 14:39:10 | First `ci.yml` run | run_number 1, id 41211121487 | [I] |
| 2026-11-10 10:49 to 10:51 | Verify step ran and failed (the last failing run that reached a test step) | run 114, id 42802436427 | [I] |
| 2026-11-10 12:11:03 | Last green `ci.yml` run, about 238 s | run 123, id 42813577068 | [I] |
| 2026-11-10 16:50:31 | First fast failure (about 4 s) | run 124, id 42858669998 | [I] |
| 2026-11-10 17:47:53 to 17:47:58 | Fast failure | run 126, id 42868601856 | [I] |
| 2026-11-10 17:50:42 to 17:50:46 | Fast failure, head 7ea9f1d (PR #2 branch) | run 128, id 42869079792 | [V] |
| 2026-11-10 17:54:19 to 17:54:23 | Fast failure, head 959bc77a (PR #1 branch) | run 129, id 42869686754 | [V] |
| 2026-11-10 17:58:37 to 17:58:42 | Fast failure, head cfd371c, 5 s | run 130, id 42870398639 | [V] |
| 2026-11-11 03:32:36 | First `BuildFailed` run (startup_failure), push, head e01552604f | run 1, id 42953442721 | [V] |
| 2026-11-11 07:39:56 | `BuildFailed` run 30 | id 42981142104 | [I] for time; [V] present in listing |
| 2026-11-11 07:44:17 | `BuildFailed` run 32 | id 42981674218 | [I] for time; [V] present in listing |
| 2026-11-11 07:45:44 | `BuildFailed` run 34, pull_request, head 1c55ef7 | id 42981857703 | [V] |
| 2026-11-11 07:55:42 | `BuildFailed` run 35, push, head cb3d5e4 | id 42983065150 | [V] |
| 2026-11-11 07:55:46 | `BuildFailed` run 36, pull_request, head cb3d5e4 | id 42983072933 | [V] |
| 2026-11-11 07:57:21 | `BuildFailed` run 37, push, head 2759b23 | id 42983260429 | [V] |
| 2026-11-11 07:57:23 | `BuildFailed` run 38, pull_request, head 2759b23 | id 42983265445 | [V] |

## Run-level facts

- Run 130 (42870398639): three jobs (verify, e2e-web, groundstead-verify). Head cfd371c. `get_workflow_run` and `get_workflow_run_usage` confirm it ran 5000 ms. Billable UBUNTU total_ms is 0, and each of its three job durations is 0 [V]. Job IDs: 130019832406, 130019832914, 130019833069 [V]. Job log download returned HTTP 404 [I].
- Run 128, 129, 130 each show created and updated times 4 to 5 s apart [V].
- Run 114 (42802436427) is the last run that reached a test step. Its verify step `Run npm run verify` ran 10:50:28 to 10:51:16 and failed [I].
- Run 123 (42813577068) reached `Run npm run verify` and `Run npm run e2e:web`, and succeeded [I].
- The head commit of run 130 says "verify exit 0 (681 pass / 1 skipped); e2e:web exit 0". This is the commit author's claim [I], not a CI result.

## BuildFailed runs (workflow id 414146482) [V]

- total_count 38. Run numbers 1 to 38, contiguous.
- Conclusion: `startup_failure` for all 38 runs [V, grep of the saved listing].
- Events: 19 `pull_request`, 19 `push` [V].
- Push events occur on `ccr-*` branches. `ci.yml` triggers `push` on `main` only [V, Read of ci.yml lines 5 to 6]. So these runs are not produced by the `ci.yml` file in the tree as it stands.
- Each run shows 0 jobs and a duration of 0 s [I, from input; the listing shows created and updated times equal, which fits].

## Hypotheses (none verified)

H1: a workflow definition that GitHub could not build (for the BuildFailed runs). Not checkable from this session. Evidence for: path literally `BuildFailed`; workflow entity is listed as deleted [I]; no `ci.yml` push runs on `ccr-*` branches exist. Evidence against: no other workflow file exists in any tree this session can see [V]. Owner check: open run 42953442721 and read the run banner for a file and line.

H2: an account or organization block before job dispatch (billing, spending limit, or Actions disabled). Not checkable from this session. Evidence for: a clean break at 16:50Z on 2026-11-10, with the workflow file unchanged; failing jobs show no steps. Evidence against: no message is readable. Billable total_ms is 0 for the green run 123 too [I], so that field does not separate a block from a normal run. Owner check: read Settings > Billing and plans, and the Actions settings.

H3: a repository or organization Actions policy, ruleset, or required workflow change that blocks job start. Not checkable from this session (no tool reads rulesets). Owner check: Settings > Rules, Settings > Actions, and the audit log from 2026-11-10T12:00Z to 2026-11-11T08:00Z.

H4: GitHub-hosted runner availability or an Actions incident. Weak. The failures are consistent over about 8 hours and the BuildFailed runs use no runner at all [V, 0 jobs]. The status page could not be read (403 at CONNECT, see 05). Rank low unless an incident is listed.

H5: a content problem in `ci.yml`. Rejected by evidence. Blob ff44185d99f4111eff5275c56869e9d8891568bc is the same at 6d3a7fc, 2759b23's branch PR #1 head, and the earlier heads named in the input [V for 6d3a7fc; I for others]. No `.github` commit after 7c852c9 exists in the local history [V].

## Owner checks (UI only; the agent does not re-run anything)

1. Open run 42870398639 and read any annotation or message on the `verify` job. Record the text verbatim.
2. Open run 42953442721 and read the run banner.
3. Billing and plans for the owning account: Actions usage, spending limit, failed-payment notice. Until read, cost statements stay BILLING_UNVERIFIED.
4. Repository and organization Actions settings: enabled, allowed-actions policy, workflow permissions. Check the audit log from 2026-11-10T12:00Z to 2026-11-11T08:00Z.
5. Rules and required workflows for `ccr-4544c9f7-b1t50m`, `ccr-8dbbf147-1ge7hc`, and `main`.
6. Ask the owner to decide which branch carries the groundstead project and whether PR #1's base should change (PR #1 targets `main`, which is an empty root commit).
7. GitHub status page for Actions, 2026-11-10T16:30Z to 18:30Z and 2026-11-11T03:00Z to 08:00Z [P, blocked here, see 05].

Re-running CI is an owner action from the Actions UI, after items 1 to 5 are read. This folder does not re-run anything.
