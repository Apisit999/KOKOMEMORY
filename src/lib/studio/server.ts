import "server-only";
import { EntitlementSigner } from "./crypto.ts";
import { FirestoreStore } from "./firestore-store.ts";
import { createStudioHandler } from "./http.ts";
import { StudioService } from "./service.ts";
import { ReleaseService } from "./releases.ts";
import { CloudService } from "./cloud.ts";
import { createHash } from "node:crypto";
import type { PublicRelease, ReleaseStorage } from "./types.ts";
import type { PhotoStorage } from "./cloud.ts";
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
function r2PhotoStorage(): PhotoStorage {
  const base = r2Storage("R2_PRIVATE_BUCKET_NAME");
  const bucket = () => { const name = (process.env.R2_PRIVATE_BUCKET_NAME ?? "").trim(); if (!name) throw new Error("R2_PRIVATE_BUCKET_NAME is not configured"); return name; };
  return {
    ...base,
    async presignDownload(key, expiresInSeconds) {
      const [{ GetObjectCommand }, { getSignedUrl }, { r2 }] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner"), import("@/lib/r2")]);
      return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: expiresInSeconds });
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
async function getCloud() {
  if (cloudService) return cloudService;
  await getService(); // same environment and project confirmation checks
  const { adminDb } = await import("@/lib/firebase-admin");
  const privatePem = (process.env.STUDIO_SIGNING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const trusted = JSON.parse(process.env.STUDIO_TRUSTED_PUBLIC_KEYS_JSON ?? "{}") as Record<string, string>;
  cloudService = new CloudService({ store: new FirestoreStore(adminDb), signer: new EntitlementSigner(process.env.STUDIO_SIGNING_KEY_ID ?? "", privatePem, trusted), storage: r2PhotoStorage() });
  return cloudService;
}
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
  service = new StudioService({ store: new FirestoreStore(adminDb), signer: new EntitlementSigner(keyId, privatePem, trusted), origin: process.env.STUDIO_WEB_ORIGIN ?? "" });
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
