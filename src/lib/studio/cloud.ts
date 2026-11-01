import { hash, type EntitlementSigner } from "./crypto.ts";
import { PRODUCT_ID, StudioError, type License, type Plan, type ReleaseStorage, type Transaction, type Store } from "./types.ts";

/**
 * Cloud photo storage for KOKO Studio customers.
 * Ownership comes from the server-side license (ownerUid), never from anything the Desktop app claims.
 * Layout: owner account -> event -> photo. Files live in object storage under studio/{ownerUid}/{eventId}/{photoId}.jpg.
 */
export type CloudEvent = { id: string; ownerUid: string; licenseId: string; clientEventId: string; name: string; date: string | null; status: "active" | "archived"; photoCount: number; bytes: number; createdAt: string; updatedAt: string };
export type CloudPhoto = { id: string; eventId: string; ownerUid: string; sessionId: string | null; key: string; size: number; sha256: string; status: "pending" | "ready" | "hidden"; createdAt: string; updatedAt: string; readyAt: string | null };
export type CloudUsage = { ownerUid: string; bytes: number; photos: number; updatedAt: string };
type Input = Record<string, unknown>;

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const iso = (time: number) => new Date(time).toISOString();
function text(value: unknown, min: number, max: number) {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f]/.test(value)) throw new StudioError("invalid_request");
  return value;
}
function pattern(value: unknown, re: RegExp) { const v = text(value, 1, 128); if (!re.test(v)) throw new StudioError("invalid_request"); return v; }
export const photoKey = (ownerUid: string, eventId: string, photoId: string) => `studio/${ownerUid}/${eventId}/${photoId}.jpg`;

export class CloudService {
  private store: Store; private signer: EntitlementSigner; private storage: ReleaseStorage; private now: () => number;
  constructor(options: { store: Store; signer: EntitlementSigner; storage: ReleaseStorage; now?: () => number }) {
    this.store = options.store; this.signer = options.signer; this.storage = options.storage; this.now = options.now ?? Date.now;
  }

  /** Reads only. Proves the signed entitlement, then re-checks the live license, plan and device in the database. */
  private async authorize(tx: Transaction, input: Input) {
    const deviceId = pattern(input.deviceId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    if (input.productId !== PRODUCT_ID) throw new StudioError("invalid_request");
    const claims = this.signer.verify(input.entitlement, deviceId, this.now());
    const license = await tx.get<License>("studioLicenses", claims.licenseId);
    if (!license || license.productId !== PRODUCT_ID) throw new StudioError("invalid_license", 401);
    if (license.status === "revoked") throw new StudioError("revoked", 403);
    if (license.status !== "active" || (license.expiresAt && Date.parse(license.expiresAt) <= this.now())) throw new StudioError("expired", 403);
    if (license.devices[deviceId]?.status !== "active") throw new StudioError("device_limit", 403);
    const plan = await tx.get<Plan>("studioPlans", license.planId);
    if (!plan || !plan.active || !plan.features.includes("cloud_sync") || !claims.features.includes("cloud_sync")) throw new StudioError("cloud_unavailable", 403);
    // Photos belong to a customer account, so the booth must be linked to one first.
    if (!license.ownerUid) throw new StudioError("account_link_required", 403);
    return { license, plan, ownerUid: license.ownerUid, quota: plan.photoStorageQuotaBytes ?? 0 };
  }

  async upsertEvent(input: Input) {
    const clientEventId = pattern(input.clientEventId, /^[A-Za-z0-9_-]{8,64}$/);
    const name = text(input.name, 1, 120);
    let date: string | null = null;
    if (input.date !== undefined && input.date !== null) { date = pattern(input.date, /^\d{4}-\d{2}-\d{2}$/); if (!Number.isFinite(Date.parse(date))) throw new StudioError("invalid_request"); }
    return this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      const id = hash(`event:${auth.ownerUid}:${clientEventId}`).slice(0, 32);
      const existing = await tx.get<CloudEvent>("studioEvents", id);
      const at = iso(this.now());
      // The same owner re-sending an event only renames it; counters and ownership are never client-controlled.
      const event: CloudEvent = existing ? { ...existing, name, date, updatedAt: at } : { id, ownerUid: auth.ownerUid, licenseId: auth.license.id, clientEventId, name, date, status: "active", photoCount: 0, bytes: 0, createdAt: at, updatedAt: at };
      tx.set("studioEvents", id, event);
      return { eventId: id };
    });
  }

  async initPhoto(input: Input) {
    const eventId = pattern(input.eventId, /^[0-9a-f]{32}$/);
    const photoId = pattern(input.photoId, /^[0-9a-f]{32}$/);
    const sha256 = pattern(input.sha256, /^[0-9a-f]{64}$/);
    const size = input.size;
    if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > MAX_PHOTO_BYTES) throw new StudioError("invalid_request");
    const sessionId = input.sessionId === undefined || input.sessionId === null ? null : pattern(input.sessionId, /^[A-Za-z0-9_-]{1,64}$/);
    const outcome = await this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      const event = await tx.get<CloudEvent>("studioEvents", eventId);
      if (!event || event.ownerUid !== auth.ownerUid) throw new StudioError("not_found", 404);
      if (event.status !== "active") throw new StudioError("event_archived", 409);
      const id = hash(`photo:${auth.ownerUid}:${photoId}`).slice(0, 32);
      const existing = await tx.get<CloudPhoto>("studioPhotos", id);
      if (existing) {
        if (existing.eventId !== eventId || existing.size !== size || existing.sha256 !== sha256) throw new StudioError("photo_conflict", 409);
        return { id, key: existing.key, alreadyUploaded: existing.status !== "pending" };
      }
      const usage = (await tx.get<CloudUsage>("studioUsage", auth.ownerUid)) ?? { ownerUid: auth.ownerUid, bytes: 0, photos: 0, updatedAt: iso(this.now()) };
      if (usage.bytes + size > auth.quota) throw new StudioError("quota_exceeded", 403);
      const at = iso(this.now());
      const key = photoKey(auth.ownerUid, eventId, photoId);
      tx.set<CloudPhoto>("studioPhotos", id, { id, eventId, ownerUid: auth.ownerUid, sessionId, key, size, sha256, status: "pending", createdAt: at, updatedAt: at, readyAt: null });
      return { id, key, alreadyUploaded: false };
    });
    if (outcome.alreadyUploaded) return { photoId: outcome.id, alreadyUploaded: true as const };
    return { photoId: outcome.id, alreadyUploaded: false as const, uploadUrl: await this.storage.presignUpload(outcome.key), expiresInSeconds: 900 };
  }

  /** The server measures the stored object itself; the declared size and checksum must match before the photo counts. */
  async confirmPhoto(input: Input) {
    const photoId = pattern(input.photoId, /^[0-9a-f]{32}$/);
    const pending = await this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      const id = hash(`photo:${auth.ownerUid}:${photoId}`).slice(0, 32);
      const photo = await tx.get<CloudPhoto>("studioPhotos", id);
      if (!photo || photo.ownerUid !== auth.ownerUid) throw new StudioError("not_found", 404);
      return photo;
    });
    if (pending.status !== "pending") return { photoId: pending.id, status: pending.status };
    const found = await this.storage.inspect(pending.key);
    if (!found) throw new StudioError("file_missing", 409);
    if (found.size !== pending.size || found.sha256 !== pending.sha256) throw new StudioError("upload_mismatch", 409);
    return this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      const photo = await tx.get<CloudPhoto>("studioPhotos", pending.id);
      if (!photo || photo.ownerUid !== auth.ownerUid) throw new StudioError("not_found", 404);
      if (photo.status !== "pending") return { photoId: photo.id, status: photo.status };
      const event = await tx.get<CloudEvent>("studioEvents", photo.eventId);
      const usage = (await tx.get<CloudUsage>("studioUsage", auth.ownerUid)) ?? { ownerUid: auth.ownerUid, bytes: 0, photos: 0, updatedAt: iso(this.now()) };
      if (!event) throw new StudioError("not_found", 404);
      if (usage.bytes + photo.size > auth.quota) throw new StudioError("quota_exceeded", 403);
      const at = iso(this.now());
      tx.set<CloudPhoto>("studioPhotos", photo.id, { ...photo, status: "ready", updatedAt: at, readyAt: at });
      tx.set<CloudEvent>("studioEvents", event.id, { ...event, photoCount: event.photoCount + 1, bytes: event.bytes + photo.size, updatedAt: at });
      tx.set<CloudUsage>("studioUsage", auth.ownerUid, { ownerUid: auth.ownerUid, bytes: usage.bytes + photo.size, photos: usage.photos + 1, updatedAt: at });
      return { photoId: photo.id, status: "ready" as const };
    });
  }
}
