import test from "node:test";
import assert from "node:assert/strict";
import { MemoryRateLimiter } from "../../src/lib/studio/memory-rate-limit.ts";
import { StudioError } from "../../src/lib/studio/types.ts";

const MINUTE = 60_000;
const blocked = (fn: () => void) => { try { fn(); return false; } catch (error) { assert.ok(error instanceof StudioError && error.status === 429 && error.code === "rate_limited"); return true; } };

test("memory limiter: lets `max` requests through in a minute, then answers 429 until the next minute", () => {
  const limiter = new MemoryRateLimiter();
  const t = 10 * MINUTE + 5_000;
  for (let i = 0; i < 300; i++) assert.equal(blocked(() => limiter.hit("share/view:1.2.3.4", 300, t + i)), false, `request ${i + 1}`);
  assert.equal(blocked(() => limiter.hit("share/view:1.2.3.4", 300, t + 400)), true);
  assert.equal(blocked(() => limiter.hit("share/view:1.2.3.4", 300, t + 50_000)), true, "still the same minute");
  assert.equal(blocked(() => limiter.hit("share/view:1.2.3.4", 300, 11 * MINUTE)), false, "a new minute starts a new count");
});

test("memory limiter: addresses and paths are counted separately", () => {
  const limiter = new MemoryRateLimiter();
  const t = 20 * MINUTE;
  for (let i = 0; i < 3; i++) limiter.hit("share/view:a", 3, t);
  assert.equal(blocked(() => limiter.hit("share/view:a", 3, t)), true);
  assert.equal(blocked(() => limiter.hit("share/view:b", 3, t)), false);
  assert.equal(blocked(() => limiter.hit("share/photo:a", 3, t)), false);
});

test("memory limiter: many guests behind one address are served at full speed up to the limit (no queueing)", () => {
  const limiter = new MemoryRateLimiter();
  const started = performance.now();
  for (let i = 0; i < 300; i++) limiter.hit("share/view:venue-wifi", 300, 30 * MINUTE);
  assert.ok(performance.now() - started < 50, "300 counts take well under 50 ms");
});

test("memory limiter: the table stays bounded: old minutes are dropped first, and a full table of current entries is cleared", () => {
  const limiter = new MemoryRateLimiter(100);
  for (let i = 0; i < 100; i++) limiter.hit(`old:${i}`, 5, 40 * MINUTE);
  assert.equal(limiter.size, 100);
  limiter.hit("new", 5, 41 * MINUTE);
  assert.equal(limiter.size, 1, "every old window was dropped");
  for (let i = 0; i < 100; i++) limiter.hit(`fresh:${i}`, 5, 41 * MINUTE);
  assert.ok(limiter.size <= 100, "never grows past its limit");
});
