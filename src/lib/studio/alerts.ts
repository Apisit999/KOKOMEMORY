import type { MonitorSnapshot } from "./monitoring.ts";

/**
 * Turns what the watcher observed into messages for people, without spamming them.
 * Rules: an alert opens only after `failAfter` bad checks in a row (one blip is not an incident), closes after `okAfter` good checks
 * in a row (and says so), and while it stays open it repeats at most once per `renotifyMs`.
 */
export type Severity = "critical" | "warning";
export type Observation = { id: string; ok: boolean; severity: Severity; title: string; detail?: string };
export type AlertState = Record<string, { failures: number; successes: number; firing: boolean; since: number | null; lastNotified: number | null }>;
export type Notice = { id: string; kind: "firing" | "reminder" | "resolved"; severity: Severity; title: string; detail?: string; since: number; minutesOpen: number };
export type AlertConfig = { failAfter: number; okAfter: number; renotifyMs: number };
export const DEFAULT_ALERT_CONFIG: AlertConfig = { failAfter: 2, okAfter: 2, renotifyMs: 60 * 60_000 };

export function evaluate(observations: Observation[], previous: AlertState, now: number, config: AlertConfig = DEFAULT_ALERT_CONFIG): { state: AlertState; notices: Notice[] } {
  const state: AlertState = JSON.parse(JSON.stringify(previous));
  const notices: Notice[] = [];
  for (const o of observations) {
    const s = state[o.id] ?? (state[o.id] = { failures: 0, successes: 0, firing: false, since: null, lastNotified: null });
    if (o.ok) {
      s.failures = 0; s.successes += 1;
      if (s.firing && s.successes >= config.okAfter) {
        notices.push({ id: o.id, kind: "resolved", severity: o.severity, title: o.title, since: s.since ?? now, minutesOpen: Math.round((now - (s.since ?? now)) / 60_000) });
        s.firing = false; s.since = null; s.lastNotified = null;
      }
    } else {
      s.successes = 0; s.failures += 1;
      if (!s.firing && s.failures >= config.failAfter) {
        s.firing = true; s.since = now; s.lastNotified = now;
        notices.push({ id: o.id, kind: "firing", severity: o.severity, title: o.title, detail: o.detail, since: now, minutesOpen: 0 });
      } else if (s.firing && s.lastNotified !== null && now - s.lastNotified >= config.renotifyMs) {
        s.lastNotified = now;
        notices.push({ id: o.id, kind: "reminder", severity: o.severity, title: o.title, detail: o.detail, since: s.since ?? now, minutesOpen: Math.round((now - (s.since ?? now)) / 60_000) });
      }
    }
  }
  return { state, notices };
}

export type Thresholds = {
  /** Server errors (5xx) as a share of requests over the last 5 minutes, only judged with at least `minRequests` requests. */
  errorRate: number; minRequests: number;
  /** 95th percentile response time in ms. */
  p95Ms: number;
  /** Uploads that were started but never confirmed. */
  stuckUploads: number; stuckMinutes: number;
  /** Requests answered 429 in 5 minutes. */
  rateLimited: number;
  /** Slowest acceptable guest page check (the watcher opens a real guest link). */
  canaryMs: number;
  tlsWarnDays: number; tlsCriticalDays: number;
};
export const DEFAULT_THRESHOLDS: Thresholds = { errorRate: 0.05, minRequests: 20, p95Ms: 3000, stuckUploads: 5, stuckMinutes: 15, rateLimited: 50, canaryMs: 3000, tlsWarnDays: 14, tlsCriticalDays: 3 };

/** What the outside watcher measured itself, besides the site's own snapshot. */
export type Probes = {
  siteHealth: { ok: boolean; ms: number };
  snapshotReachable: boolean;
  canary?: { ok: boolean; ms: number; detail?: string } | null;
  tlsDaysLeft?: number | null;
};

export function observationsFrom(snapshot: MonitorSnapshot | null, probes: Probes, t: Thresholds = DEFAULT_THRESHOLDS): Observation[] {
  const out: Observation[] = [];
  out.push({ id: "site-down", ok: probes.siteHealth.ok, severity: "critical", title: "The website does not answer", detail: probes.siteHealth.ok ? undefined : "The health page did not respond with OK." });
  if (probes.siteHealth.ok) out.push({ id: "monitor-endpoint", ok: probes.snapshotReachable, severity: "warning", title: "The site's monitoring page cannot be read", detail: probes.snapshotReachable ? undefined : "Check the monitor token, or the site is failing before it can report." });
  if (snapshot) {
    for (const name of ["database", "storage"] as const) {
      const check = snapshot.checks.find(c => c.name === name);
      if (check) out.push({ id: `check-${name}`, ok: check.ok, severity: "critical", title: name === "database" ? "The database cannot be reached" : "The photo storage cannot be reached", detail: check.ok ? undefined : `The ${name} check failed (${check.ms} ms).` });
    }
    const m = snapshot.metrics;
    const judged = m.requests >= t.minRequests;
    out.push({ id: "error-rate", ok: !judged || m.serverErrorRate < t.errorRate, severity: "critical", title: "Many requests are failing", detail: `${m.serverErrors} of ${m.requests} requests in the last ${m.windowMinutes} minutes were server errors (${(m.serverErrorRate * 100).toFixed(1)}%).${Object.keys(m.errorPaths).length ? ` Worst: ${Object.entries(m.errorPaths).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, n]) => `${p} x${n}`).join(", ")}.` : ""}` });
    out.push({ id: "slow-responses", ok: !judged || m.latencyMs.p95 === null || m.latencyMs.p95 < t.p95Ms, severity: "warning", title: "The site is slow", detail: `95% of requests take under ${m.latencyMs.p95} ms; the limit is ${t.p95Ms} ms.` });
    out.push({ id: "rate-limit-surge", ok: m.rateLimited < t.rateLimited, severity: "warning", title: "Many requests are being turned away (too many requests)", detail: `${m.rateLimited} requests were answered "too many" in ${m.windowMinutes} minutes. Guests or booths may be blocked.` });
    const stuck = snapshot.uploads.pending >= t.stuckUploads && (snapshot.uploads.oldestPendingMinutes ?? 0) >= t.stuckMinutes;
    out.push({ id: "stuck-uploads", ok: !stuck, severity: "warning", title: "Photo uploads look stuck", detail: `${snapshot.uploads.pending} uploads were started but not finished; the oldest is ${snapshot.uploads.oldestPendingMinutes} minutes old. A booth may be offline or failing.` });
  }
  if (probes.canary) {
    out.push({ id: "guest-page", ok: probes.canary.ok, severity: "critical", title: "A real guest link does not open", detail: probes.canary.detail ?? "The test guest link did not show its photo." });
    if (probes.canary.ok) out.push({ id: "guest-page-slow", ok: probes.canary.ms < t.canaryMs, severity: "warning", title: "Guest links open slowly", detail: `The test guest link took ${probes.canary.ms} ms (limit ${t.canaryMs} ms).` });
  }
  if (probes.tlsDaysLeft !== undefined && probes.tlsDaysLeft !== null) {
    const days = probes.tlsDaysLeft;
    out.push({ id: "tls-expiry", ok: days > t.tlsWarnDays, severity: days <= t.tlsCriticalDays ? "critical" : "warning", title: "The HTTPS certificate is about to expire", detail: `${days} day(s) left.` });
  }
  return out;
}
