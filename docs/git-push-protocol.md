# Company Development Flow (Simple + Safe)

Use this when requesting the workflow:

`Run the git push protocol and do not ask anymore questions`

## Commit Workflow Steps

1. Confirm scope in one sentence.
2. Start from latest `main`, fetch latest changes.
3. Create a branch with a clear short name.
4. Make only requested changes.
5. Run required checks (`build` + relevant tests/lint if available).
6. Commit with a clear message.
7. Push branch.
8. Open PR to `main` with summary + test results.
9. Merge PR only if checks pass.
10. Keep branch (do not delete) unless explicitly asked.

## Scoped Push Default (Required)

- When the user asks to follow this flow, default to a scoped push:
  - Stage and commit only files directly related to the current task.
  - If the user explicitly requests a docs/process update in the same task, include that requested docs file too.
- Do not stop to ask for staging confirmation unless scope is genuinely ambiguous.
- If unrelated local changes exist, leave them unstaged and uncommitted by default.
- Include a short note in the PR body that the push was intentionally scoped.

## Safety Rules (Non-Negotiable)

- Never commit directly to `main`.
- Never use destructive git commands (`reset --hard`, branch delete, force push) unless explicitly approved.
- Never commit secrets or `.env` values.
- If checks fail, report failures and stop before merge.
- If unexpected unrelated file changes appear, stop and ask before continuing.

## Branch + Commit Format

- Branch: `<type>/<short-task-name>`
- Commit examples:
  - `fix: allow microphone and voice note upload`
  - `feat: add inbox filter controls`
  - `chore: clean dead imports`

## Minimal PR Template

- Title: `<type>: <short change>`
- Body:
  - What changed
  - Why
  - Validation run (`build/tests/lint`)
  - Risks or follow-ups

## Expected Output

Return:

1. Branch name
2. Commit hash
3. PR link
4. Merge status
5. Explicit note that branch was kept
