# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Overview

`koko-wedding` (KOKO Memory): a Next.js 16 (App Router, Turbopack) / React 19 site for a wedding photobooth business. Customer-facing booking, gallery/portfolio, 3D-printing quotes/orders, an admin back office, and the "KOKO Studio" desktop-licensing backend. UI copy is mostly Thai. Backend is Firebase Auth + Firestore (Admin SDK in route handlers) and Cloudflare R2 for uploads; email via Resend. Path alias `@/*` → `src/*`. There is no git repo in this checkout.

## Commands

```bash
npm ci                    # npm is the lockfile of record in practice (pnpm-lock.yaml also exists)
npm run dev               # next dev --turbopack on :3000, uses .env.local
npm run build             # next build --turbopack
npm run lint              # eslint (warnings about <img> are pre-existing)
npx tsc --noEmit          # typecheck (no script for it)
npm run test:auth         # node:test via --experimental-strip-types
npm run test:studio
# single test file / test name:
node --experimental-strip-types --test tests/studio/service.test.ts
node --experimental-strip-types --test --test-name-pattern="rotation" tests/studio/*.test.ts
```

Tests import `.ts` files directly with explicit extensions (Node type-stripping, no bundler), so `src/lib/studio/*` must stay free of `@/` aliases and non-erasable TS syntax (enums, parameter properties).

### Isolated local stack (no real data)

`.env.studio.local` (gitignored; template `.env.studio.example`) points everything at the demo project `demo-kokomemory-local` and the Firebase emulators.

```bash
# needs Java on PATH; firebase.json defines auth :9099, firestore :8080
npx firebase-tools emulators:start --only firestore,auth --project demo-kokomemory-local
npm run studio:dev        # scripts/studio-start-local.mjs → dev server on http://127.0.0.1:3040, build dir .next-studio-local
STUDIO_TEST_EMULATORS=true npm run test:studio   # enables emulator.test.ts (skipped otherwise)
```

`studio-start-local.mjs` refuses to start unless `STUDIO_ENV=local`, `GCLOUD_PROJECT=demo-kokomemory-local` and the origin is exactly `http://127.0.0.1:3040`. Plain `npm run dev` reads `.env.local`, which points at the real `koko-wedding` Firebase project, so avoid write-testing with it. `.env.staging` holds the staging project's config for deployment (`docs/KOKO_STUDIO_STAGING_RUNBOOK.md`). `studio:migrate` needs `STUDIO_MIGRATION_PROJECT_CONFIRM`.

## Architecture

- **Routes** live in `src/app`: public pages, `account/*` (customer, Firebase Auth), `admin/*`, and `api/*` route handlers. Handlers set `runtime = "nodejs"` and `dynamic = "force-dynamic"`.
- **Auth model**: browser uses the Firebase client SDK (`src/lib/firebase.ts`); every protected API re-verifies a Bearer ID token server-side. Customer routes use `customer-api-auth.ts` / inline `verifyIdToken(token, true)` and require a verified email. Admin routes call `requireAdminApi` (`src/lib/require-admin-api.ts`), which accepts only Firebase custom claims (`admin`, `isAdmin`, or `role === "admin"`), never Firestore profiles. `scripts/set-admin.ts` grants the claim. `firestore.rules` restricts client reads to document owners; all writes go through Admin SDK routes.
- **Server is the source of truth for money and availability.** `/api/booking/create` ignores client pricing: it recomputes package price (`src/data/booking-packages.ts`), travel fee and deposit (`src/data/booking-pricing.ts`), rejects mismatches with 409, and uses a Firestore transaction with a `bookingDates/{date}` lock plus a 30-minute payment hold (`pending_payment` → expired/released). Booking IDs are a hash of uid + `clientRequestId` for idempotency. Closed dates are hard-coded in that route. Lifecycle helpers: `booking-lifecycle.ts`, `three-d-order-lifecycle.ts`, `three-d-payment-admin.ts`.
- **Thai address data** comes from the `geothai` package via `src/data/thailand/localized-areas.ts`; the province string value (Thai name) is what the API validates against.
- **Storage**: `src/lib/r2.ts` / `storage.ts` wrap R2 (public bucket + private bucket for payment slips and 3D files; slips are served through authenticated routes such as `/api/payment-slip/[paymentId]`).
- **`src/services/*`** are client-side Firestore/API wrappers per domain (booking, gallery, portfolio, 3D); `src/lib/firebase-admin.ts` exports `adminDb`/`adminAuth` for server code.
- **KOKO Studio licensing** (`src/lib/studio/*`, entry `api/studio/[...path]` and desktop-facing `v1/desktop/[...path]`): RS256-signed entitlements with key IDs (`crypto.ts`), `service.ts` holds license/device logic against an abstract store (`firestore-store.ts` in production, `tests/studio/memory-store.ts` in tests), `http.ts` enforces origin, auth, body size and a durable rate limiter, `migration.ts` is the data migration. Gated by `STUDIO_LICENSE_ENABLED`; trusted public keys are a JSON map by key ID so keys can be rotated. Product design and verification notes are in `docs/KOKO_STUDIO_*.md`.
- `PHOTO_SEARCH_ENABLED=true` is required for `/search` (otherwise 404). `tools/windows-uploader` is a separate desktop uploader; `.agents/skills` holds project skills (debug, payment, release, security).
