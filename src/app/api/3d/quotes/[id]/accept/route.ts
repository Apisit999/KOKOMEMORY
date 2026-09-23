import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi, safeId } from "@/lib/customer-api-auth";

export const runtime = "nodejs";

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id);
        if (!id) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });

        const quoteRef = adminDb.collection("3dQuotes").doc(id);
        const orderRef = adminDb.collection("threeDOrders").doc();
        const paymentRef = adminDb.collection("threeDPayments").doc();
        const orderNumber = `3D-${Date.now()}`;
        const result = await adminDb.runTransaction(async (tx) => {
            const quote = await tx.get(quoteRef);
            if (!quote.exists || quote.data()?.userId !== user.uid) throw new Error("NOT_FOUND");

            const data = quote.data()!;
            if (data.status !== "quoted") throw new Error("QUOTE_NOT_READY");

            const quantity = Number(data.quantity);
            const subtotal = Number(data.subtotal);
            const shippingFee = Number(data.shippingFee || 0);
            const discount = Number(data.discount || 0);
            const total = Number(data.total);
            const values = [quantity, subtotal, shippingFee, discount, total];
            if (!Number.isInteger(quantity) || quantity < 1 || values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("QUOTE_PRICE_MISSING");
            if (discount > subtotal || roundMoney(subtotal + shippingFee - discount) !== roundMoney(total)) throw new Error("QUOTE_PRICE_INVALID");

            const item = {
                productName: "Custom 3D Printing",
                quantity,
                unitPrice: roundMoney(total / quantity),
                totalPrice: total,
                material: String(data.material || ""),
                color: String(data.color || ""),
                notes: String(data.customerNote || ""),
            };
            tx.create(orderRef, {
                orderNumber,
                userId: user.uid,
                quoteId: id,
                source: "custom_quote",
                customer: { name: "", phone: "", email: user.email || "" },
                items: [item],
                subtotal,
                discount,
                shippingFee,
                totalPrice: total,
                paidAmount: 0,
                remainingAmount: total,
                orderStatus: "pending_payment",
                paymentStatus: "unpaid",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            tx.create(paymentRef, {
                orderId: orderRef.id,
                quoteId: id,
                userId: user.uid,
                orderNumber,
                amount: total,
                currency: "THB",
                method: "bank_transfer",
                status: "unpaid",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            tx.update(quoteRef, { status: "converted", acceptedAt: FieldValue.serverTimestamp(), convertedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
            tx.create(adminDb.collection("auditLogs").doc(), { action: "3D_QUOTE_ACCEPTED", resource: "3dQuote", quoteId: id, orderId: orderRef.id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
            tx.create(adminDb.collection("auditLogs").doc(), { action: "3D_ORDER_CREATED", resource: "3dOrder", orderId: orderRef.id, quoteId: id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
            return { orderId: orderRef.id };
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const code = error instanceof Error ? error.message : "INTERNAL";
        const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "QUOTE_NOT_READY" || code === "QUOTE_PRICE_INVALID" ? 409 : 400;
        return NextResponse.json({ success: false, error: code }, { status });
    }
}
