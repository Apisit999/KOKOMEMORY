import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { hash, type EntitlementSigner } from "./crypto.ts";
import { PRODUCT_ID, effectivePlanId, StudioError, type License, type Plan, type ReleaseStorage, type Transaction, type Store } from "./types.ts";

/**
 * Cloud photo storage for KOKO Studio customers.
 * Ownership comes from the server-side license (ownerUid), never from anything the Desktop app claims.
 * Layout: owner account -> event -> photo. Files live in object storage under studio/{ownerUid}/{eventId}/{photoId}.jpg.
 */
export type CloudEvent = { id: string; ownerUid: string; licenseId: string; clientEventId: string; name: string; date: string | null; status: "active" | "archived"; photoCount: number; bytes: number; createdAt: string; updatedAt: string };
export type CloudPhoto = { id: string; eventId: string; ownerUid: string; sessionId: string | null; key: string; size: number; sha256: string; status: "pending" | "ready" | "hidden" | "deleted"; createdAt: string; updatedAt: string; readyAt: string | null; derivatives?: DerivativeKind[] };
/** Smaller copies made after upload so phones never load the original: grid, full screen, and the default saved file. */
export type DerivativeKind = "thumb" | "preview" | "download";
export type Derivative = { kind: DerivativeKind; bytes: Uint8Array; contentType: "image/webp" | "image/jpeg" };
export type DerivativeMaker = (original: Uint8Array) => Promise<Derivative[]>;
export const derivativeKey = (key: string, kind: DerivativeKind) => key.replace(/.jpg$/, kind === "download" ? ".download.jpg" : `.${kind}.webp`);
export type CloudUsage = { ownerUid: string; bytes: number; photos: number; updatedAt: string };
type Input = Record<string, unknown>;
/** Customer photos need signed, short-lived read URLs and deletion on top of the release storage contract. */
export interface PhotoStorage extends ReleaseStorage {
  /** With downloadName the browser is told to save the file instead of showing it. */
  presignDownload(key: string, expiresInSeconds: number, options?: { downloadName?: string }): Promise<string>;
  remove(key: string): Promise<void>;
  /** Whole object as bytes (photos are capped at MAX_PHOTO_BYTES); null when missing. */
  read(key: string): Promise<Uint8Array | null>;
  write(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
}
/** Who is asking: a customer sees only their own photos; an admin sees everything. */
export type CloudScope = { ownerUid: string } | { admin: true };
export const VIEW_URL_SECONDS = 600;
/** One link covers either a single capture session (one guest) or a whole event (the host). */
export type ShareScope = "session" | "event";
export type ShareIndex = { id: string; ownerUid: string; scope: ShareScope; target: string; generation: number; revoked: boolean; updatedAt: string };
export type ShareRecord = { id: string; ownerUid: string; scope: ShareScope; eventId: string | null; sessionId: string | null; createdAt: string; expiresAt: string; revoked: boolean; revokedAt: string | null; pinSalt?: string | null; pinHash?: string | null; pinFailures?: number; pinLockedUntil?: string | null };
export const SESSION_SHARE_DAYS = 30;
const PIN = /^[0-9]{4,8}$/;
const PIN_MAX_FAILURES = 5;
const PIN_LOCK_MS = 15 * 60_000;
const pinDigest = (pin: string, salt: string) => scryptSync(pin, salt, 32).toString("hex");
export const EVENT_SHARE_DAYS = 90;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** A capture session registered by the booth. The booth makes its token offline, so the QR prints before the server knows it. */
export type CloudSession = { id: string; ownerUid: string; eventId: string; sessionId: string; shareId: string; shortCode: string; expectedCount: number | null; createdAt: string; expiresAt: string };
export type ShortCodeRecord = { id: string; eventId: string; shareId: string; expiresAt: string };
/** No look-alike characters (0/O, 1/I). 8 of 32 symbols = 40 bits, only valid together with its event and rate limited. */
const SHORT_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const SHORT_CODE = /^[2-9A-HJ-NP-Z]{8}$/;
const MAX_EXPECTED = 100;
const shortCodeId = (eventId: string, code: string) => hash(`shortcode:${eventId}:${code}`);
function newShortCode() { return [...randomBytes(8)].map(b => SHORT_CODE_ALPHABET[b & 31]).join(""); }

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
/** Photos one event or link can show. The Firestore store allows up to this many per query. */
export const MAX_LIST_PHOTOS = 1000;
const iso = (time: number) => new Date(time).toISOString();
function text(value: unknown, min: number, max: number) {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f]/.test(value)) throw new StudioError("invalid_request");
  return value;
}
function pattern(value: unknown, re: RegExp) { const v = text(value, 1, 128); if (!re.test(v)) throw new StudioError("invalid_request"); return v; }
export const photoKey = (ownerUid: string, eventId: string, photoId: string) => `studio/${ownerUid}/${eventId}/${photoId}.jpg`;

export class CloudService {
  private store: Store; private signer: EntitlementSigner; private storage: PhotoStorage; private now: () => number; private origin: string; private secret: string; private makeDerivatives: DerivativeMaker | null;
  constructor(options: { store: Store; signer: EntitlementSigner; storage: PhotoStorage; now?: () => number; origin: string; shareSecret: string; makeDerivatives?: DerivativeMaker }) {
    this.makeDerivatives = options.makeDerivatives ?? null;
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
    const plan = await tx.get<Plan>("studioPlans", effectivePlanId(license, this.now()));
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
    const confirmed = await this.store.transaction(async tx => {
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
    if (confirmed.status === "ready") await this.buildDerivatives(pending);
    return confirmed;
  }

  /**
   * Best effort: a photo without derivatives still works (pages fall back to the original), so a failure never fails the upload.
   * Derivatives do not count against the quota; they are a fraction of the original and are deleted with it.
   */
  private async buildDerivatives(photo: CloudPhoto) {
    if (!this.makeDerivatives) return;
    try {
      const original = await this.storage.read(photo.key);
      if (!original) return;
      const made = await this.makeDerivatives(original);
      for (const d of made) await this.storage.write(derivativeKey(photo.key, d.kind), d.bytes, d.contentType);
      const kinds = made.map(d => d.kind);
      await this.store.transaction(async tx => {
        const fresh = await tx.get<CloudPhoto>("studioPhotos", photo.id);
        if (fresh && fresh.status !== "deleted") tx.set<CloudPhoto>("studioPhotos", photo.id, { ...fresh, derivatives: kinds });
      });
    } catch { /* keep serving the original */ }
  }
  /** Admin: make phone-sized copies for photos uploaded before they existed. Bounded per run; safe to run again. */
  async backfillDerivatives(limit = 50) {
    if (!this.makeDerivatives) throw new StudioError("not_configured", 503);
    const ready = await this.store.list<CloudPhoto>("studioPhotos", { field: "status", value: "ready" }, MAX_LIST_PHOTOS);
    const todo = ready.filter(p => !p.derivatives?.length).slice(0, Math.max(1, Math.min(limit, 200)));
    let made = 0;
    for (const photo of todo) { await this.buildDerivatives(photo); const fresh = await this.store.transaction(tx => tx.get<CloudPhoto>("studioPhotos", photo.id)); if (fresh?.derivatives?.length) made += 1; }
    return { checked: todo.length, made, failed: todo.length - made, remaining: Math.max(0, ready.filter(p => !p.derivatives?.length).length - made) };
  }
  private viewKey(photo: CloudPhoto, kind: DerivativeKind) { return photo.derivatives?.includes(kind) ? derivativeKey(photo.key, kind) : photo.key; }

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
      const plan = await this.store.transaction(tx => tx.get<Plan>("studioPlans", effectivePlanId(license, this.now())));
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
    const all = await this.store.list<CloudPhoto>("studioPhotos", { field: "eventId", value: id }, MAX_LIST_PHOTOS);
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
    if (result.removeFile) { try { for (const kind of result.photo.derivatives ?? []) await this.storage.remove(derivativeKey(result.photo.key, kind)); await this.storage.remove(result.photo.key); } catch { throw new StudioError("storage_unavailable", 503); } }
    return { photoId, status: result.photo.status };
  }

  /**
   * Deletes photos older than the owner's plan retention (the longest among their active cloud licenses).
   * Plans without a retention period keep photos. Safe to run repeatedly; a failed file removal is retried on the next run.
   * Bounded by the store's list cap (100 licenses, 100 photos per owner per run), so schedule it often.
   */
  async sweepExpiredPhotos(actor = "system:retention") {
    const cutoffOf = (days: number) => this.now() - days * 86_400_000;
    const licenses = await this.store.list<License>("studioLicenses", undefined, 1000);
    const retentionByOwner = new Map<string, number>();
    const GRACE_DAYS = 14;
    for (const license of licenses) {
      if (license.status !== "active" || !license.ownerUid) continue;
      // A lapsed paid/pilot plan keeps photos downloadable for GRACE_DAYS, then everything is purged.
      if (license.planExpiresAt && effectivePlanId(license, this.now()) === "free" && Date.parse(license.planExpiresAt) + GRACE_DAYS * 86_400_000 <= this.now() && !retentionByOwner.has(license.ownerUid)) retentionByOwner.set(license.ownerUid, -1);
      const plan = await this.store.transaction(tx => tx.get<Plan>("studioPlans", effectivePlanId(license, this.now())));
      if (!plan?.active || !plan.features.includes("cloud_sync") || !plan.photoRetentionDays) continue;
      retentionByOwner.set(license.ownerUid, Math.max(retentionByOwner.get(license.ownerUid) ?? 0, plan.photoRetentionDays));
    }
    let deleted = 0, failed = 0;
    for (const [ownerUid, days] of retentionByOwner) {
      const cutoff = days < 0 ? this.now() + 1 : cutoffOf(days);
      const photos = await this.store.list<CloudPhoto>("studioPhotos", { field: "ownerUid", value: ownerUid }, 100);
      for (const photo of photos) {
        if ((photo.status !== "ready" && photo.status !== "hidden") || Date.parse(photo.createdAt) >= cutoff) continue;
        try { await this.managePhoto({ admin: true }, actor, { action: "delete", photoId: photo.id }); deleted += 1; } catch { failed += 1; }
      }
    }
    return { deleted, failed };
  }

  // ---------- share links ----------
  /**
   * Tokens are derived (HMAC) rather than stored, so asking again returns the same link without keeping the link
   * itself in the database; only its hash is stored. Revoking bumps the generation, so a new link is never the old one.
   */
  private shareToken(ownerUid: string, scope: ShareScope, target: string, generation: number) {
    return createHmac("sha256", this.secret).update(`share:${ownerUid}:${scope}:${target}:${generation}`).digest("base64url");
  }
  /** openExternalBrowser=1 makes LINE open the link in the phone's real browser, where saving works. */
  private shareUrl(token: string) { return `${this.origin}/s/${token}?openExternalBrowser=1`; }

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

  /**
   * Desktop: register a session whose token the booth generated itself (43 base64url characters = 256 random bits).
   * Called whenever the booth is back online; sending the same session and token again returns the same result.
   */
  async registerSession(input: Input) {
    const sessionId = pattern(input.sessionId, /^[A-Za-z0-9_-]{1,64}$/);
    const eventId = pattern(input.eventId, /^[0-9a-f]{32}$/);
    const token = pattern(input.token, TOKEN);
    let expectedCount: number | null = null;
    if (input.expectedCount !== undefined && input.expectedCount !== null) {
      if (typeof input.expectedCount !== "number" || !Number.isSafeInteger(input.expectedCount) || input.expectedCount < 0 || input.expectedCount > MAX_EXPECTED) throw new StudioError("invalid_request");
      expectedCount = input.expectedCount;
    }
    const candidates = [newShortCode(), newShortCode(), newShortCode()];
    const made = await this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      const event = await tx.get<CloudEvent>("studioEvents", eventId);
      if (!event || event.ownerUid !== auth.ownerUid) throw new StudioError("not_found", 404);
      if (event.status !== "active") throw new StudioError("event_archived", 409);
      const id = hash(`session:${auth.ownerUid}:${sessionId}`).slice(0, 32);
      const shareId = hash(token);
      const existing = await tx.get<CloudSession>("studioSessions", id);
      const share = await tx.get<ShareRecord>("studioShares", shareId);
      if (existing) {
        if (existing.shareId !== shareId || existing.eventId !== eventId) throw new StudioError("session_conflict", 409);
        if (existing.expectedCount !== expectedCount && expectedCount !== null) tx.set<CloudSession>("studioSessions", id, { ...existing, expectedCount });
        return existing;
      }
      // A token already used by anything else is refused, so one token can never open two sessions.
      if (share) throw new StudioError("session_conflict", 409);
      const taken = await Promise.all(candidates.map(code => tx.get<ShortCodeRecord>("studioShortCodes", shortCodeId(eventId, code))));
      const free = candidates.findIndex((code, i) => !taken[i] || Date.parse(taken[i]!.expiresAt) <= this.now());
      if (free < 0) throw new StudioError("try_again", 503);
      const at = iso(this.now()); const expiresAt = iso(this.now() + SESSION_SHARE_DAYS * 86400000);
      const session: CloudSession = { id, ownerUid: auth.ownerUid, eventId, sessionId, shareId, shortCode: candidates[free], expectedCount, createdAt: at, expiresAt };
      tx.set<ShareRecord>("studioShares", shareId, { id: shareId, ownerUid: auth.ownerUid, scope: "session", eventId, sessionId, createdAt: at, expiresAt, revoked: false, revokedAt: null });
      tx.set<ShortCodeRecord>("studioShortCodes", shortCodeId(eventId, session.shortCode), { id: shortCodeId(eventId, session.shortCode), eventId, shareId, expiresAt });
      tx.set<CloudSession>("studioSessions", id, session);
      return session;
    });
    // eventUrl is printed under the code for guests who cannot scan: they open it and type the code.
    return { url: this.shareUrl(token), eventUrl: `${this.origin}/e/${eventId}`, shortCode: made.shortCode, expiresAt: made.expiresAt, expectedCount: expectedCount ?? made.expectedCount };
  }

  /** Desktop: cancel the QR link of one session, e.g. when a guest asks for their photos to be private again. */
  async revokeSessionShare(input: Input) {
    const sessionId = pattern(input.sessionId, /^[A-Za-z0-9_-]{1,64}$/);
    return this.store.transaction(async tx => {
      const auth = await this.authorize(tx, input);
      // A booth-made token is not derivable, so its link is found through the registered session.
      const session = await tx.get<CloudSession>("studioSessions", hash(`session:${auth.ownerUid}:${sessionId}`).slice(0, 32));
      const own = session ? await tx.get<ShareRecord>("studioShares", session.shareId) : null;
      const derived = await this.revokeIn(tx, auth.ownerUid, "session", sessionId);
      if (own && !own.revoked) tx.set<ShareRecord>("studioShares", own.id, { ...own, revoked: true, revokedAt: iso(this.now()) });
      return derived;
    });
  }

  /** Customer: link for a whole event (create returns the same link again), or cancel a link. */
  async manageShare(ownerUid: string, input: Input) {
    const action = input.action;
    if (action !== "create" && action !== "revoke" && action !== "setPin" && action !== "clearPin") throw new StudioError("invalid_request");
    const pin = action === "setPin" ? (typeof input.pin === "string" && PIN.test(input.pin) ? input.pin : (() => { throw new StudioError("invalid_pin"); })()) : null;
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
      if (action === "setPin" || action === "clearPin") {
        const made = await this.ensureShare(tx, ownerUid, scope, target, event?.id ?? null, scope === "event" ? EVENT_SHARE_DAYS : SESSION_SHARE_DAYS);
        const record = await tx.get<ShareRecord>("studioShares", hash(made.token));
        if (!record) throw new StudioError("not_found", 404);
        if (action === "setPin") { const salt = randomBytes(16).toString("hex"); tx.set<ShareRecord>("studioShares", record.id, { ...record, pinSalt: salt, pinHash: pinDigest(pin!, salt), pinFailures: 0, pinLockedUntil: null }); }
        else tx.set<ShareRecord>("studioShares", record.id, { ...record, pinSalt: null, pinHash: null, pinFailures: 0, pinLockedUntil: null });
        return { url: this.shareUrl(made.token), expiresAt: made.expiresAt, pinProtected: action === "setPin" };
      }
      return this.revokeIn(tx, ownerUid, scope, target);
    });
  }

  /** Checks the optional PIN of a link. Five wrong guesses lock that link for 15 minutes, so a short PIN cannot be brute-forced. */
  private async checkPin(share: ShareRecord, pinInput: unknown) {
    if (!share.pinHash || !share.pinSalt) return;
    if (share.pinLockedUntil && Date.parse(share.pinLockedUntil) > this.now()) throw new StudioError("pin_locked", 429);
    if (typeof pinInput !== "string" || pinInput === "") throw new StudioError("pin_required", 401);
    const given = Buffer.from(PIN.test(pinInput) ? pinDigest(pinInput, share.pinSalt) : "0".repeat(64), "hex");
    const ok = PIN.test(pinInput) && timingSafeEqual(given, Buffer.from(share.pinHash, "hex"));
    const outcome = await this.store.transaction(async tx => {
      const fresh = await tx.get<ShareRecord>("studioShares", share.id);
      if (!fresh || fresh.revoked) return "gone" as const;
      if (fresh.pinLockedUntil && Date.parse(fresh.pinLockedUntil) > this.now()) return "locked" as const;
      if (ok) { if (fresh.pinFailures) tx.set<ShareRecord>("studioShares", fresh.id, { ...fresh, pinFailures: 0, pinLockedUntil: null }); return "ok" as const; }
      const failures = (fresh.pinFailures ?? 0) + 1;
      const locked = failures >= PIN_MAX_FAILURES;
      tx.set<ShareRecord>("studioShares", fresh.id, { ...fresh, pinFailures: locked ? 0 : failures, pinLockedUntil: locked ? iso(this.now() + PIN_LOCK_MS) : null });
      return locked ? "locked" as const : "bad" as const;
    });
    if (outcome === "gone") throw new StudioError("share_unavailable", 404);
    if (outcome === "locked") throw new StudioError("pin_locked", 429);
    if (outcome === "bad") throw new StudioError("pin_invalid", 401);
  }

  /** Public, no login. Missing, revoked and expired links all look the same so links cannot be probed. */
  /** Validates a public link (and its PIN) and returns the photos it shows, oldest first. */
  private async shareContents(tokenInput: unknown, pinInput?: unknown) {
    if (typeof tokenInput !== "string" || !TOKEN.test(tokenInput)) throw new StudioError("share_unavailable", 404);
    return this.shareContentsById(hash(tokenInput), pinInput);
  }
  private async shareContentsById(shareId: string, pinInput?: unknown) {
    const share = await this.store.transaction(tx => tx.get<ShareRecord>("studioShares", shareId));
    if (!share || share.revoked || Date.parse(share.expiresAt) <= this.now()) throw new StudioError("share_unavailable", 404);
    await this.checkPin(share, pinInput);
    const filter = share.scope === "event" ? { field: "eventId", value: share.eventId ?? "" } : { field: "sessionId", value: share.sessionId ?? "" };
    const all = await this.store.list<CloudPhoto>("studioPhotos", filter, MAX_LIST_PHOTOS);
    // The owner check keeps a share from ever showing photos of another account, even if ids collide.
    const photos = all.filter(p => p.status === "ready" && p.ownerUid === share.ownerUid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { share, photos };
  }

  /**
   * Plain download links on our own site (a normal GET that any browser, LINE or a download manager can follow).
   * The signed token is made only after the link (and its PIN) was accepted, expires with the page URLs, and names exactly one photo.
   */
  private downloadToken(shareId: string, photoId: string) {
    const body = Buffer.from(JSON.stringify({ s: shareId, p: photoId, e: this.now() + VIEW_URL_SECONDS * 1000 })).toString("base64url");
    return `${body}.${createHmac("sha256", this.secret).update(`download:${body}`).digest("base64url")}`;
  }
  async sharePhotoByToken(tokenInput: unknown) {
    if (typeof tokenInput !== "string" || tokenInput.length > 400) throw new StudioError("share_unavailable", 404);
    const [body, mac] = tokenInput.split(".");
    if (!body || !mac) throw new StudioError("share_unavailable", 404);
    const expected = createHmac("sha256", this.secret).update(`download:${body}`).digest();
    const given = Buffer.from(mac, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new StudioError("share_unavailable", 404);
    let claim: { s?: string; p?: string; e?: number };
    try { claim = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { throw new StudioError("share_unavailable", 404); }
    if (typeof claim.s !== "string" || typeof claim.p !== "string" || typeof claim.e !== "number" || claim.e <= this.now()) throw new StudioError("share_unavailable", 404);
    const share = await this.store.transaction(tx => tx.get<ShareRecord>("studioShares", claim.s!));
    if (!share || share.revoked || Date.parse(share.expiresAt) <= this.now()) throw new StudioError("share_unavailable", 404);
    const filter = share.scope === "event" ? { field: "eventId", value: share.eventId ?? "" } : { field: "sessionId", value: share.sessionId ?? "" };
    const photos = (await this.store.list<CloudPhoto>("studioPhotos", filter, MAX_LIST_PHOTOS)).filter(p => p.status === "ready" && p.ownerUid === share.ownerUid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const index = photos.findIndex(p => p.id === claim.p);
    if (index < 0) throw new StudioError("share_unavailable", 404);
    const bytes = await this.storage.read(this.viewKey(photos[index], "download"));
    if (!bytes) throw new StudioError("file_missing", 404);
    return { bytes, name: `KOKO-${String(index + 1).padStart(2, "0")}.jpg` };
  }

  /** One photo through our own origin: no storage CORS needed, and the browser gets a same-site file it can always save. */
  async sharePhoto(tokenInput: unknown, photoIdInput: unknown, pinInput?: unknown) {
    const { photos } = await this.shareContents(tokenInput, pinInput);
    const index = photos.findIndex(p => p.id === photoIdInput);
    if (index < 0) throw new StudioError("share_unavailable", 404);
    const bytes = await this.storage.read(this.viewKey(photos[index], "download"));
    if (!bytes) throw new StudioError("file_missing", 404);
    return { bytes, name: `KOKO-${String(index + 1).padStart(2, "0")}.jpg` };
  }

  /**
   * A well-formed token nobody registered yet is most likely a QR the booth printed while offline: the page waits for it
   * instead of showing an error. Every unknown token looks the same, so this reveals nothing; revoked and expired links stay unavailable.
   */
  async viewShare(tokenInput: unknown, pinInput?: unknown) {
    if (typeof tokenInput === "string" && TOKEN.test(tokenInput) && !(await this.store.transaction(tx => tx.get<ShareRecord>("studioShares", hash(tokenInput))))) {
      return { scope: "session" as const, pending: true, pinProtected: false, eventName: null, expiresAt: iso(this.now() + SESSION_SHARE_DAYS * 86400000), expectedCount: null, urlExpiresInSeconds: VIEW_URL_SECONDS, photos: [] };
    }
    return { ...(await this.present(await this.shareContents(tokenInput, pinInput))), pending: false };
  }

  /** Public: the 8-character code printed under the QR, valid only together with its event. Callers must rate limit. */
  async viewShortCode(eventIdInput: unknown, codeInput: unknown, pinInput?: unknown) {
    if (typeof eventIdInput !== "string" || !/^[0-9a-f]{32}$/.test(eventIdInput) || typeof codeInput !== "string") throw new StudioError("share_unavailable", 404);
    const code = codeInput.trim().toUpperCase();
    if (!SHORT_CODE.test(code)) throw new StudioError("share_unavailable", 404);
    const record = await this.store.transaction(tx => tx.get<ShortCodeRecord>("studioShortCodes", shortCodeId(eventIdInput, code)));
    if (!record || record.eventId !== eventIdInput || Date.parse(record.expiresAt) <= this.now()) throw new StudioError("share_unavailable", 404);
    return this.present(await this.shareContentsById(record.shareId, pinInput));
  }

  private async present({ share, photos }: { share: ShareRecord; photos: CloudPhoto[] }) {
    const session = share.scope === "session" && share.sessionId ? await this.store.transaction(tx => tx.get<CloudSession>("studioSessions", hash(`session:${share.ownerUid}:${share.sessionId}`).slice(0, 32))) : null;
    const expectedCount = session && session.shareId === share.id ? session.expectedCount : null;
    const eventId = share.eventId ?? photos[0]?.eventId ?? null;
    const event = eventId ? await this.store.transaction(tx => tx.get<CloudEvent>("studioEvents", eventId)) : null;
    const items = await Promise.all(photos.map(async p => ({
      id: p.id, createdAt: p.createdAt,
      url: await this.storage.presignDownload(this.viewKey(p, "preview"), VIEW_URL_SECONDS),
      thumbUrl: await this.storage.presignDownload(this.viewKey(p, "thumb"), VIEW_URL_SECONDS),
      downloadUrl: `${this.origin}/api/studio/share/photo?t=${this.downloadToken(share.id, p.id)}`,
    })));
    return { scope: share.scope, pinProtected: Boolean(share.pinHash), eventName: event && event.ownerUid === share.ownerUid ? event.name : null, expiresAt: share.expiresAt, expectedCount, urlExpiresInSeconds: VIEW_URL_SECONDS, photos: items };
  }
}
