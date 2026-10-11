import type { Firestore, Transaction as FirebaseTransaction, DocumentData, Query } from "firebase-admin/firestore";
import type { Store, Transaction } from "./types.ts";
const collections = new Set(["studioPlans", "studioLicenses", "studioLicenseKeys", "studioDeviceAuthorizations", "studioLinkCodes", "studioIdempotency", "studioAuditLogs", "studioRateLimits", "studioSchema", "studioOrders", "studioPaymentEvents"]);
export class FirestoreStore implements Store {
  private db: Firestore;
  constructor(db: Firestore) { this.db = db; }
  private ref(collection: string, id: string) {
    if (!collections.has(collection) || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("Invalid Studio document path");
    return this.db.collection(collection).doc(id);
  }
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async (firebaseTx: FirebaseTransaction) => work({
      get: async <V>(collection: string, id: string) => {
        const snapshot = await firebaseTx.get(this.ref(collection, id));
        return snapshot.exists ? snapshot.data() as V : null;
      },
      set: (collection, id, value) => { firebaseTx.set(this.ref(collection, id), value as DocumentData); },
    }));
  }
  async list<T>(collection: string, filter?: { field: string; value: string }, limit = 50): Promise<T[]> {
    if (!collections.has(collection)) throw new Error("Invalid Studio collection");
    let query: Query = this.db.collection(collection);
    if (filter) query = query.where(filter.field, "==", filter.value);
    const snapshot = await query.limit(Math.min(limit, 100)).get();
    return snapshot.docs.map(doc => doc.data() as T);
  }
}
