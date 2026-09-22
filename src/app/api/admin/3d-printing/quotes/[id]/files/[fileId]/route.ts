import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateBucket() {
    const value = process.env.R2_PRIVATE_BUCKET_NAME?.trim();
    if (!value) throw new Error("R2_PRIVATE_BUCKET_NOT_CONFIGURED");
    return value;
}

function safeName(value: unknown) {
    const name = typeof value === "string" && value.trim() ? value.trim() : "file";
    return name.replace(/[\\\r\n\"\\]/g, "_").slice(0, 180);
}

export async function GET(request: Request, context: { params: Promise<{ id: string; fileId: string }> }) {
    try {
        await requireAdminApi(request);
        const { id, fileId } = await context.params;
        const snap = await adminDb.collection("3dQuotes").doc(id).get();
        if (!snap.exists) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
        const data = snap.data()!;
        const file = Array.isArray(data.files) ? data.files.find((item: Record<string, unknown>) => item.id === fileId) as Record<string, unknown> | undefined : undefined;
        const key = file?.key;
        if (!file || typeof key !== "string" || !key.startsWith(`3d-quotes/${id}/`) || key.includes("..")) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
        const bucket = privateBucket();
        try { await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); } catch { return NextResponse.json({ success: false, error: "FILE_NOT_FOUND" }, { status: 404 }); }
        const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!result.Body) return NextResponse.json({ success: false, error: "FILE_NOT_FOUND" }, { status: 404 });
        const body = Buffer.from(await result.Body.transformToByteArray());
        return new NextResponse(body, { headers: { "Content-Type": String(file.contentType || "application/octet-stream"), "Content-Disposition": `attachment; filename="${safeName(file.fileName)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        const code = error instanceof Error ? error.message : "DOWNLOAD_FAILED";
        return NextResponse.json({ success: false, error: code }, { status: code === "R2_PRIVATE_BUCKET_NOT_CONFIGURED" ? 503 : 500 });
    }
}
