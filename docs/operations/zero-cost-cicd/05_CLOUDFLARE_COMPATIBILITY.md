# 05 Cloudflare compatibility

Status: UNVERIFIED for every Cloudflare claim below. No Cloudflare tool or account access exists in this session.

## Access check [V]

- Command: `curl -sS -o /dev/null -m 15 -w 'HTTP %{http_code}\n' https://developers.cloudflare.com/pages/`
- Result: `curl: (56) CONNECT tunnel failed, response 403`. Exit code 56. HTTP 000.
- The proxy refused the tunnel. Per the proxy's rules, this session does not route around a policy denial. Cloudflare docs could not be checked. Owner may allow the host if docs verification is wanted.

Every statement about how Cloudflare Pages reads `_headers`, how Pages build settings work, or whether Workers support a given driver is [U] general knowledge that was not checked against Cloudflare docs.

## Per component

### apps/web (Vite SPA)

- Output: `apps/web/dist`, built by `vite build --config apps/web/vite.config.ts` [I].
- The root `verify` script includes `build:web` and exits 0 locally [V, package.json and 02-verify.log exit line].
- `apps/web/public/_headers` exists [V]. Its CSP includes `connect-src 'self'` [V].
- The `/v1` API path is proxied only by the Vite dev server to `AFTERVIA_LOCAL_API_URL` or `http://127.0.0.1:8787` [I]. Production routing for `/v1` is UNKNOWN. A cross-origin API would require a CSP change.

### apps/landing

- Static: no JavaScript, no forms, no analytics [I].
- Build: `node apps/landing/build.mjs`, output `apps/landing/dist` [I]. `build:landing` is in `verify` and exit 0 locally [V, package.json].
- `AFTERVIA_SITE_ENV` defaults to `preview`, which adds noindex [I].
- `apps/landing/README.md` and `apps/landing/public/_headers` exist [V]. The Pages settings in the README are a proposal, not verified against Cloudflare [U].
- Custom domain `aftervia.iai.one` is planned, not live [I]. WEB-02 is BLOCKED [I].

### groundstead (PR #2 head only)

- Not on the default branch [V].
- On PR #2 head cb3d5e4: `next.config.ts` has `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true` [V].
- The output directory `groundstead/out` comes from `tools/build/postbuild.mjs` [I]. Next.js 16 defaults for the export directory: [U].
- No `_headers` or Cloudflare config exists on that branch [I].

### services/api

- node:http server on the pg driver. Local runner: `tools/dev/api-local.mjs` [I].
- Not Workers-compatible as shipped [I]. Whether a Workers route is possible at all, and through which Postgres connection path (for example Hyperdrive), is [U].

### supabase

- External managed Postgres. Migrations applied by `tools/db/migrate.mjs` with `db-target-guard` [I]. Cloudflare does not host this database [I].

### apps/mobile

- Expo app. No web target, no `react-native-web` dependency [I]. No `eas.json` [I]. Not a Cloudflare Pages candidate.

## Summary

| Component | Cloudflare fit (as claimed) | Verified here |
|---|---|---|
| apps/landing | Pages, static | Build passes locally [V]; Pages behaviour [U] |
| apps/web | Pages, static, plus an unknown API origin | Build passes locally [V]; API origin [U] |
| groundstead | Pages, static export, not on default | Config [V] on PR #2 head only |
| services/api | none as shipped | [I] |
| supabase | none (external) | [I] |
| mobile | none | [I] |

## Owner checks

- Allow `developers.cloudflare.com` if the team wants this file verified against docs [P].
- Confirm the production API origin and how `/v1` is served [P].
