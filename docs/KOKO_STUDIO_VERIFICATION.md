# KOKO Studio verification record

Date: 2026-10-11 (workspace date).

## Inspected evidence

- Website repository: Next.js 16 / React 19, Firebase Auth, Firestore/Admin, Cloudflare R2 uploader routes. Existing account, booking, gallery and admin routes were present. `firestore.rules` limits user profile/booking client reads to the owner; server Admin SDK routes require explicit authorization.
- Desktop contract: source documents and license runtime inspected in `D:\pKOKO`. Desktop uses RS256 signed entitlement with `kid`; product ID `koko-photobooth`; Free features are capture, printing, templates. Website account linking is absent.
- Desktop readiness review reports 88/88 automated tests and TypeScript check passed for that Desktop work, but explicitly says no production License API/public key, no end-to-end activation, and no actual target-machine/hardware testing. This is a source-document report; tests were not rerun as part of this website change.
- The 0.1.27 release directory contains an installer and a checksum manifest, but the artifact has not been independently re-hashed here and is not approved for publishing.

## Website changes in this implementation

- Added public `/koko-studio` page and central release metadata source. Release metadata currently has no approved artifact, so no download URL is rendered. macOS remains unavailable.
- Added authenticated-layout route `/account/koko-studio` using the existing Firebase Auth account layout. It states that no license is linked because the current Desktop cannot link accounts.
- Added account navigation and links from the existing software page.

## Test status

- Website package exposes `dev`, `build`, `start`, and `lint`; it has no test script or test framework configured.
- Firebase Auth Emulator startup was attempted with isolated demo project `demo-kokomemory-local`; Firebase CLI 15.33.0 stopped because Java is not installed/on PATH. No account was created against production.
- TypeScript: passed with 0 diagnostics using the repository tsconfig.
- ESLint: final full-project run completed with 0 errors and 51 existing warnings. Changed files have no warning/error.
- Production build: `npm.cmd run build` passed. Next.js 16.3.6 (Turbopack) compiled successfully, TypeScript passed, page data collected, and all 67 static pages generated; exit code 0.
- Browser desktop: production build served locally at `http://localhost:3040`; `/koko-studio` rendered expected navigation, Free features, cloud exclusion, and release gate; no download link and no browser console errors.
- Browser mobile (390px): product heading present and document width 380px for a 390px viewport; no horizontal overflow.
- Account access: unauthenticated navigation to `/account/koko-studio` redirected to the existing `/account/login` flow. Signed-in account display was not tested.
- Desktop 0.1.27: `npm.cmd run typecheck` passed. All 19 existing test scripts passed, 88/88 tests total, including license verifier/runtime/server, Free claim repeat and reactivation, cloud denial, device limit, expiry/revoke, KOKOMEMORY init/upload/confirm/retry behavior, connection-secret separation, capture/storage/templates, and simulated printing. These are automated isolated tests; they do not prove interaction with a packaged app or hardware.
- Account: production build browser confirmed the existing unauthenticated account route redirects to login. Signup and login form validation rendered the expected required-field errors without sending a request. Actual account creation/authentication was not end-to-end tested; no staging account and Auth Emulator could not start because Java is missing.
- Staging License API and Desktop integration: not run; no staging endpoint/credentials configured.
- Booking upload/gallery integration: not run; requires staging R2 and test booking credentials.
- Production: not deployed; no production changes made.

## Known gaps

License API/account device authorization/admin Studio screens/payment schema and verified webhooks are not implemented. Hosting target for the Next.js runtime is not established by the checked Firebase configuration. Installer lifecycle, independent checksum verification and browser/device end-to-end scenarios remain required before release.
