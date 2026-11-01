import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { EntitlementSigner } from "../../src/lib/studio/crypto.ts";
import { StudioService } from "../../src/lib/studio/service.ts";
import { createStudioHandler } from "../../src/lib/studio/http.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import { PRODUCT_ID } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";
const desktopRoot = process.env.KOKO_DESKTOP_SOURCE ?? "D:/pKOKO";
const runtimePath = path.join(desktopRoot, "src/main/services/license-runtime.ts");
test("actual Desktop 0.1.27 LicenseRuntime accepts web API responses including reclaim and offline recovery", { skip: !existsSync(runtimePath) }, async () => {
  const { LicenseRuntime } = await import(pathToFileURL(runtimePath).href);
  const store = new MemoryStore(); await migrateStudio(store);
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 }); const signer = new EntitlementSigner("desktop-test", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
  let time = Date.now(); const service = new StudioService({ store, signer, origin: "http://localhost:3040", now: () => time });
  const handler = createStudioHandler({ enabled: true, origin: "http://localhost:3040", service: async () => service, authenticate: async () => { throw new Error(); }, clientAddress: () => "desktop-test" });
  const profile = await mkdtemp(path.join(os.tmpdir(), "koko-studio-contract-"));
  try {
    const runtime = new LicenseRuntime({ userDataPath: profile, productId: PRODUCT_ID, apiBaseUrl: "http://localhost:3040", trustedKeys: signer.publicKeys(), now: () => time,
      fetcher: async (url: string, init: RequestInit) => handler(new Request(url, init), `desktop/${new URL(url).pathname.replace("/v1/desktop/", "")}`) });
    assert.equal((await runtime.claimFreeLicense()).state, "active");
    assert.equal((await runtime.claimFreeLicense()).state, "active");
    assert.equal((await runtime.getPlans())[0].amountMinor, 0);
    time += 80 * 3600000; assert.equal((await runtime.getStatus()).state, "active");
    assert.equal(await runtime.deactivate(), true); assert.equal((await runtime.claimFreeLicense()).state, "active");
    await assert.rejects(runtime.createPhotoFolder("test"), /does not include cloud/);
  } finally { await rm(profile, { recursive: true, force: true }); }
});
test("actual Desktop uploader sends deterministic IDs, checksum, init/upload/confirm and repeat semantics", { skip: !existsSync(path.join(desktopRoot, "src/main/services/koko-memory-client.ts")) }, async () => {
  const { KokoMemoryApiClient } = await import(pathToFileURL(path.join(desktopRoot, "src/main/services/koko-memory-client.ts")).href);
  const requests: { method: string; pathname: string }[] = []; let uploaded = false; let initId = "";
  const client = new KokoMemoryApiClient(async (url: string, init: RequestInit) => {
    const pathname = new URL(url).pathname; requests.push({ method: init.method!, pathname });
    if (init.method === "POST") {
      const body = JSON.parse(String(init.body)); initId = body.photoId;
      assert.match(body.checksum, /^[a-f0-9]{64}$/); assert.equal(body.size, 5);
      return Response.json({ success: true, photoId: initId, alreadyUploaded: uploaded, uploadUrl: "https://test-account.r2.cloudflarestorage.com/mock-upload" });
    }
    if (init.method === "PATCH") { uploaded = true; return Response.json({ success: true }); }
    return Response.json({ success: true });
  });
  const connection = { id: "test", apiBaseUrl: "http://localhost:3040", bookingId: "booking-test", shareId: "a".repeat(24), uploadToken: "test-" + "a".repeat(40) };
  const photo = { sessionId: randomUUID(), photoId: randomUUID(), fileName: "sample.jpg", mimeType: "image/jpeg", bytes: new Uint8Array([255, 216, 255, 217, 0]) };
  await client.uploadPhoto(connection, photo); const repeated = await client.uploadPhoto(connection, photo);
  assert.equal(repeated.alreadyUploaded, true); assert.equal(initId, photo.photoId.replaceAll("-", ""));
  assert.deepEqual(requests.map(request => request.method), ["POST", "PUT", "PATCH", "POST"]);
});
