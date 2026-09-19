import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const GALLERY_SHARE_COLLECTION = "galleryShares";

export function hashGalleryToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export async function createGalleryShare(bookingId: string, expiresInSeconds = 60 * 60 * 24 * 30) {
    const token = randomBytes(32).toString("base64url");
    const shareRef = adminDb.collection(GALLERY_SHARE_COLLECTION).doc();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await shareRef.set({ bookingId, tokenHash: hashGalleryToken(token), expiresAt, revokedAt: null, createdAt: FieldValue.serverTimestamp() });
    return { shareId: shareRef.id, token, expiresAt: expiresAt.toISOString() };
}

export async function authorizeGalleryToken(bookingId: string, token: string) {
    if (!token || token.length < 40 || token.length > 200) return false;
    const snapshot = await adminDb.collection(GALLERY_SHARE_COLLECTION).where("tokenHash", "==", hashGalleryToken(token)).limit(1).get();
    if (snapshot.empty) return false;
    const share = snapshot.docs[0].data();
    const expiresAt = share.expiresAt?.toDate?.() ?? (share.expiresAt instanceof Date ? share.expiresAt : null);
    return share.bookingId === bookingId && !share.revokedAt && expiresAt instanceof Date && expiresAt.getTime() > Date.now();
}
