// Read-only inventory. It never writes Firestore/R2 and never prints secrets.
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.log(JSON.stringify({ status: "BLOCKED", reason: "missing Firebase credentials", missing }, null, 2));
  process.exit(2);
}

const app = getApps()[0] || initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
}) });
const db = getFirestore(app);
const snapshot = await db.collection("payments").get();
const result = { status: "OK", total: snapshot.size, secure: 0, legacyPublicUrl: 0, missingObjectKey: 0, unknown: 0, records: [] };
for (const doc of snapshot.docs) {
  const p = doc.data();
  const bookingPayment = p.payment && typeof p.payment === "object" ? p.payment : {};
  const secure = p.secureSlipUrl || bookingPayment.secureSlipUrl;
  const url = p.slipUrl || p.proofUrl || bookingPayment.slipUrl || bookingPayment.proofUrl;
  const key = p.slipKey || p.slipPath || p.proofKey || bookingPayment.slipKey || bookingPayment.proofKey;
  const category = secure && key ? "secure" : url ? "legacyPublicUrl" : !key ? "missingObjectKey" : "unknown";
  result[category] += 1;
  result.records.push({ paymentId: doc.id, bookingId: p.bookingId || null, category, hasSecureSlipUrl: Boolean(secure), hasLegacyUrl: Boolean(url), hasObjectKey: Boolean(key) });
}
console.log(JSON.stringify(result, null, 2));
