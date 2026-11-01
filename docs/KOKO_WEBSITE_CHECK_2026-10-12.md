# Website check — 2026-10-12

This check used the current working tree and a production Next.js server on `127.0.0.1:3107`. The build loaded `.env.local`; this was not a staging-configured build. No accounts were created, forms submitted, uploads performed, or VPS settings changed.

## Results

- `npm run test:studio`: 14 passed, 0 failed, 3 emulator integration tests skipped. Node emitted module-type warnings.
- `npm run lint`: 0 errors, 51 warnings (image optimization, unused variables, Hook dependencies, and accessibility).
- `npm run build`: passed compilation, TypeScript, and generation of 69 static pages.
- Local HTTP 200: `/`, `/services`, `/software`, `/koko-studio`, `/photobooth`, `/3d-printing`, `/gallery/portfolio`, `/about`, `/contact`, `/booking`, `/account/login`, `/account/register`, `/account/koko-studio`, `/api/studio/health`.
- Public read APIs returned 200: `/api/gallery/portfolio`, `/api/gallery/categories`, `/api/reviews`, `/api/3d-printing/products`.
- Browser: home link is present on desktop and mobile. Software dropdown navigates to KOKO Studio. At 375 × 812, the mobile drawer opens, shows the home link, locks background scrolling, closes with Escape, and returns focus to the menu button. No horizontal overflow was measured. Gallery data loaded and no broken loaded images or console errors were observed in the inspected flows.
- Unauthenticated `/account/koko-studio` redirects to login with the correct destination query.

## Confirmed bug: account destination is lost in login/register flow

1. Open `/account/koko-studio` without signing in.
2. Login URL becomes `/account/login?redirect=%2Faccount%2Fkoko-studio`.
3. The rendered registration link is `/account/register?redirect=%2Faccount`, losing the Studio destination.
4. Open `/account/login?registered=1&redirect=%2Faccount%2Fkoko-studio` to inspect the existing registration-notice path. The effect removes all query parameters, including `redirect`, and the registration link again targets `/account`.

Relevant code: `src/app/account/login/page.tsx` computes `redirectTarget` from `window` during render (line 28), while the server-rendered fallback is `/account`; its registration-notice effect removes the complete query string. `src/app/account/register/page.tsx` uses the same render-time pattern (line 41). Use a hydration-safe destination value and preserve the validated redirect while removing only notice parameters. Verify both login/register cross-links and the post-registration flow after fixing. This audit did not change application code.

## Live deployment gaps

- `https://kokomemory.com/`: HTTP 200.
- Production `/koko-studio`, `/account/koko-studio`, and `/api/studio/health`: HTTP 404. Local success does not establish that this revision has been deployed.
- `https://studio-staging.kokomemory.com/`: HTTPS verification failed with `Could not establish trust relationship for the SSL/TLS secure channel`. No certificate warning was bypassed. The staging certificate/vhost/app setup remains incomplete.

## Remaining verification

The three skipped emulator tests, real staging Firebase Admin access, signed-in workflows, booking/payment mutations, uploads, and Desktop device flows were not exercised. Firebase Admin staging credentials are still pending. Complete staging setup and test these flows against isolated staging resources before release.
