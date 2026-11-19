// Shared pieces of the load test: a simulated booth (same protocol as the Desktop app) and a simulated guest.
// LOCAL DEMO STACK ONLY (Auth/Firestore emulators + S3 mock). It refuses anything else.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import dotenv from "dotenv";
import sharp from "sharp";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const config = dotenv.config({ path: ".env.studio.local", quiet: true }).parsed;
if (config?.GCLOUD_PROJECT !== "demo-kokomemory-local" || config.STUDIO_ENV !== "local") throw new Error("Local demo environment required");
export const ORIGIN = process.env.LOAD_ORIGIN ?? "http://127.0.0.1:3040";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(ORIGIN)) throw new Error("Load test targets the local demo stack only");
export const PRODUCT = "koko-photobooth";

/** Percentile of a list of numbers (milliseconds). */
export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]);
}

/** One HTTP call with timing. `ip` goes in X-Real-IP, as nginx does in front of the real site. */
export async function call(method, url, { body, headers = {}, ip, raw, binary } = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, { method, headers: { ...(body && !raw ? { "content-type": "application/json" } : {}), ...(ip ? { "x-real-ip": ip } : {}), ...headers }, body: raw ?? (body ? JSON.stringify(body) : undefined), cache: "no-store" });
    // Images are only counted, never decoded as text: turning megabytes of binary into a string costs the load generator more CPU
    // than the server spends serving it, and that delay would be added to every measurement.
    if (binary) { const size = (await response.arrayBuffer()).byteLength; return { ok: response.ok, status: response.status, ms: performance.now() - started, json: null, bytes: size }; }
    const text = await response.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { ok: response.ok, status: response.status, ms: performance.now() - started, json, bytes: text.length };
  } catch (error) { return { ok: false, status: 0, ms: performance.now() - started, json: null, error: error.message }; }
}

/** A booth identity: free claim, link to the demo customer's account, upgrade to the demo cloud plan, fresh lease. */
export async function createBooth() {
  const demo = JSON.parse(await readFile("output/studio/demo-customer.json", "utf8"));
  const deviceId = randomUUID();
  const base = { deviceId, productId: PRODUCT };
  const claim = await call("POST", `${ORIGIN}/v1/desktop/licenses/free/claim`, { body: base, ip: "10.9.0.1" });
  if (!claim.ok) throw new Error("free claim failed " + claim.status);
  const link = await call("POST", `${ORIGIN}/v1/desktop/device-authorizations`, { body: { ...base, ...claim.json, deviceName: "Load test booth" }, ip: "10.9.0.1" });
  if (!link.ok) throw new Error("device authorization failed " + link.status);
  const signIn = await (await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-api-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: demo.email, password: demo.password, returnSecureToken: true }) })).json();
  const approve = await call("POST", `${ORIGIN}/api/studio/account/link`, { body: { action: "approve", userCode: link.json.userCode }, headers: { Authorization: `Bearer ${signIn.idToken}` }, ip: "10.9.0.1" });
  if (!approve.ok) throw new Error("approve failed " + approve.status);
  const poll = await call("POST", `${ORIGIN}/v1/desktop/device-authorizations/poll`, { body: { authorizationId: link.json.authorizationId, deviceCode: link.json.deviceCode }, ip: "10.9.0.1" });
  if (poll.json?.status !== "approved") throw new Error("poll did not approve");
  // Demo data only: give the linked license the cloud plan directly in the Firestore emulator.
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const db = getFirestore(initializeApp({ projectId: "demo-kokomemory-local" }, "load-" + deviceId));
  const licenses = await db.collection("studioLicenses").where("ownerUid", "==", demo.uid).get();
  const mine = licenses.docs.find(doc => doc.data().devices?.[deviceId]);
  if (!mine) throw new Error("linked license not found");
  await db.doc(`studioLicenses/${mine.id}`).update({ planId: "demo-cloud", maxDevices: 50 });
  const refresh = await call("POST", `${ORIGIN}/v1/desktop/leases/refresh`, { body: { ...base, entitlement: poll.json.entitlement }, ip: "10.9.0.1" });
  if (!refresh.json?.entitlement) throw new Error("lease refresh failed " + refresh.status);
  return { deviceId, entitlement: refresh.json.entitlement, uid: demo.uid, licenseId: mine.id };
}

/** A realistic phone-photo sized JPEG (about 1 MB): noisy so it does not compress to nothing. */
export async function samplePhoto() {
  return sharp({ create: { width: 2400, height: 1800, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 45 } } }).jpeg({ quality: 82 }).toBuffer();
}

export const hex32 = () => randomBytes(16).toString("hex");
export const token43 = () => randomBytes(32).toString("base64url");

/** What the Desktop app does for one round: register the session, then init, upload and confirm each photo. */
export async function uploadSession(booth, { eventId, photo, photos = 1, ip }) {
  const timings = []; const failures = [];
  const step = async (name, request) => { const r = await request(); timings.push({ name, ms: r.ms, status: r.status }); if (!r.ok) failures.push({ name, status: r.status, code: r.json?.code }); return r; };
  const sessionId = randomUUID(); const token = token43();
  const cloud = (route, payload) => call("POST", `${ORIGIN}/v1/desktop/cloud/${route}`, { body: { ...payload, deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip });
  const registered = await step("register", () => cloud("sessions", { sessionId, eventId, token, expectedCount: photos }));
  if (!registered.ok) return { token, sessionId, timings, failures, done: false };
  for (let i = 0; i < photos; i++) {
    const photoId = hex32();
    const init = await step("init", () => cloud("photos/init", { eventId, photoId, size: photo.length, sha256: createHash("sha256").update(photo).digest("hex"), sessionId }));
    if (!init.ok) return { token, sessionId, timings, failures, done: false };
    if (init.json?.alreadyUploaded !== true) {
      const put = await step("put", () => call("PUT", init.json.uploadUrl, { raw: photo, headers: { "content-type": "image/jpeg" }, binary: true }));
      if (!put.ok) return { token, sessionId, timings, failures, done: false };
      const confirm = await step("confirm", () => cloud("photos/confirm", { photoId }));
      if (!confirm.ok) return { token, sessionId, timings, failures, done: false };
    }
  }
  return { token, sessionId, timings, failures, done: true };
}

export async function createEvent(booth, name) {
  const r = await call("POST", `${ORIGIN}/v1/desktop/cloud/events`, { body: { clientEventId: "load-" + hex32().slice(0, 12), name, date: null, deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip: "10.9.0.2" });
  if (!r.ok) throw new Error("event create failed " + r.status + " " + JSON.stringify(r.json));
  return r.json.eventId;
}
