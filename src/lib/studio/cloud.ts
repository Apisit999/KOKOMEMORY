import { createHmac, randomUUID } from "node:crypto";
import { hash, type EntitlementSigner } from "./crypto.ts";
import { PRODUCT_ID, StudioError, type License, type Plan, type ReleaseStorage, type Transaction, type Store } from "./types.ts";

/**
 * Cloud photo storage for KOKO Studio customers.
 * Ownership comes from the server-side license (ownerUid), never from anything the Desktop app claims.
 * Layout: owner account -> event -> photo. Files live in object storage under studio/{ownerUid}/{eventId}/{photoId}.jpg.
 */
export type CloudEvent = { id: string; ownerUid: string; licenseId: string; clientEventId: string; name: string; date: string | null; status: "active" | "archived"; photoCount: number; bytes: number; createdAt: string; updatedAt: string };
export type CloudPhoto = { id: string; eventId: string; ownerUid: string; sessionId: string | null; key: string; size: number; sha256: string; status: "pending" | "ready" | "hidden" | "deleted"; createdAt: string; updatedAt: string; readyAt: string | null };
export type CloudUsage = { ownerUid: string; bytes: number; photos: number; updatedAt: string };
type Input = Record<string, unknown>;
/** Customer photos need signed, short-lived read URLs and deletion on top of the release storage contract. */
export interface PhotoStorage extends ReleaseStorage {
  /** With downloadName the browser is told to save the file instead of showing it. */
  presignDownload(key: string, expiresInSeconds: number, options?: { downloadName?: string }): Promise<string>;
  remove(key: string): Promise<void>;
}
/** Who is asking: a customer sees only their own photos; an admin sees everything. */
export type CloudScope = { ownerUid: string } | { admin: true };
export const VIEW_URL_SECONDS = 600;
/** One link covers either a single capture session (one guest) or a whole event (the host). */
export type ShareScope = "session" | "event";
export type ShareIndex = { id: string; ownerUid: string; scope: ShareScope; target: string; generation: number; revoked: boolean; updatedAt: string };
export type ShareRecord = { id: string; ownerUid: string; scope: ShareScope; eventId: string | null; sessionId: string | null; createdAt: string; expiresAt: string; revoked: boolean; revokedAt: string | null };
export const SESSION_SHARE_DAYS = 30;
export const EVENT_SHARE_DAYS = 90;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const iso = (time: number) => new Date(time).toISOString();
function text(value: unknown, min: number, max: number) {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f]/.test(value)) throw new StudioError("invalid_request");
  return value;
}
function pattern(value: unknown, re: RegExp) { const v = text(value, 1, 128); if (!re.test(v)) throw new StudioError("invalid_request"); return v; }
export const photoKey = (ownerUid: string, eventId: string, photoId: string) => `studio/${ownerUid}/${eventId}/${photoId}.jpg`;

export class CloudService {
  private store: Store; private signer: EntitlementSigner; private storage: PhotoStorage; private now: () => number; private origin: string; private secret: string;
  constructor(options: { store: Store; signer: EntitlementSigner; storage: PhotoStorage; now?: () => number; origin: string; shareSecret: string }) {
    if (options.shareSecret.length < 32) throw new Error("A share secret of at least 32 characters is required");
    this.origin = options.origin.replace(/\/+$/, "");
    this.secret = options.shareSecret;
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
        // A deleted photo stays as a tombstone so the booth does not upload it again.
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

  // ---------- customer and admin side ----------
  private scopeAllows(scope: CloudScope, ownerUid: string) { return "admin" in scope || scope.ownerUid === ownerUid; }

  /** Events, storage used and the plan quota for one customer account. */
  async accountOverview(ownerUid: string) {
    const [events, licenses, usage] = await Promise.all([
      this.store.list<CloudEvent>("studioEvents", { field: "ownerUid", value: ownerUid }, 100),
      this.store.list<License>("studioLicenses", { field: "ownerUid", value: ownerUid }, 20),
      this.store.transaction(tx => tx.get<CloudUsage>("studioUsage", ownerUid)),
    ]);
    let quotaBytes = 0;
    for (const license of licenses) {
      if (license.status !== "active") continue;
      const plan = await this.store.transaction(tx => tx.get<Plan>("studioPlans", license.planId));
      if (plan?.active && plan.features.includes("cloud_sync")) quotaBytes = Math.max(quotaBytes, plan.photoStorageQuotaBytes ?? 0);
    }
    return { events: events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), usage: { bytes: usage?.bytes ?? 0, photos: usage?.photos ?? 0 }, quotaBytes };
  }

  /** Admin: events across all customers, newest first, optionally for one owner. */
  async adminEvents(ownerUid?: string) {
    const events = await this.store.list<CloudEvent>("studioEvents", ownerUid ? { field: "ownerUid", value: ownerUid } : undefined, 100);
    return { events: events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  }

  /** Photos of one event with read URLs that expire after ten minutes. Hidden photos are visible to admins only. */
  async eventPhotos(scope: CloudScope, eventId: unknown) {
    const id = pattern(eventId, /^[0-9a-f]{32}$/);
    const event = await this.store.transaction(tx => tx.get<CloudEvent>("studioEvents", id));
    if (!event || !this.scopeAllows(scope, event.ownerUid)) throw new StudioError("not_found", 404);
    const all = await this.store.list<CloudPhoto>("studioPhotos", { field: "eventId", value: id }, 100);
    const visible = all.filter(p => p.ownerUid === event.ownerUid && (p.status === "ready" || ("admin" in scope && p.status === "hidden")))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const photos = await Promise.all(visible.map(async p => ({ id: p.id, status: p.status, size: p.size, createdAt: p.createdAt, url: await this.storage.presignDownload(p.key, VIEW_URL_SECONDS) })));
    return { event, photos, urlExpiresInSeconds: VIEW_URL_SECONDS };
  }

  /** delete (owner or admin), hide / unhide (admin only). Counters change only for photos that were counted. */
  async managePhoto(scope: CloudScope, actor: string, input: Input) {
    const action = input.action;
    if (action !== "delete" && action !== "hide" && action !== "unhide") throw new StudioError("invalid_request");
    if (action !== "delete" && !("admin" in scope)) throw new StudioError("forbidden", 403);
    const photoId = pattern(input.photoId, /^[0-9a-f]{32}$/);
    const result = await this.store.transaction(async tx => {
      const photo = await tx.get<CloudPhoto>("studioPhotos", photoId);
      if (!photo || !this.scopeAllows(scope, photo.ownerUid)) throw new StudioError("not_found", 404);
      const event = await tx.get<CloudEvent>("studioEvents", photo.eventId);
      const usage = await tx.get<CloudUsage>("studioUsage", photo.ownerUid);
      const at = iso(this.now());
      const audit = (name: string) => { const id = randomUUID(); tx.set("studioAuditLogs", id, { id, action: name, licenseId: `photo-${photo.id}`, deviceId: null, actor, createdAt: at }); };
      if (action === "delete") {
        if (photo.status === "deleted") return { photo, removeFile: true };
        const counted = photo.status === "ready" || photo.status === "hidden";
        tx.set<CloudPhoto>("studioPhotos", photo.id, { ...photo, status: "deleted", updatedAt: at });
        if (counted && event) tx.set<CloudEvent>("studioEvents", event.id, { ...event, photoCount: Math.max(0, event.photoCount - 1), bytes: Math.max(0, event.bytes - photo.size), updatedAt: at });
        if (counted && usage) tx.set<CloudUsage>("studioUsage", photo.ownerUid, { ...usage, bytes: Math.max(0, usage.bytes - photo.size), photos: Math.max(0, usage.photos - 1), updatedAt: at });
        audit("photo.deleted");
        return { photo: { ...photo, status: "deleted" as const }, removeFile: true };
      }
      if (photo.status === "deleted" || photo.status === "pending") throw new StudioError("photo_unavailable", 409);
      const next = action === "hide" ? "hidden" : "ready";
      if (photo.status !== next) { tx.set<CloudPhoto>("studioPhotos", photo.id, { ...photo, status: next, updatedAt: at }); audit(action === "hide" ? "photo.hidden" : "photo.unhidden"); }
      return { photo: { ...photo, status: next as CloudPhoto["status"] }, removeFile: false };
    });
    // The database is already authoritative; a failed file removal is retried by deleting again.
    if (result.removeFile) { try { await this.storage.remove(result.photo.key); } catch { throw new StudioError("storage_unavailable", 503); } }
    return { photoId, status: result.photo.status };
  }

  // ---------- share links ----------
  /**
   * Tokens are derived (HMAC) rather than stored, so asking again returns the same link without keeping the link
   * itself in the database; only its hash is stored. Revoking bumps the generation, so a new link is never the old one.
   */
  private shareToken(ownerUid: string, scope: ShareScope, target: string, generation: number) {
    return createHmac("sha256", this.secret).update(`share:${ownerUid}:${scope}:${target}:${generation}`).digest("base64url");
  }
  private shareUrl(token: string) { return `${this.origin}/s/${token}`; }

  private async ensureShare(tx: Transaction, ownerUid: string, scope: ShareScope, target: string, eventId: string | null, days: number) {
    const indexId = hash(`shareindex:${ownerUid}:${scope}:${target}`);
    const index = await tx.get<ShareIndex>("studioShareIndex", indexId);
    const current = index && !index.revoked ? this.shareToken(ownerUid, scope, target, index.generation) : null;
    const existing = current ? await tx.get<ShareRecord>("studioShares", hash(current)) : null;
    if (current && existing && !existing.revoked && Date.parse(existing.expiresAt) > this.now()) return { token: current, expiresAt: existing.expiresAt };
    const generation = index ? index.generation + 1 : 1;
    const token = this.shareToken(ownerUid, scope, target, generation);
    const at = iso(this.now()); const expiresAt = iso(this.now() + days * 86400000);
    tx.set<ShareIndex>("studioShareIndex", indexId, { id: indexId, ownerUid, scope, target, generation, revoked: false, updatedAt: at });
    tx.set<ShareRecord>("studioShares", hash(token), { id: hash(token), ownerUid, scope, eventId, sessionId: scope === "session" ? target : null, createdAt: at, expiresAt, revoked: false, revokedAt: null });
    return { token, expiresAt };
  }

  /** Desktop: the QR link for one capture session (one guest sees only that session). */
  async createSessionShare(input: Input) {
    const sessionId = pattern(input.sessionId, /^[A-Za-z0-9_-]{1,64}$/);
    return this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      const made = await this.ensureShare(tx, auth.ownerUid, "session", sessionId, null, SESSION_SHARE_DAYS);
      return { url: this.shareUrl(made.token), expiresAt: made.expiresAt };
    });
  }

  /** Cancels the current link of one target. Cancelling twice is harmless. */
  private async revokeIn(tx: Transaction, ownerUid: string, scope: ShareScope, target: string) {
    const indexId = hash(`shareindex:${ownerUid}:${scope}:${target}`);
    const index = await tx.get<ShareIndex>("studioShareIndex", indexId);
    if (!index || index.revoked) return { revoked: true };
    const record = await tx.get<ShareRecord>("studioShares", hash(this.shareToken(ownerUid, scope, target, index.generation)));
    const at = iso(this.now());
    tx.set<ShareIndex>("studioShareIndex", indexId, { ...index, revoked: true, updatedAt: at });
    if (record) tx.set<ShareRecord>("studioShares", record.id, { ...record, revoked: true, revokedAt: at });
    return { revoked: true };
  }

  /** Desktop: cancel the QR link of one session, e.g. when a guest asks for their photos to be private again. */
  async revokeSessionShare(input: Input) {
    const sessionId = pattern(input.sessionId, /^[A-Za-z0-9_-]{1,64}$/);
    return this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      return this.revokeIn(tx, auth.ownerUid, "session", sessionId);
    });
  }

  /** Customer: link for a whole event (create returns the same link again), or cancel a link. */
  async manageShare(ownerUid: string, input: Input) {
    const action = input.action;
    if (action !== "create" && action !== "revoke") throw new StudioError("invalid_request");
    const bySession = input.sessionId !== undefined && input.sessionId !== null;
    const scope: ShareScope = bySession ? "session" : "event";
    const target = bySession ? pattern(input.sessionId, /^[A-Za-z0-9_-]{1,64}$/) : pattern(input.eventId, /^[0-9a-f]{32}$/);
    return this.store.transaction(async tx => {
      const event = scope === "event" ? await tx.get<CloudEvent>("studioEvents", target) : null;
      if (scope === "event" && (!event || event.ownerUid !== ownerUid || event.status !== "active")) throw new StudioError("not_found", 404);
      if (action === "create") {
        const made = await this.ensureShare(tx, ownerUid, scope, target, event?.id ?? null, scope === "event" ? EVENT_SHARE_DAYS : SESSION_SHARE_DAYS);
        return { url: this.shareUrl(made.token), expiresAt: made.expiresAt };
      }
      return this.revokeIn(tx, ownerUid, scope, target);
    });
  }

  /** Public, no login. Missing, revoked and expired links all look the same so links cannot be probed. */
  async viewShare(tokenInput: unknown) {
    if (typeof tokenInput !== "string" || !TOKEN.test(tokenInput)) throw new StudioError("share_unavailable", 404);
    const share = await this.store.transaction(tx => tx.get<ShareRecord>("studioShares", hash(tokenInput)));
    if (!share || share.revoked || Date.parse(share.expiresAt) <= this.now()) throw new StudioError("share_unavailable", 404);
    const filter = share.scope === "event" ? { field: "eventId", value: share.eventId ?? "" } : { field: "sessionId", value: share.sessionId ?? "" };
    const all = await this.store.list<CloudPhoto>("studioPhotos", filter, 100);
    // The owner check keeps a share from ever showing photos of another account, even if ids collide.
    const photos = all.filter(p => p.status === "ready" && p.ownerUid === share.ownerUid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const eventId = share.eventId ?? photos[0]?.eventId ?? null;
    const event = eventId ? await this.store.transaction(tx => tx.get<CloudEvent>("studioEvents", eventId)) : null;
    const items = await Promise.all(photos.map(async (p, i) => ({
      id: p.id, createdAt: p.createdAt,
      url: await this.storage.presignDownload(p.key, VIEW_URL_SECONDS),
      downloadUrl: await this.storage.presignDownload(p.key, VIEW_URL_SECONDS, { downloadName: `KOKO-${String(i + 1).padStart(2, "0")}.jpg` }),
    })));
    return { scope: share.scope, eventName: event && event.ownerUid === share.ownerUid ? event.name : null, expiresAt: share.expiresAt, urlExpiresInSeconds: VIEW_URL_SECONDS, photos: items };
  }
}
