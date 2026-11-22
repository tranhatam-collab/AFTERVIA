# 09 Preview and staging evidence

Status: PENDING. No preview or staging environment exists that this session can verify.

## What is known

- No Cloudflare Pages project was created, and none is recorded in the repo [I, and no Cloudflare access exists, see 05].
- Preview URL: PENDING. Not invented here.
- Deployment ID: PENDING. Not invented here.
- Staging: `docs/plan/00_EXECUTION_PLAN.md` line 56 lists an independent staging environment as an INF-01 item, that is, a thing still to be built [V]. It is not evidence that staging exists.
- Local only: the API default is `127.0.0.1:8787` and the Desk dev server in e2e is `127.0.0.1:5173` [I]. These are local processes on the test machine, not a preview.
- `AFTERVIA_SITE_ENV` defaults to `preview` for the landing build, which adds noindex [I]. That is a build setting, not a deployed preview.

## Needed before this can move

1. Owner grants Cloudflare Pages project creation (D15), with a scoped token kept out of chat and out of the repo [I].
2. Owner chooses the DNS provider for `aftervia.iai.one` (D14) and adds one subdomain record. No nameserver change for the `iai.one` zone is authorized [I].
3. A green CI run on the head to be previewed. None exists now (see 02).
4. Owner decides the production API origin for apps/web (see 05).

Until these are done, every line in this file stays PENDING.
