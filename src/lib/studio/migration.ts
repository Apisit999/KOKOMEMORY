import { FREE_FEATURES, type Plan, type Store } from "./types.ts";
export const SCHEMA_VERSION = 1;
const GB = 1024 ** 3;
/** Paid cloud plans (docs/KOKO_STUDIO_PRICING_ANALYSIS.md). Created once, never overwritten, and not purchasable until payments are enabled. Yearly = 10 months. */
const CLOUD_TIERS = [
  { key: "starter", name: "Starter", monthlyBaht: 199, deviceLimit: 1, quotaGb: 10, retentionDays: 30 },
  { key: "pro", name: "Pro", monthlyBaht: 449, deviceLimit: 2, quotaGb: 50, retentionDays: 90 },
  { key: "studio", name: "Studio", monthlyBaht: 990, deviceLimit: 5, quotaGb: 200, retentionDays: 180 },
] as const;
export const CLOUD_PLANS: Plan[] = CLOUD_TIERS.flatMap(tier => (["month", "year"] as const).map(period => ({
  id: `${tier.key}-${period}`, version: 1, name: `${tier.name} (${period === "month" ? "monthly" : "yearly"})`, billingPeriod: period,
  amountMinor: tier.monthlyBaht * (period === "month" ? 1 : 10) * 100, currency: "THB", deviceLimit: tier.deviceLimit,
  features: [...FREE_FEATURES, "cloud_sync"] as Plan["features"], active: true, purchasable: false,
  photoRetentionDays: tier.retentionDays, photoStorageQuotaBytes: tier.quotaGb * GB,
})));
export const PILOT_PLAN_ID = "pilot";
export const PILOT_DAYS = 60;
export const PILOT_CAP = 30;
/** Free trial at the top (Studio) limits: 200 GB, 180-day retention, 5 devices. Lower these before the pilot ends. Granted to a license, lapses back to Free after PILOT_DAYS. */
export const PILOT_PLAN: Plan = { id: PILOT_PLAN_ID, version: 2, name: "Pilot (free trial, max)", billingPeriod: "month", amountMinor: 0, currency: "THB", deviceLimit: 5,
  features: [...FREE_FEATURES, "cloud_sync"] as Plan["features"], active: true, purchasable: false, photoRetentionDays: 180, photoStorageQuotaBytes: 200 * GB };
export async function migrateStudio(store: Store, at = new Date().toISOString()) {
  return store.transaction(async tx => {
    const pilot = await tx.get<Plan>("studioPlans", PILOT_PLAN_ID);
    const existingCloud = await Promise.all(CLOUD_PLANS.map(plan => tx.get<Plan>("studioPlans", plan.id)));
    const previous = await tx.get<{ version: number }>("studioSchema", "current");
    const free = await tx.get<Plan>("studioPlans", "free");
    if (previous && previous.version > SCHEMA_VERSION) throw new Error("Newer Studio schema detected");
    if (!free) tx.set<Plan>("studioPlans", "free", { id: "free", version: 1, name: "Free", billingPeriod: "lifetime", amountMinor: 0, currency: "THB", deviceLimit: 1, features: [...FREE_FEATURES], active: true, purchasable: false });
    if (!pilot || pilot.version < PILOT_PLAN.version) tx.set<Plan>("studioPlans", PILOT_PLAN_ID, PILOT_PLAN);
    let createdCloudPlans = 0;
    CLOUD_PLANS.forEach((plan, index) => { if (!existingCloud[index]) { tx.set<Plan>("studioPlans", plan.id, plan); createdCloudPlans += 1; } });
    if (!previous || previous.version < SCHEMA_VERSION) tx.set("studioSchema", "current", { version: SCHEMA_VERSION, migratedAt: at });
    return { version: SCHEMA_VERSION, createdFreePlan: !free, createdCloudPlans, changed: !pilot || pilot.version < PILOT_PLAN.version || !previous || previous.version < SCHEMA_VERSION || !free || createdCloudPlans > 0 };
  });
}
