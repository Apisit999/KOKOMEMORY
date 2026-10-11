import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { EntitlementSigner, hash } from "../../src/lib/studio/crypto.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import { StudioService } from "../../src/lib/studio/service.ts";
import { PRODUCT_ID, purchaseDisabled, type License, type Plan } from "../../src/lib/studio/types.ts";
import { createStudioHandler } from "../../src/lib/studio/http.ts";
import { MemoryStore } from "./memory-store.ts";
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const signer = new EntitlementSigner("local-test", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
async function fixture() {
  const store = new MemoryStore(); let time = Date.parse("2026-10-11T12:00:00Z");
  await migrateStudio(store);
  const service = new StudioService({ store, signer, now: () => time, origin: "http://localhost:3040" });
  const deviceId = randomUUID(); const input = { deviceId, productId: PRODUCT_ID };
  return { store, service, input, advance: (ms: number) => { time += ms; }, now: () => time };
}
test("concurrent Free claims create one license and one activation with exactly local features", async () => {
  const f = await fixture(); const results = await Promise.all(Array.from({ length: 20 }, () => f.service.claimFree(f.input)));
  const ids = results.map(result => signer.verify(result.entitlement, f.input.deviceId, f.now()).licenseId);
  assert.equal(new Set(ids).size, 1); assert.equal((await f.store.list("studioLicenses")).length, 1);
  assert.equal((await f.store.list("studioAuditLogs")).length, 1);
  assert.deepEqual(signer.verify(results[0].entitlement, f.input.deviceId, f.now()).features, ["capture", "printing", "templates"]);
});
test("deactivate/reclaim reuses original license; stale deactivate retry does not deactivate a new claim", async () => {
  const f = await fixture(); const initial = await f.service.claimFree(f.input);
  const command = { ...f.input, ...initial, idempotencyKey: randomUUID() };
  await f.service.deactivate(command); assert.deepEqual(await f.service.refresh({ ...f.input, ...initial }), { state: "device_limit" });
  const next = await f.service.claimFree(f.input); await f.service.deactivate(command);
  assert.equal(signer.verify(initial.entitlement, f.input.deviceId, f.now()).licenseId, signer.verify(next.entitlement, f.input.deviceId, f.now()).licenseId);
  assert.ok("entitlement" in await f.service.refresh({ ...f.input, ...next }));
});
test("online refresh recovers after offline grace ended", async () => {
  const f = await fixture(); const initial = await f.service.claimFree(f.input);
  f.advance(80 * 3600000); const result = await f.service.refresh({ ...f.input, ...initial });
  assert.ok("entitlement" in result); if ("entitlement" in result) assert.ok(Date.parse(signer.verify(result.entitlement, f.input.deviceId, f.now()).offlineUntil) > f.now());
});
test("signature, device/product binding, revocation, expiry and start date are enforced", async () => {
  const f = await fixture(); const issued = await f.service.claimFree(f.input); const claims = signer.verify(issued.entitlement, f.input.deviceId, f.now());
  await assert.rejects(f.service.refresh({ ...f.input, entitlement: `${issued.entitlement.slice(0, -2)}AA` }), /invalid_entitlement/);
  await assert.rejects(f.service.refresh({ deviceId: randomUUID(), productId: PRODUCT_ID, ...issued }), /invalid_entitlement/);
  await assert.rejects(f.service.claimFree({ ...f.input, productId: "another-product" }), /invalid_request/);
  const path = `studioLicenses/${claims.licenseId}`; const license = structuredClone(f.store.documents.get(path)) as License;
  f.store.documents.set(path, { ...license, status: "revoked" }); assert.deepEqual(await f.service.refresh({ ...f.input, ...issued }), { state: "revoked" });
  await assert.rejects(f.service.claimFree(f.input), /revoked/);
  f.store.documents.set(path, { ...license, expiresAt: new Date(f.now() - 1000).toISOString() }); assert.deepEqual(await f.service.refresh({ ...f.input, ...issued }), { state: "expired" });
  f.store.documents.set(path, { ...license, startsAt: new Date(f.now() + 1000).toISOString() }); await assert.rejects(f.service.refresh({ ...f.input, ...issued }), /invalid_license/);
});
test("account linking requires signed possession, browser approval and secret poll; codes are one time", async () => {
  const f = await fixture(); const issued = await f.service.claimFree(f.input);
  await assert.rejects(f.service.beginLink({ ...f.input, deviceName: "Booth PC" }), /invalid_entitlement/);
  const link = await f.service.beginLink({ ...f.input, ...issued, deviceName: "Booth PC" });
  assert.equal((await f.service.inspectLink("alice", link.userCode)).deviceName, "Booth PC");
  assert.equal((await f.service.account("alice")).licenses.length, 0);
  await assert.rejects(f.service.pollLink({ authorizationId: link.authorizationId, deviceCode: "x".repeat(43) }), /invalid_code/);
  await f.service.approveLink("alice", link.userCode);
  assert.equal((await f.service.account("alice")).licenses.length, 0);
  await f.service.pollLink(link); assert.equal((await f.service.account("alice")).licenses.length, 1);
  await assert.rejects(f.service.pollLink(link), /invalid_code|code_used/);
  await assert.rejects(f.service.approveLink("alice", link.userCode), /code_used/);
  const fresh = await f.service.beginLink({ ...f.input, ...issued, deviceName: "Booth PC" });
  await assert.rejects(f.service.approveLink("bob", fresh.userCode), /forbidden/);
});
test("expired codes and concurrent cross-account approvals cannot transfer ownership", async () => {
  const f = await fixture(); const issued = await f.service.claimFree(f.input);
  const expired = await f.service.beginLink({ ...f.input, ...issued, deviceName: "Booth PC" }); f.advance(6 * 60000);
  await assert.rejects(f.service.approveLink("alice", expired.userCode), /code_expired/);
  const a = await f.service.beginLink({ ...f.input, ...issued, deviceName: "Booth PC" });
  const b = await f.service.beginLink({ ...f.input, ...issued, deviceName: "Booth PC" });
  await f.service.approveLink("alice", a.userCode); await f.service.approveLink("bob", b.userCode);
  const results = await Promise.allSettled([f.service.pollLink(a), f.service.pollLink(b)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const account = await f.service.account("alice"); assert.equal(account.licenses.length, 1);
  assert.equal((await f.service.account("bob")).licenses.length, 0);
  await assert.rejects(f.service.manage("bob", false, { licenseId: account.licenses[0].id, action: "deactivate", deviceId: f.input.deviceId }), /not_found/);
  await assert.rejects(f.service.manage("alice", false, { licenseId: account.licenses[0].id, action: "revoke" }), /forbidden/);
  await f.service.manage("alice", false, { licenseId: account.licenses[0].id, action: "deactivate", deviceId: f.input.deviceId });
});
test("device seat race permits exactly one activation and idempotency replay cannot restore a detached seat", async () => {
  const f = await fixture(); const issued = await f.service.claimFree(f.input); const claims = signer.verify(issued.entitlement, f.input.deviceId, f.now());
  f.store.documents.set(`studioLicenseKeys/${hash("TEST-ONLY-KEY")}`, { licenseId: claims.licenseId });
  await f.service.deactivate({ ...f.input, ...issued, idempotencyKey: randomUUID() });
  const requests = [randomUUID(), randomUUID()].map(deviceId => ({ deviceId, productId: PRODUCT_ID, licenseKey: "TEST-ONLY-KEY", idempotencyKey: randomUUID() }));
  const results = await Promise.allSettled(requests.map(input => f.service.activate(input)));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const index = results.findIndex(result => result.status === "fulfilled"); const winner = results[index];
  if (winner.status !== "fulfilled") throw new Error();
  await f.service.deactivate({ deviceId: requests[index].deviceId, productId: PRODUCT_ID, ...winner.value, idempotencyKey: randomUUID() });
  await assert.rejects(f.service.activate(requests[index]), /device_limit/);
});
test("Free cloud is denied even if a legacy admin plan accidentally contains cloud_sync; migrations preserve plan edits", async () => {
  const f = await fixture(); const plan = f.store.documents.get("studioPlans/free") as Plan;
  f.store.documents.set("studioPlans/free", { ...plan, version: 7, deviceLimit: 2, features: [...plan.features, "cloud_sync"] });
  const before = structuredClone(f.store.documents.get("studioPlans/free"));
  assert.equal((await migrateStudio(f.store)).changed, false); assert.equal((await migrateStudio(f.store)).changed, false);
  assert.deepEqual(f.store.documents.get("studioPlans/free"), before);
  const issued = await f.service.claimFree(f.input);
  await assert.rejects(f.service.cloud({ ...f.input, ...issued }), /feature_not_in_plan/);
  assert.ok(!signer.verify(issued.entitlement, f.input.deviceId, f.now()).features.includes("cloud_sync"));
  assert.throws(purchaseDisabled, /purchase_unavailable/);
  assert.equal((await f.store.list("studioOrders")).length, 0);
});
test("previous key remains accepted during rotation; unknown keys fail closed", async () => {
  const f = await fixture(); const issued = await f.service.claimFree(f.input);
  const nextPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rotated = new EntitlementSigner("next-key", nextPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(), signer.publicKeys());
  assert.equal(rotated.verify(issued.entitlement, f.input.deviceId, f.now()).keyId, "local-test");
  const unknown = new EntitlementSigner("next-key", nextPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
  assert.throws(() => unknown.verify(issued.entitlement, f.input.deviceId, f.now()), /invalid_entitlement/);
});
test("HTTP denies anonymous/admin/cross-origin/oversized requests; purchase and dev issuance stay closed", async () => {
  const f = await fixture();
  const handler = createStudioHandler({ enabled: true, origin: "http://localhost:3040", service: async () => f.service, clientAddress: () => "test", authenticate: async request => { const token = request.headers.get("authorization"); if (token !== "Bearer alice" && token !== "Bearer admin") throw new Error(); return { uid: token.slice(7), admin: token === "Bearer admin" }; } });
  const request = (path: string, options: RequestInit = {}) => handler(new Request(`http://localhost:3040/${path}`, options), path);
  assert.equal((await request("account/licenses")).status, 401);
  assert.equal((await request("account/licenses", { headers: { authorization: "Bearer alice" } })).status, 200);
  assert.equal((await request("admin/licenses", { headers: { authorization: "Bearer alice" } })).status, 403);
  assert.equal((await request("admin/licenses", { headers: { authorization: "Bearer admin" } })).status, 200);
  assert.equal((await request("account/licenses", { headers: { origin: "https://attacker.invalid", authorization: "Bearer alice" } })).status, 403);
  assert.equal((await request("purchase", { method: "POST", headers: { authorization: "Bearer alice" } })).status, 503);
  assert.equal((await request("desktop/dev/issue", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 404);
  assert.equal((await request("desktop/licenses/free/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(25000) }) })).status, 413);
  assert.equal((await f.store.list("studioLicenses")).length, 0);
});
test("durable rate limiter enforces shared limit and permits next window", async () => {
  const f = await fixture(); await Promise.all([f.service.rateLimit("activate", "test", 2), f.service.rateLimit("activate", "test", 2)]);
  await assert.rejects(f.service.rateLimit("activate", "test", 2), /rate_limited/); f.advance(60000); await f.service.rateLimit("activate", "test", 2);
});
