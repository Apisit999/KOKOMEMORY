import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Fixed-window counter in Firestore (collection `rateLimits`, closed to clients by firestore.rules).
 * Set a Firestore TTL policy on `expiresAt` so old counters are deleted automatically.
 *
 * Without TRUSTED_CLIENT_IP_HEADER every caller shares one bucket ("global-native-client"): safe but coarse.
 * Set it only when a reverse proxy overwrites that header (see deploy/hostinger/nginx-https.conf.example).
 */
export function clientKey(request: Request): string {
  const name = process.env.TRUSTED_CLIENT_IP_HEADER || process.env.STUDIO_TRUSTED_CLIENT_IP_HEADER;
  return name ? (request.headers.get(name)?.slice(0, 128) || "unknown-proxy") : "global-native-client";
}

/** Returns false when the caller is over the limit. A storage failure allows the request (fails open). */
export async function allowRequest(scope: string, principal: string, max: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const id = createHash("sha256").update(`${scope}:${principal}:${bucket}`).digest("hex");
  const ref = adminDb.collection("rateLimits").doc(id);
  try {
    return await adminDb.runTransaction(async (tx) => {
      const count = ((await tx.get(ref)).data()?.count as number | undefined) ?? 0;
      if (count >= max) return false;
      tx.set(ref, { scope, count: count + 1, expiresAt: Timestamp.fromMillis((bucket + 2) * windowMs) });
      return true;
    });
  } catch {
    return true;
  }
}

export function tooManyRequests(windowSeconds: number) {
  return Response.json({ success: false, error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(windowSeconds), "Cache-Control": "no-store" } });
}
