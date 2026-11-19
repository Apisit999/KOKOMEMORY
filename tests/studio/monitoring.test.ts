import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "./memory-store.ts";
import { RequestMetrics, buildSnapshot } from "../../src/lib/studio/monitoring.ts";

const MIN = 60_000;
const okStorage = { read: async () => null };

test("metrics: counts by class, keeps only recent minutes, and gives percentiles", () => {
  const m = new RequestMetrics(0);
  const t = 100 * MIN;
  for (let i = 1; i <= 100; i++) m.record("share/view", 200, i, t);
  m.record("share/photo", 503, 900, t); m.record("share/photo", 503, 800, t); m.record("share/view", 429, 5, t); m.record("desktop/cloud/events", 400, 5, t);
  const w = m.window(5, t);
  assert.equal(w.requests, 104); assert.equal(w.serverErrors, 2); assert.equal(w.rateLimited, 1); assert.equal(w.clientErrors, 1);
  assert.deepEqual(w.errorPaths, { "share/photo": 2 });
  assert.ok((w.latencyMs.p50 ?? 0) >= 50 && (w.latencyMs.p50 ?? 0) <= 52); assert.ok((w.latencyMs.p99 ?? 0) >= 100);
  assert.equal(m.window(5, t + 10 * MIN).requests, 0, "older than the window is not counted");
  m.record("x", 200, 1, t + 60 * MIN);
  assert.equal(m.window(120, t + 60 * MIN).requests, 1, "buckets older than 30 minutes are dropped");
});

test("snapshot: all good", async () => {
  const store = new MemoryStore();
  const snap = await buildSnapshot({ store, storage: okStorage, metrics: new RequestMetrics(0), now: () => 5 * MIN, memoryBytes: () => 200 * 1024 * 1024 });
  assert.equal(snap.status, "ok"); assert.deepEqual(snap.checks.map(c => `${c.name}:${c.ok}`), ["database:true", "storage:true"]);
  assert.equal(snap.memoryMB, 200); assert.deepEqual(snap.uploads, { pending: 0, oldestPendingMinutes: null });
});

test("snapshot: a broken database is down and its error text never leaks; a broken storage is degraded", async () => {
  const brokenStore = { list: async () => { throw new Error("secret-project-123 permission denied at https://internal.example"); } };
  const down = await buildSnapshot({ store: brokenStore as never, storage: okStorage, metrics: new RequestMetrics(0), now: () => 0 });
  assert.equal(down.status, "down");
  assert.ok(!JSON.stringify(down).includes("secret-project") && !JSON.stringify(down).includes("internal.example"));
  const noStorage = await buildSnapshot({ store: new MemoryStore(), storage: { read: async () => { throw new Error("bucket koko-private unreachable"); } }, metrics: new RequestMetrics(0), now: () => 0 });
  assert.equal(noStorage.status, "degraded"); assert.ok(!JSON.stringify(noStorage).includes("koko-private"));
});

test("snapshot: pending uploads are counted with the age of the oldest; confirmed photos are not", async () => {
  const store = new MemoryStore();
  const now = Date.parse("2026-11-19T12:00:00Z");
  store.documents.set("studioPhotos/a", { status: "pending", createdAt: new Date(now - 50 * MIN).toISOString() });
  store.documents.set("studioPhotos/b", { status: "pending", createdAt: new Date(now - 2 * MIN).toISOString() });
  store.documents.set("studioPhotos/c", { status: "ready", createdAt: new Date(now - 500 * MIN).toISOString() });
  const snap = await buildSnapshot({ store, storage: okStorage, metrics: new RequestMetrics(0), now: () => now });
  assert.deepEqual(snap.uploads, { pending: 2, oldestPendingMinutes: 50 });
});

test("snapshot: a database or storage that never answers is reported as failed after the timeout, not waited for", async () => {
  const hangingStore = { list: () => new Promise<never>(() => {}) };
  const hangingStorage = { read: () => new Promise<never>(() => {}) };
  const started = Date.now();
  const snap = await buildSnapshot({ store: hangingStore as never, storage: hangingStorage, metrics: new RequestMetrics(0), checkTimeoutMs: 50 });
  assert.ok(Date.now() - started < 1500, "returned quickly");
  assert.equal(snap.status, "down");
  assert.deepEqual(snap.checks.map(c => c.ok), [false, false]);
});
