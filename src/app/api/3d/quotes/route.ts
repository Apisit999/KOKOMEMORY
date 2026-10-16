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
    return { id, quoteNumber: String(data.quoteNumber || id), userId: String(data.userId || ""), status: data.status || "inquiry", files, material: String(data.material || ""), color: String(data.color || ""), quantity: Number(data.quantity || 1), deadline: data.deadline, customerNote: data.customerNote, adminNote: data.adminNote, contactName: data.contactName, contactPhone: data.contactPhone, companyName: data.companyName, taxId: data.taxId, useCase: data.useCase, colorDetails: data.colorDetails, finish: data.finish, dimensionsMm: data.dimensionsMm, subtotal: data.subtotal, shippingFee: data.shippingFee, discount: data.discount, total: data.total, validUntil: data.validUntil, createdAt: data.createdAt, updatedAt: data.updatedAt, quotedAt: data.quotedAt, acceptedAt: data.acceptedAt, rejectedAt: data.rejectedAt, convertedAt: data.convertedAt };
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
        if (!findThreeDQuoteMaterial(material) || !color || color.length > 120 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("INVALID_QUOTE");
        const contactName = typeof body.contactName === "string" ? body.contactName.trim().slice(0, 120) : "";
        const contactPhone = typeof body.contactPhone === "string" ? body.contactPhone.trim().slice(0, 40) : "";
        if (contactName.length < 2 || !/^[+\d][\d\s().-]{7,24}$/.test(contactPhone)) throw new Error("INVALID_CONTACT");
        const optionalText = (key: string, max: number) => typeof body[key] === "string" && body[key].trim() ? body[key].trim().slice(0, max) : undefined;
        const dimensions = body.dimensions && typeof body.dimensions === "object" && !Array.isArray(body.dimensions) ? body.dimensions as Record<string, unknown> : {};
        const dimension = (key: string) => { const raw = dimensions[key]; if (raw === undefined || raw === "") return undefined; const n = Number(raw); return Number.isFinite(n) && n > 0 && n <= 10000 ? n : undefined; };
        const dimensionsMm = Object.fromEntries(
            Object.entries({ x: dimension("x"), y: dimension("y"), z: dimension("z") }).filter(([, value]) => value !== undefined),
        );
        const ref = adminDb.collection(COLLECTION).doc();
        const count = (await adminDb.collection(COLLECTION).where("userId", "==", user.uid).get()).size + 1;
        const quoteNumber = `Q3D-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(count).padStart(3, "0")}`;
        const companyName = optionalText("companyName", 160);
        const taxId = optionalText("taxId", 30);
        const useCase = optionalText("useCase", 500);
        const colorDetails = optionalText("colorDetails", 500);
        const finish = optionalText("finish", 100);
        const payload = { quoteNumber, userId: user.uid, status: "inquiry", files: [], material, color, quantity, contactName, contactPhone, ...(companyName ? { companyName } : {}), ...(taxId ? { taxId } : {}), ...(useCase ? { useCase } : {}), ...(colorDetails ? { colorDetails } : {}), ...(finish ? { finish } : {}), ...(Object.keys(dimensionsMm).length ? { dimensionsMm } : {}), ...(typeof body.deadline === "string" && body.deadline.trim() ? { deadline: body.deadline.trim().slice(0, 20) } : {}), ...(typeof body.customerNote === "string" && body.customerNote.trim() ? { customerNote: body.customerNote.trim().slice(0, 1000) } : {}), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
        await ref.create(payload);
        await adminDb.collection("auditLogs").doc().create({ action: "3D_QUOTE_CREATED", resource: "3dQuote", quoteId: ref.id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, quote: publicQuote(ref.id, { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) }, { status: 201 });
    } catch (error) { return errorResponse(error); }
}
