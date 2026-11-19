import type { Store } from "./types.ts";

/**
 * What the site knows about its own health, for an outside watcher (scripts/monitor.mjs) to read.
 * Nothing here contains customer data, keys or addresses: only counts, times and pass/fail.
 */

const MINUTE = 60_000;
const KEEP_MINUTES = 30;
const MAX_LATENCY_SAMPLES_PER_MINUTE = 2000;

type Bucket = { requests: number; serverErrors: number; clientErrors: number; rateLimited: number; latencies: number[]; errorPaths: Record<string, number> };

/** Per-minute request statistics kept in this process (a restart starts a new history). */
export class RequestMetrics {
  private readonly buckets = new Map<number, Bucket>();
  readonly startedAt: number;
  constructor(now = Date.now()) { this.startedAt = now; }

  record(path: string, status: number, ms: number, now = Date.now()) {
    const minute = Math.floor(now / MINUTE);
    let bucket = this.buckets.get(minute);
    if (!bucket) {
      bucket = { requests: 0, serverErrors: 0, clientErrors: 0, rateLimited: 0, latencies: [], errorPaths: {} };
      this.buckets.set(minute, bucket);
      for (const key of this.buckets.keys()) if (key < minute - KEEP_MINUTES) this.buckets.delete(key);
    }
    bucket.requests += 1;
    if (status >= 500) { bucket.serverErrors += 1; bucket.errorPaths[path] = (bucket.errorPaths[path] ?? 0) + 1; }
    else if (status === 429) bucket.rateLimited += 1;
    else if (status >= 400) bucket.clientErrors += 1;
    if (bucket.latencies.length < MAX_LATENCY_SAMPLES_PER_MINUTE) bucket.latencies.push(ms);
  }

  /** Totals over the last `windowMinutes` full-or-partial minutes. */
  window(windowMinutes: number, now = Date.now()) {
    const current = Math.floor(now / MINUTE);
    let requests = 0, serverErrors = 0, clientErrors = 0, rateLimited = 0;
    const latencies: number[] = []; const errorPaths: Record<string, number> = {};
    for (const [minute, bucket] of this.buckets) {
      if (minute <= current - windowMinutes) continue;
      requests += bucket.requests; serverErrors += bucket.serverErrors; clientErrors += bucket.clientErrors; rateLimited += bucket.rateLimited;
      latencies.push(...bucket.latencies);
      for (const [path, n] of Object.entries(bucket.errorPaths)) errorPaths[path] = (errorPaths[path] ?? 0) + n;
    }
    const sorted = latencies.sort((a, b) => a - b);
    const pct = (p: number) => sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]) : null;
    return { windowMinutes, requests, serverErrors, clientErrors, rateLimited, serverErrorRate: requests ? serverErrors / requests : 0, latencyMs: { p50: pct(50), p95: pct(95), p99: pct(99) }, errorPaths };
  }
}

/** One shared instance: the request handler records into it and the snapshot reads from it. */
export const requestMetrics = new RequestMetrics();

/** Paths that are the watchers themselves: counting them would hide real traffic. */
export const UNMETERED_PATHS = new Set(["health", "readiness", "monitor/snapshot"]);

export type Check = { name: string; ok: boolean; ms: number; detail?: string };
export type MonitorSnapshot = {
  status: "ok" | "degraded" | "down";
  time: string;
  uptimeSeconds: number;
  memoryMB: number;
  checks: Check[];
  uploads: { pending: number; oldestPendingMinutes: number | null };
  metrics: ReturnType<RequestMetrics["window"]>;
};

type PhotoLike = { status?: string; createdAt?: string };
/** Reads from the real store/storage; both are injected so this can be tested without a database. */
export type MonitorDeps = {
  store: Pick<Store, "list">;
  storage: { read(key: string): Promise<Uint8Array | null> };
  metrics?: RequestMetrics;
  now?: () => number;
  memoryBytes?: () => number;
  checkTimeoutMs?: number;
};

/** A dependency that hangs (no answer, no error) must not hang the report: after this long the check counts as failed. */
export const CHECK_TIMEOUT_MS = 4000;
async function timed(name: string, work: () => Promise<string | void>, now: () => number, timeoutMs = CHECK_TIMEOUT_MS): Promise<Check> {
  const started = now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { const detail = await Promise.race([work(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); })]); return { name, ok: true, ms: Math.max(0, now() - started), ...(detail ? { detail } : {}) }; }
  // The error text is never passed on: provider errors can name buckets, hosts or keys.
  catch { return { name, ok: false, ms: Math.max(0, now() - started), detail: "failed" }; }
  finally { if (timer) clearTimeout(timer); }
}

export async function buildSnapshot(deps: MonitorDeps): Promise<MonitorSnapshot> {
  const now = deps.now ?? Date.now;
  const metrics = deps.metrics ?? requestMetrics;
  const checks: Check[] = [];
  checks.push(await timed("database", async () => { await deps.store.list("studioPlans", undefined, 1); }, now, deps.checkTimeoutMs));
  // A key that does not exist must read as "missing" (null); an error means the storage cannot be reached.
  checks.push(await timed("storage", async () => { await deps.storage.read("studio/_monitor/probe"); }, now, deps.checkTimeoutMs));

  let uploads: MonitorSnapshot["uploads"] = { pending: 0, oldestPendingMinutes: null };
  const databaseOk = checks[0].ok;
  if (databaseOk) {
    try {
      // A photo is "pending" between the booth asking to upload it and the booth confirming it. Old pending photos mean stuck uploads.
      const pending = await Promise.race([deps.store.list<PhotoLike>("studioPhotos", { field: "status", value: "pending" }, 500), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), deps.checkTimeoutMs ?? CHECK_TIMEOUT_MS))]);
      const ages = pending.map(p => (now() - Date.parse(p.createdAt ?? "")) / MINUTE).filter(Number.isFinite);
      uploads = { pending: pending.length, oldestPendingMinutes: ages.length ? Math.round(Math.max(...ages)) : null };
    } catch { checks.push({ name: "uploads-query", ok: false, ms: 0, detail: "failed" }); }
  }
  const failed = checks.filter(c => !c.ok).map(c => c.name);
  const status: MonitorSnapshot["status"] = failed.includes("database") ? "down" : failed.length ? "degraded" : "ok";
  return {
    status, time: new Date(now()).toISOString(), uptimeSeconds: Math.round((now() - metrics.startedAt) / 1000),
    memoryMB: Math.round((deps.memoryBytes ? deps.memoryBytes() : process.memoryUsage().rss) / 1024 / 1024),
    checks, uploads, metrics: metrics.window(5, now()),
  };
}
