import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getReviewForBooking, getReviewRequest, submitReview } from "@/lib/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> | { bookingId: string } };

async function customer(request: Request) {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Error("UNAUTHORIZED");
    const decoded = await adminAuth.verifyIdToken(token, true);
    const user = await adminAuth.getUser(decoded.uid);
    if (user.disabled) throw new Error("UNAUTHORIZED");
    return decoded;
}

async function ownedBooking(bookingId: string, uid: string) {
    const snapshot = await adminDb.collection("bookings").doc(bookingId).get();
    if (!snapshot.exists || snapshot.data()?.userId !== uid) throw new Error("FORBIDDEN");
    return snapshot;
}

function errorResponse(error: unknown) {
    const code = error instanceof Error ? error.message : "REVIEW_ERROR";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : code === "REVIEW_ALREADY_SUBMITTED" ? 409 : code === "BOOKING_NOT_COMPLETED" ? 400 : 500;
    return NextResponse.json({ success: false, error: code }, { status });
}

export async function GET(request: Request, context: Context) {
    try {
        const decoded = await customer(request);
        const { bookingId } = await context.params;
        const bookingSnapshot = await ownedBooking(bookingId, decoded.uid);
        const booking = bookingSnapshot.data() || {};
        const review = await getReviewForBooking(bookingId);
        const reviewRequest = await getReviewRequest(bookingId);
        return NextResponse.json({
            success: true,
            booking: { id: bookingId, userId: decoded.uid, bookingStatus: booking.bookingStatus, eventDate: booking.event?.date || "", packageName: booking.package?.name || "" },
            review: review ? { id: review.id, rating: review.rating, comment: review.comment, status: review.status, createdAt: review.createdAt } : null,
            reviewRequest: reviewRequest ? { status: reviewRequest.status, completedAt: reviewRequest.completedAt } : null,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: Request, context: Context) {
    try {
        const decoded = await customer(request);
        const { bookingId } = await context.params;
        await ownedBooking(bookingId, decoded.uid);
        const body = (await request.json()) as { rating?: unknown; comment?: unknown };
        const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
        const comment = typeof body.comment === "string" ? body.comment.trim() : "";
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ success: false, error: "INVALID_RATING" }, { status: 400 });
        if (comment.length < 10 || comment.length > 2000) return NextResponse.json({ success: false, error: "INVALID_COMMENT" }, { status: 400 });
        const user = await adminAuth.getUser(decoded.uid);
        await submitReview({ bookingId, userId: decoded.uid, rating, comment, customerName: user.displayName || "" });
        return NextResponse.json({ success: true, status: "pending" }, { status: 201 });
    } catch (error) {
        return errorResponse(error);
    }
}
