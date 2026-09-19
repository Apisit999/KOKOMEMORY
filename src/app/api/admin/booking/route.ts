import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        await requireAdminApi(request);

        const snapshot = await adminDb
            .collection("bookings")
            .orderBy("createdAt", "desc")
            .get();

        const bookings = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
        }));

        return NextResponse.json({ success: true, bookings });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        console.error("Admin booking list error:", error);
        const code = error instanceof Error ? error.message : "DATABASE_ERROR";
        const status = ["MISSING_TOKEN", "INVALID_TOKEN", "UNAUTHORIZED"].includes(code)
            ? 401
            : code === "NOT_ADMIN" || code === "ADMIN_DISABLED"
                ? 403
                : 500;

        return NextResponse.json(
            { success: false, error: "ไม่สามารถโหลด Booking ได้", code },
            { status },
        );
    }
}
