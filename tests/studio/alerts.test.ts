import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ALERT_CONFIG, DEFAULT_THRESHOLDS, evaluate, observationsFrom, type AlertState, type Observation } from "../../src/lib/studio/alerts.ts";
import type { MonitorSnapshot } from "../../src/lib/studio/monitoring.ts";

const MIN = 60_000;
const obs = (ok: boolean, id = "x"): Observation => ({ id, ok, severity: "critical", title: "Thing", detail: ok ? undefined : "broken" });
const run = (steps: Array<[boolean, number]>, id = "x", config = DEFAULT_ALERT_CONFIG) => {
  let state: AlertState = {}; const all: string[] = [];
  for (const [ok, minute] of steps) { const r = evaluate([obs(ok, id)], state, minute * MIN, config); state = r.state; all.push(...r.notices.map(n => `${n.kind}@${minute}`)); }
  return { state, all };
};

test("alerts: one bad check is not an incident; two in a row open it once", () => {
  assert.deepEqual(run([[false, 0], [true, 1]]).all, []);
  assert.deepEqual(run([[false, 0], [false, 1], [false, 2], [false, 3]]).all, ["firing@1"], "opens once, does not repeat every minute");
});

test("alerts: while open it reminds at most once an hour, and says when it is fixed (after two good checks)", () => {
  const steps: Array<[boolean, number]> = [[false, 0], [false, 1], ...Array.from({ length: 125 }, (_, i): [boolean, number] => [false, 2 + i]), [true, 130], [true, 131]];
  assert.deepEqual(run(steps).all, ["firing@1", "reminder@61", "reminder@121", "resolved@131"]);
});

test("alerts: a single good check in the middle of an outage does not close it, and failing again does not open a second alert", () => {
  const result = run([[false, 0], [false, 1], [true, 2], [false, 3], [false, 4], [true, 5], [true, 6]]);
  assert.deepEqual(result.all, ["firing@1", "resolved@6"]);
});

test("alerts: after recovery a new failure starts a fresh alert; different problems are tracked separately", () => {
  let state: AlertState = {}; const kinds: string[] = [];
  const step = (list: Observation[], minute: number) => { const r = evaluate(list, state, minute * MIN); state = r.state; kinds.push(...r.notices.map(n => `${n.id}:${n.kind}`)); };
  step([obs(false, "a"), obs(true, "b")], 0); step([obs(false, "a"), obs(false, "b")], 1); step([obs(true, "a"), obs(false, "b")], 2); step([obs(true, "a"), obs(false, "b")], 3); step([obs(false, "a"), obs(true, "b")], 4); step([obs(false, "a"), obs(true, "b")], 5);
  assert.deepEqual(kinds, ["a:firing", "b:firing", "a:resolved", "a:firing", "b:resolved"]);
});

test("alerts: an observation that was not made this time leaves its state alone", () => {
  let r = evaluate([obs(false)], {}, 0); r = evaluate([obs(false)], r.state, MIN);
  const kept = evaluate([], r.state, 2 * MIN);
  assert.equal(kept.state.x.firing, true);
  assert.deepEqual(kept.notices, []);
});

const snapshot = (over: Partial<MonitorSnapshot> = {}): MonitorSnapshot => ({ status: "ok", time: "2026-11-19T10:00:00Z", uptimeSeconds: 100, memoryMB: 200, checks: [{ name: "database", ok: true, ms: 5 }, { name: "storage", ok: true, ms: 8 }], uploads: { pending: 0, oldestPendingMinutes: null }, metrics: { windowMinutes: 5, requests: 100, serverErrors: 0, clientErrors: 0, rateLimited: 0, serverErrorRate: 0, latencyMs: { p50: 50, p95: 120, p99: 200 }, errorPaths: {} }, ...over });
const failing = (list: Observation[]) => list.filter(o => !o.ok).map(o => o.id);
const probes = { siteHealth: { ok: true, ms: 20 }, snapshotReachable: true, canary: { ok: true, ms: 300 }, tlsDaysLeft: 60 };

test("rules: a healthy site raises nothing", () => {
  assert.deepEqual(failing(observationsFrom(snapshot(), probes)), []);
});

test("rules: each kind of trouble maps to its own alert", () => {
  assert.deepEqual(failing(observationsFrom(null, { ...probes, siteHealth: { ok: false, ms: 10000 }, snapshotReachable: false, canary: null })), ["site-down"]);
  assert.deepEqual(failing(observationsFrom(snapshot({ checks: [{ name: "database", ok: false, ms: 9000 }, { name: "storage", ok: true, ms: 8 }] }), probes)), ["check-database"]);
  assert.deepEqual(failing(observationsFrom(snapshot({ checks: [{ name: "database", ok: true, ms: 5 }, { name: "storage", ok: false, ms: 9000 }] }), probes)), ["check-storage"]);
  assert.deepEqual(failing(observationsFrom(snapshot(), { ...probes, canary: { ok: false, ms: 900, detail: "no photo" } })), ["guest-page"]);
  assert.deepEqual(failing(observationsFrom(snapshot(), { ...probes, canary: { ok: true, ms: 5000 } })), ["guest-page-slow"]);
  assert.deepEqual(failing(observationsFrom(snapshot(), { ...probes, tlsDaysLeft: 10 })), ["tls-expiry"]);
  assert.deepEqual(failing(observationsFrom(snapshot(), { ...probes, snapshotReachable: false })), ["monitor-endpoint"]);
});

test("rules: error rate and slowness are judged only with enough traffic, so a quiet night does not page anyone", () => {
  const quiet = snapshot({ metrics: { ...snapshot().metrics, requests: 3, serverErrors: 3, serverErrorRate: 1, latencyMs: { p50: 9000, p95: 9000, p99: 9000 } } });
  assert.deepEqual(failing(observationsFrom(quiet, probes)), []);
  const busy = snapshot({ metrics: { ...snapshot().metrics, requests: 200, serverErrors: 30, serverErrorRate: 0.15, latencyMs: { p50: 900, p95: 5000, p99: 9000 }, errorPaths: { "share/view": 30 } } });
  assert.deepEqual(failing(observationsFrom(busy, probes)).sort(), ["error-rate", "slow-responses"]);
  assert.match(observationsFrom(busy, probes).find(o => o.id === "error-rate")!.detail!, /share\/view x30/);
});

test("rules: stuck uploads need both a count and an age; a surge of 429 is reported", () => {
  assert.deepEqual(failing(observationsFrom(snapshot({ uploads: { pending: 4, oldestPendingMinutes: 90 } }), probes)), [], "too few");
  assert.deepEqual(failing(observationsFrom(snapshot({ uploads: { pending: 40, oldestPendingMinutes: 3 } }), probes)), [], "all recent: a busy minute, not stuck");
  assert.deepEqual(failing(observationsFrom(snapshot({ uploads: { pending: 12, oldestPendingMinutes: 45 } }), probes)), ["stuck-uploads"]);
  assert.deepEqual(failing(observationsFrom(snapshot({ metrics: { ...snapshot().metrics, rateLimited: DEFAULT_THRESHOLDS.rateLimited } }), probes)), ["rate-limit-surge"]);
});

test("rules: a certificate with 3 days left is critical, with 10 days a warning", () => {
  const sev = (days: number) => observationsFrom(snapshot(), { ...probes, tlsDaysLeft: days }).find(o => o.id === "tls-expiry")!.severity;
  assert.equal(sev(3), "critical"); assert.equal(sev(10), "warning");
});
