# Git Push Protocol (No Follow-Up Questions)

Use this trigger:

`Follow docs/git-push-protocol.md`

## Default Behavior (Required)

- Do not ask whether to include unrelated tracked file changes.
- Always stage and commit all tracked changes in the working tree for that push.
- Keep this behavior as the default for future runs when this protocol is referenced.

## Execution Steps

1. Confirm intent in one sentence.
2. Fetch latest `main`.
3. Create a branch from `main` with a clear short name.
4. Run checks (`npx tsc --noEmit`, `npm run build`, plus any task-specific checks).
5. Commit all tracked changes with a clear conventional commit message.
6. Push branch.
7. Open PR to `main` with summary + validation results.
8. Merge PR.
9. Keep branch unless explicitly told to delete it.

## Safety Rules

- Never commit directly to `main`.
- Never run destructive commands (`reset --hard`, force push, branch delete) unless explicitly requested.
- Never commit secrets or `.env` values.
- If checks fail, report failures and the merge risk, then proceed only if explicitly instructed.

## Naming + Messages

- Branch: `<type>/<short-task-name>`
- Commit: Conventional Commit style, concise and specific.
- PR title: `<type>: <short change>`

## Required Final Output

1. Branch name
2. Commit hash
3. PR link
4. Merge commit hash
5. Explicit note that branch was kept
