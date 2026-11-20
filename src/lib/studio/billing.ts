import { randomUUID } from "node:crypto";
import { StudioError, effectivePlanId, type License, type Plan, type Store, type StudioOrder, type Transaction } from "./types.ts";
import type { Input } from "./service.ts";

/**
 * Paying for a cloud plan through Omise (PromptPay QR or card).
 * Trust rule: a plan is granted only after the server itself fetches the charge from Omise and sees it paid
 * with the exact amount and currency of the order. Webhook bodies are only a hint to go and look.
 */
export type OmiseCharge = { id: string; status: "pending" | "successful" | "failed" | "expired" | "reversed"; amount: number; currency: string; paid: boolean; metadata?: Record<string, unknown>; authorize_uri?: string | null; expires_at?: string | null; failure_code?: string | null; source?: { scannable_code?: { image?: { download_uri?: string } } } | null };
export interface OmiseGateway {
  createCharge(params: { amount: number; currency: string; orderId: string; method: "promptpay" | "card"; cardToken?: string; returnUri: string }): Promise<OmiseCharge>;
  getCharge(id: string): Promise<OmiseCharge>;
}
export type PaidOrder = StudioOrder & { licenseId: string; method: "promptpay" | "card"; chargeId: string | null; paidAt: string | null; periodStart: string | null; periodEnd: string | null };

const PERIOD_DAYS = { month: 30, year: 365 } as const;
const iso = (t: number) => new Date(t).toISOString();

/** Real Omise REST API (https://api.omise.co), secret key on the server only. */
export function omiseGateway(secretKey: string, fetcher: typeof fetch = fetch): OmiseGateway {
  if (!/^skey_/.test(secretKey)) throw new Error("OMISE_SECRET_KEY is not configured");
  const auth = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  const send = async (path: string, form?: URLSearchParams) => {
    const response = await fetcher(`https://api.omise.co${path}`, { method: form ? "POST" : "GET", headers: { Authorization: auth, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, body: form });
    const json = await response.json() as OmiseCharge & { object?: string; code?: string };
    if (!response.ok || json.object === "error") throw new StudioError(json.code === "invalid_card" || json.code === "failed_capture" ? "payment_declined" : "payment_provider_error", response.status >= 500 ? 503 : 402);
    return json;
  };
  return {
    async createCharge(p) {
      const form = new URLSearchParams({ amount: String(p.amount), currency: p.currency.toLowerCase(), return_uri: p.returnUri, "metadata[orderId]": p.orderId });
      if (p.method === "promptpay") form.set("source[type]", "promptpay"); else form.set("card", p.cardToken ?? "");
      return send("/charges", form);
    },
    getCharge: id => send(`/charges/${encodeURIComponent(id)}`),
  };
}

export class BillingService {
  private store: Store; private gateway: OmiseGateway; private origin: string; private now: () => number;
  constructor(options: { store: Store; gateway: OmiseGateway; origin: string; now?: () => number }) {
    this.store = options.store; this.gateway = options.gateway; this.origin = options.origin.replace(/\/+$/, ""); this.now = options.now ?? Date.now;
  }

  /** Paid plans a customer can buy now. */
  async plans() {
    const plans = await this.store.list<Plan>("studioPlans", undefined, 100);
    return { plans: plans.filter(p => p.active && p.amountMinor > 0 && p.currency === "THB" && p.billingPeriod !== "lifetime").sort((a, b) => a.amountMinor - b.amountMinor) };
  }

  /** Starts a payment for one of the customer's own booth licenses. PromptPay returns a QR image; card may return a 3-D Secure page. */
  async checkout(uid: string, input: Input) {
    const method = input.method;
    if (method !== "promptpay" && method !== "card") throw new StudioError("invalid_request");
    const cardToken = method === "card" ? (typeof input.cardToken === "string" && /^tokn_[A-Za-z0-9_]{1,64}$/.test(input.cardToken) ? input.cardToken : (() => { throw new StudioError("invalid_request"); })()) : undefined;
    const licenseId = typeof input.licenseId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(input.licenseId) ? input.licenseId : (() => { throw new StudioError("invalid_request"); })();
    const planId = typeof input.planId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(input.planId) ? input.planId : (() => { throw new StudioError("invalid_request"); })();
    const order = await this.store.transaction(async tx => {
      const license = await tx.get<License>("studioLicenses", licenseId);
      if (!license || license.ownerUid !== uid) throw new StudioError("not_found", 404);
      if (license.status !== "active") throw new StudioError("license_inactive", 409);
      const plan = await tx.get<Plan>("studioPlans", planId);
      if (!plan || !plan.active || plan.amountMinor <= 0 || plan.currency !== "THB" || plan.billingPeriod === "lifetime") throw new StudioError("plan_unavailable", 409);
      const id = randomUUID();
      const order: PaidOrder = { id, ownerUid: uid, licenseId, planId, planVersion: plan.version, amountMinor: plan.amountMinor, currency: plan.currency, method, status: "pending", createdAt: iso(this.now()), verifiedPaymentEventId: null, chargeId: null, paidAt: null, periodStart: null, periodEnd: null };
      tx.set<PaidOrder>("studioOrders", id, order);
      return order;
    });
    let charge: OmiseCharge;
    try {
      charge = await this.gateway.createCharge({ amount: order.amountMinor, currency: order.currency, orderId: order.id, method, cardToken, returnUri: `${this.origin}/account/koko-studio/billing?order=${order.id}` });
    } catch (error) {
      await this.store.transaction(async tx => { const o = await tx.get<PaidOrder>("studioOrders", order.id); if (o) tx.set("studioOrders", o.id, { ...o, status: "cancelled" }); });
      throw error;
    }
    await this.store.transaction(async tx => { const o = await tx.get<PaidOrder>("studioOrders", order.id); if (o) tx.set("studioOrders", o.id, { ...o, chargeId: charge.id }); });
    const settled = charge.status === "successful" ? await this.settle(charge.id) : null;
    return { orderId: order.id, amountMinor: order.amountMinor, status: settled?.status ?? (charge.status === "failed" ? "failed" : "pending"),
      qrImageUrl: charge.source?.scannable_code?.image?.download_uri ?? null, authorizeUri: method === "card" ? charge.authorize_uri ?? null : null, expiresAt: charge.expires_at ?? null };
  }

  /** The customer's page polls this; while pending it asks Omise again, so a lost webhook never loses a payment. */
  async orderStatus(uid: string, orderIdInput: unknown) {
    const orderId = typeof orderIdInput === "string" && /^[0-9a-f-]{36}$/.test(orderIdInput) ? orderIdInput : (() => { throw new StudioError("invalid_request"); })();
    let order = await this.store.transaction(tx => tx.get<PaidOrder>("studioOrders", orderId));
    if (!order || order.ownerUid !== uid) throw new StudioError("not_found", 404);
    if (order.status === "pending" && order.chargeId) order = (await this.settle(order.chargeId)) ?? order;
    return { orderId: order.id, status: order.status, planId: order.planId, amountMinor: order.amountMinor, paidAt: order.paidAt, periodEnd: order.periodEnd };
  }

  /** Webhook: only the charge id is used; everything else is re-read from Omise. */
  async webhook(input: Input) {
    const data = input.data as { id?: unknown; object?: unknown } | undefined;
    const id = typeof data?.id === "string" && /^chrg_[A-Za-z0-9_]{1,64}$/.test(data.id) ? data.id : null;
    if (!id) return { ok: true, ignored: true };
    await this.settle(id);
    return { ok: true };
  }

  /** Customer's payment history (also the data a tax invoice is made from). */
  async history(uid: string) {
    const orders = await this.store.list<PaidOrder>("studioOrders", { field: "ownerUid", value: uid }, 100);
    return { orders: orders.filter(o => o.status !== "cancelled").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => ({ id: o.id, planId: o.planId, amountMinor: o.amountMinor, currency: o.currency, method: o.method, status: o.status, createdAt: o.createdAt, paidAt: o.paidAt, periodStart: o.periodStart, periodEnd: o.periodEnd })) };
  }

  /** Idempotent: a charge grants its plan once, however many webhooks or polls arrive. */
  private async settle(chargeId: string): Promise<PaidOrder | null> {
    const charge = await this.gateway.getCharge(chargeId);
    const orderId = typeof charge.metadata?.orderId === "string" ? charge.metadata.orderId : null;
    if (!orderId) return null;
    return this.store.transaction(async tx => {
      const order = await tx.get<PaidOrder>("studioOrders", orderId);
      if (!order || order.chargeId !== null && order.chargeId !== charge.id) return order;
      if (order.status !== "pending") return order;
      if (charge.status === "failed" || charge.status === "expired") { const next = { ...order, chargeId: charge.id, status: "cancelled" as const }; tx.set("studioOrders", order.id, next); return next; }
      if (charge.status !== "successful" || !charge.paid) return order;
      // Amount or currency not matching the order = never grant (tampering or a mix-up); flag for a human.
      if (charge.amount !== order.amountMinor || charge.currency.toUpperCase() !== order.currency) { tx.set("studioAuditLogs", randomUUID(), { id: randomUUID(), action: "billing.amount_mismatch", licenseId: order.licenseId, deviceId: null, actor: `omise:${charge.id}`, createdAt: iso(this.now()) }); return order; }
      return this.grant(tx, order, charge.id);
    });
  }

  private async grant(tx: Transaction, order: PaidOrder, chargeId: string) {
    const license = await tx.get<License>("studioLicenses", order.licenseId);
    const plan = await tx.get<Plan>("studioPlans", order.planId);
    const at = this.now();
    if (!license || !plan || plan.billingPeriod === "lifetime") throw new StudioError("plan_unavailable", 503);
    // Paying again for the same plan extends from its current end; a different plan starts now.
    const current = effectivePlanId(license, at) === order.planId && license.planExpiresAt && Date.parse(license.planExpiresAt) > at ? Date.parse(license.planExpiresAt) : at;
    const end = current + PERIOD_DAYS[plan.billingPeriod] * 86_400_000;
    tx.set<License>("studioLicenses", license.id, { ...license, planId: plan.id, planExpiresAt: iso(end), maxDevices: plan.deviceLimit, notified: {} });
    const paid: PaidOrder = { ...order, chargeId, status: "paid", paidAt: iso(at), periodStart: iso(current), periodEnd: iso(end), verifiedPaymentEventId: chargeId };
    tx.set<PaidOrder>("studioOrders", order.id, paid);
    tx.set("studioPaymentEvents", chargeId, { id: chargeId, provider: "omise", providerEventId: chargeId, orderId: order.id, verifiedAt: iso(at), processedAt: iso(at), kind: "paid" });
    const auditId = randomUUID();
    tx.set("studioAuditLogs", auditId, { id: auditId, action: `billing.paid:${plan.id}`, licenseId: license.id, deviceId: null, actor: `omise:${chargeId}`, createdAt: iso(at) });
    return paid;
  }
}
