# Monitoring drill, 2026-11-19 (local demo stack)

`node scripts/monitor-drill.mjs` froze (not killed: no answer, no error) the photo storage, the database and the website in turn, running the real `scripts/monitor.mjs` every round against a real guest link.

Result: **20 of 20 checks passed.** For each part: one bad round raised nothing; after the second the right alerts opened exactly once (storage: check-storage + guest-page; database: check-database + guest-page; website: site-down + guest-page); no repeats while broken; one good round did not close it; the second announced "fixed"; quiet afterwards. With the alert webhook answering 503 the watcher kept running and logged the alert.

Notes
- First attempt scored 11/20 because of the drill itself (it blocked its own fake webhook, and froze the wrong website process); the watcher's decisions were right. Fixed and rerun.
- "The site is slow" stays open for up to 5 minutes after a freeze (the slow requests stay in the 5-minute window). Expected; the drill ignores it.
- Not covered locally: HTTPS certificate days (needs https), real Discord/LINE/email delivery, 4G/staging.
