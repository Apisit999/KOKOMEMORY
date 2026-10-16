import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const enabled = Boolean(authHost && firestoreHost);

test("Firestore profile rules allow Google displayName/photoURL and still reject privileged fields", { skip: !enabled }, async () => {
  assert.ok(authHost === "127.0.0.1:9099" || authHost === "localhost:9099", "Auth tests must use the local emulator");
  assert.ok(firestoreHost === "127.0.0.1:8080" || firestoreHost === "localhost:8080", "Firestore tests must use the local emulator");
  const projectId = process.env.GCLOUD_PROJECT;
  assert.ok(projectId?.startsWith("demo-"), "Rules tests must use a demo project");

  const app = initializeApp({ apiKey: "demo-local-api-key", authDomain: "localhost", projectId }, `profile-rules-${randomUUID()}`);
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    const db = getFirestore(app);
    connectFirestoreEmulator(db, firestoreHost!.split(":")[0], Number(firestoreHost!.split(":")[1]));

    const email = `${randomUUID()}@profile-rules.invalid`;
    const credential = await createUserWithEmailAndPassword(auth, email, `Test-${randomUUID()}-Aa1!`);
    const profile = doc(db, "users", credential.user.uid);
    await setDoc(profile, {
      uid: credential.user.uid,
      name: "Google Profile",
      displayName: "Google Profile",
      email,
      photoURL: "https://example.test/avatar.jpg",
      provider: "google",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(profile, {
      displayName: "Updated Google Profile",
      photoURL: "https://example.test/new-avatar.jpg",
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await assert.rejects(
      setDoc(profile, { isAdmin: true }, { merge: true }),
      (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "permission-denied"),
    );
  } finally {
    await deleteApp(app);
  }
});
