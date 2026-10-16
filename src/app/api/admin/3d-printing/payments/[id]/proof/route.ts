import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await requireAdminApi(request); const { id } = await context.params;
        const snap = await adminDb.collection("threeDPayments").doc(id).get(); if (!snap.exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
        const data = snap.data() || {}; const proof = data.proof as Record<string, unknown> | undefined; const key = proof?.key; const orderId = String(data.orderId || "");
        const expectedPrefix = `3d-payments/${orderId}/${id}/`;
        if (typeof key !== "string" || (!key.startsWith(expectedPrefix) && !key.startsWith(`3d-payments/${orderId}/`)) || key.includes("..") || !orderId) return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
        const order = await adminDb.collection("threeDOrders").doc(orderId).get();
        if (!order.exists || order.data()?.userId !== data.userId) return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
        const bucket = process.env.R2_PRIVATE_BUCKET_NAME?.trim(); if (!bucket) return NextResponse.json({ error: "R2_PRIVATE_BUCKET_NOT_CONFIGURED" }, { status: 503 });
        const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key })); if (!result.Body) return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
        return new NextResponse(Buffer.from(await result.Body.transformToByteArray()), { headers: { "Content-Type": String(proof?.contentType || "application/octet-stream"), "Content-Disposition": `inline; filename="${String(proof?.fileName || "proof").replace(/[\"\r\n\\/]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (error) { const denied = authErrorResponse(error); if (denied) return denied; const code = error instanceof Error ? error.message : "PROOF_DOWNLOAD_FAILED"; return NextResponse.json({ error: code }, { status: code === "R2_PRIVATE_BUCKET_NOT_CONFIGURED" ? 503 : 404 }); }
}
