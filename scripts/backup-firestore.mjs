// Logical backup of Firestore to plain files (one JSONL file per top-level collection + a manifest with counts and SHA-256).
// A second copy that WE hold, independent of Google's managed backups (see docs/BACKUP_RESTORE.md for when to use which).
// Usage: node scripts/backup-firestore.mjs --out backups/2026-11-19 [--project my-project] [--exclude studioRateLimits,studioIdempotency] [--deep]
// Studio keeps only flat, top-level collections, so sub-collections are NOT searched unless you pass --deep (searching asks Firestore
// one extra question per document: 20,000 documents took 157 s on the emulator and would be far slower over the network).
// Needs Application Default Credentials (or the emulator hosts in the environment). It only READS.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { initializeApp } from "firebase-admin/app";
import { DocumentReference, GeoPoint, Timestamp, getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, a) => (v.startsWith("--") ? [...p, [v.slice(2), a[i + 1]]] : p), []));
const out = args.out;
if (!out) { console.error("Usage: node scripts/backup-firestore.mjs --out <folder> [--project id] [--exclude a,b]"); process.exit(2); }
const project = args.project ?? process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;
if (!project) { console.error("Give --project or set GCLOUD_PROJECT."); process.exit(2); }
// Counters and one-time codes that expire by themselves: useless in a backup and they can be huge.
const DEEP = args.deep === "true" || process.argv.includes("--deep");
const EXCLUDE = new Set((args.exclude ?? "studioRateLimits").split(",").filter(Boolean));

/** Firestore values that JSON cannot carry are tagged, so the restore can rebuild them exactly. */
export function encode(value) {
  if (value instanceof Timestamp) return { __ts: [value.seconds, value.nanoseconds] };
  if (value instanceof GeoPoint) return { __geo: [value.latitude, value.longitude] };
  if (value instanceof DocumentReference) return { __ref: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { __bytes: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  return value;
}

const db = getFirestore(initializeApp({ projectId: project }));
const startedAt = new Date().toISOString();
await mkdir(out, { recursive: true });

/** Every document under a collection path, including subcollections. */
async function* walk(collectionRef) {
  let last;
  for (;;) {
    let query = collectionRef.orderBy("__name__").limit(500);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) return;
    for (const doc of snapshot.docs) {
      yield { path: doc.ref.path, data: encode(doc.data()) };
      if (DEEP) for (const sub of await doc.ref.listCollections()) yield* walk(sub);
    }
    last = snapshot.docs[snapshot.docs.length - 1];
  }
}

const manifest = { tool: "backup-firestore@1", project, startedAt, deep: DEEP, collections: {}, excluded: [...EXCLUDE] };
for (const collection of await db.listCollections()) {
  if (EXCLUDE.has(collection.id)) continue;
  const lines = []; let count = 0;
  for await (const record of walk(collection)) { lines.push(JSON.stringify(record)); count++; }
  const body = lines.join("\n") + (lines.length ? "\n" : "");
  const file = `${collection.id}.jsonl`;
  await writeFile(path.join(out, file), body);
  manifest.collections[collection.id] = { file, documents: count, sha256: createHash("sha256").update(body).digest("hex") };
  console.log(`${collection.id.padEnd(32)} ${String(count).padStart(7)} documents`);
}
manifest.finishedAt = new Date().toISOString();
manifest.totalDocuments = Object.values(manifest.collections).reduce((sum, c) => sum + c.documents, 0);
await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Backup of ${project}: ${manifest.totalDocuments} documents in ${Object.keys(manifest.collections).length} collections -> ${path.resolve(out)}`);
console.log("Note: this is read one collection at a time, so it is not an exact snapshot of one instant; a document written during the backup may be missing.");
process.exit(0);
