import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authErrorResponse } from "@/lib/api-error";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, context: Context) {
    try {
        const admin = await requireAdminApi(request);
        const { id } = await context.params;
        const body = (await request.json()) as { action?: unknown };
        const action = body.action === "restore" ? "restore" : body.action === "archive" ? "archive" : "";
        if (!id || !action) return NextResponse.json({ success: false, error: "INVALID_ARCHIVE_ACTION" }, { status: 400 });
        const bookingRef = adminDb.collection("bookings").doc(id);
        const result = await adminDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(bookingRef);
            if (!snapshot.exists) throw new Error("BOOKING_NOT_FOUND");
            const booking = snapshot.data() || {};
            if (String(booking.bookingStatus || "").toLowerCase() !== "completed") throw new Error("ARCHIVE_COMPLETED_ONLY");
            const currentArchived = booking.archiveStatus === "archived";
            const nextArchived = action === "archive";
            if (currentArchived === nextArchived) return { changed: false, archiveStatus: currentArchived ? "archived" : "active" };
            transaction.update(bookingRef, nextArchived
                ? { archiveStatus: "archived", archivedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
                : { archiveStatus: "active", archivedAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
            transaction.set(adminDb.collection("auditLogs").doc(), {
                action: nextArchived ? "BOOKING_ARCHIVED" : "BOOKING_RESTORED",
                resource: "booking",
                bookingId: id,
                adminUid: admin.uid,
                createdAt: FieldValue.serverTimestamp(),
            });
            return { changed: true, archiveStatus: nextArchived ? "archived" : "active" };
        });
        return NextResponse.json({ success: true, bookingId: id, bookingStatus: "completed", ...result });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        const code = error instanceof Error ? error.message : "ARCHIVE_FAILED";
        const status = code === "BOOKING_NOT_FOUND" ? 404 : code === "ARCHIVE_COMPLETED_ONLY" ? 409 : 500;
        return NextResponse.json({ success: false, error: code }, { status });
    }
}
