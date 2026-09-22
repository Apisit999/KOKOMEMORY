import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { adminAuth } from "@/lib/firebase-admin";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "3dQuotes";

function privateBucket() {
    const value = process.env.R2_PRIVATE_BUCKET_NAME?.trim();
    if (!value) throw new Error("R2_PRIVATE_BUCKET_NOT_CONFIGURED");
    return value;
}

function safeFile(file: Record<string, unknown>) {
    return {
        id: String(file.id || ""),
        fileName: String(file.fileName || "file"),
        contentType: String(file.contentType || "application/octet-stream"),
        size: Number(file.size || 0),
        kind: file.kind === "reference" ? "reference" : "model",
        uploadedAt: file.uploadedAt || null,
        availability: typeof file.key === "string" ? "stored" : "metadata_missing",
    };
}

function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
}

function readMoney(value: unknown) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? roundMoney(number) : null;
}

function validatePricing(pricing: { subtotal: number; shippingFee: number; discount: number; total: number }) {
    if (pricing.discount > pricing.subtotal || roundMoney(pricing.subtotal + pricing.shippingFee - pricing.discount) !== roundMoney(pricing.total)) throw new Error("INVALID_PRICING");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await requireAdminApi(request);
        const id = (await context.params).id;
        const snap = await adminDb.collection(COLLECTION).doc(id).get();
        if (!snap.exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        const data = snap.data()!;
        let customer: Record<string, unknown> | null = null;
        if (typeof data.userId === "string" && data.userId) {
            try {
                const user = await adminAuth.getUser(data.userId);
                customer = { userId: user.uid, displayName: user.displayName || null, email: user.email || null, phoneNumber: user.phoneNumber || null, photoURL: user.photoURL || null };
            } catch { customer = { userId: data.userId }; }
        }
        return NextResponse.json({ success: true, quote: { id, ...data, customer, files: Array.isArray(data.files) ? data.files.map(safeFile) : [] } });
    } catch (error) {
        const denied = authErrorResponse(error);
        return denied || NextResponse.json({ error: "ADMIN_ERROR" }, { status: 400 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdminApi(request);
        const id = (await context.params).id;
        const ref = adminDb.collection(COLLECTION).doc(id);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
        const data = snap.data()!;
        const deletable = new Set(["inquiry", "rejected", "expired"]);
        if (!deletable.has(String(data.status || ""))) return NextResponse.json({ success: false, error: "QUOTE_HAS_DEPENDENCIES", code: "QUOTE_HAS_DEPENDENCIES" }, { status: 409 });

        const [orders, payments] = await Promise.all([
            adminDb.collection("threeDOrders").where("quoteId", "==", id).limit(1).get(),
            adminDb.collection("threeDPayments").where("quoteId", "==", id).limit(1).get(),
        ]);
        if (!orders.empty || !payments.empty) return NextResponse.json({ success: false, error: "QUOTE_HAS_DEPENDENCIES", code: "QUOTE_HAS_DEPENDENCIES" }, { status: 409 });

        const files = Array.isArray(data.files) ? data.files as Record<string, unknown>[] : [];
        const bucket = privateBucket();
        for (const file of files) {
            const key = file.key;
            if (typeof key !== "string" || !key.startsWith(`3d-quotes/${id}/`) || key.includes("..")) throw new Error("FILE_METADATA_INVALID");
        }
        for (const file of files) await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.key as string }));

        await adminDb.runTransaction(async (tx) => {
            const current = await tx.get(ref);
            if (!current.exists) throw new Error("NOT_FOUND");
            const currentData = current.data()!;
            if (!deletable.has(String(currentData.status || ""))) throw new Error("QUOTE_HAS_DEPENDENCIES");
            tx.delete(ref);
            tx.create(adminDb.collection("auditLogs").doc(), { action: "3d_quote_deleted", resource: "3dQuote", quoteId: id, quoteNumber: String(currentData.quoteNumber || id), adminUid: admin.uid, deletedFileCount: files.length, createdAt: FieldValue.serverTimestamp() });
        });
        return NextResponse.json({ success: true, deletedFileCount: files.length });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        const code = error instanceof Error ? error.message : "ADMIN_ERROR";
        const status = code === "NOT_FOUND" ? 404 : code === "QUOTE_HAS_DEPENDENCIES" ? 409 : code === "R2_PRIVATE_BUCKET_NOT_CONFIGURED" ? 503 : code === "FILE_METADATA_INVALID" ? 409 : 500;
        return NextResponse.json({ success: false, error: code }, { status });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdminApi(request);
        const id = (await context.params).id;
        const ref = adminDb.collection("3dQuotes").doc(id);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

        const body = await request.json() as Record<string, unknown>;
        const status = typeof body.status === "string" ? body.status : undefined;
        const allowed = ["inquiry", "quoted", "accepted", "rejected", "expired", "converted"];
        if (status && !allowed.includes(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });

        const current = snap.data()!;
        const priceKeys = ["subtotal", "shippingFee", "discount", "total"] as const;
        const pricing = {
            subtotal: Number(current.subtotal || 0),
            shippingFee: Number(current.shippingFee || 0),
            discount: Number(current.discount || 0),
            total: Number(current.total),
        };
        for (const key of priceKeys) {
            if (body[key] === undefined) continue;
            const value = readMoney(body[key]);
            if (value === null) return NextResponse.json({ error: "INVALID_PRICING" }, { status: 400 });
            pricing[key] = value;
        }
        if (status === "quoted" || priceKeys.some((key) => body[key] !== undefined)) validatePricing(pricing);

        const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
        if (status) {
            updates.status = status;
            if (status === "quoted") updates.quotedAt = FieldValue.serverTimestamp();
        }
        for (const key of ["adminNote", "validUntil"]) if (typeof body[key] === "string") updates[key] = body[key].trim().slice(0, 5000);
        for (const key of priceKeys) if (body[key] !== undefined) updates[key] = pricing[key];
        await ref.update(updates);

        const action = status === "quoted" ? "3D_QUOTE_QUOTED" : "3D_QUOTE_UPDATED";
        await adminDb.collection("auditLogs").doc().create({ action, resource: "3dQuote", quoteId: id, adminUid: admin.uid, createdAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true });
    } catch (error) {
        const denied = authErrorResponse(error);
        return denied || NextResponse.json({ error: error instanceof Error ? error.message : "ADMIN_ERROR" }, { status: 400 });
    }
}
