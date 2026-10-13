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


function getFirebaseApp() {
    const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
        throw new Error("Missing FIREBASE_PROJECT_ID");
    }

    const clientEmail =
        process.env.FIREBASE_CLIENT_EMAIL ||
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

    const privateKey = (
        process.env.FIREBASE_PRIVATE_KEY ||
        process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
        ""
    ).replace(/\\n/g, "\n");

    // Emulator credentials are unnecessary. Both services and a demo project are required
    // so local tests cannot silently target a real customer's Firebase project.
    const usingEmulators = Boolean(
        process.env.FIREBASE_AUTH_EMULATOR_HOST &&
        process.env.FIRESTORE_EMULATOR_HOST &&
        projectId.startsWith("demo-")
    );

    if (!usingEmulators && !clientEmail) {
        throw new Error("Missing FIREBASE_CLIENT_EMAIL");
    }

    if (!usingEmulators && !privateKey) {
        throw new Error("Missing FIREBASE_PRIVATE_KEY");
    }

    const existingApp = getApps()[0];
    if (existingApp) return existingApp;

    return usingEmulators
        ? initializeApp({ projectId })
        : initializeApp({
              credential: cert({ projectId, clientEmail, privateKey }),
          });
}

function lazyFirebaseService<T extends object>(factory: () => T): T {
    return new Proxy({} as T, {
        get(_target, property) {
            const service = factory();
            const value = Reflect.get(service, property, service);
            return typeof value === "function" ? value.bind(service) : value;
        },
    });
}

// Next.js loads server modules while collecting route metadata during a production build.
// Delay credential validation until a request actually uses Firebase so secrets stay runtime-only.
export const adminDb = lazyFirebaseService(() => getFirestore(getFirebaseApp()));
export const adminAuth = lazyFirebaseService(() => getAuth(getFirebaseApp()));
