# KOKO Studio staging plan — Hostinger VPS

Updated: 2026-10-12

## Current inventory

Read-only review of Hostinger hPanel found one running KVM 2 VPS in Jakarta with Ubuntu 26.04, 2 vCPU, 8 GB RAM, 100 GB disk and an 8 TB bandwidth allowance. A fresh overview on 2026-10-12 showed uptime of 2 days 1 hour, CPU at 0%, memory at 14%, disk use of 6 GB/100 GB, and bandwidth use of 0.002 TB/8 TB. The plan currently expires on 2026-11-10 and auto-renew is enabled. hPanel reports weekly backups. Docker Manager currently lists no applications. The hPanel VPS firewall page has no configured rules, and the overview shows 0 Hostinger firewall rules. The Web console is disabled. The account lists kokomemory.com, which is already serving the live website.

The local project checkout measured about 0.81 GB for `node_modules`, 3.57 GB for `.next` (including build cache), and 0.04 GB for `public`. This is a reference, not an exact Docker image size; a staging build and temporary build layers will need additional room. The 94 GB currently free provides ample headroom for one staging app if uploaded photos remain in the separate R2 bucket and old Docker images/logs are cleaned up.

The VPS overview showed 6 GB used, a weekly backup schedule, and a backup/snapshot counter of 0. A fresh read-only check of the Hostinger backups page on 2026-10-12 showed `ยังไม่มีการสำรองข้อมูล` (no automated backups), despite the weekly schedule. At the owner's explicit request, a manual snapshot was created; hPanel now lists it with creation time `2026-10-12 17:09`, location Indonesia, expiry `2026-10-13`, and an estimated 30-minute restore. The Restore action is present, but restoration was not tested because restoring overwrites the current VPS state. Recheck that this snapshot is still available immediately before any staging change, as it expires the following day; create a fresh snapshot if it has expired. The page offered an automatic daily backup upgrade for 209 THB/month; it was not selected. Hostinger hPanel showed 0 provider firewall rules. The development workstation has no Docker CLI, so local Compose validation remains outstanding. The Hostinger Web console control was disabled in hPanel.

The SSH key pair is at `C:\Users\s_kow\.ssh\koko-staging` and `C:\Users\s_kow\.ssh\koko-staging.pub`; the public key was added in hPanel. Initial non-interactive SSH attempts failed while the Windows agent was unavailable, but a later read-only VPS inventory succeeded through the Windows SSH agent. No key contents or passphrase were read or displayed.

Firebase project `koko-studio-staging-6931c` (`KOKO Studio Staging`) and Web app `KOKO Studio Staging Web` were created under `realme66688@gmail.com` on 2026-10-12. The project remains on the no-cost Spark plan; Google Analytics and Gemini were left disabled. The Firebase web config and project ID are in the ignored local `.env.staging` and nonsecret deployment example. Cloudflare R2 initially contained three existing buckets; two contain objects. Two empty staging buckets were created. A bucket-scoped R2 Object Read & Write account token for only those two buckets was created on 2026-10-12 with a six-month TTL; its credentials are stored in the ignored local `.env.staging` file and are intentionally not recorded here.

The Cloudflare zone page for `kokomemory.com` is still waiting for registrar nameserver propagation. Fresh read-only DNS lookups on 2026-10-12 returned `aster.dns-parking.com` and `helios.dns-parking.com`; direct SOA queries to both report `helios.dns-parking.com` / `dns.hostinger.com`, confirming DNS is currently delegated to Hostinger, not Cloudflare. Read-only inspection of the Hostinger DNS zone showed `@` and `admin` A records already point to `187.77.122.132`, and `www` is a CNAME to `kokomemory.com`. The live domain names therefore route to the VPS that currently serves production; inspect its listener and reverse-proxy configuration before assigning another hostname so production traffic is preserved. A second read-only DNS check on 2026-10-12 confirmed `studio-staging.kokomemory.com` returned NXDOMAIN before the owner confirmed the hostname and authorized adding DNS. A separate Firebase staging project and Web app now exist under the requested `realme66688@gmail.com` account. The previously created `koko-studio-staging` project is also visible under `wanchaibfs@gmail.com`; it has not been deleted. The two staging R2 buckets and a local staging signing key pair have been prepared. The owner later authorized a manual VPS snapshot and then the `studio-staging` A record; no firewall, environment, or service settings were changed.

## Proposed staging shape

- Keep the live website and its DNS unchanged. The owner confirmed `studio-staging.kokomemory.com`, and its A record now points to `187.77.122.132` in the authoritative Hostinger zone.
- Run the existing Next.js application as a Node container on the VPS, bound to host loopback `127.0.0.1:3001`. Keep production Nginx as the only public reverse proxy on ports 80/443 and add a separate staging virtual host after configuration review. The repository has dynamic API routes, so static-only hosting is not suitable.
- Build with staging `NEXT_PUBLIC_FIREBASE_*` values because Next.js inlines public Firebase configuration at build time. Do not include emulator settings. Supply Firebase Admin credentials, Studio signing private key, and R2 credentials only to the server at runtime.
- Use a separate Firebase project for Auth/Firestore and separate R2 buckets for public gallery assets and private uploads. Use a staging-only RSA key pair and a Desktop build containing only the matching public key.
- Run the reviewed Firestore migration against the staging project with the explicit project confirmation. Keep customer production data out of the staging project and test booking.

## Prepared deployment files

The repository has a Docker build, a Compose definition for the Next.js service bound to `127.0.0.1:3001`, Nginx HTTP bootstrap and HTTPS virtual-host examples, and an example template at `deploy/hostinger/.env.staging.example`. The repository-root `.env.staging` has been populated locally with the staging signing key pair, R2 bucket details and R2 credentials; it is git-ignored and excluded from the Docker build context. The Compose file refuses to build without staging Firebase and site configuration. The template defaults Studio licensing off until migration/config review. The previous Caddy service/template was removed because it would conflict with production Nginx on ports 80/443. The local `.env.staging` now contains Firebase public Web config and project IDs. Firebase Admin service credentials are not configured yet. Never commit or copy the file to the VPS until its secret delivery path is reviewed. These are local examples only and have not been applied to the VPS.

The template has fields for staging Firebase web/Admin configuration, Studio signing, Resend, and R2. Firebase Admin and signing/R2 values must stay server-side. The app uses `R2_BUCKET_NAME` for gallery/photo flows and `R2_PRIVATE_BUCKET_NAME` for private 3D files; scope a staging R2 token only to the staging buckets those flows need. Do not reuse production projects, buckets, or credentials. `STUDIO_LICENSE_ENABLED=false` is a deliberate gate; enable it only after staging migration and readiness review.

The Next.js self-hosting guide recommends a reverse proxy in front of the Node server; the current design follows that guidance through the existing Nginx. These files are prepared locally and have not been run against or applied to the VPS. DNS exists; TLS, secrets, migration and deployment remain outstanding.

## Work sequence

1. Recheck that the Hostinger snapshot is still available immediately before any VPS change; the current snapshot expires 2026-10-13. Review the local Compose and Nginx examples and validate them before applying anything.
2. Confirm staging Firebase and separate R2 buckets, service identity/permissions, server-only secret storage, and signing-key custody. Generate and test a staging-only signing key pair.
3. Confirm Nginx vhost routing, port 80/443, and certificate issuance/renewal approach. Keep Node bound to loopback. Prepare a concrete reviewed Nginx diff and rollback steps before editing the live configuration.
4. Create the secret file through an approved secure path, then build with staging public Firebase configuration. Keep secret values out of chat, logs and image build arguments.
5. After explicit change approval, start only the staging Compose service, validate health, apply and test the Nginx virtual host, obtain TLS, then run public HTTPS health/readiness checks. Preserve the production Nginx configuration and verify the live site.
6. Back up/rehearse the staging data path and run migration only against the confirmed staging project. Build Desktop against the staging API/public key.
7. Run the account-link, license lifecycle, installer, camera/print simulation and R2 uploader checks in `KOKO_STUDIO_STAGING_RUNBOOK.md`. Record safe evidence and installer checksum.

## Inputs required before external changes

- VPS use for staging is confirmed. Schedule deploy after the staging hostname and isolated service credentials below are ready; its renewal date is 2026-11-10.
- Enable Firebase Authentication and create the Firestore database for project `koko-studio-staging-6931c`; choose its permanent location before database creation. Set up an appropriately scoped server identity/secret delivery method; do not use a production service credential.
- R2 staging buckets and an Object Read & Write account token scoped only to `koko-studio-staging-public` and `koko-studio-staging-private` are ready; the token expires 2027-04-12. The public bucket has its rate-limited `r2.dev` development URL enabled at `https://pub-79f8f7406ece453893afa1f71e12d7fc.r2.dev`; it is empty now and this URL is for staging tests, not production delivery. The private bucket remains private. Credentials are in the ignored local `.env.staging`.
- A secure destination for the staging signing key and R2 credentials on the VPS. The unique staging signing key pair and bucket-scoped R2 credentials are stored in local `.env.staging`; neither has been copied to or configured on the VPS.
- Staging email sender details and a Resend key if verification/reset email flows are in scope.
- SSH is reported working for root from the administrator's Windows workstation with the existing key. Keep SSH limited to the administrator's source network when the firewall policy is reviewed; never share the private key.

Do not point the live hostname at this VPS, reuse production Firebase/R2 data, expose the Node port, or publish the Desktop installer as part of staging setup.

## Read-only VPS inspection command reference (completed 2026-10-12)

SSH agent access works. The following PowerShell is the read-only inventory command used for the VPS check; it does not change services, firewall, files, DNS, or environment variables. The output includes OS/resource status, listening ports, and service/process names, but does not request environment values or dump service configuration.

```powershell
$remote = @'
printf '\n== OS ==\n'; cat /etc/os-release
printf '\n== HOSTNAME ==\n'; hostnamectl --static
printf '\n== RAM ==\n'; free -h
printf '\n== DISK ==\n'; df -h /
printf '\n== LISTENING PORTS ==\n'; ss -lntup
printf '\n== NGINX ==\n'; if command -v nginx >/dev/null 2>&1; then nginx -v 2>&1; systemctl is-active nginx || true; else echo 'not installed'; fi
printf '\n== DOCKER ==\n'; if command -v docker >/dev/null 2>&1; then docker --version; docker compose version; docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'; else echo 'not installed'; fi
printf '\n== PM2 ==\n'; if command -v pm2 >/dev/null 2>&1; then pm2 list; else echo 'not installed'; fi
printf '\n== UFW ==\n'; if command -v ufw >/dev/null 2>&1; then ufw status verbose; else echo 'not installed'; fi
'@
ssh -o BatchMode=yes -o ConnectTimeout=10 -o PreferredAuthentications=publickey root@187.77.122.132 $remote
```

Review the output and identify existing services before proposing any installation or firewall change. Root access is needed only for the read-only port/process inventory; do not run deployment or installation commands in this inspection step.

## Technical basis

Next.js self-hosting guidance recommends a reverse proxy in front of the Node server. The app has server API routes and runtime secrets, so deploy it as a Node application rather than a static export. See the bundled `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` and `docs/KOKO_STUDIO_STAGING_RUNBOOK.md`.
## R2 token metadata follow-up (2026-10-12)

Read-only inspection of the Cloudflare dashboard account API-token list showed four active account tokens: `picure-ai` (all buckets, Object Read & Write), `R2 Account Token` (all buckets, Object Read only), `[R2 Data Catalog] Table Maintenance: koko-memory-storage` (all buckets, Admin Read & Write), and `koko-memory-server` (buckets `koko-memory-private` and `koko-memory-storage`, Object Read & Write; active until 2027-08-21). No user API tokens were listed. No token values or secrets were opened. None of the listed tokens is clearly identified as staging, so do not reuse one for staging. This dashboard view does not establish that the credentials are configured on the VPS or in the application.

The VPS read-only inventory was completed on 2026-10-12 through the Windows SSH agent; no key contents or passphrase were read. The server runs Ubuntu 26.04.1 LTS, has 7.7 GiB RAM (1.1 GiB used, 6.6 GiB available, no swap), and its root filesystem is 96 GB with 6.2 GB used and 90 GB available. Nginx 1.28.3 is active. Docker 29.9.0 and Compose v5.6.0 are installed, but `docker ps` showed no running containers. PM2 v7.0.4 reports the `kokomemory` process online for 46 hours with zero restarts; the process list shows `npm start` and `next-server` running as root. Listening TCP ports are 22, 80, 443, and 3000; the Next.js listener is bound to `*:3000`, while Nginx listens on 80/443. UFW is active with default incoming deny and allows TCP 22, 80, and 443 from anywhere; no allow rule exists for port 3000. The SSH allow rules are not restricted to an administrator source address. This is consistent with, but does not independently prove the cause of, the external port-3000 timeout. Hostinger hPanel previously showed zero provider firewall rules. UDP listeners are local resolver, chrony, and Monarx agent sockets. No service, firewall, file, DNS, or environment setting was changed.

Read-only HTTP checks from the VPS returned HTTP 200 for `http://127.0.0.1/` through Nginx and HTTP 404 for `/api/studio/health` both through Nginx and directly on `127.0.0.1:3000`. This confirms the existing web service responds, while the deployed application does not currently serve the Studio health route present in the local source/build. A direct request to the public VPS IP on port 3000 timed out from the development workstation; this single probe does not establish whether the cause is firewall policy or network path. Do not change firewall or proxy settings until the existing production service and backup/recovery path are reviewed.

## Local deployment-template review (2026-10-12)

Read-only review confirmed Compose loads the root `.env.staging` at runtime, while `.dockerignore` excludes `.env*` from the Docker build context except for the example template. The web service listens on container port 3000 and is published only on host loopback port 3001. Build-time Firebase/site values are public configuration; Firebase Admin, Studio signing, Resend and R2 values are runtime settings. The Compose health check calls `/api/studio/health`, which the application implements as a lightweight health response. At the time of this initial review, the template and `.env.staging` had not yet been populated. The local Docker CLI is absent, so Compose CLI validation and image build were not run. At the time of this initial review, Firebase/R2 staging resources had not yet been created. The certificate, Nginx vhost, and deployment remain outstanding.

The planned local Studio test suite was run on 2026-10-12: 14 passed, 0 failed, and 3 emulator/integration cases were skipped because Firebase emulators and the HTTP integration setup were not running. Node emitted `MODULE_TYPELESS_PACKAGE_JSON` performance warnings for TypeScript test files; these did not fail the suite. This local result does not replace staging integration or deployment checks.

Local `npm run lint` completed with 0 errors and 51 warnings, mainly existing `<img>` optimization and unused-variable warnings. Local `npm run build` completed successfully with Next.js 16.3.6, TypeScript, and 69 generated static pages. The build loaded the workstation's `.env.local`; no values were displayed. It therefore confirms the local production build only, not a build with the staging Firebase values. The staging Docker build and Compose configuration still need validation once Docker and staging inputs are available.

After the build, the app was briefly started on `127.0.0.1:43117`; `GET /api/studio/health` returned HTTP 200 with `{"status":"ok","service":"koko-studio"}`. The temporary server was stopped and the port was confirmed closed.

A static comparison of direct `process.env.NAME` references against `.env.staging.example` found no required setting missing: `NODE_ENV` is set by Compose; R2 and Firebase legacy aliases have the template's primary variables as fallbacks; emulator settings are intentionally omitted for staging; and `PHOTO_SEARCH_ENABLED` and `STUDIO_TRUSTED_CLIENT_IP_HEADER` are optional. `GCLOUD_PROJECT` is currently an unused template entry. This check examined variable names only and did not read any local secret values.

## Staging DNS and origin check (2026-10-12)

After the owner confirmed `studio-staging.kokomemory.com` and authorized the DNS change, Hostinger hPanel added `A studio-staging -> 187.77.122.132` with TTL 14400 seconds. The record appears in the DNS table, and both authoritative nameservers plus public resolvers 1.1.1.1 and 8.8.8.8 return the target IP. The workstation's first `curl` attempts could not resolve the hostname; using `--resolve` to test the VPS origin directly returned HTTP 200 over port 80. Read-only inspection of active Nginx directives showed virtual hosts only for `kokomemory.com`, `www.kokomemory.com`, and `admin.kokomemory.com`; the staging hostname currently falls through to the default server rooted at `/var/www/html`. HTTPS to port 443 failed certificate validation with Windows Schannel `SEC_E_WRONG_PRINCIPAL`, so no matching certificate is configured for the staging hostname. The first local Compose design published Caddy on ports 80/443, already bound by production Nginx; that local design has since been replaced by a loopback-only Node binding and Nginx examples below. Do not treat the hostname as staging-ready until host routing, TLS, and the Studio health endpoint are verified. No existing DNS records were edited.

## Public website smoke check (2026-10-12)

Read-only HTTP checks returned `200` for the live homepage, `/services`, `/photobooth`, `/software`, `/gallery/portfolio`, `/3d-printing`, and `/booking`. The homepage rendered its navbar with the `หน้าแรก` (Home) link visible, and the hero imagery loaded in the browser. The currently open authenticated 3D account page also rendered its navigation and account content. Live `/api/studio/health`, `/api/studio/readiness`, `/account/koko-studio`, and `/account/koko-studio/link` all returned `404`; the local source/build contains these routes, so the live service is consistent with an earlier app build, though its deployed commit was not verified. The live `/api/3d-printing/products` endpoint returned `200` with an empty product list, and the page rendered its empty-catalog state. At the time of this earlier check, `studio-staging.kokomemory.com` had not yet been configured; DNS and origin results are recorded in the later check above. No staging application is deployed. An existing browser tab for `localhost:3001` showed connection refused; the independent production-build smoke test on `127.0.0.1:43117` returned HTTP 200 and was stopped afterward.

## Local Nginx ingress preparation (2026-10-12)

After reviewing the current VPS listeners and active virtual-host names, the staging Compose stack was changed to publish only `127.0.0.1:3001` to the existing Nginx. The Caddy service and Caddyfile were removed from the local staging stack. Added separate Nginx examples: an HTTP-01 bootstrap server that redirects other HTTP traffic to HTTPS, and an HTTPS server that proxies to loopback port 3001. The HTTPS example references the expected Certbot certificate paths, forwards standard proxy headers, and disables proxy buffering for Next.js streaming. These examples have not been copied to or tested on the VPS. Compose CLI validation remains unavailable because Docker is not installed on the workstation; VPS settings remain unchanged.

## Staging resource checklist from code review (2026-10-12)

- **Firebase:** create/use a separate staging project. The web app uses Email/Password registration and login plus Google sign-in; add `studio-staging.kokomemory.com` as an authorized domain. Configure Auth and Firestore, then review and apply this repository's Firestore rules and indexes to staging. The public web config (`NEXT_PUBLIC_FIREBASE_*`) is build-time configuration and all project IDs must agree with `STUDIO_FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_ID`, and the migration's `GCLOUD_PROJECT`.
- **Firebase Admin runtime:** the running app expects `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` for Admin SDK Auth/Firestore access. Keep these in server-only secret storage. Do not use a production service account. Migration uses Application Default Credentials and requires a separately authorized staging-only identity; set `STUDIO_MIGRATION_PROJECT_CONFIRM` to the exact same staging project ID as `GCLOUD_PROJECT` before running the explicit migration script. Do not run `npm run studio:migrate` for this server workflow because that package script is wired to the local emulator environment file.
- **Cloudflare R2:** two empty buckets now exist: `R2_BUCKET_NAME=koko-studio-staging-public` for gallery/site uploads and `R2_PRIVATE_BUCKET_NAME=koko-studio-staging-private` for private 3D quote/order files. Both currently have Public Access disabled. A staging token scoped to only these buckets, a decision/configuration for public delivery of the public bucket, and validation of upload/download/head/delete operations remain outstanding. Keep the private bucket private; never configure a delivery URL for it.
- **Signing:** generate a staging-only RSA key pair (2048 bits or stronger) with a unique `STUDIO_SIGNING_KEY_ID`. Store the private PEM only in server secret storage. Set `STUDIO_TRUSTED_PUBLIC_KEYS_JSON` to a JSON map from that key ID to its public PEM. Share only the public key with a staging Desktop build.
- **Email:** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are needed to exercise verification/reset email flows. Keep the key server-side and use a staging-approved sender/domain.
- **Gate:** keep `STUDIO_LICENSE_ENABLED=false` until the Firebase project, Firestore migration, signing config, R2 setup, and readiness endpoint have all been checked.

At the time of this code review, no Firebase project, staging buckets, signing key, or email credential had been created or supplied. The R2 buckets were created in the later follow-up below. Remaining values must be entered only through the approved secure environment path; none should be pasted into chat or committed.

## R2 staging buckets created (2026-10-12)

Using the currently signed-in Cloudflare account, created `koko-studio-staging-public` and `koko-studio-staging-private` in the Asia Pacific location selected by Cloudflare's Automatic setting, Standard storage class. At initial creation both buckets were empty with Public Access `Disabled`; a later follow-up enabled the public bucket development URL while keeping the private bucket private. The R2 account ID is recorded in `.env.staging.example` with the two bucket names. The public bucket is designated for gallery delivery; its development URL and a scoped staging API token were configured later, as recorded in the current status below. Dashboard usage showed `$0.00` for the current period at creation time; future storage and operations may incur account charges.

Historical status before the account owner continued in Firebase Console. The first project `koko-studio-staging` was later created under `wanchaibfs@gmail.com` and was retained per owner direction. A separate project for the requested `realme66688@gmail.com` account is now active; see current status below.

## Local staging environment prepared (2026-10-12)

Created root `.env.staging` from the example with the confirmed R2 account ID and bucket names, plus a fresh 3072-bit RSA signing key pair under key ID `koko-studio-staging-2026-10`. The private key and trusted public key map were written directly to the ignored file and were not printed. Its Windows ACL was restricted to the current Windows account. Git ignores `.env.staging`, and `.dockerignore` excludes `.env*` from the image build context. At the time of initial environment preparation, Firebase values, R2 token and public delivery URL were blank. They have since been populated locally; Firebase Admin credentials are still pending. This file remains incomplete and must not be deployed until the remaining values and deployment review are ready. Rotate this staging signing key if the local file is shared or exposed.

## Current status update (2026-10-12)

The active staging Firebase project is `koko-studio-staging-6931c` (`KOKO Studio Staging`) under `realme66688@gmail.com`, on the Spark plan. Its Web app `KOKO Studio Staging Web` is registered. Google Analytics and Gemini were disabled during setup. Firebase public Web config and project IDs are in the local ignored `.env.staging` and deployment example. The earlier `koko-studio-staging` project under `wanchaibfs@gmail.com` is retained at the owner's request.

Firebase Authentication is initialized. Email/Password and Google sign-in are enabled; the public-facing project name is `KOKO Studio Staging`, with the owner-approved support email. `studio-staging.kokomemory.com` is an authorized domain. The Standard edition `(default)` Firestore database was created in Jakarta (`asia-southeast2`) with production mode and default deny rules. The database is empty. Repository Firestore rules have been published. All three `photos` composite indexes from `firestore.indexes.json` are Enabled. The server-side Firebase Admin identity and credentials are not prepared. Scheduled backups were left off because they require the Blaze plan.

The local root `.env.staging` contains the Firebase public config, staging signing key pair, and R2 settings/credentials. It is git-ignored, excluded from Docker build context, and ACL-restricted to the current Windows account. Do not read or print private values. No Firebase Admin credentials have been added and nothing from `.env.staging` has been copied to the VPS.

The current R2 state is: public bucket development URL enabled (rate-limited `r2.dev` endpoint, empty bucket), private bucket remains private, and a six-month Object Read & Write token scoped to the two staging buckets is present in `.env.staging`. The token credential was exposed in a tool result during creation; the owner chose to keep it temporarily and plans to rotate it later.

The workstation has no Docker CLI. Compose syntax/image build validation, Firebase service configuration, Nginx/TLS configuration, VPS changes and deployment remain outstanding. No VPS service or firewall changes were made during this follow-up.
