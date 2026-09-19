import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { authorizeGalleryToken } from "@/lib/gallery-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizeBooking(request: Request, bookingId: string) {
    const query = new URL(request.url).searchParams;
    const guestToken = query.get("guestToken") || query.get("token");
    if (guestToken && await authorizeGalleryToken(bookingId, guestToken)) return;
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Error("UNAUTHORIZED");
    const decoded = await adminAuth.verifyIdToken(token, true);
    const user = await adminAuth.getUser(decoded.uid);
    if (user.disabled) throw new Error("UNAUTHORIZED");
    const isAdmin = decoded.admin === true || decoded.isAdmin === true || decoded.role === "admin";
    if (isAdmin) return;
    const booking = await adminDb.collection("bookings").doc(bookingId).get();
    if (!booking.exists || booking.data()?.userId !== decoded.uid) throw new Error("FORBIDDEN");
}

export async function GET(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        const { bookingId } = await context.params;
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) return NextResponse.json({ success: false, error: "INVALID_BOOKING_ID" }, { status: 400 });
        await authorizeBooking(request, bookingId);
        const booking = await adminDb.collection("bookings").doc(bookingId).get();
        if (!booking.exists) return NextResponse.json({ success: false, error: "ไม่พบรายการจองนี้" }, { status: 404 });
        const snapshot = await adminDb.collection("bookings").doc(bookingId).collection("photos").get();
        const photos = snapshot.docs.map((doc) => {
            const data = doc.data();
            const status = typeof data.status === "string" ? data.status.toLowerCase() : "published";
            const deleted = data.deleted === true || Boolean(data.deletedAt);
            return { id: doc.id, bookingId, fileName: typeof data.fileName === "string" ? data.fileName : "koko-memory-photo.jpg", contentType: typeof data.contentType === "string" ? data.contentType : "image/jpeg", size: typeof data.size === "number" ? data.size : 0, status, url: `/api/gallery/${encodeURIComponent(bookingId)}/download/${encodeURIComponent(doc.id)}`, deleted };
        }).filter((photo) => !photo.deleted && ["published", "active", "ready"].includes(photo.status));
        return NextResponse.json({ success: true, bookingId, photos }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
        return NextResponse.json({ success: false, error: status === 500 ? "โหลด Gallery ไม่สำเร็จ" : "ไม่มีสิทธิ์เข้าถึง Gallery", code: code || "GALLERY_FAILED" }, { status });
    }
}
