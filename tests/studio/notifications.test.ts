import test from "node:test";
import assert from "node:assert/strict";
import { NotificationService, dueNotices, type Mailer } from "../../src/lib/studio/notifications.ts";
import { migrateStudio } from "../../src/lib/studio/migration.ts";
import { PRODUCT_ID, type License } from "../../src/lib/studio/types.ts";
import { MemoryStore } from "./memory-store.ts";
const DAY = 86_400_000; const GB = 1024 ** 3;
async function fixture(license: Partial<License>, usageBytes = 0, mailer?: Mailer) {
  const store = new MemoryStore(); let time = Date.parse("2026-11-10T00:00:00Z"); await migrateStudio(store);
  const base: License = { id: "lic-1", ownerUid: "uid-a", productId: PRODUCT_ID, planId: "pilot", status: "active", startsAt: "2026-11-01T00:00:00Z", expiresAt: null, createdAt: "2026-11-01T00:00:00Z", linkedAt: null, maxDevices: 5, devices: {}, planExpiresAt: new Date(time + 30 * DAY).toISOString() };
  await store.transaction(async tx => { tx.set("studioLicenses", "lic-1", { ...base, ...license }); tx.set("studioUsage", "uid-a", { ownerUid: "uid-a", bytes: usageBytes, photos: 1, updatedAt: "x" }); });
  const outbox: { to: string; subject: string; html: string }[] = [];
  const m: Mailer = mailer ?? { async send(to, subject, html) { outbox.push({ to, subject, html }); } };
  const service = new NotificationService({ store, mailer: m, resolveEmail: async uid => uid === "uid-a" ? "a@t.test" : null, origin: "https://example.test", now: () => time });
  return { store, service, outbox, advance: (ms: number) => { time += ms; } };
}
test("no email far from expiry and under 80% usage", async () => {
  const f = await fixture({}, 2.5 * GB); assert.deepEqual(await f.service.run(), { sent: 0, failed: 0 }); assert.equal(f.outbox.length, 0);
});
test("expiry reminders go out once at 7 days and once at 1 day, then an ended notice", async () => {
  const f = await fixture({}); f.advance(24 * DAY);
  await f.service.run(); await f.service.run(); assert.equal(f.outbox.length, 1); assert.match(f.outbox[0].subject, /7 วัน/);
  f.advance(5.5 * DAY); await f.service.run(); await f.service.run(); assert.equal(f.outbox.length, 2); assert.match(f.outbox[1].subject, /1 วัน/);
  f.advance(1 * DAY); await f.service.run(); await f.service.run(); assert.equal(f.outbox.length, 3); assert.match(f.outbox[2].subject, /สิ้นสุดแล้ว/);
  f.advance(20 * DAY); await f.service.run(); assert.equal(f.outbox.length, 3); // after the grace period nothing more is sent
});
test("quota notices at 80% and 90%, once each, and re-arm after usage drops", async () => {
  const f = await fixture({}, 42.5 * GB); // 85% of 50 GB
  await f.service.run(); await f.service.run(); assert.equal(f.outbox.length, 1); assert.match(f.outbox[0].subject, /80%/);
  await f.store.transaction(async tx => { tx.set("studioUsage", "uid-a", { ownerUid: "uid-a", bytes: 47.5 * GB, photos: 1, updatedAt: "x" }); });
  await f.service.run(); assert.equal(f.outbox.length, 2); assert.match(f.outbox[1].subject, /90%/);
  await f.store.transaction(async tx => { tx.set("studioUsage", "uid-a", { ownerUid: "uid-a", bytes: 2.5 * GB, photos: 1, updatedAt: "x" }); });
  await f.service.run();
  await f.store.transaction(async tx => { tx.set("studioUsage", "uid-a", { ownerUid: "uid-a", bytes: 47.5 * GB, photos: 1, updatedAt: "x" }); });
  await f.service.run(); assert.equal(f.outbox.length, 3);
});
test("failed send is retried next run; free licenses, unlinked owners and unverified emails are skipped", async () => {
  let fail = true; const sent: string[] = [];
  const f = await fixture({}, 47.5 * GB, { async send(_to, subject) { if (fail) throw new Error("down"); sent.push(subject); } });
  assert.deepEqual(await f.service.run(), { sent: 0, failed: 1 }); fail = false; assert.deepEqual(await f.service.run(), { sent: 1, failed: 0 });
  const g = await fixture({ planId: "free", planExpiresAt: null }, 47.5 * GB); await g.service.run(); assert.equal(g.outbox.length, 0);
  const h = await fixture({ ownerUid: "uid-none" }, 47.5 * GB); await h.service.run(); assert.equal(h.outbox.length, 0);
});
test("pure decision and escaping", () => {
  assert.deepEqual(dueNotices({ planId: "pro-month", planExpiresAt: null }, 9 * GB, 10 * GB, 0), ["quota90"]);
});
