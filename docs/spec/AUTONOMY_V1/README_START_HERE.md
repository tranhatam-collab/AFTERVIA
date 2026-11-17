# AFTERVIA Claude Code Autonomy v1.0

This package contains INSTRUCTIONS, not code already installed into AFTERVIA. It does not mean Claude has been configured or a schedule has been created. Use it with the current actual repo, verifying latest commits.

## Fast start
1. Open current Claude Code session on the actual AFTERVIA development branch. Paste `commands/01_FOUNDER_MASTER_COMMAND.md` as one mandate. Ask Claude to reconcile it with existing `docs/plan` rather than overwrite existing policies.
2. For the ongoing local loop, copy `.claude/loop.md` into project only after checking for an existing file and merging conservatively; call `/loop 15m` in a session you will keep open. Do not create a second writer if send_later is already active.
3. For cloud independence, create ONE Cloud Routine (hourly) at https://claude.ai/code/routines with `commands/02_CLOUD_ROUTINE_PROMPT.md` and the exact repo. The current default `main` was reported empty-root: routine MUST fetch the development branch. If existing loop is active, use routine as read-only or pause old writer first. Test one run before enabling ongoing writes.
4. For independent security review, paste `commands/04_READ_ONLY_AUDIT.md` into another session; it cannot push.
5. Use `commands/05_STOP_OR_RESUME.md` to stop or restart safely.

## Key product facts requiring verification
- Project branch according to latest user report: `ccr-4544c9f7-b1t50m`.
- PR draft: https://github.com/tranhatam-collab/AFTERVIA/pull/1.
- `main` empty-root: **not app source**.
- Work order sequence before new evidence: WO04-02 -> WO04-03 -> WO07-01.
- 46 acceptance IDs in prior specification; several only partial; do not claim whole app is already done.
- No guarantee of 100% business outcomes, revenue, IP registration, legal approval or unattended unlimited quota.

## Files
- `commands/01_FOUNDER_MASTER_COMMAND.md` — comprehensive order / limits / DoD.
- `commands/02_CLOUD_ROUTINE_PROMPT.md` — cloud recurring agent prompt.
- `commands/03_LOCAL_CLI_COMMANDS.md` — verified commands and setup.
- `.claude/loop.md` — local CLI loop instructions.
- `commands/04_READ_ONLY_AUDIT.md` — separate independent audit.
- `commands/05_STOP_OR_RESUME.md` — stop/resume instructions.
- `templates/STATUS_TEMPLATE.md` — report receipt.

Official documentation:
https://code.claude.com/docs/en/routines
https://code.claude.com/docs/en/scheduled-tasks
https://code.claude.com/docs/en/cli-reference
