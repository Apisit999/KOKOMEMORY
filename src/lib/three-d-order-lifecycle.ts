import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type LifecycleAction = "start" | "complete-production" | "quality-approve" | "ship" | "complete";

const transitions: Record<LifecycleAction, { from: string; to?: string; audit: string }> = {
    start: { from: "queued", to: "printing", audit: "3d_order_started" },
    "complete-production": { from: "printing", to: "quality_check", audit: "3d_order_sent_to_quality_check" },
    "quality-approve": { from: "quality_check", to: "ready", audit: "3d_order_quality_approved" },
    ship: { from: "ready", to: "shipping", audit: "3d_order_shipped" },
    complete: { from: "shipping", to: "completed", audit: "3d_order_completed" },
};

export function canTransitionOrderStatus(current: string, next: string) {
    return Object.values(transitions).some((item) => item.from === current && item.to === next);
}

export async function transitionThreeDOrder(orderId: string, action: LifecycleAction, actorUid: string, metadata: Record<string, unknown> = {}) {
    const policy = transitions[action];
    if (!policy) throw new Error("INVALID_ORDER_ACTION");
    const orderRef = adminDb.collection("threeDOrders").doc(orderId);
    await adminDb.runTransaction(async (tx) => {
        const snapshot = await tx.get(orderRef);
        if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");
        const order = snapshot.data() || {};
        if (order.orderStatus !== policy.from) throw new Error("INVALID_ORDER_TRANSITION");
        if (action === "ship" && (!String(metadata.carrier || "").trim() || !String(metadata.trackingNumber || "").trim())) throw new Error("SHIPPING_DETAILS_REQUIRED");
        const now = FieldValue.serverTimestamp();
        const update: Record<string, unknown> = { updatedAt: now };
        if (policy.to) update.orderStatus = policy.to;
        if (action === "start") update.startedAt = now;
        if (action === "complete-production") update.productionCompletedAt = now;
        if (action === "quality-approve") { update.qualityCheckedAt = now; update.qualityCheckedBy = actorUid; }
        if (action === "ship") { update.shippedAt = now; update.shippedBy = actorUid; update.carrier = String(metadata.carrier).trim().slice(0, 100); update.trackingNumber = String(metadata.trackingNumber).trim().slice(0, 200); }
        if (action === "complete") { update.completedAt = now; update.completedBy = actorUid; }
        tx.update(orderRef, update);
        tx.create(adminDb.collection("auditLogs").doc(), { action: policy.audit, resource: "3dOrder", orderId, actorUid, previousStatus: policy.from, ...(policy.to ? { status: policy.to } : {}), ...(action === "ship" ? { carrier: update.carrier, trackingNumber: update.trackingNumber } : {}), createdAt: now });
    });
    return { orderId, status: policy.to || "quality_check" };
}
