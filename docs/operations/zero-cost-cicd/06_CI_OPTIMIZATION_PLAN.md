# 06 CI optimization plan

Status: PROPOSED, NOT APPLIED. No file under `.github/` was changed. The binding rules forbid it, and CI cannot run here to verify a change. Each proposal needs owner approval and a green run before it is trusted.

Read against the current `ci.yml` [V, Read of 100 lines]. Check names must stay the same, because required-check settings are UNKNOWN [U].

## Proposals

### P1. Job timeouts (PROPOSED, NOT APPLIED)

Jobs currently inherit the 360-minute GitHub default [V: no `timeout-minutes` in ci.yml]. A hung Postgres or Playwright step holds runner time.

```yaml
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
  e2e-web:
    runs-on: ubuntu-latest
    timeout-minutes: 20
  groundstead-verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
```

Risk: a value that is too low gives false red on slow runners, and a timed-out job fails a required check. Calibrate from several green runs first. Run 123 took about 238 s in total [I].

### P2. Cancel superseded pull-request runs (PROPOSED, NOT APPLIED)

Each push currently queues an independent run [V: no `concurrency` key].

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Risk: a cancelled run may read as a non-success and block merge under required checks. Confirm required checks first (UNKNOWN). Main-branch pushes are not cancelled.

### P3. workflow_dispatch so the owner can re-run from the UI (D22, PROPOSED, NOT APPLIED)

```yaml
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
```

Low risk. Check names do not change. Owner decision required; D22 has no reply [I].

### P4. Playwright browser cache (PROPOSED, NOT APPLIED)

Browsers are downloaded on every run [V, ci.yml lines 66 to 67 and 89 to 91]. `--with-deps` still installs system packages on each run, so the saving is partial.

```yaml
      - name: Cache Playwright browsers
        uses: actions/cache@<SHA-TO-VERIFY> # tag v4: pin UNVERIFIED
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - name: Install the browser Playwright expects
        run: npx playwright install --with-deps chromium
```

The new action must be SHA-pinned. The placeholder `<SHA-TO-VERIFY>` is intentionally not filled in.

### P5. Upload e2e output on failure (PROPOSED, NOT APPLIED)

`tools/e2e` writes screenshots and a summary to `.loop/e2e`, which CI does not keep [I].

```yaml
      - name: Upload e2e output on failure
        if: failure()
        uses: actions/upload-artifact@<SHA-TO-VERIFY> # tag v4: pin UNVERIFIED
        with:
          name: e2e-loop-output
          path: .loop/e2e
          retention-days: 7
```

Confirm first that the screenshots hold no real data [I]. Artifact storage quota is UNKNOWN.

### P6. Dependency cache for groundstead (PROPOSED for when groundstead lands, NOT APPLIED)

The setup-node cache is keyed on the root lockfile [V]. Groundstead has its own lockfile [I].

```yaml
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # pin as in ci.yml; tag mapping UNVERIFIED
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: |
            package-lock.json
            groundstead/package-lock.json
```

No change is needed while groundstead is absent.

### P7. groundstead-verify reports green with nothing verified (owner decision, NOT APPLIED)

When `groundstead/package.json` is absent, the job prints "nothing to verify" and passes [V, ci.yml lines 80 to 88]. Options, all needing an owner decision:
- keep as is, and document the job as a no-op on the default branch;
- make the job neutral or skipped in that case;
- fail when the branch is expected to carry groundstead.

A pass-to-fail change turns a required check red on the default branch. Do not apply without a decision.

### P8. Path filters (NOT RECOMMENDED NOW)

A workflow skipped by `paths:` never reports its required check, so the PR stays pending. If ever used, add a gate job with the same check names that always reports.

### P9. e2e-web on every PR (owner decision, NOT APPLIED)

e2e-web installs Chromium and runs the full web e2e on every PR [V]. Options: keep it required but cached (P4), or run it on push to main and on `workflow_dispatch` and remove it from required checks. Dropping the PR gate removes a check that catches web regressions before merge.

### P10. Digest pin for the postgres service image (PROPOSED, NOT APPLIED)

The service uses the tag `postgres:16` [V]. Pin it to a digest in line with the SHA-pinned actions. The digest is `<TO-VERIFY>`. It cannot be checked from this session.

### P11. Verify the action SHA-to-tag mapping (required before trusting P4 to P6)

The pins for `actions/checkout` and `actions/setup-node` have comments that say "tag v4". The mapping is [U]. The action repositories are not attached to this session. A wrong SHA makes every job fail.

### P12. Keep `push` limited to `main`

Already the case [V]. No change. Recorded as a constraint: the BuildFailed runs show push and pull_request pairs on the same SHAs [V, 19 push events], and the push trigger must not be widened to feature branches.

## Not proposed

No self-hosted runner. Any self-hosted runner needs explicit owner authorization and a security review, including fork PRs and runner hygiene.
