import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { EntitlementSigner } from "../../src/lib/studio/crypto.ts";
import { CloudService, photoKey, type PhotoStorage } from "../../src/lib/studio/cloud.ts";
import { StudioService } from "../../src/lib/studio/service.ts";
import { createStudioHandler } from "../../src/lib/studio/http.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import { LEGAL_VERSION, PRODUCT_ID, type Claims, type License, type Plan } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";

/**
 * M6 acceptance: customer account B must not see or change anything of customer account A through any API.
 * Every account and booth route is called as B (signed-in user B or booth B) against A's ids.
 */
const ORIGIN = "http://localhost:3040";
const NOW = Date.now();
const iso = (t: number) => new Date(t).toISOString();
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const DEVICE = { a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } as const;
const FEATURES = ["capture", "printing", "templates", "cloud_sync"];

async function setup() {
  const store = new MemoryStore(); await migrateStudio(store);
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signer = new EntitlementSigner("iso-test", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
  const files = new Map<string, Buffer>();
  const storage: PhotoStorage = {
    presignDownload: async key => `https://view.example.invalid/${key}`,
    read: async key => { const f = files.get(key); return f ? new Uint8Array(f) : null; },
    remove: async key => { files.delete(key); },
    presignUpload: async key => `https://upload.example.invalid/${key}`,
    write: async (key, bytes) => { files.set(key, Buffer.from(bytes)); },
    inspect: async key => { const f = files.get(key); return f ? { size: f.length, sha256: sha(f) } : null; },
  };
  store.documents.set("studioPlans/pro", { id: "pro", version: 1, name: "Pro", billingPeriod: "month", amountMinor: 0, currency: "THB", deviceLimit: 2, features: FEATURES, active: true, purchasable: false, photoStorageQuotaBytes: 1_000_000 } as Plan);
  const entitlement: Record<"a" | "b", string> = { a: "", b: "" };
  for (const who of ["a", "b"] as const) {
    const license: License = { id: `lic-${who}`, ownerUid: `uid-${who}`, productId: PRODUCT_ID, planId: "pro", status: "active", startsAt: iso(NOW - 1e6), expiresAt: null, createdAt: iso(NOW - 1e6), linkedAt: iso(NOW), maxDevices: 2, devices: { [DEVICE[who]]: { status: "active", name: `booth ${who}`, activatedAt: iso(NOW), lastSeenAt: iso(NOW), deactivatedAt: null } } };
    store.documents.set(`studioLicenses/lic-${who}`, license);
    const claims: Claims = { schemaVersion: 1, keyId: "iso-test", licenseId: `lic-${who}`, deviceId: DEVICE[who], productId: PRODUCT_ID, issuedAt: iso(NOW), startsAt: iso(NOW - 1e6), expiresAt: null, refreshAfter: iso(NOW + 1e6), offlineUntil: iso(NOW + 2e6), features: FEATURES };
    entitlement[who] = signer.sign(claims);
  }
  const service = new StudioService({ store, signer, origin: ORIGIN });
  const cloud = new CloudService({ store, signer, storage, origin: ORIGIN, shareSecret: "tenant-isolation-share-secret-0123456789" });
  const handler = createStudioHandler({ enabled: true, origin: ORIGIN, service: async () => service, cloud: async () => cloud,
    authenticate: async req => { const uid = req.headers.get("x-test-uid"); if (!uid) throw new Error(); return { uid, admin: false }; },
    clientAddress: req => `addr-${req.headers.get("x-test-uid") ?? "booth"}-${randomBytes(4).toString("hex")}` });
  const call = async (path: string, options: { as?: string; body?: object; query?: Record<string, string> } = {}) => {
    const url = new URL(`${ORIGIN}/api/studio/${path}`); for (const [k, v] of Object.entries(options.query ?? {})) url.searchParams.set(k, v);
    const response = await handler(new Request(url, { method: options.body ? "POST" : "GET", headers: { "content-type": "application/json", ...(options.as ? { "x-test-uid": options.as } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined }), path);
    const type = response.headers.get("content-type") ?? "";
    return { status: response.status, json: type.includes("json") ? await response.json() as Record<string, any> : null };
  };
  const booth = (who: "a" | "b", extra: object) => ({ deviceId: DEVICE[who], productId: PRODUCT_ID, entitlement: entitlement[who], ...extra });

  // Customer A: one event, one ready photo, one registered session with a guest link.
  const event = await call("desktop/cloud/events", { body: booth("a", { clientEventId: "wedding-0001", name: "งาน A", date: "2026-12-01" }) });
  assert.equal(event.status, 200); const eventId = event.json!.eventId as string;
  const bytes = Buffer.from("photo of customer A");
  const clientPhotoId = "1".repeat(32);
  assert.equal((await call("desktop/cloud/photos/init", { body: booth("a", { eventId, photoId: clientPhotoId, size: bytes.length, sha256: sha(bytes), sessionId: "round-1" }) })).status, 200);
  files.set(photoKey("uid-a", eventId, clientPhotoId), bytes);
  const confirmed = await call("desktop/cloud/photos/confirm", { body: booth("a", { photoId: clientPhotoId }) });
  assert.equal(confirmed.status, 200);
  const token = randomBytes(32).toString("base64url");
  assert.equal((await call("desktop/cloud/sessions", { body: booth("a", { eventId, sessionId: "round-1", token }) })).status, 200);
  const photos = await call("account/cloud/photos", { as: "uid-a", query: { eventId } });
  assert.equal(photos.json!.photos.length, 1);
  return { call, booth, eventId, clientPhotoId, token, storedPhotoId: photos.json!.photos[0].id as string, store };
}

test("account routes: user B cannot list, open, change or share anything of user A", async () => {
  const t = await setup();
  const overview = await t.call("account/cloud/events", { as: "uid-b" });
  assert.equal(overview.status, 200); assert.deepEqual(overview.json!.events, []); assert.equal(overview.json!.usage.photos, 0);
  assert.equal((await t.call("account/cloud/photos", { as: "uid-b", query: { eventId: t.eventId } })).status, 404);
  assert.equal((await t.call("account/cloud/photos/manage", { as: "uid-b", body: { action: "delete", photoId: t.storedPhotoId } })).status, 404);
  for (const action of ["create", "revoke", "setPin", "clearPin"]) assert.equal((await t.call("account/cloud/shares", { as: "uid-b", body: { action, eventId: t.eventId, pin: "1234" } })).status, 404, `event share ${action}`);
  // A session-scoped link made by B for A's session id belongs to B and shows none of A's photos.
  const sessionLink = await t.call("account/cloud/shares", { as: "uid-b", body: { action: "create", sessionId: "round-1" } });
  assert.equal(sessionLink.status, 200);
  const bView = await t.call("share/view", { body: { token: new URL(sessionLink.json!.url).pathname.split("/").pop() } });
  assert.equal(bView.status, 200); assert.equal(bView.json!.photos.length, 0); assert.equal(bView.json!.eventName, null);
  const licenses = await t.call("account/licenses", { as: "uid-b" });
  assert.deepEqual(licenses.json!.licenses.map((l: License) => l.id), ["lic-b"]);
  assert.equal((await t.call("account/licenses/manage", { as: "uid-b", body: { action: "deactivate", licenseId: "lic-a", deviceId: DEVICE.a } })).status, 404);
  assert.equal((await t.call("account/pilot/start", { as: "uid-b", body: { licenseId: "lic-a", acceptTerms: "x" } })).status, 400); // terms checked first
  for (const path of ["admin/cloud/events", "admin/licenses", "admin/releases", "admin/stats"]) assert.equal((await t.call(path, { as: "uid-b" })).status, 403, path);
  assert.equal((await t.call("admin/cloud/photos/manage", { as: "uid-b", body: { action: "delete", photoId: t.storedPhotoId } })).status, 403);
  // A's photo, link and booth are untouched.
  assert.equal((await t.call("account/cloud/photos", { as: "uid-a", query: { eventId: t.eventId } })).json!.photos.length, 1);
  assert.equal((await t.call("share/view", { body: { token: t.token } })).json!.photos.length, 1);
  assert.equal((t.store.documents.get("studioLicenses/lic-a") as License).devices[DEVICE.a].status, "active");
});

test("pilot start on another user's license is refused even with terms accepted", async () => {
  const t = await setup();
  assert.equal((await t.call("account/pilot/start", { as: "uid-b", body: { licenseId: "lic-a", acceptTerms: LEGAL_VERSION } })).status, 404);
});

test("booth routes: booth B cannot reach events, photos or links of customer A", async () => {
  const t = await setup();
  // Same client event id from booth B makes B's own event, never A's.
  const bEvent = await t.call("desktop/cloud/events", { body: t.booth("b", { clientEventId: "wedding-0001", name: "งาน B", date: null }) });
  assert.equal(bEvent.status, 200); assert.notEqual(bEvent.json!.eventId, t.eventId);
  const bytes = Buffer.from("x");
  assert.equal((await t.call("desktop/cloud/photos/init", { body: t.booth("b", { eventId: t.eventId, photoId: "2".repeat(32), size: 1, sha256: sha(bytes) }) })).status, 404);
  assert.equal((await t.call("desktop/cloud/photos/confirm", { body: t.booth("b", { photoId: t.clientPhotoId }) })).status, 404);
  assert.equal((await t.call("desktop/cloud/sessions", { body: t.booth("b", { eventId: t.eventId, sessionId: "round-x", token: randomBytes(32).toString("base64url") }) })).status, 404);
  // Re-using A's guest token for B's own event is refused.
  assert.equal((await t.call("desktop/cloud/sessions", { body: t.booth("b", { eventId: bEvent.json!.eventId, sessionId: "round-1", token: t.token }) })).status, 409);
  assert.equal((await t.call("desktop/cloud/shares/revoke", { body: t.booth("b", { sessionId: "round-1" }) })).status, 200);
  const bShare = await t.call("desktop/cloud/shares", { body: t.booth("b", { sessionId: "round-1" }) });
  assert.equal(bShare.status, 200);
  assert.equal((await t.call("share/view", { body: { token: new URL(bShare.json!.url).pathname.split("/").pop() } })).json!.photos.length, 0);
  // Booth B presenting A's signed entitlement is refused (it is bound to A's device).
  assert.notEqual((await t.call("desktop/cloud/events", { body: { ...t.booth("a", {}), deviceId: DEVICE.b, clientEventId: "wedding-0002", name: "x", date: null } })).status, 200);
  // A's guest link still shows A's photo after everything B did.
  const aView = await t.call("share/view", { body: { token: t.token } });
  assert.equal(aView.status, 200); assert.equal(aView.json!.photos.length, 1); assert.equal(aView.json!.eventName, "งาน A");
});
