import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "./memory-store.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import type { Plan } from "../../src/lib/studio/types.ts";

test("cloud plans are created once with the agreed prices, are not purchasable, and admin edits survive re-migration", async () => {
  const store = new MemoryStore();
  const first = await migrateStudio(store);
  assert.equal(first.createdCloudPlans, 6);
  const get = (id: string) => store.documents.get(`studioPlans/${id}`) as Plan;
  assert.equal(get("starter-month").amountMinor, 19900);
  assert.equal(get("starter-year").amountMinor, 199000);
  assert.equal(get("pro-month").photoStorageQuotaBytes, 50 * 1024 ** 3);
  assert.equal(get("studio-month").photoRetentionDays, 180);
  assert.equal(get("studio-month").deviceLimit, 5);
  for (const id of ["starter", "pro", "studio"]) for (const p of ["month", "year"]) { assert.equal(get(`${id}-${p}`).purchasable, false); assert.ok(get(`${id}-${p}`).features.includes("cloud_sync")); }
  assert.ok(!get("free").features.includes("cloud_sync"));
  store.documents.set("studioPlans/pro-month", { ...get("pro-month"), amountMinor: 49900, version: 2 });
  const second = await migrateStudio(store);
  assert.equal(second.createdCloudPlans, 0);
  assert.equal(get("pro-month").amountMinor, 49900);
});
