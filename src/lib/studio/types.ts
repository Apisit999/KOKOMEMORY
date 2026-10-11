export const PRODUCT_ID = "koko-photobooth";
export const FREE_FEATURES = ["capture", "printing", "templates"] as const;
export type Feature = "capture" | "printing" | "templates" | "cloud_sync";
export type Plan = {
  id: string; version: number; name: string; billingPeriod: "month" | "year" | "lifetime";
  amountMinor: number; currency: string; deviceLimit: number; features: Feature[];
  active: boolean; purchasable: boolean; photoRetentionDays?: number; photoStorageQuotaBytes?: number;
};
export type Device = { status: "active" | "deactivated"; name: string; activatedAt: string; lastSeenAt: string; deactivatedAt: string | null };
export type License = {
  id: string; ownerUid: string | null; productId: string; planId: string; status: "active" | "revoked" | "expired";
  startsAt: string; expiresAt: string | null; createdAt: string; linkedAt: string | null;
  maxDevices: number; devices: Record<string, Device>;
};
export type Claims = {
  schemaVersion: 1; keyId: string; licenseId: string; deviceId: string; productId: string;
  issuedAt: string; startsAt: string; expiresAt: string | null; refreshAfter: string; offlineUntil: string; features: Feature[];
};
export type LinkRequest = {
  id: string; codeHash: string; pollHash: string; licenseId: string; deviceId: string; deviceName: string;
  status: "pending" | "approved" | "consumed"; expiresAt: string; ownerUid: string | null;
};
export type StudioOrder = { id: string; ownerUid: string; planId: string; planVersion: number; amountMinor: number; currency: string; status: "pending" | "paid" | "cancelled" | "refunded"; createdAt: string; verifiedPaymentEventId: string | null };
export type StudioPaymentEvent = { id: string; provider: string; providerEventId: string; orderId: string; verifiedAt: string; processedAt: string | null; kind: "paid" | "renewed" | "refunded" | "chargeback" };
/** A future adapter must verify raw webhook bytes before producing a trusted event. */
export interface PaymentProviderAdapter {
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<StudioPaymentEvent>;
}
export interface Transaction {
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T extends object>(collection: string, id: string, value: T): void;
}
export interface Store {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
  list<T>(collection: string, filter?: { field: string; value: string }, limit?: number): Promise<T[]>;
}
export class StudioError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}
export function purchaseDisabled(): never { throw new StudioError("purchase_unavailable", 503); }
