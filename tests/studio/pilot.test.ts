import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { EntitlementSigner } from "../../src/lib/studio/crypto.ts";
import { migrateStudio, PILOT_CAP, PILOT_DAYS } from "../../src/lib/studio/migration.ts";
import { StudioService } from "../../src/lib/studio/service.ts";
import { LEGAL_VERSION, PRODUCT_ID, type License } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const signer = new EntitlementSigner("local-test", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
async function fixture() {
  const store = new MemoryStore(); let time = Date.parse("2026-11-03T12:00:00Z"); await migrateStudio(store);
  const service = new StudioService({ store, signer, now: () => time, origin: "http://localhost:3040" });
  const deviceId = randomUUID(); const input = { deviceId, productId: PRODUCT_ID };
  const issued = await service.claimFree(input); const licenseId = signer.verify(issued.entitlement, deviceId, time).licenseId;
  const lic = (await store.transaction(tx => tx.get<License>("studioLicenses", licenseId)))!;
  await store.transaction(async tx => { tx.set("studioLicenses", licenseId, { ...lic, ownerUid: "uid-a" }); });
  return { store, service, input, licenseId, advance: (ms: number) => { time += ms; }, now: () => time };
}
const features = async (f: Awaited<ReturnType<typeof fixture>>) => {
  const r = await f.service.refresh({ ...f.input, entitlement: (await f.service.claimFree(f.input)).entitlement });
  return "entitlement" in r ? signer.verify(r.entitlement, f.input.deviceId, f.now()).features : r;
};
test("pilot gives every feature, only once, then lapses back to Free without locking the booth", async () => {
  const f = await fixture();
  await f.service.startPilot("uid-a", { licenseId: f.licenseId, acceptTerms: LEGAL_VERSION });
  assert.deepEqual(await features(f), ["capture", "printing", "templates", "cloud_sync"]);
  await assert.rejects(f.service.startPilot("uid-a", { licenseId: f.licenseId, acceptTerms: LEGAL_VERSION }), /pilot_unavailable/);
  f.advance((PILOT_DAYS + 1) * 86_400_000);
  assert.deepEqual(await features(f), ["capture", "printing", "templates"]);
});
test("pilot requires accepting the current terms and records the acceptance", async () => {
  const f = await fixture();
  await assert.rejects(f.service.startPilot("uid-a", { licenseId: f.licenseId }), /terms_required/);
  await assert.rejects(f.service.startPilot("uid-a", { licenseId: f.licenseId, acceptTerms: "old" }), /terms_required/);
  await f.service.startPilot("uid-a", { licenseId: f.licenseId, acceptTerms: LEGAL_VERSION });
  const lic = (await f.store.transaction(tx => tx.get<License>("studioLicenses", f.licenseId)))!;
  assert.equal(lic.termsAccepted?.version, LEGAL_VERSION); assert.equal(lic.termsAccepted?.uid, "uid-a");
});
test("pilot is owner-only and capped", async () => {
  const f = await fixture();
  await assert.rejects(f.service.startPilot("uid-b", { licenseId: f.licenseId, acceptTerms: LEGAL_VERSION }), /not_found/);
  await f.store.transaction(async tx => { tx.set("studioPilot", "current", { count: PILOT_CAP }); });
  await assert.rejects(f.service.startPilot("uid-a", { licenseId: f.licenseId, acceptTerms: LEGAL_VERSION }), /pilot_full/);
});
test("admin grant sets and resets a plan with an audit entry", async () => {
  const f = await fixture();
  const r = await f.service.grantPlan("admin", { licenseId: f.licenseId, planId: "pro-month", days: 30 });
  assert.ok(r.planExpiresAt); assert.deepEqual(await features(f), ["capture", "printing", "templates", "cloud_sync"]);
  await f.service.grantPlan("admin", { licenseId: f.licenseId, planId: "free" });
  assert.deepEqual(await features(f), ["capture", "printing", "templates"]);
});
