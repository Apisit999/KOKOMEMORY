// Restores a backup made by scripts/backup-firestore.mjs into the LOCAL Firestore EMULATOR (demo projects only).
// Restoring into a real project is deliberately not offered here: use Google's managed restore, which writes into a NEW database
// (docs/BACKUP_RESTORE.md). This script exists to PROVE that a backup is complete and usable, and to rehearse the procedure.
// Usage: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/restore-firestore.mjs --from backups/2026-11-19 [--wipe]
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { initializeApp } from "firebase-admin/app";
import { GeoPoint, Timestamp, getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, a) => (v.startsWith("--") ? [...p, [v.slice(2), a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : "true"]] : p), []));
const from = args.from;
if (!from) { console.error("Usage: node scripts/restore-firestore.mjs --from <backup folder> [--wipe]"); process.exit(2); }
const manifest = JSON.parse(await readFile(path.join(from, "manifest.json"), "utf8"));
const project = manifest.project;
if (!process.env.FIRESTORE_EMULATOR_HOST || !String(project).startsWith("demo-")) {
  console.error(`Refusing: restore only runs against the Firestore Emulator for a demo project (FIRESTORE_EMULATOR_HOST must be set and the backup's project must start with "demo-"; this backup is for "${project}").`);
  process.exit(2);
}

// 1. The backup must be complete and untouched before anything is written.
for (const [name, info] of Object.entries(manifest.collections)) {
  const body = await readFile(path.join(from, info.file), "utf8");
  if (createHash("sha256").update(body).digest("hex") !== info.sha256) throw new Error(`${name}: file does not match its checksum; the backup is damaged`);
  const count = body.split("\n").filter(Boolean).length;
  if (count !== info.documents) throw new Error(`${name}: ${count} documents in the file, ${info.documents} in the manifest`);
}
console.log(`Backup verified: ${manifest.totalDocuments} documents, checksums match.`);

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    if ("__ts" in value) return new Timestamp(value.__ts[0], value.__ts[1]);
    if ("__geo" in value) return new GeoPoint(value.__geo[0], value.__geo[1]);
    if ("__bytes" in value) return Buffer.from(value.__bytes, "base64");
    if ("__ref" in value) return db.doc(value.__ref);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}
const db = getFirestore(initializeApp({ projectId: project }));
const started = performance.now();
if (args.wipe) {
  const response = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: "DELETE" });
  if (!response.ok) throw new Error("Could not clear the emulator: " + response.status);
  console.log("Emulator database cleared first (--wipe).");
}
// 2. Write. Documents with the same ID are overwritten; documents that are not in the backup are left alone.
const writer = db.bulkWriter();
let failed = 0;
writer.onWriteError(error => { failed++; console.error("write failed:", error.documentRef?.path, error.message); return false; });
let written = 0;
for (const info of Object.values(manifest.collections)) {
  for (const line of (await readFile(path.join(from, info.file), "utf8")).split("\n").filter(Boolean)) {
    const record = JSON.parse(line);
    writer.set(db.doc(record.path), decode(record.data)); written++;
  }
}
await writer.close();
if (failed) throw new Error(`${failed} documents could not be written`);
console.log(`Restored ${written} documents in ${((performance.now() - started) / 1000).toFixed(1)} s.`);

// 3. Check what is now in the database against the manifest.
let wrong = 0;
for (const [name, info] of Object.entries(manifest.collections)) {
  const now = (await db.collection(name).count().get()).data().count;
  const ok = now >= info.documents;
  if (!ok) wrong++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(32)} backup ${info.documents}  now ${now}`);
}
process.exit(wrong ? 1 : 0);
