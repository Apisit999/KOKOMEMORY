import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi, safeId } from "@/lib/customer-api-auth";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";
const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function privateBucket() {
    const value = process.env.R2_PRIVATE_BUCKET_NAME?.trim();
    if (!value) throw new Error("R2_PRIVATE_BUCKET_NOT_CONFIGURED");
    return value;
}

function safeFileName(name: string) {
    return name.replace(/[\\/\r\n]/g, "_").slice(0, 160) || "payment-proof";
}

function timestampMillis(value: unknown) {
    if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
    if (value && typeof value === "object" && "_seconds" in value) return Number(value._seconds) * 1000;
    return new Date(String(value || 0)).getTime() || 0;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    let bucket = "";
    let key = "";
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id);
        if (!id) throw new Error("NOT_FOUND");
        const form = await request.formData();
        const proof = form.get("proof");
        if (!(proof instanceof File) || proof.size <= 0 || proof.size > MAX_PROOF_SIZE) throw new Error("INVALID_PROOF");
        const extension = proof.name.toLowerCase().split(".").pop() || "";
        if (!IMAGE_EXTENSIONS.has(extension) || !IMAGE_TYPES.has(proof.type)) throw new Error("INVALID_PROOF_TYPE");

        const orderRef = adminDb.collection("threeDOrders").doc(id);
        const orderSnapshot = await orderRef.get();
        if (!orderSnapshot.exists || orderSnapshot.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
        if (orderSnapshot.data()?.orderStatus !== "pending_payment" || orderSnapshot.data()?.paymentStatus === "paid") throw new Error("PAYMENT_NOT_ALLOWED");

        const paymentRef = adminDb.collection("threeDPayments").doc();
        const fileName = safeFileName(proof.name);
        key = `3d-payments/${id}/${paymentRef.id}/${crypto.randomUUID()}-${fileName}`;
        bucket = privateBucket();
        await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await proof.arrayBuffer()), ContentType: proof.type, CacheControl: "private, no-store" }));

        try {
            await adminDb.runTransaction(async (transaction) => {
                const latestOrder = await transaction.get(orderRef);
                if (!latestOrder.exists || latestOrder.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
                const current = latestOrder.data() || {};
                if (current.orderStatus !== "pending_payment" || current.paymentStatus === "paid") throw new Error("PAYMENT_NOT_ALLOWED");
                const payments = await transaction.get(adminDb.collection("threeDPayments").where("orderId", "==", id));
                if (payments.docs.some((doc) => ["submitted", "pending_verification", "verified"].includes(String(doc.data().status)))) throw new Error("PAYMENT_ALREADY_SUBMITTED");
                const amount = Number(current.totalPrice);
                if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_ORDER_TOTAL");
                transaction.create(paymentRef, {
                    orderId: id,
                    quoteId: typeof current.quoteId === "string" ? current.quoteId : null,
                    userId: user.uid,
                    orderNumber: String(current.orderNumber || id),
                    amount,
                    currency: "THB",
                    method: "bank_transfer",
                    status: "submitted",
                    proof: { fileName, contentType: proof.type, size: proof.size, key },
                    submittedAt: FieldValue.serverTimestamp(),
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                transaction.set(adminDb.collection("auditLogs").doc(), { action: "3d_payment_submitted", resource: "3dPayment", paymentId: paymentRef.id, orderId: id, userId: user.uid, amount, createdAt: FieldValue.serverTimestamp() });
            });
        } catch (error) {
            await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
            throw error;
        }
        return NextResponse.json({ success: true, paymentId: paymentRef.id, status: "submitted" }, { status: 201 });
    } catch (error) {
        const code = error instanceof Error ? error.message : "PAYMENT_SUBMIT_FAILED";
        const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : ["PAYMENT_NOT_ALLOWED", "PAYMENT_ALREADY_SUBMITTED"].includes(code) ? 409 : code === "R2_PRIVATE_BUCKET_NOT_CONFIGURED" ? 503 : 400;
        return NextResponse.json({ success: false, error: code }, { status });
    }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id);
        if (!id) throw new Error("NOT_FOUND");
        const order = await adminDb.collection("threeDOrders").doc(id).get();
        if (!order.exists || order.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
        const snapshot = await adminDb.collection("threeDPayments").where("orderId", "==", id).get();
        const payments = snapshot.docs.sort((a, b) => timestampMillis(b.data().createdAt) - timestampMillis(a.data().createdAt));
        const latest = payments[0];
        if (!latest) return NextResponse.json({ payment: null });
        const data = latest.data();
        return NextResponse.json({ payment: { id: latest.id, status: data.status, amount: Number(data.amount) || 0, currency: data.currency || "THB", method: data.method, proof: data.proof ? { fileName: data.proof.fileName, contentType: data.proof.contentType, size: Number(data.proof.size) || 0 } : undefined, rejectReason: typeof data.rejectReason === "string" ? data.rejectReason : undefined, createdAt: data.createdAt, submittedAt: data.submittedAt, verifiedAt: data.verifiedAt, rejectedAt: data.rejectedAt } });
    } catch (error) {
        const code = error instanceof Error ? error.message : "PAYMENT_LOOKUP_FAILED";
        return NextResponse.json({ error: code }, { status: code === "UNAUTHORIZED" ? 401 : 404 });
    }
}
