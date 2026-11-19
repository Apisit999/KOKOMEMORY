// Load test for the photo delivery stack: guests scanning QR codes and booths uploading, against the LOCAL demo stack.
// Usage: node scripts/loadtest.mjs [--sessions 300] [--guests 1000] [--ramp 60] [--booths 5] [--booth-sessions 10] [--booth-photos 3] [--nat 100] [--actions 3] [--only seed|guests]
// Needs the demo stack: Auth + Firestore emulators, S3 mock and the Studio site on :3040 started with STUDIO_TRUSTED_CLIENT_IP_HEADER=x-real-ip.
import os from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { call, createBooth, createEvent, ORIGIN, percentile, samplePhoto, uploadSession } from "./loadtest-lib.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[i + 1]]] : pairs), []));
const num = (name, fallback) => Number(args[name] ?? fallback);
const SESSIONS = num("sessions", 300), GUESTS = num("guests", 1000), RAMP = num("ramp", 60), BOOTHS = num("booths", 5), BOOTH_SESSIONS = num("booth-sessions", 10), BOOTH_PHOTOS = num("booth-photos", 3), NAT = num("nat", 100), ACTIONS = num("actions", 3), ONLY = args.only ?? "all";
const TOKENS_FILE = "output/loadtest/tokens.json";
const wait = ms => new Promise(r => setTimeout(r, ms));
const ipOf = n => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
const stats = values => ({ n: values.length, p50: percentile(values, 50), p95: percentile(values, 95), p99: percentile(values, 99), max: values.length ? Math.round(Math.max(...values)) : null });
const report = { startedAt: new Date().toISOString(), machine: { cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, memoryGB: Math.round(os.totalmem() / 1e9), platform: os.platform() }, params: { SESSIONS, GUESTS, RAMP, BOOTHS, BOOTH_SESSIONS, BOOTH_PHOTOS, NAT, ACTIONS }, notes: [] };

const tokens = [];
let booth, eventId, photo;
if (ONLY === "guests") { tokens.push(...JSON.parse(await readFile(TOKENS_FILE, "utf8"))); console.log(`Reusing ${tokens.length} saved links.`); }
else {
console.log("Setting up a booth identity…");
booth = await createBooth();
eventId = await createEvent(booth, "Load test event");
photo = await samplePhoto();
if (photo) report.photoMB = +(photo.length / 1e6).toFixed(2);

// --- Phase 1: seed sessions so guests have something to open (unique IP per request, so the rate limit is not what we measure here)
console.log(`Seeding ${SESSIONS} sessions (1 photo each)…`);
{
  let next = 0, ip = 5000;
  const timings = []; let failed = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < SESSIONS) {
      next++;
      const r = await uploadSession(booth, { eventId, photo, photos: 1, ip: ipOf(ip++) });
      timings.push(...r.timings); if (r.done) tokens.push(r.token); else failed++;
    }
  }));
  report.seed = { sessions: SESSIONS, ok: tokens.length, failed, seconds: +((performance.now() - started) / 1000).toFixed(1), perStep: Object.fromEntries(["register", "init", "put", "confirm"].map(name => [name, stats(timings.filter(t => t.name === name).map(t => t.ms))])) };
  console.log(`  ${tokens.length}/${SESSIONS} sessions in ${report.seed.seconds}s; confirm p95 ${report.seed.perStep.confirm.p95} ms`);
}
if (!tokens.length) throw new Error("No sessions could be seeded");
await mkdir("output/loadtest", { recursive: true }); await writeFile(TOKENS_FILE, JSON.stringify(tokens));
if (ONLY === "seed") { console.log(`Saved ${tokens.length} links to ${TOKENS_FILE}.`); process.exit(0); }

// --- Phase 2: several booths upload at the same time, each from its own address, one photo after another like the real app
console.log(`${BOOTHS} booths uploading ${BOOTH_SESSIONS} rounds of ${BOOTH_PHOTOS} photos each, at the same time…`);
{
  const timings = [], failures = []; let roundsDone = 0, rounds = 0;
  const started = performance.now();
  await Promise.all(Array.from({ length: BOOTHS }, async (_, b) => {
    for (let i = 0; i < BOOTH_SESSIONS; i++) {
      rounds++;
      const r = await uploadSession(booth, { eventId, photo, photos: BOOTH_PHOTOS, ip: ipOf(900 + b) });
      timings.push(...r.timings); failures.push(...r.failures); if (r.done) roundsDone++;
    }
  }));
  const seconds = (performance.now() - started) / 1000;
  const byStatus = {}; for (const t of timings) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  report.booths = { booths: BOOTHS, rounds, roundsDone, roundSuccessPct: +(100 * roundsDone / rounds).toFixed(1), seconds: +seconds.toFixed(1), photosPerMinute: +(roundsDone * BOOTH_PHOTOS / (seconds / 60)).toFixed(1), calls: timings.length, byStatus, failureCodes: failures.reduce((m, f) => (m[`${f.name}:${f.status}:${f.code ?? ""}`] = (m[`${f.name}:${f.status}:${f.code ?? ""}`] ?? 0) + 1, m), {}), perStep: Object.fromEntries(["register", "init", "put", "confirm"].map(name => [name, stats(timings.filter(t => t.name === name).map(t => t.ms))])) };
  console.log(`  rounds ok ${roundsDone}/${rounds} (${report.booths.roundSuccessPct}%), ${report.booths.photosPerMinute} photos/min, statuses ${JSON.stringify(byStatus)}`);
}

}
// --- Phase 3: guests open their link. Each guest: the share API, then the first photo.
async function guestRun(label, { guests, rampSeconds, groupSize }) {
  console.log(`Guests: ${label} (${guests} guests over ${rampSeconds}s, ${groupSize === 1 ? "own address each" : groupSize + " guests per address"})…`);
  const results = [];
  const started = performance.now();
  await Promise.all(Array.from({ length: guests }, async (_, g) => {
    await wait((g / guests) * rampSeconds * 1000 + Math.random() * 50);
    const ip = ipOf(100_000 + Math.floor(g / groupSize) + (label.length * 1000));
    const view = await call("POST", `${ORIGIN}/api/studio/share/view`, { body: { token: tokens[g % tokens.length] }, ip });
    let photoMs = null, photoOk = null;
    if (view.ok && view.json?.photos?.[0]?.url) { const t = await call("GET", view.json.photos[0].url, { binary: true }); photoMs = t.ms; photoOk = t.ok; }
    // The guest then taps a photo to save it: each tap asks the site for a fresh signed link, and counts against the same limit.
    const extra = [];
    for (let k = 1; k < ACTIONS && view.ok && view.json?.photos?.[0]?.id; k++) { await wait(200 + Math.random() * 800); extra.push(await call("POST", `${ORIGIN}/api/studio/share/photo`, { body: { token: tokens[g % tokens.length], photoId: view.json.photos[0].id }, ip })); }
    results.push({ viewMs: view.ms, status: view.status, ok: view.ok, photoMs, photoOk, firstPhotoMs: photoMs === null ? null : view.ms + photoMs, extraStatuses: extra.map(e => e.status), extraMs: extra.map(e => e.ms) });
  }));
  const seconds = (performance.now() - started) / 1000;
  const byStatus = {}; for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const extraStatus = {}; for (const r of results) for (const st of r.extraStatuses) extraStatus[st] = (extraStatus[st] ?? 0) + 1;
  const guestsFullyServed = results.filter(r => r.ok && r.extraStatuses.every(st => st === 200)).length;
  const out = { label, guests, rampSeconds, groupSize, actionsPerGuest: ACTIONS, seconds: +seconds.toFixed(1), okPct: +(100 * results.filter(r => r.ok).length / guests).toFixed(1), fullyServedPct: +(100 * guestsFullyServed / guests).toFixed(1), byStatus, photoTapStatuses: extraStatus, photoTapMs: stats(results.flatMap(r => r.extraMs)), viewMs: stats(results.map(r => r.viewMs)), viewOkMs: stats(results.filter(r => r.ok).map(r => r.viewMs)), firstPhotoMs: stats(results.filter(r => r.firstPhotoMs !== null).map(r => r.firstPhotoMs)) };
  console.log(`  opened ${out.okPct}%, fully served (open + taps) ${out.fullyServedPct}%  taps ${JSON.stringify(extraStatus)}  statuses ${JSON.stringify(byStatus)}  view p50/p95/p99 ${out.viewMs.p50}/${out.viewMs.p95}/${out.viewMs.p99} ms  first photo p95 ${out.firstPhotoMs.p95} ms`);
  return out;
}
report.guests = [];
report.guests.push(await guestRun("A end-of-event spread", { guests: GUESTS, rampSeconds: RAMP, groupSize: 1 }));
await wait(2000);
report.guests.push(await guestRun("B same venue Wi-Fi", { guests: GUESTS, rampSeconds: RAMP, groupSize: NAT }));
await wait(2000);
report.guests.push(await guestRun("C everyone at once", { guests: GUESTS, rampSeconds: 5, groupSize: 1 }));

report.finishedAt = new Date().toISOString();
await mkdir("output/loadtest", { recursive: true });
const file = `output/loadtest/report-${Date.now()}.json`;
await writeFile(file, JSON.stringify(report, null, 2));
console.log("Report saved to", file);
process.exit(0);
