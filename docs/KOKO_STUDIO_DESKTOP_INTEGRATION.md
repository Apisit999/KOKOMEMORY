# KOKO Studio Desktop integration
Date: 2026-10-12. Desktop account-linking source changes were made in D:/pKOKO and validated with TypeScript plus the full Desktop test suite.

## Verified source contract
Read docs/LICENSE_API_CONTRACT.md, docs/PROJECT_READINESS_REVIEW_TH.md, src/main/services/license-runtime.ts, src/main/license-config.ts, src/shared/license-contract.ts, src/main/services/license-verifier.ts, server/license-server.cjs and src/main/services/koko-memory-client.ts.

Product ID: koko-photobooth. Compact RS256 JWS header: alg RS256, typ JWT, kid. Claims: schemaVersion 1, keyId, licenseId, deviceId, productId, issuedAt, startsAt, expiresAt (ISO/null), refreshAfter, offlineUntil, features. New service retains that contract. Free has capture/printing/templates and expiresAt null. Refresh interval is 24 hours; offline allowance is 72 hours, capped by actual license expiry.

Existing endpoints are now implemented on the website under /v1/desktop: plans, licenses/free/claim, licenses/activate, leases/refresh, licenses/deactivate. Response is { entitlement: "<signed-jws>" }; deactivation is { ok: true }; refresh terminal responses are { state: "revoked" | "expired" | "device_limit" }. Errors contain stable code plus requestId. No dev issuance endpoint is exposed.

## Desktop public configuration
Build Desktop with KOKO_LICENSE_API_BASE_URL pointing to the staging HTTPS site origin and KOKO_LICENSE_TRUSTED_KEYS_JSON containing the staging public PEM map. Keep LICENSE_PRODUCT_ID / configured product equal to koko-photobooth. Actual Desktop license-config reads this public configuration. Never bundle the server private key or Firebase/R2 credentials.

Website server configuration uses STUDIO_SIGNING_KEY_ID, STUDIO_SIGNING_PRIVATE_KEY and STUDIO_TRUSTED_PUBLIC_KEYS_JSON. The latter retains previous public keys during rotation. The public map may be copied to Desktop through a controlled staging build; the private key remains only in server secret configuration.

## Browser-based linking contract (web and Desktop bridge implemented; automated validation passed)
First obtain a valid Free entitlement using the existing claim. Then:
1. POST /v1/desktop/device-authorizations with JSON:
   { "deviceId": "<installation-uuid>", "productId": "koko-photobooth", "entitlement": "<current-signed-jws>", "deviceName": "My booth PC" }
   Response:
   { "authorizationId": "<opaque-id>", "deviceCode": "<secret-poll-code>", "userCode": "ABCDE-12345", "verificationUrl": "https://staging.example.invalid/account/koko-studio/link", "expiresAt": "<ISO>", "pollIntervalSeconds": 5 }
2. Open verificationUrl in the system browser. Display userCode in Desktop. Never put deviceCode/entitlement in a URL or Renderer logs.
3. Logged-in browser POST /api/studio/account/link with Firebase Bearer token and { "action": "inspect", "userCode": "ABCDE-12345" }; response gives deviceName, planId and expiresAt. Show the device, then explicit confirmation POST with action approve.
4. Electron Main polls POST /v1/desktop/device-authorizations/poll with { "authorizationId": "<opaque-id>", "deviceCode": "<secret-poll-code>" }. Pending is { status: "pending" }. Completed is { status: "approved", entitlement: "<signed-jws>" }. Verify the JWS with the same Main verifier before persisting.
5. Approval expires after five minutes, including after browser approval if not consumed. Successful consumption is one time. Invalid secret returns invalid_code; used/expired codes fail. A lost successful poll response requires a fresh link request; do not retry forever or reuse an already consumed code. Respect rate_limited / Retry-After, and stop on expiry.

Implemented in the Desktop working tree: Main-only begin/poll/cancel methods, typed IPC and preload bridge, an Account screen with the one-time user code and approval status, system-browser opening restricted to the configured origin, cancellation on exit, and Main-only storage of the poll secret and returned entitlement. The Renderer does not receive either secret and does not collect website passwords. The independent Free claim remains available.

Desktop verification: `npm.cmd run typecheck` and `npm.cmd run package` passed. All 20 Desktop test files passed, 90/90 tests total, including new account-link coverage for secret isolation, pending/approved states, Retry-After handling, untrusted verification origins, and rejection of an entitlement signed for another device. Browser-based staging approval and installed-app lifecycle remain unverified because no staging endpoint or credentials were available.

Remaining before staging: exercise the packaged Desktop-to-web approval flow against a staging service, then complete the installer and device lifecycle checks in the staging runbook.

Local browser link verification (2026-10-12): the demo emulator flow passed after aligning STUDIO_WEB_ORIGIN and all local fixture URLs to http://127.0.0.1:3040. Browser inspect and approval succeeded, and the demo Desktop consumer received the approved entitlement. The local HTTP test also confirms the configured origin is accepted and a different origin is rejected with origin_denied. This verifies the local path only; staging and packaged Desktop UI remain pending.

The website does not assign an existing installation license to an account based only on deviceId. Signed active entitlement proof starts the request, authenticated browser approval selects the account, and the private poll secret commits ownership. A license already owned by another account is never transferred implicitly.

## Existing booking uploader
KokoMemoryApiClient uses POST init, R2 PUT, PATCH confirm at /api/admin/gallery/{bookingId}/uploads, plus the existing fallback PUT. It sends a stable 32-hex photo ID (local UUID without hyphens), JPEG content type, size and SHA-256. alreadyUploaded skips duplicate upload/confirm. Public gallery guestToken and uploader uploadToken are separate. Existing booking/share scope and token expiry/revocation checks remain in the website.

Tests imported the real Desktop client to verify init/upload/confirm/repeat and the real LicenseRuntime to verify Free/deactivation/offline recovery. The uploader test uses mocked storage responses; it does not prove R2 upload or a real gallery URL. Staging must use a test booking and distinct R2 credentials and verify cross-booking denial, retry, duplicate confirmation and the resulting guest gallery.

## Installer status
0.1.27 Setup.exe: 154504192 bytes.
SHA-256: 7e87419f26b3753e972f306cbaa659c07e3841faf769354d57cd9fba91c64ef8
All four files in SHA256SUMS.txt independently match. Windows Authenticode status: NotSigned.
This is a reviewed candidate, not an approved customer release. No production API/public key, installed-app lifecycle or physical hardware flow was certified. Do not publish it automatically.
