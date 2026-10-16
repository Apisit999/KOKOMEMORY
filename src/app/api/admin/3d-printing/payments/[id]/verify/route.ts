import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { transitionThreeDPayment } from "@/lib/three-d-payment-admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdminApi(request);
        const { id } = await context.params;
        const result = await transitionThreeDPayment(id, "verified", admin.uid);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const denied = authErrorResponse(error); if (denied) return denied;
        const code = error instanceof Error ? error.message : "PAYMENT_VERIFY_FAILED";
        const status = code === "PAYMENT_NOT_FOUND" || code === "ORDER_NOT_FOUND" ? 404 : ["PAYMENT_INVALID_TRANSITION", "PAYMENT_RELATION_INVALID", "PAYMENT_AMOUNT_MISMATCH", "ORDER_ALREADY_PAID"].includes(code) ? 409 : 400;
        return NextResponse.json({ error: code, code }, { status });
    }
}
