import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { EntitlementSigner } from "../../src/lib/studio/crypto.ts";
import { CloudService, photoKey, type PhotoStorage } from "../../src/lib/studio/cloud.ts";
import { PRODUCT_ID, type Claims, type License, type Plan } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const signer = new EntitlementSigner("local-test", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
const NOW = Date.parse("2026-11-01T12:00:00Z");
const iso = (t: number) => new Date(t).toISOString();
const DEVICE = "11111111-1111-4111-8111-111111111111";
const photo = Buffer.from("fake jpeg bytes");
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const ID = (n: string) => n.repeat(32).slice(0, 32);

function setup(options: { quota?: number; features?: Plan["features"]; ownerUid?: string | null; status?: License["status"] } = {}) {
  const store = new MemoryStore();
  const files = new Map<string, Buffer>();
  const removed: string[] = [];
  const failures = { remove: false };
  const storage: PhotoStorage = {
    presignDownload: async (key, seconds, options) => `https://view.example.invalid/${key}?exp=${seconds}${options?.downloadName ? `&dl=${options.downloadName}` : ""}`,
    remove: async key => { if (failures.remove) throw new Error("r2 down"); removed.push(key); files.delete(key); },
    presignUpload: async key => `https://upload.example.invalid/${key}?sig=1`,
    inspect: async key => { const f = files.get(key); return f ? { size: f.length, sha256: sha(f) } : null; },
  };
  const features = options.features ?? ["capture", "printing", "templates", "cloud_sync"];
  store.documents.set("studioPlans/pro", { id: "pro", version: 1, name: "Pro", billingPeriod: "month", amountMinor: 0, currency: "THB", deviceLimit: 2, features, active: true, purchasable: false, photoStorageQuotaBytes: options.quota ?? 1000 } satisfies Plan);
  const license: License = { id: "lic-1", ownerUid: options.ownerUid === undefined ? "uid-a" : options.ownerUid, productId: PRODUCT_ID, planId: "pro", status: options.status ?? "active", startsAt: iso(NOW - 1e6), expiresAt: null, createdAt: iso(NOW - 1e6), linkedAt: null, maxDevices: 2, devices: { [DEVICE]: { status: "active", name: "booth", activatedAt: iso(NOW), lastSeenAt: iso(NOW), deactivatedAt: null } } };
  store.documents.set("studioLicenses/lic-1", license);
  const claims: Claims = { schemaVersion: 1, keyId: "local-test", licenseId: "lic-1", deviceId: DEVICE, productId: PRODUCT_ID, issuedAt: iso(NOW), startsAt: iso(NOW - 1e6), expiresAt: null, refreshAfter: iso(NOW + 1e6), offlineUntil: iso(NOW + 2e6), features };
  const input = { deviceId: DEVICE, productId: PRODUCT_ID, entitlement: signer.sign(claims) };
  const cloud = new CloudService({ store, signer, storage, now: () => NOW, origin: "https://studio.example.invalid", shareSecret: "test-share-secret-0123456789-abcdef-xyz" });
  const at = (offsetMs: number) => new CloudService({ store, signer, storage, now: () => NOW + offsetMs, origin: "https://studio.example.invalid", shareSecret: "test-share-secret-0123456789-abcdef-xyz" });
  return { store, files, cloud, input, license, removed, failures, at };
}
async function makeEvent(f: ReturnType<typeof setup>) { return (await f.cloud.upsertEvent({ ...f.input, clientEventId: "event-0001", name: "งานแต่ง A", date: "2026-11-20" })).eventId; }

test("upsertEvent is idempotent and scoped to the license owner", async () => {
  const f = setup();
  const a = await makeEvent(f), b = await makeEvent(f);
  assert.equal(a, b);
  assert.equal(f.store.documents.size, 3 /* plan + license + one event */);
  const stored = f.store.documents.get(`studioEvents/${a}`) as { ownerUid: string };
  assert.equal(stored.ownerUid, "uid-a");
});

test("full upload flow: init, upload, confirm counts the photo against the owner", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  const init = await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("a"), size: photo.length, sha256: sha(photo) });
  assert.equal(init.alreadyUploaded, false);
  assert.ok("uploadUrl" in init && init.uploadUrl.includes(`studio/uid-a/${eventId}/`));
  f.files.set(photoKey("uid-a", eventId, ID("a")), photo);
  const done = await f.cloud.confirmPhoto({ ...f.input, photoId: ID("a") });
  assert.equal(done.status, "ready");
  const usage = f.store.documents.get("studioUsage/uid-a") as { bytes: number; photos: number };
  assert.deepEqual([usage.bytes, usage.photos], [photo.length, 1]);
  const event = f.store.documents.get(`studioEvents/${eventId}`) as { photoCount: number };
  assert.equal(event.photoCount, 1);
  // A second confirm or init is a no-op, not a double count.
  await f.cloud.confirmPhoto({ ...f.input, photoId: ID("a") });
  assert.equal((f.store.documents.get("studioUsage/uid-a") as { photos: number }).photos, 1);
  const again = await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("a"), size: photo.length, sha256: sha(photo) });
  assert.equal(again.alreadyUploaded, true);
});

test("confirm rejects a missing file and a file that differs from what was declared", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("b"), size: photo.length, sha256: sha(photo) });
  await assert.rejects(f.cloud.confirmPhoto({ ...f.input, photoId: ID("b") }), /file_missing/);
  f.files.set(photoKey("uid-a", eventId, ID("b")), Buffer.from("different bytes!"));
  await assert.rejects(f.cloud.confirmPhoto({ ...f.input, photoId: ID("b") }), /upload_mismatch/);
  assert.equal(f.store.documents.has("studioUsage/uid-a"), false);
});

test("storage quota is enforced and the same photo id with different content conflicts", async () => {
  const f = setup({ quota: 10 });
  const eventId = await makeEvent(f);
  await assert.rejects(f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("c"), size: 11, sha256: sha(photo) }), /quota_exceeded/);
  const g = setup();
  const e2 = await makeEvent(g);
  await g.cloud.initPhoto({ ...g.input, eventId: e2, photoId: ID("d"), size: 5, sha256: sha(photo) });
  await assert.rejects(g.cloud.initPhoto({ ...g.input, eventId: e2, photoId: ID("d"), size: 6, sha256: sha(photo) }), /photo_conflict/);
});

test("access control: no cloud feature, unlinked account, revoked license and other owners are refused", async () => {
  await assert.rejects(makeEvent(setup({ features: ["capture", "printing", "templates"] })), /cloud_unavailable/);
  await assert.rejects(makeEvent(setup({ ownerUid: null })), /account_link_required/);
  await assert.rejects(makeEvent(setup({ status: "revoked" })), /revoked/);
  const f = setup();
  const eventId = await makeEvent(f);
  // The same event id owned by someone else must look like it does not exist.
  const stored = f.store.documents.get(`studioEvents/${eventId}`) as object;
  f.store.documents.set(`studioEvents/${eventId}`, { ...stored, ownerUid: "uid-other" });
  await assert.rejects(f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("e"), size: 5, sha256: sha(photo) }), /not_found/);
  await assert.rejects(f.cloud.initPhoto({ ...f.input, entitlement: "garbage", eventId, photoId: ID("e"), size: 5, sha256: sha(photo) }), /invalid_entitlement/);
});

test("input validation rejects oversized, malformed and non-integer values", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  for (const bad of [{ size: 0 }, { size: 26 * 1024 * 1024 }, { size: 1.5 }, { sha256: "xyz" }, { photoId: "not-hex" }]) {
    await assert.rejects(f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("f"), size: 5, sha256: sha(photo), ...bad }), /invalid_request/);
  }
});

test("the Firestore store accepts every collection the cloud service uses (the in-memory store would not catch a missing one)", async () => {
  const { FirestoreStore } = await import("../../src/lib/studio/firestore-store.ts");
  const touched: string[] = [];
  const fakeDb = {
    collection: (name: string) => ({ doc: (id: string) => ({ name, id }) }),
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => work({ get: async (ref: { name: string }) => { touched.push(ref.name); return { exists: false }; }, set: (ref: { name: string }) => { touched.push(ref.name); } }),
  };
  const store = new FirestoreStore(fakeDb as never);
  for (const name of ["studioEvents", "studioPhotos", "studioUsage", "studioShareIndex", "studioShares"]) {
    await store.transaction(async tx => { await tx.get(name, "abc"); tx.set(name, "abc", { ok: true }); });
  }
  assert.deepEqual([...new Set(touched)].sort(), ["studioEvents", "studioPhotos", "studioShareIndex", "studioShares", "studioUsage"]);
  await assert.rejects(store.transaction(async tx => { await tx.get("notAStudioCollection", "abc"); }), /Invalid Studio document path/);
});

async function uploadReady(f: ReturnType<typeof setup>, eventId: string, letter: string, body = photo) {
  await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID(letter), size: body.length, sha256: sha(body) });
  f.files.set(photoKey("uid-a", eventId, ID(letter)), body);
  return f.cloud.confirmPhoto({ ...f.input, photoId: ID(letter) });
}
const OWNER = { ownerUid: "uid-a" };
const ADMIN = { admin: true } as const;

test("account overview lists events with usage and the plan quota, only for that owner", async () => {
  const f = setup({ quota: 5000 });
  const eventId = await makeEvent(f);
  await uploadReady(f, eventId, "a");
  const view = await f.cloud.accountOverview("uid-a");
  assert.equal(view.events.length, 1);
  assert.deepEqual(view.usage, { bytes: photo.length, photos: 1 });
  assert.equal(view.quotaBytes, 5000);
  const other = await f.cloud.accountOverview("uid-b");
  assert.deepEqual([other.events.length, other.usage.photos, other.quotaBytes], [0, 0, 0]);
});

test("event photos come with expiring read URLs; other customers cannot see them; hidden ones are admin-only", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  const done = await uploadReady(f, eventId, "a");
  const mine = await f.cloud.eventPhotos(OWNER, eventId);
  assert.equal(mine.photos.length, 1);
  assert.ok(mine.photos[0].url.startsWith("https://view.example.invalid/studio/uid-a/") && mine.photos[0].url.endsWith("exp=600"));
  await assert.rejects(f.cloud.eventPhotos({ ownerUid: "uid-b" }, eventId), /not_found/);
  assert.equal((await f.cloud.eventPhotos(ADMIN, eventId)).photos.length, 1);
  await f.cloud.managePhoto(ADMIN, "admin-1", { action: "hide", photoId: done.photoId });
  assert.equal((await f.cloud.eventPhotos(OWNER, eventId)).photos.length, 0);
  assert.equal((await f.cloud.eventPhotos(ADMIN, eventId)).photos[0].status, "hidden");
  await f.cloud.managePhoto(ADMIN, "admin-1", { action: "unhide", photoId: done.photoId });
  assert.equal((await f.cloud.eventPhotos(OWNER, eventId)).photos.length, 1);
  const logs = [...f.store.documents].filter(([k]) => k.startsWith("studioAuditLogs/")).map(([, v]) => (v as { action: string; actor: string }));
  assert.deepEqual(logs.map(l => l.action).sort(), ["photo.hidden", "photo.unhidden"]);
  assert.ok(logs.every(l => l.actor === "admin-1"));
});

test("deleting a photo frees the quota, removes the file and is not re-uploaded by the booth", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  const a = await uploadReady(f, eventId, "a");
  await uploadReady(f, eventId, "b", Buffer.from("second photo bytes"));
  const out = await f.cloud.managePhoto(OWNER, "uid-a", { action: "delete", photoId: a.photoId });
  assert.equal(out.status, "deleted");
  assert.deepEqual(f.removed, [photoKey("uid-a", eventId, ID("a"))]);
  const usage = f.store.documents.get("studioUsage/uid-a") as { photos: number; bytes: number };
  assert.deepEqual([usage.photos, usage.bytes], [1, "second photo bytes".length]);
  assert.equal((f.store.documents.get(`studioEvents/${eventId}`) as { photoCount: number }).photoCount, 1);
  assert.equal((await f.cloud.eventPhotos(OWNER, eventId)).photos.length, 1);
  // The booth asks again for the same photo: it is told it is already handled, and no upload URL is issued.
  const again = await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("a"), size: photo.length, sha256: sha(photo) });
  assert.equal(again.alreadyUploaded, true);
  // A second delete does not double-decrement.
  await f.cloud.managePhoto(OWNER, "uid-a", { action: "delete", photoId: a.photoId });
  assert.equal((f.store.documents.get("studioUsage/uid-a") as { photos: number }).photos, 1);
});

test("a failed file removal is reported, the photo is already gone from the account, and a retry finishes the job", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  const a = await uploadReady(f, eventId, "a");
  f.failures.remove = true;
  await assert.rejects(f.cloud.managePhoto(OWNER, "uid-a", { action: "delete", photoId: a.photoId }), /storage_unavailable/);
  assert.equal((await f.cloud.eventPhotos(OWNER, eventId)).photos.length, 0);
  assert.equal((f.store.documents.get("studioUsage/uid-a") as { photos: number }).photos, 0);
  f.failures.remove = false;
  await f.cloud.managePhoto(OWNER, "uid-a", { action: "delete", photoId: a.photoId });
  assert.equal(f.removed.length, 1);
});

test("permissions: customers cannot hide photos or touch other accounts photos; bad input is rejected", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  const a = await uploadReady(f, eventId, "a");
  await assert.rejects(f.cloud.managePhoto(OWNER, "uid-a", { action: "hide", photoId: a.photoId }), /forbidden/);
  await assert.rejects(f.cloud.managePhoto({ ownerUid: "uid-b" }, "uid-b", { action: "delete", photoId: a.photoId }), /not_found/);
  await assert.rejects(f.cloud.managePhoto(ADMIN, "admin", { action: "explode", photoId: a.photoId }), /invalid_request/);
  await assert.rejects(f.cloud.managePhoto(ADMIN, "admin", { action: "delete", photoId: "nope" }), /invalid_request/);
  await assert.rejects(f.cloud.eventPhotos(OWNER, "../etc"), /invalid_request/);
  assert.equal(f.removed.length, 0);
});

const tokenOf = (url: string) => url.split("/s/")[1] as string;
async function uploadIn(f: ReturnType<typeof setup>, eventId: string, letter: string, sessionId: string, owner = "uid-a") {
  const body = Buffer.from(`photo ${letter}`);
  await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID(letter), size: body.length, sha256: sha(body), sessionId });
  f.files.set(photoKey(owner, eventId, ID(letter)), body);
  return f.cloud.confirmPhoto({ ...f.input, photoId: ID(letter) });
}

test("a session link shows only that guest's photos; the event link shows all; links are stable and unguessable", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  await uploadIn(f, eventId, "a", "guest-one");
  await uploadIn(f, eventId, "b", "guest-one");
  await uploadIn(f, eventId, "c", "guest-two");
  const one = await f.cloud.createSessionShare({ ...f.input, sessionId: "guest-one" });
  const two = await f.cloud.createSessionShare({ ...f.input, sessionId: "guest-two" });
  assert.match(one.url, /^https:\/\/studio\.example\.invalid\/s\/[A-Za-z0-9_-]{43}$/);
  assert.notEqual(one.url, two.url);
  assert.equal((await f.cloud.createSessionShare({ ...f.input, sessionId: "guest-one" })).url, one.url, "asking again returns the same link");
  const viewOne = await f.cloud.viewShare(tokenOf(one.url));
  const viewTwo = await f.cloud.viewShare(tokenOf(two.url));
  assert.deepEqual([viewOne.photos.length, viewTwo.photos.length], [2, 1]);
  assert.equal(viewOne.eventName, "งานแต่ง A");
  assert.ok(viewOne.photos[0].downloadUrl.endsWith("&dl=KOKO-01.jpg"));
  assert.ok(!viewOne.photos[0].url.includes("&dl="));
  const host = (await f.cloud.manageShare("uid-a", { action: "create", eventId })) as { url: string };
  assert.equal((await f.cloud.viewShare(tokenOf(host.url))).photos.length, 3);
  // Only a hash is stored: the token itself never appears in any stored document.
  const stored = JSON.stringify([...f.store.documents.values()]);
  for (const url of [one.url, two.url, host.url]) assert.ok(!stored.includes(tokenOf(url)));
});

test("guests of one account can never see another account's photos through a link", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  await uploadIn(f, eventId, "a", "shared-session-id");
  // Another account re-uses the same session id for its own booth.
  const stored = f.store.documents.get(`studioPhotos/${[...f.store.documents.keys()].find(k => k.startsWith("studioPhotos/"))!.split("/")[1]}`) as object;
  f.store.documents.set("studioPhotos/other-photo", { ...stored, id: "other-photo", ownerUid: "uid-b", key: "studio/uid-b/x/y.jpg" });
  const mine = await f.cloud.createSessionShare({ ...f.input, sessionId: "shared-session-id" });
  const view = await f.cloud.viewShare(tokenOf(mine.url));
  assert.equal(view.photos.length, 1);
  assert.ok(view.photos.every(p => p.url.includes("studio/uid-a/")));
});

test("hidden, deleted and unfinished photos never appear on a share link", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  const a = await uploadIn(f, eventId, "a", "s1");
  const b = await uploadIn(f, eventId, "b", "s1");
  await f.cloud.initPhoto({ ...f.input, eventId, photoId: ID("c"), size: 5, sha256: sha(photo), sessionId: "s1" }); // pending, never confirmed
  const link = tokenOf((await f.cloud.createSessionShare({ ...f.input, sessionId: "s1" })).url);
  await f.cloud.managePhoto(ADMIN, "admin", { action: "hide", photoId: a.photoId });
  assert.equal((await f.cloud.viewShare(link)).photos.length, 1);
  await f.cloud.managePhoto(OWNER, "uid-a", { action: "delete", photoId: b.photoId });
  assert.equal((await f.cloud.viewShare(link)).photos.length, 0);
});

test("revoked, expired, forged and malformed links are indistinguishable; a new link after revoking is different", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  await uploadIn(f, eventId, "a", "s1");
  const first = await f.cloud.createSessionShare({ ...f.input, sessionId: "s1" });
  const token = tokenOf(first.url);
  assert.equal((await f.cloud.viewShare(token)).photos.length, 1);
  await f.cloud.manageShare("uid-a", { action: "revoke", sessionId: "s1" });
  const errors: string[] = [];
  for (const attempt of [token, "A".repeat(43), "short", "", undefined, 42]) {
    try { await f.cloud.viewShare(attempt); errors.push("allowed"); } catch (e) { errors.push((e as { code: string; status: number }).code + (e as { status: number }).status); }
  }
  assert.deepEqual(new Set(errors), new Set(["share_unavailable404"]));
  const second = await f.cloud.createSessionShare({ ...f.input, sessionId: "s1" });
  assert.notEqual(tokenOf(second.url), token);
  assert.equal((await f.cloud.viewShare(tokenOf(second.url))).photos.length, 1);
  await assert.rejects(f.cloud.viewShare(token), /share_unavailable/);
  // Expiry: 31 days later a session link is gone, and asking again issues a fresh one.
  const later = f.at(31 * 86400000);
  await assert.rejects(later.viewShare(tokenOf(second.url)), /share_unavailable/);
  assert.notEqual(tokenOf((await later.createSessionShare({ ...f.input, sessionId: "s1" })).url), tokenOf(second.url));
});

test("the booth can cancel a session link; cancelling twice is harmless and other accounts' links are unaffected", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  await uploadIn(f, eventId, "a", "s1");
  const link = await f.cloud.createSessionShare({ ...f.input, sessionId: "s1" });
  assert.equal((await f.cloud.viewShare(tokenOf(link.url))).photos.length, 1);
  assert.deepEqual(await f.cloud.revokeSessionShare({ ...f.input, sessionId: "s1" }), { revoked: true });
  assert.deepEqual(await f.cloud.revokeSessionShare({ ...f.input, sessionId: "s1" }), { revoked: true });
  await assert.rejects(f.cloud.viewShare(tokenOf(link.url)), /share_unavailable/);
  await assert.rejects(f.cloud.revokeSessionShare({ ...f.input, entitlement: "garbage", sessionId: "s1" }), /invalid_entitlement/);
});

test("event links can only be managed by the event owner, and booths need a cloud license to create session links", async () => {
  const f = setup();
  const eventId = await makeEvent(f);
  await assert.rejects(f.cloud.manageShare("uid-b", { action: "create", eventId }), /not_found/);
  await assert.rejects(f.cloud.manageShare("uid-a", { action: "explode", eventId }), /invalid_request/);
  await assert.rejects(f.cloud.manageShare("uid-a", { action: "create", eventId: "../x" }), /invalid_request/);
  const noCloud = setup({ features: ["capture", "printing", "templates"] });
  await assert.rejects(noCloud.cloud.createSessionShare({ ...noCloud.input, sessionId: "s1" }), /cloud_unavailable/);
  await assert.rejects(f.cloud.createSessionShare({ ...f.input, sessionId: "bad id!" }), /invalid_request/);
  assert.throws(() => new CloudService({ store: f.store, signer, storage: {} as never, origin: "https://x.invalid", shareSecret: "too-short" }), /share secret/);
});

test("retention sweep deletes only photos older than the plan retention and frees quota", async () => {
  const f = setup();
  const plan = f.store.documents.get("studioPlans/pro") as Plan;
  f.store.documents.set("studioPlans/pro", { ...plan, photoRetentionDays: 30 });
  const eventId = await makeEvent(f);
  const upload = async (service: CloudService, n: string, body: string) => {
    const buf = Buffer.from(body); await service.initPhoto({ ...f.input, eventId, photoId: ID(n), sha256: sha(buf), size: buf.length });
    f.files.set(photoKey("uid-a", eventId, ID(n)), buf); await service.confirmPhoto({ ...f.input, photoId: ID(n) });
  };
  await upload(f.cloud, "a", "old photo");
  await upload(f.at(20 * 86_400_000), "b", "newer photo");
  const result = await f.at(31 * 86_400_000).sweepExpiredPhotos();
  assert.deepEqual(result, { deleted: 1, failed: 0 });
  assert.equal(f.removed.length, 1);
  assert.equal((f.store.documents.get("studioUsage/uid-a") as { photos: number }).photos, 1);
  f.store.documents.set("studioPlans/pro", { ...plan, photoRetentionDays: undefined });
  assert.equal((await f.at(400 * 86_400_000).sweepExpiredPhotos()).deleted, 0);
});
