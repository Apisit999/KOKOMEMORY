# KOKO Studio staging on the Hostinger VPS

Target: `https://studio-staging.kokomemory.com` on the existing VPS. The app runs in Docker bound to `127.0.0.1:3001`; the existing production Nginx stays the only public proxy. Production (`kokomemory.com`, PM2 on port 3000) is never touched.

Files here: `Dockerfile`, `docker-compose.staging.yml`, `nginx-http-bootstrap.conf.example`, `nginx-https.conf.example`, `.env.staging.example`.

Status: these files have NOT been run through Docker or Nginx yet (no Docker/Nginx on the authoring machine). What was verified: the standalone Next.js build succeeds with only the public `NEXT_PUBLIC_*` values (no server secrets) and the resulting `server.js` serves `/api/studio/health` with 200.

## Order of work (each step needs an explicit go-ahead)

1. Snapshot the VPS in hPanel (the previous snapshot expired 2026-10-13).
2. Put the repo and a `.env.staging` on the VPS through a reviewed secure path (start from `.env.staging.example`). Keep `STUDIO_LICENSE_ENABLED=false` until step 6.
3. From the repo root: `docker compose --env-file .env.staging -f deploy/hostinger/docker-compose.staging.yml up -d --build`, then `curl http://127.0.0.1:3001/api/studio/health` on the VPS.
4. Back up `/etc/nginx`, add the bootstrap vhost, `nginx -t && systemctl reload nginx`, issue the certificate with certbot, then swap in the HTTPS vhost and reload again. Verify `https://kokomemory.com` still responds.
5. Run the Firestore migration against the STAGING project only (`STUDIO_ENV=staging`, `STUDIO_MIGRATION_PROJECT_CONFIRM` equal to `koko-studio-staging-6931c`; see `docs/KOKO_STUDIO_STAGING_RUNBOOK.md`).
6. Set `STUDIO_LICENSE_ENABLED=true`, restart the container, check `/api/studio/readiness` returns 200.
7. Set the bucket CORS policy for browser uploads (allow `PUT` from the staging origin), then publish a test release from `/admin/koko-studio`.

## Rollback
`docker compose ... down`, restore the saved Nginx config, `nginx -t && systemctl reload nginx`. The migration is additive; do not delete data to roll back code.

## What is actually deployed (verified over SSH, 2026-10-30)

Staging was ALREADY live before these files were rewritten, so the order of work above describes a first install; updating is the normal path now.

- Releases live in `/opt/koko-studio-staging/releases/<id>/` (the unpacked repo plus a `.env.staging` with mode 600). Compose project name is `hostinger`, service `web`, container `hostinger-web-1`, published on `127.0.0.1:3001`.
- Nginx vhost: `/etc/nginx/sites-available/studio-staging` (enabled). It already sets `X-Real-IP $remote_addr`, so `STUDIO_TRUSTED_CLIENT_IP_HEADER=x-real-ip` in the env file is safe. Do not overwrite it with the example files. Certificate: Let's Encrypt, auto-renewed by `certbot.timer`, valid until 2027-01-11.
- Release `4b546d2-20261013b` (image `hostinger-web`, 3.9 GB) was replaced on 2026-10-30 by `sprint1-20261030` (image `koko-studio-staging:sprint1`, 530 MB). The old image is kept as `hostinger-web:rollback-20261013`.

### Update procedure (what was done)
1. Upload the source archive (no `.env*`) to `/tmp`, unpack into a NEW release dir, copy `.env.staging` from the previous release on the server (never through a workstation), add any new variables.
2. `docker compose -p hostinger --env-file .env.staging -f deploy/hostinger/docker-compose.staging.yml config -q`, then `build` while the old container keeps serving.
3. `up -d --no-build` (a few seconds of downtime), wait for `healthy`, check `/api/studio/health`, `/readiness`, `/releases/latest` and the public HTTPS page.
4. Rollback: `cd <old release>/deploy/hostinger && docker compose -p hostinger --env-file <old release>/.env.staging up -d --no-build` (the `--env-file` is required because the old compose has no `.env` beside it).

Never print container environment variables: multi-line values such as private keys are split across lines and leak.
