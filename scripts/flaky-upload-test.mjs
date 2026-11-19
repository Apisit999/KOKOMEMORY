// Upload reliability under a bad network, using the REAL Desktop uploader (StudioCloudClient + retry backoff + recovery pass)
// talking to the REAL Studio site, with faults injected between them. LOCAL DEMO STACK ONLY.
// Usage: node scripts/flaky-upload-test.mjs [--sessions 40] [--photos 3] [--desktop C:/PhotoboothKoKo] [--seed 1]
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { call, createBooth, ORIGIN, PRODUCT } from "./loadtest-lib.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, a) => (v.startsWith("--") ? [...p, [v.slice(2), a[i + 1]]] : p), []));
const SESSIONS = Number(args.sessions ?? 40), PHOTOS = Number(args.photos ?? 3), DESKTOP = args.desktop ?? "C:/PhotoboothKoKo";
let seed = Number(args.seed ?? 1);
const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; // repeatable runs
const imp = file => import(pathToFileURL(path.join(DESKTOP, "src/main/services", file)).href);
const { StudioCloudClient, StudioCloudError, PERMANENT_CLOUD_CODES } = await imp("studio-cloud-client.ts");
const { RetryBackoff } = await imp("retry-backoff.ts");
const { recoverStudioCloudSessions } = await imp("studio-cloud-recovery.ts");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const db = getFirestore(initializeApp({ projectId: "demo-kokomemory-local" }, "flaky"));
const booth = await createBooth();
console.log(`Desktop uploader: ${DESKTOP}  |  ${SESSIONS} rounds x ${PHOTOS} photos per profile`);

// --- the bad network -------------------------------------------------------------------------------------------------------
// The site limits each caller address per minute (30 photo uploads/min). The test runs far faster than a real booth, so every call comes
// from a different address: this test measures correctness on a bad network, the per-minute limit is reported separately.
// The per-device limit (60/min) cannot be dodged that way: start the site with STUDIO_BOOTH_DEVICE_PER_MINUTE=100000 for this test
// (honoured only when STUDIO_ENV=local); scripts/booth-rate-limit-test.mjs checks the real limits.
let ipCounter = 3_000_000;
const nextIp = () => { ipCounter++; return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`; };
function makeNetwork(profile) {
  const stats = { codes: {}, calls: 0, beforeLost: 0, responseLost: 0, serverError: 0, truncated: 0, outage: 0 };
  let outageLeft = 0;
  const maybeOutage = () => { if (profile.outageAfterCalls && stats.calls === profile.outageAfterCalls) outageLeft = profile.outageCalls; if (outageLeft > 0) { outageLeft--; stats.outage++; throw new Error("network_error"); } };
  const api = {
    async call(route, payload) {
      stats.calls++; maybeOutage();
      if (random() < profile.before) { stats.beforeLost++; throw new Error("network_error"); }
      if (random() < profile.serverError) { stats.serverError++; throw new StudioCloudError("server_error", false); }
      const r = await call("POST", `${ORIGIN}${route}`, { body: { ...payload, deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip: nextIp() });
      // The site did the work, but the answer never reaches the booth.
      if (random() < profile.after) { stats.responseLost++; throw new Error("network_error"); }
      if (!r.ok) { const code = r.json?.code ?? "server_error"; const key = `${route.replace("/v1/desktop/cloud/", "")}:${r.status}:${code}`; stats.codes[key] = (stats.codes[key] ?? 0) + 1; throw new StudioCloudError(code, PERMANENT_CLOUD_CODES.includes(code)); }
      // The Desktop only accepts https upload links; the local storage mock is http, so the link is dressed up and mapped back below.
      if (route.endsWith("/photos/init") && r.json?.uploadUrl) r.json.uploadUrl = r.json.uploadUrl.replace("http://127.0.0.1:9199", "https://storage.test.invalid");
      return r.json;
    }
  };
  const upload = async (url, bytes) => {
    stats.calls++; maybeOutage();
    const real = url.replace("https://storage.test.invalid", "http://127.0.0.1:9199");
    if (random() < profile.before) { stats.beforeLost++; throw new Error("network_error"); }
    if (random() < profile.truncate) { // half of the file arrives, then the connection drops
      stats.truncated++;
      await fetch(real, { method: "PUT", body: bytes.subarray(0, Math.floor(bytes.length / 2)), headers: { "content-type": "image/jpeg" } });
      throw new Error("network_error");
    }
    const response = await fetch(real, { method: "PUT", body: Buffer.from(bytes), headers: { "content-type": "image/jpeg" } });
    if (!response.ok) throw new Error("upload_failed");
    if (random() < profile.after) { stats.responseLost++; throw new Error("network_error"); }
  };
  return { api, upload, stats };
}

// --- one run ---------------------------------------------------------------------------------------------------------------
async function runProfile(name, profile) {
  const expectedCalls = SESSIONS * (PHOTOS * 3 + 1);
  profile = profile.outage ? { ...profile, outageAfterCalls: Math.round(expectedCalls * 0.2), outageCalls: Math.round(expectedCalls * 0.5) } : profile;
  const net = makeNetwork(profile);
  const dir = mkdtempSync(path.join(tmpdir(), "koko-flaky-"));
  let now = Date.parse("2026-11-19T19:00:00Z");
  let client = new StudioCloudClient(dir, net.api, net.upload, () => now, ORIGIN);
  const restart = () => { client = new StudioCloudClient(dir, net.api, net.upload, () => now, ORIGIN); }; // the app is closed and reopened
  const eventId = `flaky-${name.replace(/\W/g, "").toLowerCase()}-${randomUUID().slice(0, 8)}`;
  // Distinct photos, so a photo attached to the wrong round would be noticed.
  const rounds = [];
  for (let i = 0; i < SESSIONS; i++) {
    const photos = [];
    for (let p = 0; p < PHOTOS; p++) { const bytes = await sharp({ create: { width: 400, height: 300, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 50 } } }).jpeg({ quality: 80 }).toBuffer(); photos.push({ id: randomUUID(), bytes: new Uint8Array(bytes), sha: createHash("sha256").update(bytes).digest("hex") }); }
    rounds.push({ id: randomUUID(), photoIds: photos.map(x => x.id), photos });
  }
  const links = new Map(); let firstAttemptOk = 0;
  const started = performance.now();
  // 1. Every round as the app does it when a round finishes: guest link first (works offline), then try the upload once.
  for (let i = 0; i < rounds.length; i++) {
    if (i > 0 && i % 13 === 0) restart();
    const round = rounds[i];
    try { const link = await client.ensureShare(round.id); if (link) links.set(round.id, link.url); } catch { /* offline: tried again below */ }
    try { await client.uploadSession({ sessionId: round.id, eventId, eventName: "Flaky network test", photos: round.photos.map(x => ({ id: x.id, bytes: x.bytes })) }); await client.ensureShare(round.id); firstAttemptOk++; } catch { /* left for the recovery pass */ }
    now += 20_000;
  }
  // 2. The recovery pass the app runs every minute while online, until nothing is waiting.
  const backoff = new RetryBackoff();
  let passes = 0; const maxPasses = profile.passes ?? 400;
  for (; passes < maxPasses; passes++) {
    if (passes % 7 === 3) restart();
    const pending = client.pendingSessionIds(rounds);
    if (!pending.length) break;
    await recoverStudioCloudSessions({
      sessions: rounds, pendingIds: s => client.pendingSessionIds(s), backoff, now: () => now,
      upload: async id => { const round = rounds.find(r => r.id === id); await client.uploadSession({ sessionId: id, eventId, eventName: "Flaky network test", photos: round.photos.map(x => ({ id: x.id, bytes: x.bytes })) }); const link = await client.ensureShare(id); if (link) links.set(id, link.url); },
      isPermanent: e => e instanceof StudioCloudError && e.permanent, isNoCloud: () => false
    });
    now += 60_000;
  }
  const seconds = (performance.now() - started) / 1000;
  const stillPending = client.pendingSessionIds(rounds).length;

  // 3. What really is on the server, checked from the database and the object storage, not from what the app believes.
  const snap = await db.collection("studioPhotos").where("eventId", "==", (JSON.parse(await (await import("node:fs/promises")).readFile(path.join(dir, "studio-cloud-index.json"), "utf8")).events[eventId] ?? "none")).get();
  const docs = snap.docs.map(d => d.data());
  const byId = new Map(); for (const d of docs) byId.set(d.id, (byId.get(d.id) ?? 0) + 1);
  const expected = rounds.flatMap(r => r.photos.map(p => ({ round: r.id, ...p })));
  let missing = 0, notReady = 0, corrupt = 0, wrongRound = 0, corruptReady = 0;
  for (const e of expected) {
    const id = createHash("sha256").update(`photo:${booth.uid}:${e.id.replace(/-/g, "")}`).digest("hex").slice(0, 32);
    const doc = docs.find(d => d.id === id) ?? docs.find(d => d.sha256 === e.sha);
    if (!doc) { missing++; continue; }
    if (doc.status !== "ready") notReady++;
    if (doc.sessionId !== e.round) wrongRound++;
    const object = await fetch(`http://127.0.0.1:9199/local-private/${doc.key}`);
    const body = object.ok ? Buffer.from(await object.arrayBuffer()) : null;
    if (!body || createHash("sha256").update(body).digest("hex") !== e.sha) { corrupt++; if (doc.status === "ready") corruptReady++; }
  }
  const duplicates = [...byId.values()].filter(n => n > 1).length + Math.max(0, docs.length - new Set(docs.map(d => d.sha256)).size);
  // Guest links, as a guest would open them.
  let linkOk = 0;
  for (const round of rounds) {
    const url = links.get(round.id) ?? client.getShare(round.id)?.url;
    const token = url?.match(/\/s\/([A-Za-z0-9_-]{43})/)?.[1];
    if (!token) continue;
    const view = await call("POST", `${ORIGIN}/api/studio/share/view`, { body: { token }, ip: `10.91.${linkOk % 200}.1` });
    if (view.ok && view.json?.photos?.length === PHOTOS) linkOk++;
  }
  return { name, rounds: SESSIONS, photosExpected: expected.length, onServer: docs.length, missing, notReady, corrupt, corruptReady, duplicates, wrongRound, linksWorking: linkOk, firstAttemptRounds: firstAttemptOk, recoveryPasses: passes, stillPending, calls: net.stats.calls, faults: net.stats, seconds: +seconds.toFixed(1) };
}

const profiles = {
  "A light (5% faults)": { before: 0.05, after: 0.03, serverError: 0.02, truncate: 0.03 },
  "B heavy (15-20% faults)": { before: 0.15, after: 0.12, serverError: 0.08, truncate: 0.1 },
  "C brutal (35-40% faults)": { before: 0.3, after: 0.25, serverError: 0.15, truncate: 0.2, passes: 4000 },
  "D outage mid-event (every call fails for a stretch)": { before: 0.03, after: 0.03, serverError: 0.01, truncate: 0.02, outage: true },
};
const results = [];
for (const [name, profile] of Object.entries(profiles).filter(([name]) => !args.only || name.startsWith(args.only))) {
  const r = await runProfile(name, profile); results.push(r);
  const safe = r.corruptReady === 0 && r.duplicates === 0 && r.wrongRound === 0;
  const complete = r.missing === 0 && r.notReady === 0 && r.corrupt === 0 && r.stillPending === 0 && r.linksWorking === r.rounds;
  r.safe = safe; r.complete = complete;
  console.log(`\n${safe ? (complete ? "PASS" : "SAFE but unfinished") : "FAIL"}  ${name}`);
  console.log(`  rounds finished in the first attempt: ${r.firstAttemptRounds}/${r.rounds}; the rest needed the recovery pass (${r.recoveryPasses} passes)`);
  console.log(`  photos expected ${r.photosExpected}, on server ${r.onServer}, missing ${r.missing}, not ready ${r.notReady}, damaged file behind an unfinished photo ${r.corrupt - r.corruptReady}, damaged file marked ready ${r.corruptReady}, duplicated ${r.duplicates}, attached to the wrong round ${r.wrongRound}`);
  console.log(`  answers from the server that were errors: ${JSON.stringify(r.faults.codes)}`);
  console.log(`  guest links that open with all photos: ${r.linksWorking}/${r.rounds}; still waiting in the app: ${r.stillPending}`);
  console.log(`  calls made ${r.calls} (${(r.calls / (r.rounds * (PHOTOS * 3 + 1))).toFixed(1)}x the faultless minimum); faults injected: lost before server ${r.faults.beforeLost}, answer lost ${r.faults.responseLost}, 5xx ${r.faults.serverError}, upload cut ${r.faults.truncated}, outage ${r.faults.outage}`);
}
console.log("\nSummary:", results.every(r => r.safe) ? "no photo the site calls ready was damaged, duplicated or attached to the wrong round" : "SAFETY PROBLEMS FOUND", "|", results.every(r => r.complete) ? "every round finished" : `unfinished: ${results.filter(r => !r.complete).map(r => r.name).join("; ")}`);
process.exit(0);
