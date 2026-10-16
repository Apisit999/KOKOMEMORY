---
name: koko-security
description: Security review for KOKOwedding, focusing on Firebase Auth, Admin APIs, Firestore, Cloudflare R2, payment proof files, user ownership, and access control.
---

# KOKO Security

## Review areas
- Firebase Authentication
- Admin authorization
- `requireAdminApi`
- Firestore access
- API authorization
- user ownership / IDOR
- booking access
- payment access
- payment proof URLs
- Cloudflare R2 uploads
- public/private file exposure
- secrets and environment variables
- server/client boundaries

## Rules
- Review before modifying.
- Do not invent security vulnerabilities.
- Show evidence from the actual source.
- Distinguish confirmed issues from recommendations.
- Never print secrets.
- Never weaken authorization to make a feature work.

## Output
For each finding report:
- Severity
- File
- Relevant code
- Why it matters
- Safe fix
- Regression risk

If no issue is found, say so clearly.
