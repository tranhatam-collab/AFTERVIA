# 10 Security and secrets audit

Status: names only. No secret value was read, printed or copied into this folder. Where a file holds a literal value, this audit names the variable and does not reproduce the value.

## Variables referenced by `.github/workflows/ci.yml` [V]

| Name | Where | Value kind | Note |
|---|---|---|---|
| `POSTGRES_PASSWORD` | service container env, in `verify` and `e2e-web` (2 occurrences) | literal, throwaway | Local service only. The literal value is in the file. Not reproduced here. |
| `POSTGRES_DB` | service container env (2 occurrences) | literal, `aftervia_test` | Test database name only. |
| `TEST_DATABASE_URL` | job `env` in `verify` and `e2e-web` (2 occurrences) | literal DSN to localhost | Points at the throwaway service. Contains a literal throwaway credential. Not reproduced here. |

- `ci.yml` contains zero `secrets.` references [V, grep count 0].
- No environment-level secret and no repository variable is read by `ci.yml` [V].
- The owner should confirm that no production DSN is ever stored as a CI variable [P]. The workflow does not reference one [V].

## Variables referenced by code and config [I, names from the input; no value read]

`DATABASE_URL`, `TEST_DATABASE_URL`, `AFTERVIA_LOCAL_DATABASE_URL`, `AFTERVIA_LOCAL_JWT_SECRET`, `AFTERVIA_LOCAL_PORT`, `AFTERVIA_LOCAL_APP_ENV`, `AFTERVIA_LOCAL_API_URL`, `AFTERVIA_SITE_ENV`, `AFTERVIA_PERF_RUN`, `AFTERVIA_E2E_PLAYWRIGHT`, `EXPO_PUBLIC_API_BASE`, `AI_PROVIDER`, `APP_ENV`, `BILLING_WEBHOOK_SECRET`, `HAWK_API_KEY`, `GITHUB_OUTPUT` (runner-provided).

Named in docs only: `CLOUDFLARE_API_TOKEN` (docs/plan, D15). Not set in this session, and no repo file uses it [I].

`EXPO_PUBLIC_*` values are embedded in a mobile build by design. They are not secrets [I, general practice, not checked here].

## Secret scanning

- Local: `tools/checks/secret-scan.mjs` is part of `npm run verify`. The verify log reads "secret scan OK: 582 files, 6 rules" inside a run that exited 0 [V, 02-verify.log]. This is a local result for the tree at 6d3a7fc. It is not a remote scan.
- GitHub secret scanning state for the repository: UNKNOWN. No read tool was used for it, and the run-scan tool was not invoked.

## Action pins

- `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` and `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` are pinned to SHAs [V].
- Their comments say "tag v4". The SHA-to-tag mapping is UNVERIFIED. The action repositories are not attached to this session.
- The `postgres:16` service image is pinned by tag only, not by digest [V].

## Permissions

- Top-level `permissions: contents: read` [V]. No job raises it.

## Dependency audit

- `npm audit --omit=dev --audit-level=high` is a CI step [V]. Locally, the output lists 5 moderate vulnerabilities and no high [V]. Exit 0 is per input [I].
- The audit output suggests `npm audit fix --force`. Do not run it. The input states it would move `expo` to a breaking major version.

## Fork and pull-request exposure

- No secret is referenced in `ci.yml` [V], so a pull request from a fork gets no secret through this workflow. The repository-level fork policy is UNKNOWN.

## Findings for the owner

1. Literal throwaway credentials sit in `ci.yml` (see table). They are local to the service container. Consider generated values. Not changed here.
2. The `postgres:16` image is not digest-pinned. See 06 P10.
3. Action SHA-to-tag mapping is unverified. See 06 P11.
4. No production credential is referenced anywhere in the CI path [V].
