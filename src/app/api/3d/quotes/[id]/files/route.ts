import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi, safeId } from "@/lib/customer-api-auth";
import { r2 } from "@/lib/r2";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

const MAX_MODEL = 50 * 1024 * 1024;
const MAX_REFERENCE = 10 * 1024 * 1024;
const MODEL_TYPES = new Set(["model/stl", "application/sla", "application/vnd.ms-pki.stl", "model/3mf", "application/3mf", "application/octet-stream"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function privateBucket() { const value = process.env.R2_PRIVATE_BUCKET_NAME?.trim(); if (!value) throw new Error("R2_PRIVATE_BUCKET_NOT_CONFIGURED"); return value; }

function hasModelSignature(buffer: Buffer, extension: string) {
    if (extension === "3mf") return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (buffer.length < 84) return false;
    const ascii = buffer.subarray(0, Math.min(buffer.length, 80)).toString("ascii").trimStart().toLowerCase();
    if (ascii.startsWith("solid")) return true;
    const triangles = buffer.readUInt32LE(80);
    return triangles > 0 && 84 + triangles * 50 === buffer.length;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request); const id = safeId((await context.params).id); if (!id) throw new Error("NOT_FOUND"); const ref = adminDb.collection("3dQuotes").doc(id); const quote = await ref.get(); if (!quote.exists || quote.data()?.userId !== user.uid) throw new Error("NOT_FOUND"); if (quote.data()?.status !== "inquiry") throw new Error("QUOTE_LOCKED");
        const form = await request.formData(); const file = form.get("file"); const kind = form.get("kind") === "reference" ? "reference" : "model"; if (!(file instanceof File) || !file.name) throw new Error("INVALID_FILE"); const extension = file.name.toLowerCase().split(".").pop() || ""; const validType = kind === "model" ? ["stl", "3mf"].includes(extension) && (MODEL_TYPES.has(file.type) || !file.type) : ["jpg", "jpeg", "png", "webp"].includes(extension) && IMAGE_TYPES.has(file.type); if (!validType) throw new Error("INVALID_FILE_TYPE"); if (file.size <= 0 || file.size > (kind === "model" ? MAX_MODEL : MAX_REFERENCE)) throw new Error("FILE_TOO_LARGE");
        const bucket = privateBucket(); const fileId = randomUUID(); const safeExtension = extension === "jpeg" ? "jpg" : extension; const key = `3d-quotes/${id}/${kind}/${fileId}.${safeExtension}`; const buffer = Buffer.from(await file.arrayBuffer()); if (kind === "model" && !hasModelSignature(buffer, extension)) throw new Error("INVALID_FILE_CONTENT");
        try {
            await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: file.type || "application/octet-stream", CacheControl: "private, no-store" }));
        } catch (error) {
            const r2Error = error as { name?: unknown; code?: unknown; message?: unknown; $metadata?: { httpStatusCode?: unknown } };
            console.error("[3D_UPLOAD_R2_ERROR]", {
                name: typeof r2Error.name === "string" ? r2Error.name : "UnknownError",
                code: typeof r2Error.code === "string" ? r2Error.code : undefined,
                message: typeof r2Error.message === "string" ? r2Error.message : "R2 upload failed",
                httpStatusCode: r2Error.$metadata?.httpStatusCode,
                bucket,
                keyPrefix: key.slice(0, key.lastIndexOf("/") + 1),
            });
            throw new Error("R2_UPLOAD_FAILED");
        }
        const metadata = { id: fileId, fileName: file.name.replace(/[\\/]/g, "_").slice(0, 200), contentType: file.type || "application/octet-stream", size: file.size, kind, key, uploadedAt: new Date().toISOString() }; await ref.update({ files: FieldValue.arrayUnion(metadata), updatedAt: FieldValue.serverTimestamp() }); return NextResponse.json({ success: true, file: { id: fileId, fileName: metadata.fileName, contentType: metadata.contentType, size: metadata.size, kind } });
    } catch (error) { const code = error instanceof Error ? error.message : "UPLOAD_FAILED"; const status = code === "UNAUTHORIZED" ? 401 : code === "NOT_FOUND" ? 404 : code === "R2_PRIVATE_BUCKET_NOT_CONFIGURED" || code === "R2_UPLOAD_FAILED" ? 503 : 400; const safeError = code === "R2_UPLOAD_FAILED" ? "R2_UPLOAD_FAILED" : code; return NextResponse.json({ success: false, error: safeError }, { status }); }
}
