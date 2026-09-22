import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdminApi(request);
        const { id } = await context.params;
        const ref = adminDb.collection("threeDOrders").doc(id);
        await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) throw new Error("NOT_FOUND");
            if (snap.data()?.isArchived !== true) throw new Error("ORDER_NOT_ARCHIVED");
            tx.update(ref, { isArchived: false, archivedAt: null, archivedBy: null, updatedAt: FieldValue.serverTimestamp() });
            tx.create(adminDb.collection("auditLogs").doc(), { action: "3d_order_restored", resource: "3dOrder", orderId: id, adminUid: admin.uid, createdAt: FieldValue.serverTimestamp() });
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        const denied = authErrorResponse(error); if (denied) return denied;
        const code = error instanceof Error ? error.message : "RESTORE_FAILED";
        const status = code === "NOT_FOUND" ? 404 : code === "ORDER_NOT_ARCHIVED" ? 409 : 500;
        return NextResponse.json({ success: false, error: code, code }, { status });
    }
}
