import { StudioError } from "./types.ts";

/**
 * Per-minute counter kept in this server process, for the busiest public reads (a guest opening a photo link, saving a photo).
 *
 * Why not the database: the database limiter does a read-then-write transaction on ONE document per caller address per minute.
 * Guests of one event usually share an address (venue Wi-Fi, or a mobile carrier that puts many phones behind one address), so
 * those transactions queue up on a single document: measured, 5 requests at once from one address already took 5 s, and 10 at
 * once failed with 503. Counting here costs nothing and cannot queue.
 *
 * Trade-offs, on purpose: the counts live in one process (a restart resets them, several server instances each count
 * separately), and the table is bounded: when it is full, old windows are dropped first, and as a last resort it is cleared,
 * which lets some traffic through for a moment rather than growing without limit. Short codes and account linking, which are
 * guessable or sensitive, stay on the database limiter.
 */
export class MemoryRateLimiter {
  private readonly entries = new Map<string, { minute: number; count: number }>();
  private readonly maxEntries: number;
  constructor(maxEntries = 20_000) { this.maxEntries = maxEntries; }

  /** Counts one request; throws 429 once `max` requests were already seen in the same minute for this key. */
  hit(key: string, max: number, now: number) {
    const minute = Math.floor(now / 60_000);
    const entry = this.entries.get(key);
    if (entry && entry.minute === minute) {
      if (entry.count >= max) throw new StudioError("rate_limited", 429);
      entry.count += 1;
      return;
    }
    if (this.entries.size >= this.maxEntries) this.prune(minute);
    this.entries.set(key, { minute, count: 1 });
  }

  get size() { return this.entries.size; }

  private prune(minute: number) {
    for (const [key, entry] of this.entries) if (entry.minute !== minute) this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) this.entries.clear();
  }
}
