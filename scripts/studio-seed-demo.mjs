// Seeds demo cloud photos into the LOCAL emulator + local S3 mock only. Refuses anything else.
import { createHash, randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import dotenv from "dotenv";
import sharp from "sharp";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const config = dotenv.config({ path: ".env.studio.local", quiet: true }).parsed;
if (config?.GCLOUD_PROJECT !== "demo-kokomemory-local" || config.STUDIO_ENV !== "local" || config.R2_LOCAL_ENDPOINT !== "http://127.0.0.1:9199") throw new Error("Local demo environment required");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"; process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const app = initializeApp({ projectId: "demo-kokomemory-local" });
const db = getFirestore(app); const auth = getAuth(app);

const email = "demo-customer@studio-test.invalid"; const password = "Demo-" + randomUUID().slice(0, 12);
let user; try { user = await auth.getUserByEmail(email); await auth.updateUser(user.uid, { password, emailVerified: true }); } catch { user = await auth.createUser({ email, password, emailVerified: true, displayName: "Demo Customer" }); }
const uid = user.uid; const now = new Date().toISOString();
await db.doc("studioPlans/demo-cloud").set({ id: "demo-cloud", version: 1, name: "Demo Cloud", billingPeriod: "month", amountMinor: 0, currency: "THB", deviceLimit: 1, features: ["capture", "printing", "templates", "cloud_sync"], active: true, purchasable: false, photoRetentionDays: 90, photoStorageQuotaBytes: 5 * 1024 ** 3 });
await db.doc("studioLicenses/demo-license").set({ id: "demo-license", ownerUid: uid, productId: "koko-photobooth", planId: "demo-cloud", status: "active", startsAt: now, expiresAt: null, createdAt: now, linkedAt: now, maxDevices: 1, devices: {} });

const hex = (s) => createHash("sha256").update(s).digest("hex").slice(0, 32);
const events = [["Wedding Nok & Beam", "2026-10-24", 8], ["Corporate Party", "2026-11-01", 5]];
const colors = ["#c9a227", "#8a5a44", "#4a6b6a", "#b4577a", "#5b6fa8", "#7a8f3a", "#a8553d", "#3f3f46"];
let totalBytes = 0, totalPhotos = 0;
for (const [name, date, count] of events) {
  const eventId = hex(`event:${uid}:${name}`); let bytes = 0;
  for (let i = 0; i < count; i++) {
    const photoId = hex(`demo-photo:${eventId}:${i}`); const id = hex(`photo:${uid}:${photoId}`);
    const key = `studio/${uid}/${eventId}/${photoId}.jpg`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800"><rect width="100%" height="100%" fill="${colors[(i + name.length) % colors.length]}"/><text x="600" y="900" font-size="120" fill="white" text-anchor="middle" font-family="sans-serif">${name.split(" ")[0]} ${i + 1}</text></svg>`;
    const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
    const put = await fetch(`http://127.0.0.1:9199/local-private/${key}`, { method: "PUT", body: jpg, headers: { "content-type": "image/jpeg" } });
    if (!put.ok) throw new Error("S3 mock upload failed (is scripts/local-s3-mock.mjs running?)");
    await db.doc(`studioPhotos/${id}`).set({ id, eventId, ownerUid: uid, sessionId: `session${Math.floor(i / 2)}`, key, size: jpg.length, sha256: createHash("sha256").update(jpg).digest("hex"), status: "ready", createdAt: now, updatedAt: now, readyAt: now });
    bytes += jpg.length; totalBytes += jpg.length; totalPhotos++;
  }
  await db.doc(`studioEvents/${eventId}`).set({ id: eventId, ownerUid: uid, licenseId: "demo-license", clientEventId: hex(name), name, date, status: "active", photoCount: count, bytes, createdAt: now, updatedAt: now });
}
await db.doc(`studioUsage/${uid}`).set({ ownerUid: uid, bytes: totalBytes, photos: totalPhotos, updatedAt: now });
await mkdir("output/studio", { recursive: true });
await writeFile("output/studio/demo-customer.json", JSON.stringify({ email, password, uid }), { mode: 0o600 });
console.log(`Seeded ${totalPhotos} photos. Login details saved to output/studio/demo-customer.json`);
