// Outside watcher for the photo delivery site. Run it every minute from cron / a systemd timer / any small machine that is NOT the site itself.
//   node scripts/monitor.mjs            (one round: check, decide, notify, save state, exit; exit code 1 when something is firing)
//   node scripts/monitor.mjs --dry      (checks and prints; sends nothing, keeps no state)
// Settings come from environment variables (see docs/MONITORING.md):
//   MONITOR_SITE_URL        https://studio.example.com          (required)
//   MONITOR_TOKEN           same value as STUDIO_MONITOR_TOKEN on the site (32+ characters)
//   MONITOR_CANARY_URL      a real guest link (https://.../s/<token>) of a test round that keeps at least one ready photo
//   MONITOR_WEBHOOK_URL     where alerts are posted as JSON (Discord, Slack, LINE bridge, Make, n8n ...)
//   MONITOR_EMAIL_TO + RESEND_API_KEY (+ MONITOR_EMAIL_FROM)   alerts by email
//   MONITOR_STATE_FILE      default ./monitor-state.json
import { readFile, rename, writeFile } from "node:fs/promises";
import tls from "node:tls";
import { DEFAULT_ALERT_CONFIG, evaluate, observationsFrom } from "../src/lib/studio/alerts.ts";

const env = process.env;
const DRY = process.argv.includes("--dry");
const site = (env.MONITOR_SITE_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(site)) { console.error("MONITOR_SITE_URL is required (https://...)"); process.exit(2); }
const STATE_FILE = env.MONITOR_STATE_FILE ?? "monitor-state.json";
const TIMEOUT_MS = Number(env.MONITOR_TIMEOUT_MS ?? 10_000);
const config = { failAfter: Number(env.MONITOR_FAIL_AFTER ?? DEFAULT_ALERT_CONFIG.failAfter), okAfter: Number(env.MONITOR_OK_AFTER ?? DEFAULT_ALERT_CONFIG.okAfter), renotifyMs: Number(env.MONITOR_RENOTIFY_MINUTES ?? 60) * 60_000 };

async function timedFetch(url, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    return { response, ms: Math.round(performance.now() - started) };
  } catch { return { response: null, ms: Math.round(performance.now() - started) }; }
}

// ---- probes ---------------------------------------------------------------------------------------------------------------
const probes = { siteHealth: { ok: false, ms: 0 }, snapshotReachable: false, canary: null, tlsDaysLeft: null };
let snapshot = null;

{ // the site answers at all
  const { response, ms } = await timedFetch(`${site}/api/studio/health`);
  const body = response?.ok ? await response.json().catch(() => null) : null;
  probes.siteHealth = { ok: body?.status === "ok", ms };
}
if (probes.siteHealth.ok && env.MONITOR_TOKEN) { // the site's own view of itself
  const { response } = await timedFetch(`${site}/api/studio/monitor/snapshot`, { headers: { "x-monitor-token": env.MONITOR_TOKEN } });
  if (response?.ok) { snapshot = await response.json().catch(() => null); probes.snapshotReachable = Boolean(snapshot); }
}
if (probes.siteHealth.ok && !env.MONITOR_TOKEN) probes.snapshotReachable = true; // nothing to read, nothing to complain about
if (env.MONITOR_CANARY_URL) { // what a guest does: open the link, then fetch the first photo
  const token = env.MONITOR_CANARY_URL.match(/\/s\/([A-Za-z0-9_-]{43})/)?.[1];
  if (!token) probes.canary = { ok: false, ms: 0, detail: "MONITOR_CANARY_URL is not a guest link" };
  else {
    const started = performance.now();
    const view = await timedFetch(`${site}/api/studio/share/view`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const body = view.response?.ok ? await view.response.json().catch(() => null) : null;
    const photoUrl = body?.photos?.[0]?.thumbUrl ?? body?.photos?.[0]?.url;
    let photoOk = false;
    if (photoUrl) { const photo = await timedFetch(photoUrl); photoOk = Boolean(photo.response?.ok); await photo.response?.arrayBuffer().catch(() => null); }
    const ms = Math.round(performance.now() - started);
    probes.canary = { ok: photoOk, ms, detail: !view.response ? "The guest page did not answer." : !view.response.ok ? `The guest page answered ${view.response.status}.` : !photoUrl ? "The test link shows no photo." : !photoOk ? "The first photo could not be fetched from storage." : undefined };
  }
}
if (site.startsWith("https://")) { // certificate days left
  const host = new URL(site).hostname;
  probes.tlsDaysLeft = await new Promise(resolve => {
    const socket = tls.connect({ host, port: Number(new URL(site).port || 443), servername: host, timeout: TIMEOUT_MS }, () => {
      const valid = socket.getPeerCertificate()?.valid_to; socket.end();
      resolve(valid ? Math.floor((Date.parse(valid) - Date.now()) / 86_400_000) : null);
    });
    socket.on("error", () => resolve(null)); socket.on("timeout", () => { socket.destroy(); resolve(null); });
  });
}

// ---- decide ---------------------------------------------------------------------------------------------------------------
let previous = {};
if (!DRY) { try { previous = JSON.parse(await readFile(STATE_FILE, "utf8")); } catch { /* first run */ } }
const observations = observationsFrom(snapshot, probes);
const { state, notices } = evaluate(observations, previous, Date.now(), config);

// ---- tell people ----------------------------------------------------------------------------------------------------------
const icon = n => (n.kind === "resolved" ? "OK" : n.severity === "critical" ? "ALERT" : "WARNING");
const text = n => n.kind === "resolved"
  ? `[${icon(n)}] ${site}: fixed after ${n.minutesOpen} min: ${n.title}`
  : `[${icon(n)}] ${site}: ${n.title}${n.kind === "reminder" ? ` (still open after ${n.minutesOpen} min)` : ""}${n.detail ? ` - ${n.detail}` : ""}`;
async function send(notice) {
  const message = text(notice);
  console.log(message);
  if (DRY) return;
  const jobs = [];
  if (env.MONITOR_WEBHOOK_URL) jobs.push(fetch(env.MONITOR_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: message, content: message, severity: notice.severity, kind: notice.kind, id: notice.id, site, time: new Date().toISOString() }), signal: AbortSignal.timeout(TIMEOUT_MS) }).then(r => { if (!r.ok) throw new Error(`webhook answered ${r.status}`); }));
  if (env.MONITOR_EMAIL_TO && env.RESEND_API_KEY) jobs.push(fetch("https://api.resend.com/emails", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` }, body: JSON.stringify({ from: env.MONITOR_EMAIL_FROM ?? "KOKO Monitor <onboarding@resend.dev>", to: env.MONITOR_EMAIL_TO.split(",").map(s => s.trim()), subject: message.slice(0, 120), text: message }), signal: AbortSignal.timeout(TIMEOUT_MS) }).then(r => { if (!r.ok) throw new Error(`email service answered ${r.status}`); }));
  // A channel that is down must not stop the others, and must not lose the alert silently: it is printed to the log as well.
  for (const result of await Promise.allSettled(jobs)) if (result.status === "rejected") console.error("could not deliver an alert:", result.reason?.message ?? result.reason);
}
for (const notice of notices) await send(notice);

if (!DRY) { await writeFile(`${STATE_FILE}.tmp`, JSON.stringify(state, null, 2)); await rename(`${STATE_FILE}.tmp`, STATE_FILE); }
const firing = Object.entries(state).filter(([, s]) => s.firing).map(([id]) => id);
const summary = { time: new Date().toISOString(), siteMs: probes.siteHealth.ms, canaryMs: probes.canary?.ms ?? null, tlsDaysLeft: probes.tlsDaysLeft, requests5min: snapshot?.metrics?.requests ?? null, firing };
console.log(JSON.stringify(summary));
process.exit(firing.length ? 1 : 0);
