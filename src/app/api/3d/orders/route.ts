import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi } from "@/lib/customer-api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) { try { const user = await requireCustomerApi(request); const snapshot = await adminDb.collection("threeDOrders").where("userId", "==", user.uid).get(); return NextResponse.json({ success: true, orders: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) }); } catch (error) { const code = error instanceof Error ? error.message : "INTERNAL"; return NextResponse.json({ success: false, error: code }, { status: code === "UNAUTHORIZED" ? 401 : 400 }); } }

export async function POST(request: Request) {
    try {
        const user = await requireCustomerApi(request); const body = await request.json() as Record<string, unknown>; const productId = typeof body.productId === "string" ? body.productId.trim() : ""; const quantity = Math.floor(Number(body.quantity)); if (!/^[A-Za-z0-9_-]{1,128}$/.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("INVALID_ORDER");
        const productRef = adminDb.collection("threeDProducts").doc(productId); const orderRef = adminDb.collection("threeDOrders").doc(); const sequenceRef = adminDb.collection("threeDOrderSequences").doc(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
        const result = await adminDb.runTransaction(async (tx) => { const product = await tx.get(productRef); if (!product.exists || product.data()?.status !== "active") throw new Error("PRODUCT_NOT_FOUND"); const p = product.data()!; const price = Number(p.price); if (!Number.isFinite(price) || price < 0) throw new Error("INVALID_PRODUCT"); const sequence = await tx.get(sequenceRef); const next = Number(sequence.data()?.value || 0) + 1; const orderNumber = `3D-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(next).padStart(3, "0")}`; const subtotal = Math.round(price * quantity * 100) / 100; const customer = { name: user.name || "", phone: "", email: user.email || "" }; const item = { productId, productName: String(p.name || ""), quantity, unitPrice: price, totalPrice: subtotal, material: String(p.material || "") }; const order = { orderNumber, userId: user.uid, source: "product", customer, items: [item], subtotal, discount: 0, shippingFee: 0, totalPrice: subtotal, paidAmount: 0, remainingAmount: subtotal, orderStatus: "waiting_payment", paymentStatus: "unpaid", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }; tx.set(sequenceRef, { value: next, updatedAt: FieldValue.serverTimestamp() }); tx.create(orderRef, order); tx.create(adminDb.collection("auditLogs").doc(), { action: "3D_ORDER_CREATED", resource: "3dOrder", orderId: orderRef.id, userId: user.uid, createdAt: FieldValue.serverTimestamp() }); return { id: orderRef.id, orderNumber }; });
        return NextResponse.json({ success: true, order: result }, { status: 201 });
    } catch (error) { const code = error instanceof Error ? error.message : "INTERNAL"; return NextResponse.json({ success: false, error: code }, { status: code === "UNAUTHORIZED" ? 401 : 400 }); }
}
