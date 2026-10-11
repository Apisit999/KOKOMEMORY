# KOKO Studio local and staging runbook
Date: 2026-10-11. Production deploy and DNS changes are outside this delivery.

## Local isolated verification (Windows PowerShell)
Node 24 is installed. Java 21 portable was provisioned in ignored .local-tools/java21/jdk-21.0.12.1+1-jre for Firebase Emulator; it does not change the machine-wide Java installation.
1. Create local-only credentials once: node scripts/studio-local-config.mjs
   It refuses to overwrite existing .env.studio.local. The demo RSA private key is ignored and not printed.
2. In terminal A set Java PATH, then start emulators:
   $javaBin = (Resolve-Path '.local-tools/java21/jdk-21.0.12.1+1-jre/bin').Path
   $env:PATH = $javaBin + [IO.Path]::PathSeparator + $env:PATH
   npx.cmd --yes --package=firebase-tools firebase emulators:start --only auth,firestore --project demo-kokomemory-local --config firebase.json
3. Run explicit additive migration: npm.cmd run studio:migrate
   Repeating it preserves plan settings and returns changed false.
4. In terminal B: npm.cmd run studio:dev
   Opens loopback port 3040 using .next-studio-local, so another dev server need not be stopped.
5. Unit/contract tests: npm.cmd run test:studio
6. Actual Auth/Firestore/Next tests:
   $env:STUDIO_TEST_EMULATORS = 'true'
   node.exe --env-file=.env.studio.local --experimental-strip-types --test tests/studio/emulator.test.ts
7. Browser fixtures: node scripts/studio-browser-fixture.mjs
   Credentials/codes are stored only in ignored output/studio/browser-fixture.json. Use them in the real login form, inspect/approve the device code, then node scripts/studio-consume-browser-link.mjs. Never paste fixture secrets into reports.
8. Validate npm.cmd exec -- tsc --noEmit, npm.cmd run lint and npm.cmd run build.
9. Close only test browser/emulator/dev processes you started; preserve any pre-existing server. Local emulator state is disposable and does not persist unless explicitly exported.

Next.js may generate AGENTS.md/CLAUDE.md and add local build type paths to tsconfig. Those instructions point to the bundled Next guides. Demo tests never create production accounts or upload real customer photos.

## Staging prerequisites
Owner must provide/approve the Next.js Node hosting target, staging HTTPS origin, distinct Firebase project with Auth/Firestore, server identity/secret store, and a distinct R2 bucket/test booking. Static-only hosting cannot run the API. SQLite is not required by this implementation.

Use .env.studio.example as the variable inventory. STUDIO_ENV=staging; STUDIO_WEB_ORIGIN=https://<staging-host>; STUDIO_FIREBASE_PROJECT_ID must equal the configured FIREBASE_PROJECT_ID. Set STUDIO_LICENSE_ENABLED=true only after staging migration/config review. Remove emulator environment variables and NEXT_PUBLIC_FIREBASE_USE_EMULATORS. Public Firebase config is staging-only; private Firebase/signing/R2 config belongs in the server secret store.

Generate a staging RSA key pair (2048+). Use a unique STUDIO_SIGNING_KEY_ID, store private PEM via secret configuration and distribute only public PEM to a staging Desktop build. Configure a trusted client IP header only with platform-guaranteed sanitization; do not accept arbitrary x-forwarded-for as proof of origin. Enforce HTTPS and no credentialed cross-origin access. Browser APIs use revoked-token checked Firebase Bearer tokens and same-origin checks.

## Backup, migration and deployment sequence
1. Record deployment revision, Firebase/R2 inventory and schema version. Export Firestore using the managed backup/export service to a restricted backup bucket. Back up R2 objects/metadata and verify retention/access; do not include raw private keys in general backups.
2. Rehearse restore into a separate staging project/bucket and compare document counts plus a sample of booking/gallery/photo metadata. Record recovery point and time.
3. For staging migration set STUDIO_ENV=staging, GCLOUD_PROJECT to the staging project and STUDIO_MIGRATION_PROJECT_CONFIRM to that same explicit ID. Authenticate using staging Application Default Credentials; then run node --experimental-strip-types scripts/studio-migrate.ts. No production migration command is enabled by this script.
4. Deploy the prepared revision to staging with server-only secrets; apply existing Firestore Rules/indexes after review. Do not expose client writes to studio collections. Migration is not part of server startup.
5. Check /api/studio/health (200) and /api/studio/readiness (200 only when signing/database/schema are ready); errors must not reveal configuration. Purchase must return purchase_unavailable and no dev issuance route may exist.
6. Schedule expiration cleanup for studioRateLimits, studioIdempotency and code/authorization documents. Retain audit events per owner-approved policy. Current expiry fields are ISO strings; use a bounded scheduled cleanup job or a reviewed migration to Firestore TTL timestamp fields, not an unvalidated TTL policy.
7. Build Desktop with the staging API origin/public key. Verify real network Free claim, restart, deactivate/reclaim, revoked/expired denial, device limit and online refresh after offline grace.
8. Verify browser login, cross-account/API denial, code expiry/re-use/concurrent ownership attempts, admin actions and audit records. No passwords enter Desktop.
9. Test JPEG sample capture/template/export/local gallery and Simulate print in the packaged application. Separately test real Windows installer lifecycle: clean install, upgrade preserving user data, uninstall/reinstall/recovery, supported OS and Authenticode signing. No camera/printer success should be inferred from simulation.
10. Test existing uploader against staging test booking/R2 with init/PUT/confirm/retry and a real gallery share link. Verify MIME/size checks and denied wrong booking/share credentials. Keep public guest credential distinct from upload credential.
11. Capture safe logs, screenshots and actual installer checksum. Approve release metadata only after all required checks. macOS stays unavailable until separately verified.
12. Review staging evidence and rollback plan with the owner before any production action.

## Rollback and key rotation
Roll back the web/API revision first and disable STUDIO_LICENSE_ENABLED if necessary. Schema migration is additive and preserves plan edits; never delete new or old customer data to roll back code. Use approved backups only when a confirmed recovery point is needed. Restore rehearsal and production restore remain external operational work.

For signing-key rotation first distribute the new public key to supported clients, then change active server keyId/private key and keep the old public key in STUDIO_TRUSTED_PUBLIC_KEYS_JSON. Verify both key generations in staging. Retire an old key only after supported clients have updated and lease/offline windows are covered.

## Paid launch gate
No payment provider/checkout/webhook is selected or enabled. Final owner pricing and entitlement policy, provider signature verification, server reconciliation, idempotent order/event processing, renewal/refund/chargeback handling and rollback evidence are required before removing the unconditional purchase-disabled gate.
