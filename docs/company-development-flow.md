# Company Development Flow (Branch + Pull Request)

This is the standard flow to use for every task in this repository.

## Goal

- Keep `main` stable.
- Ship work through reviewed pull requests.
- Minimize merge conflicts by syncing often.

## Branch Rules

- Never commit directly to `main`.
- Create one branch per feature/fix/chore.
- Use clear branch names:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`

## Standard Start of Work

```bash
git checkout main
git pull origin main
git checkout -b feat/your-change-name
```

## During Development

- Make small, focused commits.
- Keep commits scoped to one logical change.
- Commit format:
  - `feat: add inbox filter chips`
  - `fix: prevent empty message submission`
  - `chore: clean unused imports`

```bash
git add .
git commit -m "feat: your commit message"
```

## Keep Branch Conflict-Safe

If your branch is open for more than a few hours, sync it with latest `main` before opening or merging PR:

```bash
git checkout main
git pull origin main
git checkout feat/your-change-name
git rebase main
```

If conflicts happen:

```bash
# fix files manually
git add <fixed-files>
git rebase --continue
```

Then update remote branch:

```bash
git push --force-with-lease
```

## Push Branch

```bash
git push -u origin feat/your-change-name
```

## Open Pull Request on GitHub

- Base branch: `main`
- Compare branch: your feature branch
- Add PR title in conventional format (for example: `feat: add inbox filter chips`)
- Add clear description:
  - What changed
  - Why it changed
  - Any testing done
  - Screenshots for UI work

## PR Checklist (Use Every Time)

- Branch is up to date with latest `main`
- No unresolved conflicts
- App builds and relevant tests pass locally
- No secrets or `.env` values committed
- API keys remain server-side only (API routes)
- UI follows project design system
- PR description includes testing notes

## Merge Rules

- Merge only after review approval and passing checks.
- Prefer `Squash and merge` unless team says otherwise.
- Delete merged branch from remote to keep repo clean.

## After Merge

```bash
git checkout main
git pull origin main
git branch -d feat/your-change-name
```

## If You Need Help

Ask Codex: "Do PR prep now for my current branch."

Codex should then:

- Fetch and sync with `main`
- Rebase your branch
- Resolve conflicts if needed
- Run checks/tests
- Push safely
- Provide a ready-to-paste PR title and description
