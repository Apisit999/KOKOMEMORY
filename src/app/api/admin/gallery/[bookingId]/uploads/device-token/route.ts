import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";
import { GALLERY_SHARE_COLLECTION, hashGalleryToken } from "@/lib/gallery-share";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        await requireAdminApi(request);
        const { bookingId } = await context.params;
        const body = await request.json() as { shareId?: unknown };
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId) || typeof body.shareId !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(body.shareId)) {
            return NextResponse.json({ success: false, error: "INVALID_UPLOAD_SCOPE" }, { status: 400 });
        }
        const shareRef = adminDb.collection(GALLERY_SHARE_COLLECTION).doc(body.shareId);
        const shareSnapshot = await shareRef.get();
        const share = shareSnapshot.data();
        const expiresAt = share?.expiresAt?.toDate?.() ?? (share?.expiresAt instanceof Date ? share.expiresAt : null);
        if (!shareSnapshot.exists || share?.bookingId !== bookingId || share?.scope !== "album" || share?.albumId !== body.shareId || share?.revokedAt || !(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) {
            return NextResponse.json({ success: false, error: "ALBUM_UNAVAILABLE" }, { status: 404 });
        }
        const token = randomBytes(32).toString("base64url");
        await shareRef.update({ uploaderTokenHash: hashGalleryToken(token), uploaderTokenCreatedAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, token, expiresAt: expiresAt.toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
        return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
}
