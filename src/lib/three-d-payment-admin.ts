import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export async function transitionThreeDPayment(paymentId: string, nextStatus: "verified" | "rejected", adminUid: string, rejectReason?: string) {
    const paymentRef = adminDb.collection("threeDPayments").doc(paymentId);
    let orderId = "";
    await adminDb.runTransaction(async (tx) => {
        const paymentSnap = await tx.get(paymentRef);
        if (!paymentSnap.exists) throw new Error("PAYMENT_NOT_FOUND");
        const payment = paymentSnap.data() || {};
        if (payment.status !== "submitted") throw new Error("PAYMENT_INVALID_TRANSITION");
        orderId = typeof payment.orderId === "string" ? payment.orderId : "";
        if (!orderId || typeof payment.userId !== "string") throw new Error("PAYMENT_RELATION_INVALID");
        const orderRef = adminDb.collection("threeDOrders").doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) throw new Error("ORDER_NOT_FOUND");
        const order = orderSnap.data() || {};
        if (payment.orderId !== orderRef.id || payment.userId !== order.userId) throw new Error("PAYMENT_RELATION_INVALID");
        const amount = Number(payment.amount);
        const total = Number(order.totalPrice);
        if (!Number.isFinite(amount) || !Number.isFinite(total) || amount !== total) throw new Error("PAYMENT_AMOUNT_MISMATCH");
        if (nextStatus === "verified" && order.paymentStatus === "paid") throw new Error("ORDER_ALREADY_PAID");
        if (nextStatus === "rejected" && !rejectReason?.trim()) throw new Error("REJECT_REASON_REQUIRED");

        const now = FieldValue.serverTimestamp();
        const paymentUpdate: Record<string, unknown> = { status: nextStatus, updatedAt: now };
        if (nextStatus === "verified") {
            paymentUpdate.verifiedAt = now;
            paymentUpdate.verifiedBy = adminUid;
            tx.update(orderRef, { paymentStatus: "paid", paidAmount: total, remainingAmount: 0, orderStatus: order.orderStatus === "pending_payment" ? "queued" : order.orderStatus, updatedAt: now });
            if (order.orderStatus === "pending_payment") {
                tx.set(adminDb.collection("auditLogs").doc(), { action: "3d_order_queued", resource: "3dOrder", orderId, actorUid: adminUid, previousStatus: "pending_payment", status: "queued", createdAt: now });
            }
        } else {
            paymentUpdate.rejectedAt = now;
            paymentUpdate.rejectedBy = adminUid;
            paymentUpdate.rejectReason = rejectReason!.trim().slice(0, 500);
            tx.update(orderRef, { paymentStatus: "unpaid", orderStatus: "pending_payment", updatedAt: now });
        }
        tx.update(paymentRef, paymentUpdate);
        tx.set(adminDb.collection("auditLogs").doc(), { action: nextStatus === "verified" ? "3d_payment_verified" : "3d_payment_rejected", resource: "3dPayment", paymentId, orderId, adminUid, ...(nextStatus === "rejected" ? { rejectReason: rejectReason!.trim().slice(0, 500) } : {}), amount, createdAt: now });
    });
    return { paymentId, orderId, status: nextStatus };
}
