import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";
import { isAllowedBookingTransition, normalizeBookingStatus } from "@/lib/booking-lifecycle";
import { isIsoDateBefore, todayBangkok } from "@/lib/bangkok-date";
import { ensureReviewRequest } from "@/lib/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const adminUser = await requireAdminApi(request);
        const requestedView = new URL(request.url).searchParams.get("view") || "active";
        const view = ["active", "completed", "cancelled", "archived", "all"].includes(requestedView)
            ? requestedView
            : "active";

        const snapshot = await adminDb
            .collection("bookings")
            .orderBy("createdAt", "desc")
            .get();

        const today = todayBangkok();
        const autoCompletedIds = new Set<string>();

        await Promise.all(snapshot.docs.map(async (document) => {
            const data = document.data();
            const status = typeof data.bookingStatus === "string" ? data.bookingStatus.trim().toLowerCase() : "";
            const event = data.event;
            const eventDate = event && typeof event === "object" && !Array.isArray(event) && typeof event.date === "string"
                ? event.date.trim()
                : "";

            if (status !== "confirmed" || !isIsoDateBefore(eventDate, today) || !isAllowedBookingTransition(status, "completed")) return;

            const completed = await adminDb.runTransaction(async (transaction) => {
                const bookingRef = adminDb.collection("bookings").doc(document.id);
                const currentSnapshot = await transaction.get(bookingRef);
                if (!currentSnapshot.exists) return false;

                const current = currentSnapshot.data() || {};
                if (typeof current.bookingStatus !== "string" || current.bookingStatus.trim().toLowerCase() !== "confirmed") return false;

                const currentEvent = current.event;
                const currentDate = currentEvent && typeof currentEvent === "object" && !Array.isArray(currentEvent) && typeof currentEvent.date === "string"
                    ? currentEvent.date.trim()
                    : "";
                if (!isIsoDateBefore(currentDate, today) || !isAllowedBookingTransition("confirmed", "completed")) return false;

                transaction.update(bookingRef, {
                    bookingStatus: "completed",
                    completedAt: FieldValue.serverTimestamp(),
                    completedBy: "system",
                    updatedAt: FieldValue.serverTimestamp(),
                });
                transaction.set(adminDb.collection("auditLogs").doc(), {
                    action: "AUTO_COMPLETE_BOOKING",
                    resource: "booking",
                    bookingId: document.id,
                    previousStatus: "confirmed",
                    bookingStatus: "completed",
                    adminUid: adminUser.uid,
                    actor: "system",
                    createdAt: FieldValue.serverTimestamp(),
                });
                return true;
            });
            if (completed) autoCompletedIds.add(document.id);
        }));

        await Promise.all(
            Array.from(autoCompletedIds).map(async (bookingId) => {
                try {
                    await ensureReviewRequest(bookingId);
                } catch (reviewError) {
                    console.error(
                        "Review request side effect failed:",
                        reviewError instanceof Error ? reviewError.message : "UNKNOWN_ERROR",
                    );
                }
            }),
        );

        const bookings = snapshot.docs
            .map((document) => ({
                id: document.id,
                ...document.data(),
                ...(autoCompletedIds.has(document.id) ? { bookingStatus: "completed" } : {}),
            } as { id: string; bookingStatus?: unknown; archiveStatus?: unknown }))
            .filter((booking) => {
                const status = normalizeBookingStatus(booking.bookingStatus) || (typeof booking.bookingStatus === "string" ? booking.bookingStatus : "");
                const isArchived = booking.archiveStatus === "archived";
                if (view === "active") return ["pending_payment", "payment_submitted", "payment_rejected", "confirmed"].includes(status) && !isArchived;
                if (view === "completed") return status === "completed" && !isArchived;
                if (view === "archived") return isArchived;
                if (view === "cancelled") return status === "cancelled";
                if (view === "active") return !isArchived;
                return true;
            });

        return NextResponse.json({ success: true, bookings });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        console.error("Admin booking list error:", error);
        const code = error instanceof Error ? error.message : "DATABASE_ERROR";
        const status = ["MISSING_TOKEN", "INVALID_TOKEN", "UNAUTHORIZED"].includes(code)
            ? 401
            : code === "NOT_ADMIN" || code === "ADMIN_DISABLED" || code === "FORBIDDEN"
                ? 403
                : 500;

        return NextResponse.json(
            { success: false, error: "ไม่สามารถโหลด Booking ได้", code },
            { status },
        );
    }
}
