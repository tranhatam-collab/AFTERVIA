# LOCAL CLI COMMANDS — RUN ONLY IN AN AUTHORIZED CLAUDE CODE SESSION

1. Update tool / verify auth if installed:

```bash
claude --version
claude auth status
git status --short --branch
git remote -v
```

2. Open Claude Code in the verified repository (do not run from `main` empty-root):

```bash
claude
```

Paste the entire contents of `commands/01_FOUNDER_MASTER_COMMAND.md` into Claude once, or ask it to read that file *if you have already copied it into the repo*. Then configure `.claude/loop.md` in the repository, after verifying it does not conflict with existing loop settings.

3. Local repetition (works only while the CLI session remains open):

```text
/loop 15m
```

or with an explicit prompt:

```text
/loop 15m Kiểm tra và thực hiện một bước phát triển AFTERVIA an toàn theo backlog/loop protocol, verify và ghi receipt; không mở writer thứ hai.
```

Do not run multiple local loops that change the same branch.

4. Cloud routine setup (independent of local session, if available to the account):

```text
/schedule
/schedule list
```

Use `/schedule` interactively to create exactly ONE routine `AFTERVIA-AUTODEV`, schedule hourly, select ONLY repo `tranhatam-collab/AFTERVIA`, and paste the content of `commands/02_CLOUD_ROUTINE_PROMPT.md` into Instructions. Once configured, confirm the routine exists in the UI and run one controlled dry run. For autonomy with cloud **writing**, FIRST pause the old local/send_later writer; otherwise configure the routine to be read-only monitoring. Minimal intervals / availability depend on Anthropic product settings.

Use the GUI if CLI lacks access: https://claude.ai/code/routines

5. Routine management (only after the routine exists):

```text
/schedule list
/schedule update
/schedule run
```

These commands may open interactive selection; they do not prove a routine was created until the scheduler confirms. To pause use the Cloud Routines web UI toggle; to stop local `/loop`, use session task cancellation as described in Claude Code docs. Do not configure routine-to-routine self-triggering.

6. Audit read-only command for any session:

```text
Kiểm tra PR #1 và CI tại exact HEAD. So sánh backlog, 46 acceptance IDs, current artifacts, các P0/P1 tồn đọng, test coverage đầy đủ và blockers. Không sửa, push, merge, hoặc tạo lịch. Báo những việc đã chứng minh và chưa chứng minh.
```

7. If you need automated noninteractive CLI in an approved sandbox, refer to Claude Code `claude -p`/Agent SDK and enforce budget, permission allowlist and timeout OUTSIDE model, never use `--dangerously-skip-permissions` as a substitute for safeguards.
