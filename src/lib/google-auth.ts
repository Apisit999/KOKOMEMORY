import {
    browserLocalPersistence,
    GoogleAuthProvider,
    setPersistence,
    signOut,
    signInWithPopup,
    type User,
} from "firebase/auth";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/** Authenticate with Google while preserving Firebase's local auth session. */
export async function signInWithGoogle() {
    await setPersistence(auth, browserLocalPersistence);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);

    if (!result.user.emailVerified) {
        await signOut(auth);
        const error = new Error("Google account email is not verified") as Error & { code?: string };
        error.code = "auth/email-not-verified";
        throw error;
    }

    return result;
}

/**
 * Merge only the Firebase-auth profile fields into users/{uid}.
 * Booking, payment, and admin fields are intentionally untouched.
 */
export async function syncGoogleUserProfile(user: User) {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);
    const profile = {
        uid: user.uid,
        name: user.displayName || "",
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        provider: "google" as const,
        updatedAt: serverTimestamp(),
    };

    await setDoc(
        userRef,
        snapshot.exists()
            ? profile
            : { ...profile, createdAt: serverTimestamp() },
        { merge: true },
    );
}

export function getGoogleAuthErrorCode(error: unknown): string {
    if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === "string" ? code : "";
    }

    return "";
}
