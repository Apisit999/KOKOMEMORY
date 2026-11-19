# Monitoring and alerts

Two parts:

1. **The site reports on itself**: `GET /api/studio/monitor/snapshot` with header `x-monitor-token`. It returns only counts, times and pass/fail (database reachable, photo storage reachable, requests/errors/slowness over 5 minutes, uploads stuck in "pending"). No customer data. Without the right token it answers 404.
2. **A watcher outside the site** (`scripts/monitor.mjs`) runs every minute on a *different* machine, reads that report, opens a real guest link like a guest would, checks the HTTPS certificate, and sends messages.

## Set up

On the site add to the environment: `STUDIO_MONITOR_TOKEN` (32+ random characters, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

On the watcher machine set:

| Variable | Meaning |
|---|---|
| `MONITOR_SITE_URL` | `https://studio.example.com` |
| `MONITOR_TOKEN` | same value as `STUDIO_MONITOR_TOKEN` |
| `MONITOR_CANARY_URL` | a real guest link of a test round that keeps at least one photo (never expires; make it on a Pro event) |
| `MONITOR_WEBHOOK_URL` | Discord/Slack/LINE-bridge/Make/n8n URL; receives JSON `{text, content, severity, kind, id, site, time}` |
| `MONITOR_EMAIL_TO`, `RESEND_API_KEY` | optional, alerts by email (comma separated recipients) |
| `MONITOR_FAIL_AFTER` / `MONITOR_OK_AFTER` | bad/good rounds in a row before opening/closing (default 2 / 2) |
| `MONITOR_RENOTIFY_MINUTES` | reminder interval while still broken (default 60) |

Run `node scripts/monitor.mjs --dry` first: it checks and prints, sends nothing. Then schedule `node scripts/monitor.mjs` every minute (cron: `* * * * * cd /path && node scripts/monitor.mjs >> monitor.log 2>&1`; Windows: Task Scheduler, repeat every 1 minute). It keeps its memory in `monitor-state.json`; exit code 1 means something is currently firing.

## What raises an alert

| Alert | Severity | When |
|---|---|---|
| website does not answer | critical | `/api/studio/health` fails or times out |
| database / photo storage cannot be reached | critical | the site's own check fails or hangs > 4 s |
| a real guest link does not open | critical | guest page or its first photo fails |
| many requests failing | critical | ≥ 5 % server errors in 5 min (judged only with ≥ 20 requests) |
| site is slow | warning | 95th percentile ≥ 3 s |
| guest links open slowly | warning | canary ≥ 3 s |
| requests turned away (429) | warning | ≥ 50 in 5 min |
| uploads stuck | warning | ≥ 5 pending and oldest ≥ 15 min |
| certificate expiring | warning, then critical | ≤ 14 days, ≤ 3 days |
| monitoring page unreadable | warning | wrong token, or the site fails before it can report |

An alert opens only after 2 bad rounds in a row (one blip is ignored), is not repeated every minute (a reminder at most once an hour), and "fixed" is announced after 2 good rounds.

## Rehearsal

`scripts/monitor-drill.mjs` (local demo stack only) freezes storage, database and website in turn and checks that exactly the right alerts arrive, once, and that recovery is announced. See `docs/MONITORING_DRILL_2026-11-19.md` for the latest result.

## Limits

- Request numbers are kept in memory of one site process: after a restart they start from zero, and with several site instances each reports its own. Fine for one VPS; use a shared metrics service when scaling out.
- The watcher must not run on the same machine as the site, or it dies with it.
- Nobody sees alerts until a channel is configured: the webhook/email values are the owner's to provide.
