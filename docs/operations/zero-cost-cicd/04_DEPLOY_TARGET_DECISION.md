# 04 Deploy target decision

Status: BLOCKED (see 13). This is a recommendation. No deploy was made, and no Cloudflare, DNS, billing or production setting was changed.

## Chosen route

- CI verify gate: GitHub-hosted runners (`ubuntu-latest`), as already in `.github/workflows/ci.yml`. Route C. No self-hosted runner is proposed or authorized.
- Static frontends (apps/landing, apps/web, groundstead export): Cloudflare Pages through the Git integration (route A). Only after the CI gate is green on the relevant head, and only with the owner approvals listed in 13.
- Postgres: external managed Supabase (route C, not Cloudflare). The production project is not in the repo.
- API (services/api): no production deploy configuration exists [I]. Hosting is undecided, and the owner must choose it.
- Mobile (apps/mobile): not applicable to Cloudflare. No web target and no distribution config in the repo [I].

## Why this route

- The verify gate runs `npm run verify` with a Postgres 16 service container and a Playwright e2e step [V, ci.yml read]. The service-container jobs need a runner that offers service containers. Cloudflare Pages and Workers build environments are not confirmed to offer them [U, Cloudflare docs unreachable, see 05].
- The API is a node:http server on the pg driver and is not Workers-compatible as shipped [I]. A move to Workers would need a rewrite, which is a separate owner decision.
- The database stays in Supabase, which is outside Cloudflare [I].

## Component decisions

| Component | Route | Status | Blocker | Owner permission needed |
|---|---|---|---|---|
| CI verify gate (ci.yml) | C | BLOCKED | No job has started since 2026-11-10T17:58:37Z (see 02) | Read billing, Actions settings, rules; re-run from UI |
| Postgres service container in CI | C | BLOCKED | Inherits the CI block. Throwaway test database only. | None beyond the CI items |
| apps/landing | A | BLOCKED | WEB-02 blocked on Pages permission (D15) and iai.one DNS (D14) [I]; publication gated on HUM-WEB-03 lawyer review [V, docs/plan/06 line 47] | Pages project creation; DNS record decision; written legal sign-off |
| apps/web | A | HOLD | No production API origin in the repo. `/v1` is proxied only by the Vite dev server [I]. CSP `connect-src 'self'` [V] | Production API origin decision; Pages approval |
| groundstead | A | HOLD | Exists only on PR #2's head [V]. Not on the default branch [V]. No `_headers` on that branch [I] | Owner decides which branch carries it; separate Pages project |
| services/api | C (undecided) | HOLD | No deploy config [I] | Name the production API host and DB connection method |
| supabase | C | HOLD | Production project ref and region not in repo; no `supabase/config.toml` tracked [I] | Name the production project; approve any production migration as a separate action |
| apps/mobile | D | NOT_APPLICABLE | No deploy config [I] | Decide whether mobile release is in scope |
| packages, tools, tests | D | NOT_APPLICABLE | No deploy target | None |

## Overall

BLOCKED. Route C is the only route that fits the current verify gate. Route A is secondary and static-only. It cannot start until the CI gate is green and the owner approvals in 13 are given.

## What changes if the CI Postgres job cannot run on Cloudflare

CI stays on GitHub-hosted runners. The database stays on Supabase. Cloudflare would host only static frontends. Moving the API to Workers would need a rewrite and a separate decision.
