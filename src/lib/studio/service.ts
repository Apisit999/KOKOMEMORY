import { randomBytes, randomUUID } from "node:crypto";
import { EntitlementSigner, hash } from "./crypto.ts";
import { SCHEMA_VERSION } from "./migration.ts";
import { FREE_FEATURES, PRODUCT_ID, StudioError, type Claims, type Device, type License, type LinkRequest, type Plan, type Store, type Transaction } from "./types.ts";

export type Input = Record<string, unknown>;
const iso = (time: number) => new Date(time).toISOString();
function text(value: unknown, min = 1, max = 128) {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f]/.test(value)) throw new StudioError("invalid_request");
  return value;
}
function safeId(value: unknown) { const id = text(value); if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new StudioError("invalid_request"); return id; }
function deviceInput(input: Input) {
  const deviceId = text(input.deviceId, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId) || input.productId !== PRODUCT_ID) throw new StudioError("invalid_request");
  return deviceId;
}
type Audit = { id: string; actor: string; action: string; licenseId: string; deviceId: string | null; createdAt: string };
export class StudioService {
  private store: Store;
  private signer: EntitlementSigner;
  private now: () => number;
  private origin: string;
  constructor(options: { store: Store; signer: EntitlementSigner; now?: () => number; origin: string }) {
    this.store = options.store; this.signer = options.signer; this.now = options.now ?? Date.now; this.origin = options.origin;
    const url = new URL(this.origin);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Studio requires HTTPS outside localhost");
  }
  async ready() {
    const schema = await this.store.transaction(tx => tx.get<{ version: number }>("studioSchema", "current"));
    if (schema?.version !== SCHEMA_VERSION) throw new StudioError("migration_required", 503);
  }
  async rateLimit(scope: string, principal: string, max = 30) {
    const minute = Math.floor(this.now() / 60000);
    const id = hash(`${scope}:${principal}:${minute}`);
    await this.store.transaction(async tx => {
      const previous = await tx.get<{ count: number }>("studioRateLimits", id);
      if ((previous?.count ?? 0) >= max) throw new StudioError("rate_limited", 429);
      tx.set("studioRateLimits", id, { count: (previous?.count ?? 0) + 1, expiresAt: iso((minute + 2) * 60000) });
    });
  }
  async plans() { return { plans: (await this.store.list<Plan>("studioPlans")).filter(plan => plan.active && plan.id === "free").map(plan => ({ ...plan, amountMinor: 0, purchasable: false, features: [...FREE_FEATURES] })) }; }
  private audit(tx: Transaction, action: string, licenseId: string, deviceId: string | null, actor = "desktop") {
    const id = randomUUID();
    tx.set<Audit>("studioAuditLogs", id, { id, action, licenseId, deviceId, actor, createdAt: iso(this.now()) });
  }
  private async plan(tx: Transaction, planId: string): Promise<Plan> {
    const plan = await tx.get<Plan>("studioPlans", planId);
    if (!plan || !plan.active || !Number.isInteger(plan.deviceLimit) || plan.deviceLimit < 1 || plan.deviceLimit > 20 || !Array.isArray(plan.features)) throw new StudioError("plan_unavailable", 503);
    return plan;
  }
  private live(license: License | null) {
    if (!license || license.productId !== PRODUCT_ID) throw new StudioError("invalid_license", 401);
    if (license.expiresAt !== null && !Number.isFinite(Date.parse(license.expiresAt))) throw new StudioError("invalid_license", 403);
    if (license.status === "revoked") throw new StudioError("revoked", 403);
    if (license.status === "expired" || (license.expiresAt && Date.parse(license.expiresAt) <= this.now())) throw new StudioError("expired", 403);
    if (license.status !== "active" || !Number.isFinite(Date.parse(license.startsAt)) || Date.parse(license.startsAt) > this.now()) throw new StudioError("invalid_license", 403);
    return license;
  }
  private claims(license: License, plan: Plan, deviceId: string): Claims {
    const now = this.now();
    const deadline = license.expiresAt ? Date.parse(license.expiresAt) : Infinity;
    return { schemaVersion: 1, keyId: this.signer.keyId, licenseId: license.id, deviceId, productId: PRODUCT_ID, issuedAt: iso(now), startsAt: license.startsAt, expiresAt: license.expiresAt,
      refreshAfter: iso(Math.min(now + 24 * 3600000, deadline)), offlineUntil: iso(Math.min(now + 72 * 3600000, deadline)), features: license.planId === "free" ? [...FREE_FEATURES] : plan.features.filter(feature => ["capture", "printing", "templates", "cloud_sync"].includes(feature)) };
  }
  private token(license: License, plan: Plan, deviceId: string) { return { entitlement: this.signer.sign(this.claims(license, plan, deviceId)) }; }
  private activateDevice(license: License, plan: Plan, deviceId: string) {
    const previous = license.devices[deviceId];
    const limit = Math.min(license.maxDevices, plan.deviceLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new StudioError("invalid_license", 403);
    if (previous?.status !== "active" && Object.values(license.devices).filter(device => device.status === "active").length >= limit) throw new StudioError("device_limit", 409);
    const device: Device = { name: previous?.name ?? "KOKO Studio Windows", status: "active", activatedAt: previous?.activatedAt ?? iso(this.now()), lastSeenAt: iso(this.now()), deactivatedAt: null };
    // Keep deactivated history bounded; the audit collection retains the durable history.
    if (!previous && Object.keys(license.devices).length >= 20) {
      const oldId = Object.keys(license.devices).find(id => license.devices[id].status === "deactivated");
      if (!oldId) throw new StudioError("device_limit", 409);
      delete license.devices[oldId];
    }
    license.devices[deviceId] = device;
  }
  async claimFree(input: Input) {
    const deviceId = deviceInput(input);
    const id = `free-${hash(`${PRODUCT_ID}:${deviceId}`)}`;
    return this.store.transaction(async tx => {
      let license = await tx.get<License>("studioLicenses", id);
      const plan = await this.plan(tx, "free");
      const created = !license;
      if (!license) license = { id, ownerUid: null, productId: PRODUCT_ID, planId: "free", status: "active", startsAt: iso(this.now()), expiresAt: null, createdAt: iso(this.now()), linkedAt: null, maxDevices: 1, devices: {} };
      this.live(license);
      // Repeat claim remains compatible, but never changes account ownership.
      const reactivated = license.devices[deviceId]?.status !== "active";
      this.activateDevice(license, plan, deviceId);
      tx.set("studioLicenses", id, license);
      if (created || reactivated) this.audit(tx, created ? "license.free_claimed" : "license.reactivated", id, deviceId);
      return this.token(license, plan, deviceId);
    });
  }
  async activate(input: Input) {
    const deviceId = deviceInput(input);
    const keyHash = hash(text(input.licenseKey, 8, 256));
    const requestKey = text(input.idempotencyKey, 8, 160);
    return this.store.transaction(async tx => {
      const mapping = await tx.get<{ licenseId: string }>("studioLicenseKeys", keyHash);
      if (!mapping) throw new StudioError("invalid_license", 401);
      const license = this.live(await tx.get<License>("studioLicenses", mapping.licenseId));
      const plan = await this.plan(tx, license.planId);
      const idemId = hash(`activate:${license.id}:${deviceId}:${requestKey}`);
      const previous = await tx.get<{ done: boolean }>("studioIdempotency", idemId);
      if (previous) {
        if (license.devices[deviceId]?.status !== "active") throw new StudioError("device_limit", 409);
        return this.token(license, plan, deviceId);
      }
      this.activateDevice(license, plan, deviceId);
      tx.set("studioLicenses", license.id, license);
      tx.set("studioIdempotency", idemId, { done: true, expiresAt: iso(this.now() + 30 * 86400000) });
      this.audit(tx, "license.activated", license.id, deviceId);
      return this.token(license, plan, deviceId);
    });
  }
  private proof(input: Input) {
    const deviceId = deviceInput(input);
    return { deviceId, claims: this.signer.verify(input.entitlement, deviceId, this.now()) };
  }
  private active(license: License, deviceId: string) {
    if (license.devices[deviceId]?.status !== "active") throw new StudioError("device_limit", 403);
  }
  async refresh(input: Input) {
    const { deviceId, claims } = this.proof(input);
    try {
      return await this.store.transaction(async tx => {
        const license = this.live(await tx.get<License>("studioLicenses", claims.licenseId));
        const plan = await this.plan(tx, license.planId);
        this.active(license, deviceId);
        if (Object.values(license.devices).filter(d => d.status === "active").length > Math.min(license.maxDevices, plan.deviceLimit)) throw new StudioError("device_limit", 403);
        license.devices[deviceId].lastSeenAt = iso(this.now());
        tx.set("studioLicenses", license.id, license);
        return this.token(license, plan, deviceId);
      });
    } catch (error) {
      if (error instanceof StudioError && ["revoked", "expired", "device_limit"].includes(error.code)) return { state: error.code };
      throw error;
    }
  }
  async deactivate(input: Input) {
    const { deviceId, claims } = this.proof(input);
    const requestKey = text(input.idempotencyKey, 8, 160);
    return this.store.transaction(async tx => {
      const license = this.live(await tx.get<License>("studioLicenses", claims.licenseId));
      const idemId = hash(`deactivate:${license.id}:${deviceId}:${requestKey}`);
      const previous = await tx.get<{ done: boolean }>("studioIdempotency", idemId);
      if (previous) return { ok: true };
      if (license.devices[deviceId]) {
        license.devices[deviceId].status = "deactivated"; license.devices[deviceId].deactivatedAt = iso(this.now());
        tx.set("studioLicenses", license.id, license);
        this.audit(tx, "license.deactivated", license.id, deviceId);
      }
      tx.set("studioIdempotency", idemId, { done: true, expiresAt: iso(this.now() + 30 * 86400000) });
      return { ok: true };
    });
  }
  async cloud(input: Input): Promise<never> {
    const { deviceId, claims } = this.proof(input);
    const hasCloud = await this.store.transaction(async tx => {
      const license = this.live(await tx.get<License>("studioLicenses", claims.licenseId));
      const plan = await this.plan(tx, license.planId);
      this.active(license, deviceId);
      return license.planId !== "free" && plan.features.includes("cloud_sync") && claims.features.includes("cloud_sync");
    });
    throw new StudioError(hasCloud ? "cloud_unavailable" : "feature_not_in_plan", hasCloud ? 503 : 403);
  }
  async beginLink(input: Input) {
    const { deviceId, claims } = this.proof(input);
    const deviceName = text(input.deviceName, 1, 80);
    const id = randomBytes(24).toString("base64url");
    const deviceCode = randomBytes(32).toString("base64url");
    const userCode = randomBytes(5).toString("hex").toUpperCase();
    const codeHash = hash(userCode);
    const expiresAt = iso(this.now() + 5 * 60000);
    await this.store.transaction(async tx => {
      const license = this.live(await tx.get<License>("studioLicenses", claims.licenseId));
      const collision = await tx.get("studioLinkCodes", codeHash);
      this.active(license, deviceId);
      if (collision) throw new StudioError("retry_request", 409);
      tx.set<LinkRequest>("studioDeviceAuthorizations", id, { id, codeHash, pollHash: hash(deviceCode), licenseId: license.id, deviceId, deviceName, status: "pending", expiresAt, ownerUid: null });
      tx.set("studioLinkCodes", codeHash, { authorizationId: id, expiresAt });
      this.audit(tx, "device.link_requested", license.id, deviceId);
    });
    return { authorizationId: id, deviceCode, userCode: `${userCode.slice(0, 5)}-${userCode.slice(5)}`, verificationUrl: `${this.origin}/account/koko-studio/link`, expiresAt, pollIntervalSeconds: 5 };
  }
  private code(value: unknown) {
    const code = text(value, 10, 11).replace("-", "").toUpperCase();
    if (!/^[0-9A-F]{10}$/.test(code)) throw new StudioError("invalid_code", 404);
    return hash(code);
  }
  private pending(link: LinkRequest | null): LinkRequest {
    if (!link) throw new StudioError("invalid_code", 404);
    if (Date.parse(link.expiresAt) <= this.now()) throw new StudioError("code_expired", 410);
    if (link.status !== "pending") throw new StudioError("code_used", 409);
    return link;
  }
  async inspectLink(uid: string, value: unknown) {
    const codeHash = this.code(value);
    return this.store.transaction(async tx => {
      const code = await tx.get<{ authorizationId: string }>("studioLinkCodes", codeHash);
      if (!code) throw new StudioError("invalid_code", 404);
      const link = this.pending(await tx.get<LinkRequest>("studioDeviceAuthorizations", code.authorizationId));
      const license = this.live(await tx.get<License>("studioLicenses", link.licenseId));
      if (license.ownerUid && license.ownerUid !== uid) throw new StudioError("forbidden", 403);
      this.active(license, link.deviceId);
      return { deviceName: link.deviceName, expiresAt: link.expiresAt, planId: license.planId };
    });
  }
  async approveLink(uid: string, value: unknown) {
    const codeHash = this.code(value);
    return this.store.transaction(async tx => {
      const code = await tx.get<{ authorizationId: string }>("studioLinkCodes", codeHash);
      if (!code) throw new StudioError("invalid_code", 404);
      const link = this.pending(await tx.get<LinkRequest>("studioDeviceAuthorizations", code.authorizationId));
      const license = this.live(await tx.get<License>("studioLicenses", link.licenseId));
      if (license.ownerUid && license.ownerUid !== uid) throw new StudioError("forbidden", 403);
      this.active(license, link.deviceId);
      link.status = "approved"; link.ownerUid = uid;
      // Ownership is committed only when the secret-bearing Desktop consumes the approval.
      tx.set("studioDeviceAuthorizations", link.id, link);
      this.audit(tx, "device.link_approved", license.id, link.deviceId, uid);
      return { ok: true, status: "approved" };
    });
  }
  async pollLink(input: Input) {
    const id = safeId(input.authorizationId);
    const pollHash = hash(text(input.deviceCode, 40, 100));
    return this.store.transaction(async tx => {
      const link = await tx.get<LinkRequest>("studioDeviceAuthorizations", id);
      if (!link || link.pollHash !== pollHash) throw new StudioError("invalid_code", 404);
      if (Date.parse(link.expiresAt) <= this.now()) throw new StudioError("code_expired", 410);
      if (link.status === "consumed") throw new StudioError("code_used", 409);
      if (link.status === "pending") return { status: "pending" };
      const license = this.live(await tx.get<License>("studioLicenses", link.licenseId));
      const plan = await this.plan(tx, license.planId);
      this.active(license, link.deviceId);
      if (!link.ownerUid || (license.ownerUid && license.ownerUid !== link.ownerUid)) throw new StudioError("forbidden", 403);
      license.ownerUid = link.ownerUid; license.linkedAt = iso(this.now()); license.devices[link.deviceId].name = link.deviceName;
      link.status = "consumed"; link.pollHash = "";
      tx.set("studioLicenses", license.id, license); tx.set("studioDeviceAuthorizations", id, link);
      this.audit(tx, "device.linked", license.id, link.deviceId, link.ownerUid);
      return { status: "approved", ...this.token(license, plan, link.deviceId) };
    });
  }
  async account(uid: string) {
    const [licenses, storedPlans] = await Promise.all([this.store.list<License>("studioLicenses", { field: "ownerUid", value: uid }, 100), this.store.list<Plan>("studioPlans")]);
    const planIds = new Set(licenses.map(license => license.planId));
    const plans = storedPlans.filter(plan => planIds.has(plan.id)).map(plan => plan.id === "free" ? { ...plan, amountMinor: 0, features: [...FREE_FEATURES], purchasable: false } : plan);
    return { licenses, plans, purchaseEnabled: false, desktopLinkingAvailable: false };
  }
  async manage(uid: string, admin: boolean, input: Input) {
    const id = safeId(input.licenseId); const action = text(input.action);
    if (!["deactivate", "revoke"].includes(action) || (action === "revoke" && !admin)) throw new StudioError("forbidden", 403);
    const deviceId = action === "deactivate" ? deviceInput({ deviceId: input.deviceId, productId: PRODUCT_ID }) : null;
    return this.store.transaction(async tx => {
      const license = await tx.get<License>("studioLicenses", id);
      if (!license || (!admin && license.ownerUid !== uid)) throw new StudioError("not_found", 404);
      if (action === "revoke") license.status = "revoked";
      if (deviceId) {
        if (!license.devices[deviceId]) throw new StudioError("not_found", 404);
        license.devices[deviceId].status = "deactivated"; license.devices[deviceId].deactivatedAt = iso(this.now());
      }
      tx.set("studioLicenses", id, license);
      this.audit(tx, admin ? `admin.${action}` : "account.deactivate", id, deviceId, uid);
      return { ok: true };
    });
  }
  async admin() {
    const [licenses, plans, audit] = await Promise.all([this.store.list<License>("studioLicenses"), this.store.list<Plan>("studioPlans"), this.store.list<Audit>("studioAuditLogs")]);
    return { licenses, plans, audit, purchaseEnabled: false, limit: 50 };
  }
}
