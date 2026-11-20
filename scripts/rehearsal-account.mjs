// Rehearsal helper for the LOCAL emulator stack only: creates a test customer, approves a desktop link code
// as that customer, and moves the linked license to a cloud plan. Usage:
//   node scripts/rehearsal-account.mjs approve <USER_CODE> [webOrigin]
//   node scripts/rehearsal-account.mjs plan
//   node scripts/rehearsal-account.mjs password <NEW_PASSWORD>
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const app = initializeApp({ projectId: "demo-kokomemory-local" });
const db = getFirestore(app);
const auth = getAuth(app);
const email = "rehearsal-customer@studio-test.invalid";
const password = "Reh-" + randomUUID().slice(0, 12);

async function customer() {
  let user;
  try { user = await auth.getUserByEmail(email); await auth.updateUser(user.uid, { password, emailVerified: true }); }
  catch { user = await auth.createUser({ email, password, emailVerified: true, displayName: "Rehearsal Customer" }); }
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const body = await response.json();
  if (!body.idToken) throw new Error("Could not sign in the rehearsal customer: " + JSON.stringify(body).slice(0, 200));
  return { uid: user.uid, idToken: body.idToken };
}

const [, , command, arg, originArg] = process.argv;
if (command === "approve") {
  const { idToken, uid } = await customer();
  const origin = originArg ?? "http://127.0.0.1:3040";
  const response = await fetch(`${origin}/api/studio/account/link`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${idToken}`, origin },
    body: JSON.stringify({ action: "approve", userCode: arg })
  });
  console.log("approve", response.status, (await response.text()).slice(0, 200));
  console.log("uid", uid);
} else if (command === "plan") {
  const { uid } = await customer();
  const plans = await db.collection("studioPlans").get();
  const cloud = plans.docs.map(d => d.data()).filter(p => Array.isArray(p.features) && p.features.includes("cloud_sync") && p.id !== "free");
  console.log("cloud plans:", cloud.map(p => `${p.id}(${p.billingPeriod})`).join(", "));
  const licenses = await db.collection("studioLicenses").where("ownerUid", "==", uid).get();
  if (licenses.empty) throw new Error("No license is linked to the rehearsal customer yet");
  const target = cloud.find(p => p.billingPeriod === "month") ?? cloud[0];
  if (!target) throw new Error("No cloud plan found");
  for (const doc of licenses.docs) await doc.ref.update({ planId: target.id, status: "active" });
  console.log("linked licenses moved to", target.id, "count", licenses.size);
} else if (command === "password") {
  // Sets a known password for signing in through the real web pages during a rehearsal.
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password: arg, emailVerified: true });
  console.log("password set for", email);
} else {
  console.log("Usage: approve <USER_CODE> | plan | password <NEW_PASSWORD>");
}
