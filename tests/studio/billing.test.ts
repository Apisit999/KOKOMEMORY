import test from "node:test";
import assert from "node:assert/strict";
import { BillingService, omiseGateway, type OmiseCharge, type OmiseGateway, type PaidOrder } from "../../src/lib/studio/billing.ts";
import { PRODUCT_ID, type License, type Plan } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";

const NOW = Date.parse("2026-11-20T10:00:00Z");
const DAY = 86_400_000;

function setup() {
  const store = new MemoryStore();
  store.documents.set("studioPlans/cloud-month", { id: "cloud-month", version: 1, name: "Cloud", billingPeriod: "month", amountMinor: 59900, currency: "THB", deviceLimit: 2, features: ["capture", "cloud_sync"], active: true, purchasable: false } as Plan);
  store.documents.set("studioPlans/free", { id: "free", version: 1, name: "Free", billingPeriod: "lifetime", amountMinor: 0, currency: "THB", deviceLimit: 1, features: ["capture"], active: true, purchasable: false } as Plan);
  for (const who of ["a", "b"]) store.documents.set(`studioLicenses/lic-${who}`, { id: `lic-${who}`, ownerUid: `uid-${who}`, productId: PRODUCT_ID, planId: "free", status: "active", startsAt: "", expiresAt: null, createdAt: "", linkedAt: "", maxDevices: 1, devices: {} } as License);
  const charges = new Map<string, OmiseCharge>();
  let n = 0; const created: Parameters<OmiseGateway["createCharge"]>[0][] = [];
  const gateway: OmiseGateway = {
    async createCharge(p) { created.push(p); const c: OmiseCharge = { id: `chrg_test_${++n}`, status: "pending", paid: false, amount: p.amount, currency: p.currency.toLowerCase(), metadata: { orderId: p.orderId }, authorize_uri: p.method === "card" ? "https://3ds.example/x" : null, source: p.method === "promptpay" ? { scannable_code: { image: { download_uri: "https://qr.example/q.svg" } } } : null }; charges.set(c.id, c); return c; },
    async getCharge(id) { const c = charges.get(id); if (!c) throw new Error("missing"); return structuredClone(c); },
  };
  let now = NOW;
  const billing = new BillingService({ store, gateway, origin: "https://koko.example", now: () => now });
  const pay = (id: string, patch: Partial<OmiseCharge> = {}) => { const c = charges.get(id)!; Object.assign(c, { status: "successful", paid: true }, patch); };
  const order = (id: string) => store.documents.get(`studioOrders/${id}`) as PaidOrder;
  const license = (id: string) => store.documents.get(`studioLicenses/${id}`) as License;
  return { store, billing, pay, order, license, created, charges, tick: (ms: number) => { now += ms; } };
}

test("PromptPay: QR returned, plan granted only after Omise says paid, webhook and polling are idempotent", async () => {
  const t = setup();
  const start = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  assert.equal(start.status, "pending"); assert.equal(start.qrImageUrl, "https://qr.example/q.svg"); assert.equal(start.amountMinor, 59900);
  assert.equal(t.created[0].amount, 59900); assert.equal(t.created[0].currency, "THB");
  assert.equal((await t.billing.orderStatus("uid-a", start.orderId)).status, "pending");
  assert.equal(t.license("lic-a").planId, "free");
  const chargeId = t.order(start.orderId).chargeId!;
  t.pay(chargeId);
  await t.billing.webhook({ key: "charge.complete", data: { id: chargeId, status: "successful" } });
  await t.billing.webhook({ key: "charge.complete", data: { id: chargeId } });
  const status = await t.billing.orderStatus("uid-a", start.orderId);
  assert.equal(status.status, "paid");
  assert.equal(t.license("lic-a").planId, "cloud-month");
  assert.equal(t.license("lic-a").planExpiresAt, new Date(NOW + 30 * DAY).toISOString(), "granted once, not twice");
  assert.equal(t.license("lic-a").maxDevices, 2);
  assert.equal([...t.store.documents.keys()].filter(k => k.startsWith("studioPaymentEvents/")).length, 1);
});

test("a fake webhook claiming success does nothing while Omise still says pending", async () => {
  const t = setup();
  const start = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  await t.billing.webhook({ key: "charge.complete", data: { id: t.order(start.orderId).chargeId, status: "successful", paid: true } });
  assert.equal(t.order(start.orderId).status, "pending"); assert.equal(t.license("lic-a").planId, "free");
  assert.deepEqual(await t.billing.webhook({ data: { id: "not-a-charge" } }), { ok: true, ignored: true });
});

test("wrong amount from Omise is never granted", async () => {
  const t = setup();
  const start = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  t.pay(t.order(start.orderId).chargeId!, { amount: 100 });
  assert.equal((await t.billing.orderStatus("uid-a", start.orderId)).status, "pending");
  assert.equal(t.license("lic-a").planId, "free");
});

test("renewal extends from the current end; failed charge cancels the order", async () => {
  const t = setup();
  const first = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  t.pay(t.order(first.orderId).chargeId!); await t.billing.orderStatus("uid-a", first.orderId);
  t.tick(10 * DAY);
  const second = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  t.pay(t.order(second.orderId).chargeId!); await t.billing.orderStatus("uid-a", second.orderId);
  assert.equal(t.license("lic-a").planExpiresAt, new Date(NOW + 60 * DAY).toISOString());
  const third = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  t.charges.get(t.order(third.orderId).chargeId!)!.status = "expired";
  assert.equal((await t.billing.orderStatus("uid-a", third.orderId)).status, "cancelled");
  assert.deepEqual((await t.billing.history("uid-a")).orders.map(o => o.status), ["paid", "paid"]);
});

test("card: token required, 3-D Secure link returned", async () => {
  const t = setup();
  await assert.rejects(t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "card" }), /invalid_request/);
  const start = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "card", cardToken: "tokn_test_123" });
  assert.equal(start.authorizeUri, "https://3ds.example/x"); assert.equal(t.created[0].cardToken, "tokn_test_123");
});

test("isolation: B cannot pay for, see or poll A's license and orders; free plan cannot be bought", async () => {
  const t = setup();
  await assert.rejects(t.billing.checkout("uid-b", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" }), /not_found/);
  await assert.rejects(t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "free", method: "promptpay" }), /plan_unavailable/);
  const start = await t.billing.checkout("uid-a", { licenseId: "lic-a", planId: "cloud-month", method: "promptpay" });
  await assert.rejects(t.billing.orderStatus("uid-b", start.orderId), /not_found/);
  assert.deepEqual((await t.billing.history("uid-b")).orders, []);
  assert.deepEqual((await t.billing.plans()).plans.map(p => p.id), ["cloud-month"]);
});

test("Omise gateway sends the documented form fields with the secret key", async () => {
  const sent: { url: string; init: RequestInit }[] = [];
  const gateway = omiseGateway("skey_test_abc", (async (url: string, init: RequestInit) => { sent.push({ url, init }); return Response.json({ object: "charge", id: "chrg_test_1", status: "pending", amount: 59900, currency: "thb", paid: false }); }) as typeof fetch);
  await gateway.createCharge({ amount: 59900, currency: "THB", orderId: "o1", method: "promptpay", returnUri: "https://koko.example/r" });
  const form = new URLSearchParams(String(sent[0].init.body));
  assert.equal(sent[0].url, "https://api.omise.co/charges");
  assert.equal((sent[0].init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from("skey_test_abc:").toString("base64")}`);
  assert.equal(form.get("source[type]"), "promptpay"); assert.equal(form.get("currency"), "thb"); assert.equal(form.get("metadata[orderId]"), "o1");
  assert.throws(() => omiseGateway(""), /OMISE_SECRET_KEY/);
});
