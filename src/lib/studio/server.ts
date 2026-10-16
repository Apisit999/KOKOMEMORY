import "server-only";
import { EntitlementSigner } from "./crypto.ts";
import { FirestoreStore } from "./firestore-store.ts";
import { createStudioHandler } from "./http.ts";
import { StudioService } from "./service.ts";
let service: StudioService | null = null;
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
export async function studioRequest(request: Request, path: string) {
  const handler = createStudioHandler({
    enabled: process.env.STUDIO_LICENSE_ENABLED === "true",
    origin: process.env.STUDIO_WEB_ORIGIN || new URL(request.url).origin,
    service: getService,
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
