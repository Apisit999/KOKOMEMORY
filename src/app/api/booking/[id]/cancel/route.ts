import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { normalizeBookingStatus, isAllowedBookingTransition } from "@/lib/booking-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, context: Ctx) {
  try {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const token = auth.slice(7).trim();
    const decoded = await getAuth().verifyIdToken(token, true);
    const user = await getAuth().getUser(decoded.uid);
    if (user.disabled || !user.emailVerified) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const params = await context.params;
    const bookingId = typeof params?.id === "string" ? params.id.trim() : "";
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.cancellationReason === "string" ? body.cancellationReason.normalize("NFC").trim() : "";
    if (!bookingId || !reason || reason.length > 500) return NextResponse.json({ error: "INVALID_CANCELLATION_REASON" }, { status: 400 });
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    await adminDb.runTransaction(async tx => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const booking = snap.data() || {};
      if (booking.userId !== decoded.uid) throw new Error("FORBIDDEN");
      const current = normalizeBookingStatus(booking.bookingStatus);
      if (!current || !isAllowedBookingTransition(current, "cancelled")) throw new Error("INVALID_TRANSITION");
      const eventDate = typeof booking.event?.date === "string" ? booking.event.date : "";
      if (eventDate) {
        const dateRef = adminDb.collection("bookingDates").doc(eventDate);
        const dateSnap = await tx.get(dateRef);
        if (dateSnap.exists && dateSnap.data()?.bookingId === bookingId) {
          tx.update(dateRef, { status: "released", updatedAt: FieldValue.serverTimestamp() });
        }
      }
      tx.update(bookingRef, {
        bookingStatus: "cancelled", cancelledAt: FieldValue.serverTimestamp(), cancelledBy: decoded.uid,
        cancellationReason: reason, updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(adminDb.collection("auditLogs").doc(), {
        action: "CUSTOMER_CANCEL_BOOKING", resource: "booking", bookingId,
        userId: decoded.uid, previousStatus: booking.bookingStatus, bookingStatus: "cancelled",
        cancellationReason: reason, createdAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ success: true, bookingId, bookingStatus: "cancelled" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "INVALID_TRANSITION" ? 409 : 500;
    return NextResponse.json({ success: false, error: code }, { status });
  }
}
