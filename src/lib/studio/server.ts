import "server-only";
import { EntitlementSigner } from "./crypto.ts";
import { FirestoreStore } from "./firestore-store.ts";
import { createStudioHandler } from "./http.ts";
import { StudioService } from "./service.ts";
import { ReleaseService } from "./releases.ts";
import { CloudService } from "./cloud.ts";
import { NotificationService } from "./notifications.ts";
import { createHash } from "node:crypto";
import type { PublicRelease, ReleaseStorage } from "./types.ts";
import type { Derivative, PhotoStorage } from "./cloud.ts";
let service: StudioService | null = null;
let releaseService: ReleaseService | null = null;
let cloudService: CloudService | null = null;

/** `bucketEnv` picks the bucket: releases use the public one; customer photos must use the private one. */
function r2Storage(bucketEnv: "R2_BUCKET_NAME" | "R2_PRIVATE_BUCKET_NAME" = "R2_BUCKET_NAME"): ReleaseStorage {
  const bucket = () => { const name = (process.env[bucketEnv] ?? "").trim(); if (!name) throw new Error(`${bucketEnv} is not configured`); return name; };
  return {
    async presignUpload(key) {
      const [{ PutObjectCommand }, { getSignedUrl }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner"), import("@/lib/r2")]);
      return getSignedUrl(r2, new PutObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 900 });
    },
    async inspect(key) {
      const [{ GetObjectCommand }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@/lib/r2")]);
      try {
        const object = await r2.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
        if (!object.Body) return null;
        const digest = createHash("sha256"); let size = 0;
        for await (const chunk of object.Body as AsyncIterable<Uint8Array>) { digest.update(chunk); size += chunk.length; }
        return { size, sha256: digest.digest("hex") };
      } catch (error) { if ((error as { name?: string }).name === "NoSuchKey") return null; throw error; }
    },
  };
}

/** Private-bucket storage for customer photos: signed short-lived reads and deletion. */
/** Phone-sized copies (thumb 400 px WebP, preview 1600 px WebP, download 2560 px JPEG). EXIF rotation is applied, metadata dropped. */
async function makeDerivatives(original: Uint8Array): Promise<Derivative[]> {
  const sharp = (await import("sharp")).default;
  const base = () => sharp(original, { limitInputPixels: 80_000_000 }).rotate();
  const fit = (size: number) => ({ width: size, height: size, fit: "inside" as const, withoutEnlargement: true });
  const [thumb, preview, download] = await Promise.all([
    base().resize(fit(400)).webp({ quality: 72 }).toBuffer(),
    base().resize(fit(1600)).webp({ quality: 80 }).toBuffer(),
    base().resize(fit(2560)).jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
  ]);
  return [
    { kind: "thumb", bytes: thumb, contentType: "image/webp" },
    { kind: "preview", bytes: preview, contentType: "image/webp" },
    { kind: "download", bytes: download, contentType: "image/jpeg" },
  ];
}

function r2PhotoStorage(): PhotoStorage {
  const base = r2Storage("R2_PRIVATE_BUCKET_NAME");
  const bucket = () => { const name = (process.env.R2_PRIVATE_BUCKET_NAME ?? "").trim(); if (!name) throw new Error("R2_PRIVATE_BUCKET_NAME is not configured"); return name; };
  return {
    ...base,
    async presignDownload(key, expiresInSeconds, options) {
      const [{ GetObjectCommand }, { getSignedUrl }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner"), import("@/lib/r2")]);
      return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket(), Key: key, ...(options?.downloadName ? { ResponseContentDisposition: `attachment; filename="${options.downloadName.replace(/[^A-Za-z0-9._-]/g, "_")}"` } : {}) }), { expiresIn: expiresInSeconds });
    },
    async read(key) {
      const [{ GetObjectCommand }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@/lib/r2")]);
      try {
        const object = await r2.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
        return object.Body ? await object.Body.transformToByteArray() : null;
      } catch (error) { if ((error as { name?: string }).name === "NoSuchKey") return null; throw error; }
    },
    async write(key, bytes, contentType) {
      const [{ PutObjectCommand }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@/lib/r2")]);
      // Derivatives never change once made, so phones and any CDN may keep them for a long time.
      await r2.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: bytes, ContentType: contentType, CacheControl: "private, max-age=31536000, immutable" }));
    },
    async remove(key) {
      const [{ DeleteObjectCommand }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@/lib/r2")]);
      await r2.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    },
  };
}

async function getReleases() {
  if (releaseService) return releaseService;
  await getService(); // enforces the same environment and project confirmation checks
  const { adminDb } = await import("@/lib/firebase-admin");
  releaseService = new ReleaseService({
    store: new FirestoreStore(adminDb), storage: r2Storage(),
    downloadBaseUrl: process.env.STUDIO_DOWNLOAD_BASE_URL || process.env.R2_PUBLIC_URL || "",
    origin: process.env.STUDIO_WEB_ORIGIN ?? "",
    // Daily-salted IP hashes are keyed with a server secret so they cannot be reversed by brute force.
    salt: createHash("sha256").update(process.env.STUDIO_SIGNING_PRIVATE_KEY ?? "unsalted").digest("hex"),
  });
  return releaseService;
}
async function getNotifications() {
  await getService();
  const [{ adminDb, adminAuth }, { Resend }] = await Promise.all([import("@/lib/firebase-admin"), import("resend")]);
  return new NotificationService({
    store: new FirestoreStore(adminDb), origin: process.env.STUDIO_WEB_ORIGIN ?? "",
    resolveEmail: async uid => { const user = await adminAuth.getUser(uid); return user.email && user.emailVerified ? user.email : null; },
    mailer: { async send(to, subject, html) {
      if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
      const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.RESEND_FROM_EMAIL || "KOKO Memory <onboarding@resend.dev>", to: [to], subject, html });
      if (result.error) throw new Error("send failed");
    } },
  });
}
/** Health and traffic numbers for the outside watcher (scripts/monitor.mjs). No customer data. */
async function getMonitorSnapshot() {
  const { buildSnapshot } = await import("./monitoring.ts");
  await getService(); // same environment checks
  const { adminDb } = await import("@/lib/firebase-admin");
  return buildSnapshot({ store: new FirestoreStore(adminDb), storage: r2PhotoStorage() });
}
async function getCloud() {
  if (cloudService) return cloudService;
  await getService(); // same environment and project confirmation checks
  const { adminDb } = await import("@/lib/firebase-admin");
  const privatePem = (process.env.STUDIO_SIGNING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const trusted = JSON.parse(process.env.STUDIO_TRUSTED_PUBLIC_KEYS_JSON ?? "{}") as Record<string, string>;
  cloudService = new CloudService({ store: new FirestoreStore(adminDb), signer: new EntitlementSigner(process.env.STUDIO_SIGNING_KEY_ID ?? "", privatePem, trusted), storage: r2PhotoStorage(), makeDerivatives,
    origin: process.env.STUDIO_WEB_ORIGIN ?? "",
    // Share links are derived from this secret. Changing it changes every derived link, so set STUDIO_SHARE_SECRET once and keep it.
    shareSecret: process.env.STUDIO_SHARE_SECRET || createHash("sha256").update(`share:${process.env.STUDIO_SIGNING_PRIVATE_KEY ?? ""}`).digest("hex") });
  return cloudService;
}
async function getBilling() {
  await getService(); // same environment checks
  const [{ adminDb }, { BillingService, omiseGateway }] = await Promise.all([import("@/lib/firebase-admin"), import("./billing.ts")]);
  return new BillingService({ store: new FirestoreStore(adminDb), gateway: omiseGateway(process.env.OMISE_SECRET_KEY ?? ""), origin: process.env.STUDIO_WEB_ORIGIN ?? "" });
}
/** Demo-only: lets a phone on the home Wi-Fi reach the local stack over plain HTTP. Ignored unless the environment is `local` on a demo project. */
function lanTestHost() { return process.env.STUDIO_ENV === "local" && (process.env.GCLOUD_PROJECT ?? "").startsWith("demo-") ? process.env.STUDIO_LAN_HOST || undefined : undefined; }
async function getService() {
  if (service) return service;
  if (!["local", "staging", "production"].includes(process.env.STUDIO_ENV ?? "")) throw new Error("Studio environment required");
  const privatePem = (process.env.STUDIO_SIGNING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const keyId = process.env.STUDIO_SIGNING_KEY_ID ?? "";
  const trusted = JSON.parse(process.env.STUDIO_TRUSTED_PUBLIC_KEYS_JSON ?? "{}") as Record<string, string>;
  const { adminDb } = await import("@/lib/firebase-admin");
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
  if (!process.env.STUDIO_FIREBASE_PROJECT_ID || projectId !== process.env.STUDIO_FIREBASE_PROJECT_ID) throw new Error("Studio Firebase project must be confirmed explicitly");
  if (process.env.STUDIO_ENV === "local" && (!projectId.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error("Local Studio requires demo emulators");
  service = new StudioService({ store: new FirestoreStore(adminDb), signer: new EntitlementSigner(keyId, privatePem, trusted), origin: process.env.STUDIO_WEB_ORIGIN ?? "", insecureHost: lanTestHost() });
  return service;
}
/** Used by server-rendered pages; returns null whenever the service is disabled or not ready. */
export async function latestPublicRelease(): Promise<PublicRelease | null> {
  if (process.env.STUDIO_LICENSE_ENABLED !== "true") return null;
  try { return (await (await getReleases()).latest({ channel: "stable" })).release; } catch { return null; }
}
export async function studioRequest(request: Request, path: string) {
  const handler = createStudioHandler({
    enabled: process.env.STUDIO_LICENSE_ENABLED === "true",
    origin: process.env.STUDIO_WEB_ORIGIN || new URL(request.url).origin,
    service: getService,
    releases: getReleases,
    cloud: getCloud,
    notifications: getNotifications,
    monitor: getMonitorSnapshot,
    // Payments stay off until real Omise keys are set and STUDIO_PAYMENTS_ENABLED=true.
    billing: process.env.STUDIO_PAYMENTS_ENABLED === "true" ? getBilling : undefined,
    authenticate: async req => {
      const { requireCustomerApi, isAdminToken } = await import("@/lib/customer-api-auth");
      const token = await requireCustomerApi(req);
      return { uid: token.uid, admin: isAdminToken(token) };
    },
    clientAddress: req => {
      const name = process.env.STUDIO_TRUSTED_CLIENT_IP_HEADER;
      return name ? (req.headers.get(name)?.slice(0, 128) || "unknown-proxy") : "global-native-client";
    },
  });
  return handler(request, path);
}
