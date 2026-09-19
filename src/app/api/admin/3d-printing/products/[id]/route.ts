import { authErrorResponse } from "@/lib/api-error";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";
import { R2_BUCKET_NAME, r2 } from "@/lib/r2";
import {
    normalizeProduct,
    toFirestoreProduct,
} from "@/app/api/admin/3d-printing/products/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
    const message = error instanceof Error ? error.message : "INTERNAL";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "NOT_FOUND" ? 404 : 500;
    const errorText = status === 401 ? "กรุณาเข้าสู่ระบบ Admin ใหม่" : status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ Admin" : status === 404 ? "ไม่พบ Product นี้" : "ไม่สามารถจัดการ Product ได้";
    if (status === 500) console.error("3D product admin detail API error:", error);
    return NextResponse.json({ success: false, error: errorText }, { status });
}

async function deleteKeys(keys: string[]) {
    await Promise.all(keys.filter(Boolean).map((key) =>
        r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
    ));
}

export async function GET(request: Request, context: RouteContext) {
    try {
        await requireAdminApi(request);
        const { id } = await context.params;
        const snapshot = await adminDb.collection("threeDProducts").doc(id).get();
        if (!snapshot.exists) throw new Error("NOT_FOUND");
        return NextResponse.json({ success: true, product: normalizeProduct(id, snapshot.data() as Record<string, unknown>) });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdminApi(request);
        const { id } = await context.params;
        const reference = adminDb.collection("threeDProducts").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) throw new Error("NOT_FOUND");
        const body = await request.json();
        const { validateInput } = await import("@/app/api/admin/3d-printing/products/route");
        const input = validateInput(body);
        const previous = normalizeProduct(id, snapshot.data() as Record<string, unknown>);
        await reference.update({ ...toFirestoreProduct(input), updatedAt: FieldValue.serverTimestamp() });

        const nextKeys = new Set(input.images.map((image) => image.key).filter((key): key is string => Boolean(key)));
        if (input.modelFileKey) nextKeys.add(input.modelFileKey);
        const oldKeys = [
            ...previous.images.map((image) => image.key),
            previous.modelFileKey,
        ].filter((key): key is string => typeof key === "string" && !nextKeys.has(key));
        if (oldKeys.length) await deleteKeys(oldKeys);

        return NextResponse.json({ success: true });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        await requireAdminApi(request);
        const { id } = await context.params;
        const reference = adminDb.collection("threeDProducts").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) throw new Error("NOT_FOUND");
        const product = normalizeProduct(id, snapshot.data() as Record<string, unknown>);
        await reference.delete();
        const keys = [...product.images.map((image) => image.key), product.modelFileKey]
            .filter((key): key is string => Boolean(key));
        if (keys.length) await deleteKeys(keys);
        return NextResponse.json({ success: true });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}
