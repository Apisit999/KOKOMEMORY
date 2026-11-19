// Capacity of the share page API: requests per second and latency at rising concurrency, from separate addresses and from ONE address.
// LOCAL DEMO STACK ONLY. Run after the stack is up (see scripts/loadtest.mjs).
import { call, createBooth, createEvent, ORIGIN, percentile, samplePhoto, uploadSession } from "./loadtest-lib.mjs";
import os from "node:os";
const booth = await createBooth(); const eventId = await createEvent(booth, "Capacity"); const photo = await samplePhoto();
const small = await (await import("sharp")).default({ create: { width: 800, height: 600, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg().toBuffer();
const tokens = [];
for (let i = 0; i < 20; i++) { const r = await uploadSession(booth, { eventId, photo: small, photos: 1, ip: `10.50.${i}.1` }); if (r.done) tokens.push(r.token); }
const ipOf = n => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
let ipCounter = 700000;
async function level(concurrency, total, sameIp) {
  const lat = []; const statuses = {}; let next = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < total) { const i = next++; const r = await call("POST", `${ORIGIN}/api/studio/share/view`, { body: { token: tokens[i % tokens.length] }, ip: sameIp ? "10.77.7.7" : ipOf(ipCounter++) }); lat.push(r.ms); statuses[r.status] = (statuses[r.status] ?? 0) + 1; }
  }));
  const s = (performance.now() - started) / 1000;
  console.log(`${sameIp ? "same IP " : "own IPs "} concurrency ${String(concurrency).padStart(3)}: ${(total / s).toFixed(1).padStart(6)} req/s  p50 ${percentile(lat, 50)} p95 ${percentile(lat, 95)} p99 ${percentile(lat, 99)} ms  statuses ${JSON.stringify(statuses)}`);
}
console.log(`machine: ${os.cpus().length} logical CPUs, ${Math.round(os.totalmem() / 1e9)} GB RAM, load ${os.loadavg().map(v => v.toFixed(1)).join("/")}`);
for (const c of [1, 5, 10, 20, 50, 100]) await level(c, Math.max(60, c * 4), false);
console.log("--- all requests from ONE address (a venue Wi-Fi or a mobile carrier sharing one address) ---");
for (const c of [1, 5, 10, 20]) await level(c, Math.max(60, c * 4), true);
process.exit(0);
