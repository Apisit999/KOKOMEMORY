import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID } from "node:crypto";
import { EntitlementSigner } from "../../src/lib/studio/crypto.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import { StudioService } from "../../src/lib/studio/service.ts";
import { ReleaseService, compareVersions } from "../../src/lib/studio/releases.ts";
import { createStudioHandler } from "../../src/lib/studio/http.ts";
import { PRODUCT_ID, type ReleaseStorage } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const signer = new EntitlementSigner("local-test", pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
const installer = Buffer.from("fake installer bytes");
async function fixture() {
  const store = new MemoryStore(); let time = Date.parse("2026-10-30T12:00:00Z");
  await migrateStudio(store);
  const files = new Map<string, Buffer>();
  const storage: ReleaseStorage = {
    presignUpload: async key => `https://upload.example.invalid/${key}?sig=1`,
    inspect: async key => { const file = files.get(key); return file ? { size: file.length, sha256: createHash("sha256").update(file).digest("hex") } : null; },
  };
  const now = () => time;
  const releases = new ReleaseService({ store, storage, downloadBaseUrl: "https://downloads.example.invalid", origin: "https://studio.example.invalid", salt: "test-salt", now });
  const service = new StudioService({ store, signer, now, origin: "http://localhost:3040" });
  const publish = async (version: string, extra: Record<string, unknown> = {}) => {
    await releases.adminAction("admin", { action: "create-draft", version, notes: ["note"], ...extra });
    files.set(`releases/windows/${version}/KOKO-Studio-Setup-${version}.exe`, installer);
    await releases.adminAction("admin", { action: "verify", version });
    await releases.adminAction("admin", { action: "set-checks", version, checks: { productionApiVerified: true, publicKeyVerified: true, installerLifecycleVerified: true, approved: true } });
    return releases.adminAction("admin", { action: "publish", version });
  };
  const meta = { ip: "203.0.113.5", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/130", referrer: "https://kokomemory.com/koko-studio", utm: {} };
  return { store, releases, service, files, publish, meta, advance: (ms: number) => { time += ms; } };
}
test("version ordering is numeric, not lexicographic", () => {
  assert.equal(compareVersions("0.1.10", "0.1.9"), 1); assert.equal(compareVersions("1.0.0", "0.9.99"), 1); assert.equal(compareVersions("0.1.1", "0.1.1"), 0);
});
test("publish is blocked until the server measured the checksum and every gate is ticked", async () => {
  const f = await fixture();
  await f.releases.adminAction("admin", { action: "create-draft", version: "0.1.28", notes: [] });
  await assert.rejects(f.releases.adminAction("admin", { action: "publish", version: "0.1.28" }), { code: "release_gate_failed" });
  await assert.rejects(f.releases.adminAction("admin", { action: "verify", version: "0.1.28" }), { code: "file_missing" });
  f.files.set("releases/windows/0.1.28/KOKO-Studio-Setup-0.1.28.exe", installer);
  const verified = await f.releases.adminAction("admin", { action: "verify", version: "0.1.28" });
  assert.equal((verified as { release: { sha256: string } }).release.sha256, createHash("sha256").update(installer).digest("hex"));
  await assert.rejects(f.releases.adminAction("admin", { action: "publish", version: "0.1.28" }), { code: "release_gate_failed" });
  await f.releases.adminAction("admin", { action: "set-checks", version: "0.1.28", checks: { checksumVerified: false, productionApiVerified: true, publicKeyVerified: true, installerLifecycleVerified: true, approved: true } });
  await f.releases.adminAction("admin", { action: "publish", version: "0.1.28" });
  assert.equal((await f.releases.latest({})).release?.version, "0.1.28");
});
test("admin cannot assert a checksum or overwrite an existing version", async () => {
  const f = await fixture();
  await f.releases.adminAction("admin", { action: "create-draft", version: "0.1.28" });
  await assert.rejects(f.releases.adminAction("admin", { action: "create-draft", version: "0.1.28" }), { code: "release_exists" });
  await f.releases.adminAction("admin", { action: "set-checks", version: "0.1.28", checks: { checksumVerified: true } });
  const list = await f.releases.adminList();
  assert.equal(list.releases[0].checks.checksumVerified, false);
  await assert.rejects(f.releases.adminAction("admin", { action: "create-draft", version: "1.0" }), { code: "invalid_request" });
});
test("latest picks the highest published stable release; withdraw rolls back; beta stays off stable", async () => {
  const f = await fixture();
  await f.publish("0.1.9"); await f.publish("0.1.10"); await f.publish("0.2.0", { channel: "beta" });
  assert.equal((await f.releases.latest({ channel: "stable" })).release?.version, "0.1.10");
  assert.equal((await f.releases.latest({ channel: "beta" })).release?.version, "0.2.0");
  await f.releases.adminAction("admin", { action: "withdraw", version: "0.1.10" });
  assert.equal((await f.releases.latest({ channel: "stable" })).release?.version, "0.1.9");
  await assert.rejects(f.releases.download({ version: "0.1.10" }, f.meta), { code: "release_unavailable" });
});
test("downloads are counted, deduplicated per visitor per day, and never store the raw IP", async () => {
  const f = await fixture(); await f.publish("0.1.28");
  const first = await f.releases.download({}, f.meta);
  assert.equal(first.url, "https://downloads.example.invalid/releases/windows/0.1.28/KOKO-Studio-Setup-0.1.28.exe");
  await f.releases.download({}, f.meta); await f.releases.download({}, { ...f.meta, ip: "198.51.100.9", utm: { source: "line" } });
  const stats = await f.releases.adminStats({});
  assert.equal(stats.totals.downloads, 3); assert.equal(stats.totals.uniqueDownloaders, 2);
  const logs = await f.store.list<{ ipHash: string; count: number; ua: string; referrerHost: string }>("studioDownloads");
  assert.equal(logs.length, 2); assert.ok(logs.some(log => log.count === 2)); assert.ok(!JSON.stringify(logs).includes("203.0.113.5"));
  assert.equal(logs[0].ua, "Windows 10/11/Chrome"); assert.equal(logs[0].referrerHost, "kokomemory.com");
  assert.equal((await f.releases.adminList()).releases[0].downloadCount, 3);
  f.advance(86400000); await f.releases.download({}, f.meta);
  assert.equal((await f.releases.adminStats({})).totals.uniqueDownloaders, 3);
});
test("concurrent downloads do not lose counts", async () => {
  const f = await fixture(); await f.publish("0.1.28");
  await Promise.all(Array.from({ length: 15 }, (_, i) => f.releases.download({}, { ...f.meta, ip: `192.0.2.${i}` })));
  assert.equal((await f.releases.adminList()).releases[0].downloadCount, 15);
  assert.equal((await f.releases.adminStats({})).totals.uniqueDownloaders, 15);
});
test("update check reports newer, mandatory and current states and annotates only active devices", async () => {
  const f = await fixture(); await f.publish("0.1.30", { minimumSupportedVersion: "0.1.28" });
  const deviceId = randomUUID(); await f.service.claimFree({ deviceId, productId: PRODUCT_ID });
  const newer = await f.releases.updateCheck({ version: "0.1.29", deviceId }) as { updateAvailable: boolean; mandatory: boolean; latest: { version: string; sha256: string } };
  assert.equal(newer.updateAvailable, true); assert.equal(newer.mandatory, false); assert.equal(newer.latest.version, "0.1.30");
  assert.equal(((await f.releases.updateCheck({ version: "0.1.20" })) as { mandatory: boolean }).mandatory, true);
  assert.deepEqual(await f.releases.updateCheck({ version: "0.1.30" }), { updateAvailable: false, currentVersion: "0.1.30" });
  const [license] = await f.store.list<{ devices: Record<string, { appVersion?: string; status: string }> }>("studioLicenses");
  assert.equal(license.devices[deviceId].appVersion, "0.1.29"); assert.equal(license.devices[deviceId].status, "active");
  await f.releases.updateCheck({ version: "0.1.5", deviceId: randomUUID() });
  assert.equal((await f.store.list("studioLicenses")).length, 1);
  await assert.rejects(f.releases.updateCheck({ version: "latest" }), { code: "invalid_request" });
  const stats = await f.releases.adminStats({}); assert.equal(stats.totals.freeClaims, 1); assert.equal(stats.totals.updateChecks, 4);
});
test("HTTP: public download redirects, admin routes need an admin, unknown query values fail closed", async () => {
  const f = await fixture(); await f.publish("0.1.28");
  const handler = createStudioHandler({ enabled: true, origin: "https://studio.example.invalid", service: async () => f.service, releases: async () => f.releases, clientAddress: () => "203.0.113.5",
    authenticate: async request => { const t = request.headers.get("authorization"); if (t === "Bearer admin") return { uid: "a", admin: true }; if (t === "Bearer user") return { uid: "u", admin: false }; throw new Error("no"); } });
  const get = (path: string, auth?: string) => handler(new Request(`https://studio.example.invalid/api/studio/${path}`, { headers: auth ? { authorization: `Bearer ${auth}` } : {} }), path.split("?")[0]);
  const redirect = await get("download?utm_source=line");
  assert.equal(redirect.status, 302); assert.match(redirect.headers.get("location") ?? "", /KOKO-Studio-Setup-0\.1\.28\.exe$/);
  assert.equal((await get("download?version=9.9.9")).status, 404);
  assert.equal((await get("download?channel=evil")).status, 400);
  assert.equal(((await (await get("releases/latest")).json()) as { release: { version: string } }).release.version, "0.1.28");
  assert.equal((await get("admin/releases")).status, 401); assert.equal((await get("admin/releases", "user")).status, 403);
  assert.equal((await get("admin/releases", "admin")).status, 200); assert.equal((await get("admin/stats?from=bad", "admin")).status, 400);
  const post = await handler(new Request("https://studio.example.invalid/api/studio/admin/releases", { method: "POST", headers: { authorization: "Bearer admin", "content-type": "application/json" }, body: JSON.stringify({ action: "withdraw", version: "0.1.28" }) }), "admin/releases");
  assert.equal(post.status, 200); assert.equal((await get("download")).status, 404);
});

test("update-check download URL carries the channel so beta releases are downloadable from the Desktop banner", async () => {
  const f = await fixture();
  await f.publish("0.3.0"); await f.publish("0.3.1", { channel: "beta" });
  const beta = await f.releases.updateCheck({ version: "0.1.0", channel: "beta" }) as { latest: { version: string; downloadUrl: string } };
  assert.equal(beta.latest.version, "0.3.1");
  assert.equal(beta.latest.downloadUrl, "https://studio.example.invalid/api/studio/download?version=0.3.1&channel=beta");
  const stable = await f.releases.updateCheck({ version: "0.1.0", channel: "stable" }) as { latest: { downloadUrl: string } };
  assert.equal(stable.latest.downloadUrl, "https://studio.example.invalid/api/studio/download?version=0.3.0");
  // The URL the Desktop opens must actually resolve.
  assert.match((await f.releases.download({ version: "0.3.1", channel: "beta" }, { ip: "1.1.1.1", userAgent: "", referrer: "", utm: {} })).url, /KOKO-Studio-Setup-0\.3\.1\.exe$/);
});
