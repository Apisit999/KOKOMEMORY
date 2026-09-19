---
name: koko-debug
description: Debug KOKOwedding safely. Inspect existing source first, identify the root cause, make the smallest possible fix, preserve working architecture, then run typecheck, lint, and build.
---

# KOKO Debug

## Rules
- Inspect the actual source before changing anything.
- Do not guess the root cause.
- Do not rewrite or refactor unrelated code.
- Preserve existing architecture and working features.
- Do not change Firebase, Cloudflare R2, authentication, payment architecture, or environment configuration unless explicitly requested.
- Never delete working code just to make an error disappear.
- Prefer the smallest safe fix.

## Verification
After making changes:
1. Run `npx tsc --noEmit`
2. Run `npm run lint`
3. Run `npm run build`
4. Report remaining errors and warnings separately.

## Output
Explain:
- Root cause
- Files changed
- What was changed
- Verification results
- Remaining issues
