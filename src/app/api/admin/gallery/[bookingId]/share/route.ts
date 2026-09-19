import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin-api";
import { adminDb } from "@/lib/firebase-admin";
import { GALLERY_SHARE_COLLECTION, hashGalleryToken } from "@/lib/gallery-share";
import { createGalleryShare } from "@/lib/gallery-share";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        await requireAdminApi(request);
        const { bookingId } = await context.params;
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) return NextResponse.json({ success: false, error: "INVALID_BOOKING_ID" }, { status: 400 });
        if (!(await adminDb.collection("bookings").doc(bookingId).get()).exists) return NextResponse.json({ success: false, error: "BOOKING_NOT_FOUND" }, { status: 404 });
        const result = await createGalleryShare(bookingId);
        return NextResponse.json({ success: true, ...result });
    } catch {
        return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        await requireAdminApi(request);
        const { bookingId } = await context.params;
        const params = new URL(request.url).searchParams;
        const token = params.get("guestToken") || params.get("token") || "";
        const snapshot = await adminDb.collection(GALLERY_SHARE_COLLECTION).where("bookingId", "==", bookingId).where("tokenHash", "==", hashGalleryToken(token)).limit(1).get();
        if (snapshot.empty) return NextResponse.json({ success: false, error: "SHARE_NOT_FOUND" }, { status: 404 });
        await snapshot.docs[0].ref.update({ revokedAt: new Date() });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
}
