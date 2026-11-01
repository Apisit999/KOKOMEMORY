import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authErrorResponse } from "@/lib/api-error";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function millis(value: unknown): number {
    if (value && typeof value === "object" && typeof (value as { seconds?: unknown }).seconds === "number") return Number((value as { seconds: number }).seconds) * 1000;
    return 0;
}

function fallbackEventDate(data: Record<string, unknown>): number {
    const event = data.event;
    const value = event && typeof event === "object" && !Array.isArray(event) ? (event as { date?: unknown }).date : undefined;
    if (typeof value !== "string") return 0;
    const parsed = new Date(`${value}T23:59:59.999+07:00`).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdminApi(request);
        const snapshot = await adminDb.collection("bookings").where("bookingStatus", "==", "completed").get();
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        let archived = 0;
        let skipped = 0;
        for (const document of snapshot.docs) {
            const ref = document.ref;
            const changed = await adminDb.runTransaction(async (transaction) => {
                const currentSnapshot = await transaction.get(ref);
                if (!currentSnapshot.exists) return false;
                const booking = currentSnapshot.data() || {};
                if (String(booking.bookingStatus || "").toLowerCase() !== "completed" || booking.archiveStatus === "archived") return false;
                const completedAt = millis(booking.completedAt) || fallbackEventDate(booking);
                if (!completedAt || completedAt > cutoff) return false;
                transaction.update(ref, { archiveStatus: "archived", archivedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
                transaction.set(adminDb.collection("auditLogs").doc(), { action: "BOOKING_ARCHIVED", resource: "booking", bookingId: document.id, adminUid: admin.uid, createdAt: FieldValue.serverTimestamp() });
                return true;
            });
            if (changed) archived += 1; else skipped += 1;
        }
        return NextResponse.json({ success: true, archived, skipped });
    } catch (error) {
        return authErrorResponse(error) || NextResponse.json({ success: false, error: "BOOKING_ARCHIVE_PROCESS_FAILED" }, { status: 500 });
    }
}
