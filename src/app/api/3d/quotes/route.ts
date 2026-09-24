import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi } from "@/lib/customer-api-auth";
import { findThreeDQuoteMaterial } from "@/lib/threeDQuoteOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "3dQuotes";

function errorResponse(error: unknown) {
    const code = error instanceof Error ? error.message : "INTERNAL";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ success: false, error: status >= 500 ? "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง" : code }, { status });
}

function publicQuote(id: string, data: FirebaseFirestore.DocumentData) {
    const files = Array.isArray(data.files) ? data.files.map((file: Record<string, unknown>) => ({
        id: String(file.id || ""), fileName: String(file.fileName || ""), contentType: String(file.contentType || ""), size: Number(file.size || 0), kind: file.kind === "reference" ? "reference" : "model",
    })) : [];
    return { id, quoteNumber: String(data.quoteNumber || id), userId: String(data.userId || ""), status: data.status || "inquiry", files, material: String(data.material || ""), color: String(data.color || ""), quantity: Number(data.quantity || 1), deadline: data.deadline, customerNote: data.customerNote, adminNote: data.adminNote, subtotal: data.subtotal, shippingFee: data.shippingFee, discount: data.discount, total: data.total, validUntil: data.validUntil, createdAt: data.createdAt, updatedAt: data.updatedAt, quotedAt: data.quotedAt, acceptedAt: data.acceptedAt, rejectedAt: data.rejectedAt, convertedAt: data.convertedAt };
}

export async function GET(request: Request) {
    try {
        const user = await requireCustomerApi(request);
        const snapshot = await adminDb.collection(COLLECTION).where("userId", "==", user.uid).get();
        const quotes = snapshot.docs.map((doc) => publicQuote(doc.id, doc.data())).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        return NextResponse.json({ success: true, quotes });
    } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
    try {
        const user = await requireCustomerApi(request);
        const body = await request.json() as Record<string, unknown>;
        const forbiddenFields = ["status", "price", "total", "subtotal", "shippingFee", "discount", "userId", "quoteId", "adminNote"];
        if (forbiddenFields.some((field) => Object.prototype.hasOwnProperty.call(body, field))) throw new Error("INVALID_QUOTE");
        const material = typeof body.material === "string" ? body.material.trim() : "";
        const color = typeof body.color === "string" ? body.color.trim() : "";
        const quantity = Math.floor(Number(body.quantity));
        if (!findThreeDQuoteMaterial(material) || !color || color.length > 60 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("INVALID_QUOTE");
        const ref = adminDb.collection(COLLECTION).doc();
        const count = (await adminDb.collection(COLLECTION).where("userId", "==", user.uid).get()).size + 1;
        const quoteNumber = `Q3D-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(count).padStart(3, "0")}`;
        const payload = { quoteNumber, userId: user.uid, status: "inquiry", files: [], material, color, quantity, ...(typeof body.deadline === "string" && body.deadline.trim() ? { deadline: body.deadline.trim() } : {}), ...(typeof body.customerNote === "string" && body.customerNote.trim() ? { customerNote: body.customerNote.trim().slice(0, 5000) } : {}), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
        await ref.create(payload);
        await adminDb.collection("auditLogs").doc().create({ action: "3D_QUOTE_CREATED", resource: "3dQuote", quoteId: ref.id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, quote: publicQuote(ref.id, { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) }, { status: 201 });
    } catch (error) { return errorResponse(error); }
}
