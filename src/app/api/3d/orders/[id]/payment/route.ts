import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi, safeId } from "@/lib/customer-api-auth";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";

function privateBucket() { const value = process.env.R2_PRIVATE_BUCKET_NAME?.trim(); if (!value) throw new Error("R2_PRIVATE_BUCKET_NOT_CONFIGURED"); return value; }

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id); if (!id) throw new Error("NOT_FOUND");
        const form = await request.formData(); const proof = form.get("proof");
        if (!(proof instanceof File) || proof.size <= 0 || proof.size > 10 * 1024 * 1024) throw new Error("INVALID_PROOF");
        const extension = proof.name.toLowerCase().split(".").pop() || "";
        const allowed = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
        if (!allowed.has(extension) || (proof.type && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(proof.type))) throw new Error("INVALID_PROOF_TYPE");
        const orderRef = adminDb.collection("threeDOrders").doc(id);
        const orderSnap = await orderRef.get(); if (!orderSnap.exists || orderSnap.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
        const order = orderSnap.data()!;
        if (order.orderStatus !== "pending_payment" || order.paymentStatus === "paid") throw new Error("PAYMENT_NOT_ALLOWED");
        const existing = await adminDb.collection("threeDPayments").where("orderId", "==", id).get();
        if (existing.docs.some((doc) => ["submitted", "pending_verification", "verified"].includes(String(doc.data().status)))) throw new Error("PAYMENT_ALREADY_SUBMITTED");
        const fileId = randomUUID(); const safeName = proof.name.replace(/[\\/\r\n]/g, "_").slice(0, 160); const key = `3d-payments/${id}/${fileId}-${safeName}`; const bucket = privateBucket();
        await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await proof.arrayBuffer()), ContentType: proof.type || "application/octet-stream", CacheControl: "private, no-store" }));
        const paymentRef = adminDb.collection("threeDPayments").doc();
        try {
            await adminDb.runTransaction(async (tx) => {
                const latest = await tx.get(orderRef); if (!latest.exists || latest.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
                const current = latest.data()!; if (current.orderStatus !== "pending_payment" || current.paymentStatus === "paid") throw new Error("PAYMENT_NOT_ALLOWED");
                tx.create(paymentRef, { orderId: id, quoteId: current.quoteId || null, userId: user.uid, orderNumber: current.orderNumber || id, amount: Number(current.totalPrice) || 0, status: "submitted", proof: { fileName: safeName, contentType: proof.type || "application/octet-stream", size: proof.size, key }, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
                tx.set(adminDb.collection("auditLogs").doc(), { action: "3d_payment_submitted", resource: "3dPayment", paymentId: paymentRef.id, orderId: id, userId: user.uid, amount: Number(current.totalPrice) || 0, createdAt: FieldValue.serverTimestamp() });
            });
        } catch (error) {
            try { const { DeleteObjectCommand } = await import("@aws-sdk/client-s3"); await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); } catch { /* preserve safe failure; object is private and unreferenced */ }
            throw error;
        }
        return NextResponse.json({ success: true, paymentId: paymentRef.id }, { status: 201 });
    } catch (error) {
        const code = error instanceof Error ? error.message : "PAYMENT_SUBMIT_FAILED";
        const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : ["PAYMENT_NOT_ALLOWED", "PAYMENT_ALREADY_SUBMITTED"].includes(code) ? 409 : code === "R2_PRIVATE_BUCKET_NOT_CONFIGURED" ? 503 : 400;
        return NextResponse.json({ success: false, error: code }, { status });
    }
}
