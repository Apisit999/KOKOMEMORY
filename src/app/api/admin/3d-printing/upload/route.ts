import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import { R2_BUCKET_NAME, getR2PublicUrl, r2 } from "@/lib/r2";

export const runtime = "nodejs";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const modelExtensions = new Set(["stl", "obj", "3mf", "zip"]);
const maxImageSize = 10 * 1024 * 1024;
const maxModelSize = 100 * 1024 * 1024;

function safeFilename(value: string) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function errorResponse(error: unknown) {
    const message = error instanceof Error ? error.message : "INTERNAL";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message.startsWith("INVALID") ? 400 : 500;
    const errorText = status === 401 ? "กรุณาเข้าสู่ระบบ Admin ใหม่" : status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ Admin" : status === 400 ? "ไฟล์ไม่ถูกต้องหรือมีขนาดใหญ่เกินไป" : "ไม่สามารถอัปโหลดไฟล์ได้";
    if (status === 500) console.error("3D upload API error:", error);
    return NextResponse.json({ success: false, error: errorText }, { status });
}

export async function POST(request: Request) {
    let key = "";
    try {
        const user = await requireAdminApi(request);
        const formData = await request.formData();
        const file = formData.get("file");
        const kind = formData.get("kind") === "model" ? "model" : "image";
        const productId = formData.get("productId");

        if (typeof productId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
            throw new Error("INVALID_PRODUCT_ID");
        }

        if (!(file instanceof File) || !file.size) throw new Error("INVALID_FILE");
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        if (kind === "image" && (!imageTypes.has(file.type) || file.size > maxImageSize)) throw new Error("INVALID_IMAGE");
        if (kind === "model" && (!modelExtensions.has(extension) || file.size > maxModelSize)) throw new Error("INVALID_MODEL");

        const buffer = Buffer.from(await file.arrayBuffer());
        key = `3d-products/${productId}/${Date.now()}-${crypto.randomUUID()}-${safeFilename(file.name)}`;
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
            ContentLength: buffer.length,
            CacheControl: "public, max-age=31536000, immutable",
            Metadata: { uploadedBy: user.uid, productId, kind },
        }));

        return NextResponse.json({
            success: true,
            file: {
                id: crypto.randomUUID(),
                key,
                url: getR2PublicUrl(key),
                name: file.name,
                contentType: file.type,
                size: file.size,
            },
        }, { status: 201 });
    } catch (error) {
        if (key) {
            try {
                await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
            } catch (cleanupError) {
                console.error("3D upload cleanup error:", cleanupError);
            }
        }
        return errorResponse(error);
    }
}

export async function DELETE(request: Request) {
    try {
        await requireAdminApi(request);
        const body = await request.json() as { key?: unknown };
        if (typeof body.key !== "string" || !body.key.startsWith("3d-products/")) throw new Error("INVALID_KEY");
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: body.key }));
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
