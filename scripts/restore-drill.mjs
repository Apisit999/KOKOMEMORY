// Disaster rehearsal on the LOCAL demo stack: create real data, back it up, wipe the database, show the site is broken, restore, show it works.
// Needs the demo stack running (Auth + Firestore emulators, S3 mock, Studio site on :3040). Usage: node scripts/restore-drill.mjs
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { call, createBooth, createEvent, ORIGIN, PRODUCT, uploadSession } from "./loadtest-lib.mjs";
import sharp from "sharp";

const env = { ...process.env, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", GCLOUD_PROJECT: "demo-kokomemory-local" };
const run = (script, ...args) => { const r = spawnSync(process.execPath, [script, ...args], { env, encoding: "utf8" }); return { code: r.status, out: (r.stdout + r.stderr).split("\n").filter(l => l && !/MetadataLookup|trace-warnings|Reparsing|eliminate this warning|MODULE_TYPELESS/.test(l)).join("\n") }; };
const steps = [];
const step = (name, ok, detail = "") => { steps.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) { console.log("Stopping: " + name); process.exit(1); } };
const viewOk = async token => (await call("POST", `${ORIGIN}/api/studio/share/view`, { body: { token }, ip: "10.80.0.1" }));

// 1. Real data: a booth, an event, 5 rounds with a photo each.
const booth = await createBooth();
const eventId = await createEvent(booth, "Restore drill event");
const small = await sharp({ create: { width: 800, height: 600, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg().toBuffer();
const tokens = [];
for (let i = 0; i < 5; i++) { const r = await uploadSession(booth, { eventId, photo: small, photos: 1, ip: `10.81.${i}.1` }); if (r.done) tokens.push(r.token); }
step("5 guest links created through the booth protocol", tokens.length === 5);
const before = await Promise.all(tokens.map(viewOk));
step("every guest link opens and shows its photo", before.every(r => r.ok && r.json.photos.length === 1));
const lease = await call("POST", `${ORIGIN}/v1/desktop/leases/refresh`, { body: { deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip: "10.80.0.2" });
step("the booth's licence refreshes", lease.ok && !!lease.json?.entitlement);

// 2. Back up.
const folder = mkdtempSync(path.join(tmpdir(), "koko-backup-"));
let t = performance.now();
const backup = run("scripts/backup-firestore.mjs", "--out", folder);
const backupSeconds = (performance.now() - t) / 1000;
console.log(backup.out.split("\n").slice(-4).join("\n"));
step("backup finished", backup.code === 0, `${backupSeconds.toFixed(1)} s`);

// 3. Disaster: everything in the database is deleted.
const wipe = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/demo-kokomemory-local/databases/(default)/documents`, { method: "DELETE" });
step("database wiped (the disaster)", wipe.ok);
const broken = await Promise.all(tokens.map(viewOk));
step("with the database gone, guest links stop working", broken.every(r => !r.ok || r.json?.photos?.length === 0), `statuses ${[...new Set(broken.map(r => r.status))].join(",")}, photos ${broken.map(r => r.json?.photos?.length ?? "-").join(",")}`);
const leaseGone = await call("POST", `${ORIGIN}/v1/desktop/leases/refresh`, { body: { deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip: "10.80.0.3" });
step("the booth's licence no longer refreshes either", !leaseGone.ok || !leaseGone.json?.entitlement, `status ${leaseGone.status}`);

// 4. Restore, timed: this is the real "time to recover" of this rehearsal.
t = performance.now();
const restore = run("scripts/restore-firestore.mjs", "--from", folder);
const restoreSeconds = (performance.now() - t) / 1000;
console.log(restore.out.split("\n").slice(0, 3).join("\n"));
step("restore finished and every collection matches the backup", restore.code === 0, `${restoreSeconds.toFixed(1)} s`);

// 5. Proof that it works again, the same way as before.
const after = await Promise.all(tokens.map(viewOk));
step("every guest link opens again with its photo", after.every(r => r.ok && r.json.photos.length === 1));
const leaseBack = await call("POST", `${ORIGIN}/v1/desktop/leases/refresh`, { body: { deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip: "10.80.0.4" });
step("the booth's licence refreshes again, with no re-activation", leaseBack.ok && !!leaseBack.json?.entitlement);
const upload = await uploadSession(booth, { eventId, photo: small, photos: 1, ip: "10.82.0.1" });
step("the booth can upload a new round after the restore", upload.done);

console.log(`\nAll ${steps.length} steps passed. Backup ${backupSeconds.toFixed(1)} s, restore ${restoreSeconds.toFixed(1)} s, on a small database (${backup.out.match(/Backup of [^:]+: (\d+) documents/)?.[1] ?? "?"} documents).`);
process.exit(0);
