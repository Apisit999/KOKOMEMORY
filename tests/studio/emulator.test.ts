import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { FirestoreStore } from "../../src/lib/studio/firestore-store.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import { StudioService } from "../../src/lib/studio/service.ts";
import { EntitlementSigner } from "../../src/lib/studio/crypto.ts";
import { PRODUCT_ID, type License } from "../../src/lib/studio/types.ts";
const enabled = process.env.STUDIO_TEST_EMULATORS === "true";
function localApp() {
  if (process.env.STUDIO_ENV !== "local" || process.env.GCLOUD_PROJECT !== "demo-kokomemory-local" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Tests require isolated loopback demo emulators");
  return getApps()[0] ?? initializeApp({ projectId: "demo-kokomemory-local" });
}
test("real Firestore emulator handles concurrent claim transactions and preserves migration settings", { skip: !enabled }, async () => {
  const app = localApp(); const store = new FirestoreStore(getFirestore(app));
  await migrateStudio(store);
  const signer = new EntitlementSigner(process.env.STUDIO_SIGNING_KEY_ID!, process.env.STUDIO_SIGNING_PRIVATE_KEY!.replace(/\\n/g, "\n"));
  const service = new StudioService({ store, signer, origin: "http://localhost:3040" });
  const input = { deviceId: randomUUID(), productId: PRODUCT_ID };
  const results = await Promise.all(Array.from({ length: 8 }, () => service.claimFree(input)));
  const claims = results.map(result => signer.verify(result.entitlement, input.deviceId, Date.now()));
  assert.equal(new Set(claims.map(claim => claim.licenseId)).size, 1);
  const license = (await getFirestore(app).collection("studioLicenses").doc(claims[0].licenseId).get()).data() as License;
  assert.equal(Object.keys(license.devices).length, 1);
  assert.equal((await migrateStudio(store)).changed, false);
});
test("real Firebase Auth + Next HTTP: browser account permission, linking, admin revoke and disabled purchase", { skip: !enabled }, async () => {
  const app = localApp();
  const base = "http://localhost:3040";
  async function user() {
    const email = `${randomUUID()}@studio-test.invalid`;
    const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-local-api-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: randomUUID(), returnSecureToken: true }) });
    assert.equal(response.status, 200); return await response.json() as { idToken: string; localId: string };
  }
  const alice = await user(); const bob = await user();
  async function api(path: string, input?: object, token?: string) {
    return fetch(`${base}${path}`, { method: input ? "POST" : "GET", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(input ? { body: JSON.stringify(input) } : {}) });
  }
  assert.equal((await api("/api/studio/account/licenses")).status, 401);
  assert.equal((await api("/api/studio/account/licenses", undefined, alice.idToken)).status, 200);
  const input = { deviceId: randomUUID(), productId: PRODUCT_ID };
  const response = await api("/v1/desktop/licenses/free/claim", input); assert.equal(response.status, 200); const issued = await response.json();
  const linking = await api("/v1/desktop/device-authorizations", { ...input, ...issued, deviceName: "Local emulator booth" }); assert.equal(linking.status, 200); const link = await linking.json();
  assert.equal((await api("/api/studio/account/link", { action: "inspect", userCode: link.userCode }, alice.idToken)).status, 200);
  assert.equal((await api("/api/studio/account/link", { action: "approve", userCode: link.userCode }, alice.idToken)).status, 200);
  assert.equal((await api("/v1/desktop/device-authorizations/poll", link)).status, 200);
  const account = await (await api("/api/studio/account/licenses", undefined, alice.idToken)).json(); assert.equal(account.licenses.length, 1);
  const other = await (await api("/api/studio/account/licenses", undefined, bob.idToken)).json(); assert.equal(other.licenses.length, 0);
  assert.equal((await api("/api/studio/account/licenses/manage", { licenseId: account.licenses[0].id, action: "deactivate", deviceId: input.deviceId }, bob.idToken)).status, 404);
  assert.equal((await api("/api/studio/admin/licenses", undefined, alice.idToken)).status, 403);
  assert.equal((await api("/v1/desktop/photo-folders", { ...input, ...issued, label: "blocked" })).status, 403);
  assert.equal((await api("/api/studio/purchase", { planId: "paid" }, alice.idToken)).status, 503);
  // Admin claims are applied only to this disposable demo-emulator user.
  await getAuth(app).setCustomUserClaims(alice.localId, { admin: true });
  const custom = await getAuth(app).createCustomToken(alice.localId);
  const signed = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-local-api-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: custom, returnSecureToken: true }) });
  const admin = await signed.json();
  assert.equal((await api("/api/studio/admin/licenses/manage", { licenseId: account.licenses[0].id, action: "revoke" }, admin.idToken)).status, 200);
  assert.deepEqual(await (await api("/v1/desktop/leases/refresh", { ...input, ...issued })).json(), { state: "revoked" });
});
test("actual Desktop LicenseRuntime connects over HTTP to Next.js backed by the Firestore emulator", { skip: !enabled || !existsSync(path.join(process.env.KOKO_DESKTOP_SOURCE ?? "D:/pKOKO", "src/main/services/license-runtime.ts")) }, async () => {
  localApp();
  const { LicenseRuntime } = await import(pathToFileURL(path.join(process.env.KOKO_DESKTOP_SOURCE ?? "D:/pKOKO", "src/main/services/license-runtime.ts")).href);
  const signer = new EntitlementSigner(process.env.STUDIO_SIGNING_KEY_ID!, process.env.STUDIO_SIGNING_PRIVATE_KEY!.replace(/\\n/g, "\n"));
  const profile = await mkdtemp(path.join(os.tmpdir(), "koko-studio-http-"));
  try {
    const runtime = new LicenseRuntime({ userDataPath: profile, productId: PRODUCT_ID, apiBaseUrl: "http://localhost:3040", trustedKeys: signer.publicKeys() });
    assert.equal((await runtime.claimFreeLicense()).state, "active");
    assert.equal((await runtime.getStatus()).state, "active");
    assert.equal(await runtime.deactivate(), true);
    assert.equal((await runtime.claimFreeLicense()).state, "active");
    await assert.rejects(runtime.createPhotoFolder("blocked"), /does not include cloud/);
  } finally { await rm(profile, { recursive: true, force: true }); }
});
