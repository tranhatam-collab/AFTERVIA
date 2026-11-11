# 11 Rollback plan

Status: documented. Nothing has been deployed, so there is nothing to roll back in production.

## This commit (docs only)

- The commit adds only `docs/operations/zero-cost-cicd/`. Revert with `git revert <sha>` on `ops/zero-cost-cicd-20261111`. Do not force push, and do not rewrite history.
- No workflow is changed by this commit, so CI is unaffected.
- Branch deletion is an owner action. This writer does not delete branches, PRs or workflows.

## Default-branch docs collision

- The default branch head 2759b23 already has 14 files in the same directory under different names [V, see 01].
- If the other set is kept, do not merge this branch.
- If this branch was merged by mistake, revert the merge commit with `git revert -m 1 <merge-sha>`. Do not force push.

## Future workflow changes

- Any change to `.github/workflows/ci.yml` is made on its own branch, one change per commit, so a single revert undoes it.
- Keep the previous file in place until acceptance. Do not delete a workflow file to disable it. Use the Actions UI "disable workflow" control, which is an owner action [I].
- Any change that alters a check name, or that adds `cancel-in-progress` to a required check, is held until the owner has read the branch protection and required-check settings (UNKNOWN now).

## Pages and DNS (future, not performed)

- Nothing is published. WEB-02 is BLOCKED [I], and publication needs HUM-WEB-03 sign-off [V, docs/plan/06 line 47].
- Cloudflare Pages rollback procedure: UNVERIFIED. Cloudflare docs could not be reached (see 05). Do not rely on it until verified.
- DNS: a single subdomain record for `aftervia.iai.one` would be the only change. Removing that record is the rollback. No nameserver change is authorized [I].

## Triggers for rollback

- A CI change that makes a previously green required check fail on `main`.
- A change that starts runs on feature-branch pushes (push trigger widened beyond `main`).
- Any change that causes a secret to be printed or stored outside the approved names.
