import { FREE_FEATURES, type Plan, type Store } from "./types.ts";
export const SCHEMA_VERSION = 1;
export async function migrateStudio(store: Store, at = new Date().toISOString()) {
  return store.transaction(async tx => {
    const previous = await tx.get<{ version: number }>("studioSchema", "current");
    const free = await tx.get<Plan>("studioPlans", "free");
    if (previous && previous.version > SCHEMA_VERSION) throw new Error("Newer Studio schema detected");
    if (!free) tx.set<Plan>("studioPlans", "free", { id: "free", version: 1, name: "Free", billingPeriod: "lifetime", amountMinor: 0, currency: "THB", deviceLimit: 1, features: [...FREE_FEATURES], active: true, purchasable: false });
    if (!previous || previous.version < SCHEMA_VERSION) tx.set("studioSchema", "current", { version: SCHEMA_VERSION, migratedAt: at });
    return { version: SCHEMA_VERSION, createdFreePlan: !free, changed: !previous || previous.version < SCHEMA_VERSION || !free };
  });
}
