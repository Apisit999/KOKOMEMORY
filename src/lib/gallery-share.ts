import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export const GALLERY_SHARE_COLLECTION = "galleryShares";

export function hashGalleryToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export async function createGalleryShare(
    bookingId: string,
    expiresInSeconds = 60 * 60 * 24 * 30,
    options: { scope?: "event" | "album"; label?: string } = {},
) {
    const token = randomBytes(32).toString("base64url");
    const shareRef = adminDb.collection(GALLERY_SHARE_COLLECTION).doc();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const scope = options.scope ?? "event";
    await shareRef.set({
        bookingId,
        tokenHash: hashGalleryToken(token),
        scope,
        ...(scope === "album" ? { albumId: shareRef.id, label: options.label?.trim().slice(0, 80) || "Guest gallery" } : {}),
        expiresAt,
        revokedAt: null,
        createdAt: FieldValue.serverTimestamp(),
    });
    return { shareId: shareRef.id, token, scope, expiresAt: expiresAt.toISOString() };
}

export async function getGalleryShare(bookingId: string, token: string): Promise<{ shareId: string; scope: "event" | "album"; albumId: string | null } | null> {
    if (!token || token.length < 40 || token.length > 200) return null;
    const snapshot = await adminDb.collection(GALLERY_SHARE_COLLECTION).where("tokenHash", "==", hashGalleryToken(token)).limit(1).get();
    if (snapshot.empty) return null;
    const share = snapshot.docs[0].data();
    const expiresAt = share.expiresAt?.toDate?.() ?? (share.expiresAt instanceof Date ? share.expiresAt : null);
    if (share.bookingId !== bookingId || share.revokedAt || !(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) return null;
    return {
        shareId: snapshot.docs[0].id,
        scope: share.scope === "album" && share.albumId === snapshot.docs[0].id ? "album" as const : "event" as const,
        albumId: share.scope === "album" && share.albumId === snapshot.docs[0].id ? share.albumId as string : null,
    };
}

export async function authorizeGalleryToken(bookingId: string, token: string) {
    return (await getGalleryShare(bookingId, token)) !== null;
}

export async function authorizeGalleryUploaderToken(bookingId: string, shareId: string, token: string) {
    if (!token || token.length < 40 || token.length > 200) return false;
    const snapshot = await adminDb.collection(GALLERY_SHARE_COLLECTION).doc(shareId).get();
    const share = snapshot.data();
    const expiresAt = share?.expiresAt?.toDate?.() ?? (share?.expiresAt instanceof Date ? share.expiresAt : null);
    return snapshot.exists
        && share?.bookingId === bookingId
        && share?.scope === "album"
        && share?.albumId === shareId
        && !share?.revokedAt
        && expiresAt instanceof Date
        && expiresAt.getTime() > Date.now()
        && share?.uploaderTokenHash === hashGalleryToken(token);
}
