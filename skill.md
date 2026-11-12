Git commit
Run git status and git diff --staged (if nothing is staged, look at git diff and ask whether to stage all).
If the changes cover unrelated concerns, suggest splitting into separate commits.
Write a Conventional Commit message:
Subject: type(scope): summary — imperative, max 72 chars. Types: feat, fix, refactor, docs, test, chore, perf, style.
Body (only if needed): why the change was made, not a list of every line changed.
Never commit secrets, .env files, or large build artifacts; warn if staged.
Commit only when the user asked to commit; otherwise just output the message.

Systematic debugging
Find the root cause before changing code. Do not guess-and-patch.

Steps
Reproduce: get the exact error message, stack trace, or steps. If missing, ask for them once.
Locate: search for the failing function/message (grep) instead of reading many files.
Hypothesize: list at most 2-3 likely causes, ranked.
Test the top hypothesis with the smallest check (log, print, single test, serial monitor output for hardware).
Fix the root cause with the minimal change. No unrelated refactors.
Verify: rerun the repro or test. Add a regression test when the project has tests.
Output
Root cause (1-2 sentences), the fix, and how it was verified. If two attempts fail, stop and report what was ruled out instead of trying random changes.