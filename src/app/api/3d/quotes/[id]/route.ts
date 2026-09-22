import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isAdminToken, requireCustomerApi, safeId } from "@/lib/customer-api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(error: unknown) {
    const code = error instanceof Error ? error.message : "INTERNAL";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "QUOTE_LOCKED" ? 409 : 400;
    return NextResponse.json({ success: false, error: code }, { status });
}

function normalize(id: string, data: FirebaseFirestore.DocumentData) {
    return {
        id,
        quoteNumber: String(data.quoteNumber || id),
        userId: String(data.userId || ""),
        status: data.status || "inquiry",
        files: Array.isArray(data.files) ? data.files.map((file: Record<string, unknown>) => ({ id: String(file.id || ""), fileName: String(file.fileName || ""), contentType: String(file.contentType || ""), size: Number(file.size || 0), kind: file.kind === "reference" ? "reference" : "model" })) : [],
        material: data.material || "",
        color: data.color || "",
        quantity: Number(data.quantity || 1),
        deadline: data.deadline,
        customerNote: data.customerNote,
        adminNote: data.adminNote,
        subtotal: data.subtotal,
        shippingFee: data.shippingFee,
        discount: data.discount,
        total: data.total,
        validUntil: data.validUntil,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        quotedAt: data.quotedAt,
        acceptedAt: data.acceptedAt,
        rejectedAt: data.rejectedAt,
        convertedAt: data.convertedAt,
    };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id);
        if (!id) throw new Error("NOT_FOUND");
        const snap = await adminDb.collection("3dQuotes").doc(id).get();
        if (!snap.exists) throw new Error("NOT_FOUND");
        const data = snap.data()!;
        if (data.userId !== user.uid && !isAdminToken(user)) throw new Error("FORBIDDEN");
        return NextResponse.json({ success: true, quote: normalize(id, data) });
    } catch (error) { return response(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id);
        if (!id) throw new Error("NOT_FOUND");
        const ref = adminDb.collection("3dQuotes").doc(id);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
        if (snap.data()?.status !== "inquiry") throw new Error("QUOTE_LOCKED");

        const body = await request.json() as Record<string, unknown>;
        const forbidden = ["status", "price", "total", "subtotal", "shippingFee", "discount", "userId", "quoteId", "adminNote"];
        if (forbidden.some((key) => Object.prototype.hasOwnProperty.call(body, key))) throw new Error("INVALID_FIELD");

        const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
        if (typeof body.deadline === "string") updates.deadline = body.deadline.trim().slice(0, 100);
        if (typeof body.customerNote === "string") updates.customerNote = body.customerNote.trim().slice(0, 5000);
        if (typeof body.material === "string" && body.material.trim()) updates.material = body.material.trim().slice(0, 100);
        if (typeof body.color === "string" && body.color.trim()) updates.color = body.color.trim().slice(0, 100);
        if (Object.prototype.hasOwnProperty.call(body, "quantity")) {
            if (!Number.isInteger(body.quantity) || Number(body.quantity) < 1 || Number(body.quantity) > 10000) throw new Error("INVALID_QUANTITY");
            updates.quantity = Number(body.quantity);
        }
        await ref.update(updates);
        await adminDb.collection("auditLogs").doc().create({ action: "3D_QUOTE_UPDATED", resource: "3dQuote", quoteId: id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
        const next = await ref.get();
        return NextResponse.json({ success: true, quote: normalize(id, next.data()!) });
    } catch (error) { return response(error); }
}
