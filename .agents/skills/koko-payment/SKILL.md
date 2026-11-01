---
name: koko-payment
description: Safely work on KOKOwedding booking and payment systems, including payment proof, verification, rejection, booking status, admin authorization, Firestore transactions, and audit logs.
---

# KOKO Payment

## Critical rules
- Payment is a critical system.
- Inspect existing implementation before modifying it.
- Preserve the existing Admin API architecture.
- Do not bypass `requireAdminApi`.
- Do not weaken Firebase or server-side authorization.
- Do not move payment verification back to client-side Firestore writes.
- Do not expose secrets.
- Do not modify production environment variables.
- Preserve the relationship between bookings and payments.

## Verify
Check:
- Admin authentication
- booking/payment relationship
- payment status
- proof URL
- booking status
- Firestore transaction logic
- audit logs
- null/undefined handling
- unauthorized access
- duplicate verification/rejection

## Verification commands
Run:
1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`

Do not claim success unless the relevant command actually passes.
