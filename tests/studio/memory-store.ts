import type { Store, Transaction } from "../../src/lib/studio/types.ts";
/** Isolated transactional test double; no production credentials or network access. */
export class MemoryStore implements Store {
  readonly documents = new Map<string, object>();
  private queue: Promise<unknown> = Promise.resolve();
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const draft = new Map([...this.documents].map(([key, value]) => [key, structuredClone(value)]));
      let wrote = false;
      const result = await work({
        get: async <V>(collection: string, id: string) => {
          if (wrote) throw new Error("Firestore requires reads before writes");
          return structuredClone(draft.get(`${collection}/${id}`) ?? null) as V | null;
        },
        set: (collection, id, value) => { wrote = true; draft.set(`${collection}/${id}`, structuredClone(value)); },
      });
      this.documents.clear(); for (const [key, value] of draft) this.documents.set(key, value);
      return result;
    });
    this.queue = run.catch(() => {}); return run;
  }
  async list<T>(collection: string, filter?: { field: string; value: string }, limit = 50): Promise<T[]> {
    return [...this.documents].filter(([key, value]) => key.startsWith(`${collection}/`) && (!filter || (value as Record<string, unknown>)[filter.field] === filter.value)).slice(0, limit).map(([, value]) => structuredClone(value) as T);
  }
}
