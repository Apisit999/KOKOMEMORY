import {
    cert,
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getAuth,
} from "firebase-admin/auth";

import {
    getFirestore,
} from "firebase-admin/firestore";


/* ============================================================
   Firebase Admin Environment
============================================================ */

const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

const privateKey = (
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    ""
).replace(
    /\\n/g,
    "\n"
);

// Emulator credentials are unnecessary. Both services and a demo project are required
// so local tests cannot silently target a real customer's Firebase project.
const usingEmulators = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST && projectId?.startsWith("demo-"));


/* ============================================================
   Validate Environment
============================================================ */

if (!projectId) {
    throw new Error(
        "Missing FIREBASE_PROJECT_ID"
    );
}

if (!usingEmulators && !clientEmail) {
    throw new Error(
        "Missing FIREBASE_CLIENT_EMAIL"
    );
}

if (!usingEmulators && !privateKey) {
    throw new Error(
        "Missing FIREBASE_PRIVATE_KEY"
    );
}


/* ============================================================
   Firebase Admin App
============================================================ */

const firebaseApp =
    getApps().length > 0
        ? getApps()[0]
        : usingEmulators ? initializeApp({ projectId }) : initializeApp({
              credential: cert({
                  projectId,
                  clientEmail,
                  privateKey,
              }),
          });


/* ============================================================
   Firebase Admin Services
============================================================ */

export const adminDb =
    getFirestore(firebaseApp);

export const adminAuth =
    getAuth(firebaseApp);
