# KOKO Studio website implementation
Date: 2026-10-11. Scope: local implementation and deployment preparation; production was not deployed.

## Implemented
Next.js App Router / Node runtime reuses Firebase Auth, Firebase custom admin claims and Firestore Admin. Studio data is isolated in new collections; existing booking, gallery, R2 uploader and payment workflows were not replaced. SQLite from D:/pKOKO/server/license-server.cjs was reviewed and was not embedded in a serverless filesystem.

Public product and installation guide: /koko-studio. Account: /account/koko-studio and /account/koko-studio/link. Admin: /admin/koko-studio. Shared UI reads real authenticated APIs and displays an unavailable state when service configuration is absent.

Free costs 0 THB and has no trial end date. Its server policy grants capture, printing, templates only. Desktop cloud is explicitly denied, even when legacy Free plan data contains cloud_sync. Marketing and API use the same FREE_FEATURES source. Free's installation-bound claim remains compatible with Desktop 0.1.27. This does not make the current packaged installer production-ready.

## API routes
All responses have no-store caching and safe error codes/request IDs. Unsupported operations never grant rights.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /v1/desktop/plans | Active Free plan; paid purchase disabled |
| POST | /v1/desktop/licenses/free/claim | Deterministic claim per product/installation |
| POST | /v1/desktop/licenses/activate | Compatibility activation by hashed license key |
| POST | /v1/desktop/leases/refresh | Verify signature/binding and current database state |
| POST | /v1/desktop/licenses/deactivate | Idempotent deactivation |
| POST | /v1/desktop/photo-folders | Deny Free; paid cloud implementation unavailable |
| POST | /v1/desktop/device-authorizations | Require signed, active device possession |
| POST | /v1/desktop/device-authorizations/poll | Consume one-time approval using device secret |
| GET | /api/studio/account/licenses | Owner UID only |
| POST | /api/studio/account/link | Inspect/approve code after Firebase authentication |
| POST | /api/studio/account/licenses/manage | Owner deactivates own device |
| GET | /api/studio/admin/licenses | Custom-claim admin: licenses, plans, audit |
| POST | /api/studio/admin/licenses/manage | Admin revoke/deactivate with atomic audit |
| POST | /api/studio/purchase | Always 503 purchase_unavailable; creates no order/license |
| GET | /api/studio/health | Safe liveness |
| GET | /api/studio/readiness | Signing config, Firestore/schema readiness |

No development issuance route exists. activate does not create a license or infer purchase. Paid payment schemas/provider interface are preparation only; no provider, checkout, webhook or automatic paid issuance exists.

## Firestore schema and transaction rules
- studioSchema/current: explicit migration version and date.
- studioPlans: version, period, amountMinor, currency, deviceLimit, features, active, purchasable, optional photoRetentionDays/photoStorageQuotaBytes.
- studioLicenses: opaque ID, ownerUid or null, product/plan IDs, dates/status, maxDevices, bounded map of active/deactivated devices.
- studioLicenseKeys: SHA-256 license-key document ID mapped to a license; raw keys are never stored or returned.
- studioDeviceAuthorizations: random ID, hashes of user/poll secrets, license/device/name, expiry, approval/consumed state and approved UID.
- studioLinkCodes: SHA-256 user code index.
- studioIdempotency: action/license/device/request scoped hash and completion marker; JWTs are not persisted here.
- studioAuditLogs: actor UID, action, license/device IDs and date; no tokens, signing keys, email or user content.
- studioRateLimits: fixed-minute shared Firestore counter with expiry.
- studioOrders / studioPaymentEvents: typed future contracts; no purchase writes are enabled.

A license document is the transaction seat lock. All reads precede writes. Same-installation Free claims use a deterministic document ID; seat reservation and link ownership checks execute atomically. Ownership commits only after the Desktop polls with the secret generated for that authorization. A guessed device ID alone cannot link an account. A code lasts five minutes; approval and consumption each reject re-use/expiry. Simultaneous approvals for different accounts cannot steal a license.

Device deactivation releases usage; it does not revoke a Free license. The installation can claim again. Revocation is the admin action that stops future claims/refresh; previously signed offline leases remain valid until their signed deadline. This expected offline revocation delay is at most 72 hours. Refresh accepts a valid signed proof after offlineUntil, then checks live expiry/revocation/activation before issuing a fresh lease.

## Configuration, migration and authorization
API defaults to disabled. STUDIO_ENV, STUDIO_FIREBASE_PROJECT_ID, signing config and migration must be set explicitly. Local requires a demo project and both emulators. .env.studio.example contains names and dummy public configuration; generated .env.studio.local is ignored and its private key is never printed.

Firebase ID tokens are checked for revocation and disabled users using the existing helper. Admin requires existing custom claims. Browser operations use Authorization Bearer, not ambient cookies; same-origin validation prevents cross-origin requests and no cross-origin credential allowance is added. Electron Main requests carry no browser Origin. Only configure STUDIO_TRUSTED_CLIENT_IP_HEADER when the hosting proxy overwrites spoofed inbound values; otherwise a conservative shared native-client bucket applies. Errors log only a safe service/code/requestId tuple.

Run migrations explicitly, not at server startup. Migration creates Free/schema only when absent and preserves existing plan features, limits and admin edits. Direct Firestore client access stays denied by the existing catch-all Rules. Owner queries use existing single-field indexes; no compound query was added. Configure scheduled removal of expired link/rate/idempotency docs and audit retention before staging load tests; expired secrets remain unusable even before cleanup.

## Important limits
The web side of device authorization is implemented and locally verified. Desktop 0.1.27 lacks an account-linking UI/IPC bridge. The test uses its real LicenseRuntime against the web handler but is not a packaged-Desktop/hardware test. Admin view currently returns at most 50 records per collection (pagination and policy editing remain later work). Account returns at most 100 licenses.

No staging hostname/project/storage credentials were supplied. Hosting for the Next.js Node runtime remains an owner decision. No production database migration, DNS change, real payment or installer publication occurred. See the sales/installation plan and staging runbook for release gates.
