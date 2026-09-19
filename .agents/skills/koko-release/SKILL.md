---
name: koko-release
description: Pre-release verification for KOKOwedding. Check source changes, TypeScript, lint, build, authentication, payment, admin APIs, and configuration without deploying.
---

# KOKO Release

## Before release
Inspect:
- `git status`
- changed files
- unexpected files
- environment usage
- API routes
- authentication
- admin authorization
- payment
- booking
- R2 integration

## Required checks
Run:
1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`

## Rules
- Do not deploy automatically.
- Do not modify `.env` files.
- Do not run destructive Git commands.
- Do not run `git reset --hard`.
- Do not run `git clean`.
- Do not delete untracked files.
- Report failures honestly.

## Final report
Provide:
- TypeScript result
- Lint result
- Build result
- Files changed
- Potential risks
- Whether the project is ready for the next step
