import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-error";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";
import { transitionThreeDPayment } from "@/lib/three-d-payment-admin";

function normalize(id: string, data: FirebaseFirestore.DocumentData) {
    return { id, orderId: String(data.orderId || ""), orderNumber: String(data.orderNumber || ""), userId: data.userId, quoteId: data.quoteId, amount: Number(data.amount) || 0, currency: String(data.currency || "THB"), method: data.method, status: data.status, proof: data.proof ? { fileName: data.proof.fileName, contentType: data.proof.contentType, size: Number(data.proof.size) || 0 } : undefined, reference: data.reference, note: data.note, rejectReason: data.rejectReason, submittedAt: data.submittedAt, verifiedAt: data.verifiedAt, rejectedAt: data.rejectedAt, createdAt: data.createdAt, updatedAt: data.updatedAt };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await requireAdminApi(request); const { id } = await context.params; const snap = await adminDb.collection("threeDPayments").doc(id).get();
        if (!snap.exists) return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
        const payment = snap.data() || {}; const orderId = String(payment.orderId || ""); const orderSnap = await adminDb.collection("threeDOrders").doc(orderId).get();
        if (!orderSnap.exists || orderSnap.data()?.userId !== payment.userId) return NextResponse.json({ error: "PAYMENT_RELATION_INVALID" }, { status: 409 });
        const order = orderSnap.data() || {}; let quoteNumber: string | undefined;
        if (typeof payment.quoteId === "string") { const quote = await adminDb.collection("3dQuotes").doc(payment.quoteId).get(); if (quote.exists) quoteNumber = quote.data()?.quoteNumber; }
        return NextResponse.json({ payment: normalize(snap.id, payment), order: { id: orderSnap.id, orderNumber: order.orderNumber, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, totalPrice: Number(order.totalPrice) || 0, userId: order.userId, customer: order.customer || null }, quoteNumber });
    } catch (error) { const denied = authErrorResponse(error); if (denied) return denied; return NextResponse.json({ error: error instanceof Error ? error.message : "PAYMENT_DETAIL_FAILED" }, { status: 500 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdminApi(request); const { id } = await context.params; const body = await request.json() as { status?: string; rejectReason?: string };
        if (body.status === "verified" || body.status === "rejected") {
            const result = await transitionThreeDPayment(id, body.status, admin.uid, body.rejectReason);
            return NextResponse.json({ success: true, ...result });
        }
        return NextResponse.json({ error: "PAYMENT_INVALID_TRANSITION", code: "PAYMENT_INVALID_TRANSITION" }, { status: 409 });
    } catch (error) { const denied = authErrorResponse(error); if (denied) return denied; const code = error instanceof Error ? error.message : "PAYMENT_UPDATE_FAILED"; const status = code === "PAYMENT_NOT_FOUND" || code === "ORDER_NOT_FOUND" ? 404 : 409; return NextResponse.json({ error: code, code }, { status }); }
}
