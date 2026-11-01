import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authErrorResponse } from "@/lib/api-error";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: Context) {
    try {
        const admin = await requireAdminApi(request);
        const { id } = await context.params;
        const body = (await request.json()) as { status?: unknown };
        const status = body.status === "approved" || body.status === "rejected" ? body.status : "";
        if (!status) return NextResponse.json({ success: false, error: "INVALID_REVIEW_STATUS" }, { status: 400 });
        const ref = adminDb.collection("reviews").doc(id);
        const current = await ref.get();
        if (!current.exists) return NextResponse.json({ success: false, error: "REVIEW_NOT_FOUND" }, { status: 404 });
        await ref.update({ status, reviewedBy: admin.uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        await adminDb.collection("auditLogs").doc().create({ action: status === "approved" ? "REVIEW_APPROVED" : "REVIEW_REJECTED", resource: "review", reviewId: id, bookingId: current.data()?.bookingId || id, adminUid: admin.uid, createdAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, status });
    } catch (error) {
        return authErrorResponse(error) || NextResponse.json({ success: false, error: "REVIEW_UPDATE_FAILED" }, { status: 500 });
    }
}
