import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { authorizeGalleryUploaderToken, GALLERY_SHARE_COLLECTION } from "@/lib/gallery-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

function getStorage() {
    const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) throw new Error("R2_NOT_CONFIGURED");
    return {
        bucketName,
        client: new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        }),
    };
}

async function getAlbum(bookingId: string, shareId: string) {
    const snapshot = await adminDb.collection(GALLERY_SHARE_COLLECTION).doc(shareId).get();
    const share = snapshot.data();
    const expiresAt = share?.expiresAt?.toDate?.() ?? (share?.expiresAt instanceof Date ? share.expiresAt : null);
    if (!snapshot.exists || share?.bookingId !== bookingId || share?.scope !== "album" || share?.albumId !== shareId || share?.revokedAt || !(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) return null;
    return share;
}

async function authorizeUpload(request: Request, bookingId: string, shareId: string) {
    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] || "";
    if (await authorizeGalleryUploaderToken(bookingId, shareId, bearer)) return;
    await requireAdminApi(request);
}

export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        const { bookingId } = await context.params;
        const body = await request.json() as { shareId?: unknown; fileName?: unknown; contentType?: unknown; size?: unknown; photoId?: unknown; checksum?: unknown };
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId) || typeof body.shareId !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(body.shareId)) {
            return NextResponse.json({ success: false, error: "INVALID_UPLOAD_SCOPE" }, { status: 400 });
        }
        if (typeof body.fileName !== "string" || body.fileName.length > 240 || typeof body.contentType !== "string" || !Object.hasOwn(ALLOWED_TYPES, body.contentType) || typeof body.size !== "number" || !Number.isSafeInteger(body.size) || body.size < 1 || body.size > MAX_FILE_SIZE) {
            return NextResponse.json({ success: false, error: "INVALID_IMAGE" }, { status: 400 });
        }
        await authorizeUpload(request, bookingId, body.shareId);
        if (!(await adminDb.collection("bookings").doc(bookingId).get()).exists) return NextResponse.json({ success: false, error: "BOOKING_NOT_FOUND" }, { status: 404 });
        if (!(await getAlbum(bookingId, body.shareId))) return NextResponse.json({ success: false, error: "ALBUM_UNAVAILABLE" }, { status: 404 });

        const { client, bucketName } = getStorage();
        const photoId = typeof body.photoId === "string" && /^[a-f0-9]{32}$/i.test(body.photoId) ? body.photoId.toLowerCase() : randomUUID().replace(/-/g, "");
        const checksum = typeof body.checksum === "string" && /^[a-f0-9]{64}$/i.test(body.checksum) ? body.checksum.toLowerCase() : null;
        const safeName = body.fileName.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180);
        const objectName = `${photoId}.${ALLOWED_TYPES[body.contentType]}`;
        const key = `photos/${bookingId}/${body.shareId}/${objectName}`;
        const photoRef = adminDb.collection("bookings").doc(bookingId).collection("photos").doc(photoId);
        const existing = await photoRef.get();
        if (existing.exists) {
            const previous = existing.data();
            if (previous?.albumId !== body.shareId || previous?.key !== key || previous?.size !== body.size || previous?.contentType !== body.contentType || (checksum && previous?.checksum !== checksum)) {
                return NextResponse.json({ success: false, error: "UPLOAD_ID_CONFLICT" }, { status: 409 });
            }
            if (previous?.status === "ready") return NextResponse.json({ success: true, photoId, alreadyUploaded: true }, { headers: { "Cache-Control": "private, no-store" } });
        }
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const command = new PutObjectCommand({ Bucket: bucketName, Key: key, ContentType: body.contentType });
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 15 * 60 });
        const photoData = {
            bookingId,
            albumId: body.shareId,
            fileName: safeName,
            objectName,
            key,
            contentType: body.contentType,
            size: body.size,
            storage: "cloudflare-r2",
            status: "uploading",
            deleted: false,
            ...(checksum ? { checksum } : {}),
            uploadExpiresAt: Timestamp.fromDate(expiresAt),
        };
        if (existing.exists) await photoRef.update(photoData);
        else await photoRef.create({ ...photoData, createdAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, photoId, uploadUrl, expiresAt: expiresAt.toISOString(), alreadyUploaded: false }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        if (error instanceof Error && error.message === "R2_NOT_CONFIGURED") return NextResponse.json({ success: false, error: "R2_NOT_CONFIGURED" }, { status: 503 });
        return NextResponse.json({ success: false, error: "UPLOAD_PREPARATION_FAILED" }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        const { bookingId } = await context.params;
        const body = await request.json() as { shareId?: unknown; photoId?: unknown };
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId) || typeof body.shareId !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(body.shareId) || typeof body.photoId !== "string" || !/^[a-f0-9]{32}$/i.test(body.photoId)) {
            return NextResponse.json({ success: false, error: "INVALID_UPLOAD" }, { status: 400 });
        }
        await authorizeUpload(request, bookingId, body.shareId);
        if (!(await getAlbum(bookingId, body.shareId))) return NextResponse.json({ success: false, error: "ALBUM_UNAVAILABLE" }, { status: 404 });
        const photoRef = adminDb.collection("bookings").doc(bookingId).collection("photos").doc(body.photoId);
        const photoSnapshot = await photoRef.get();
        const photo = photoSnapshot.data();
        if (!photoSnapshot.exists || photo?.albumId !== body.shareId || typeof photo?.key !== "string") return NextResponse.json({ success: false, error: "PHOTO_NOT_FOUND" }, { status: 404 });
        if (photo.status === "ready") return NextResponse.json({ success: true, photoId: body.photoId, status: "ready" });

        const { client, bucketName } = getStorage();
        const object = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: photo.key }));
        if (object.ContentLength !== photo.size || object.ContentType !== photo.contentType) return NextResponse.json({ success: false, error: "UPLOADED_FILE_MISMATCH" }, { status: 409 });
        await photoRef.update({ status: "ready", uploadedAt: FieldValue.serverTimestamp(), uploadExpiresAt: FieldValue.delete() });
        return NextResponse.json({ success: true, photoId: body.photoId, status: "ready" });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        const name = error instanceof Error ? error.name : "";
        if (name === "NotFound" || name === "NoSuchKey") return NextResponse.json({ success: false, error: "UPLOAD_NOT_FOUND" }, { status: 409 });
        if (error instanceof Error && error.message === "R2_NOT_CONFIGURED") return NextResponse.json({ success: false, error: "R2_NOT_CONFIGURED" }, { status: 503 });
        return NextResponse.json({ success: false, error: "UPLOAD_CONFIRMATION_FAILED" }, { status: 500 });
    }
}

// A streaming same-origin fallback keeps browser uploads working when the R2
// bucket has not enabled browser CORS. The direct signed URL remains preferred.
export async function PUT(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        const { bookingId } = await context.params;
        const query = new URL(request.url).searchParams;
        const shareId = query.get("shareId") || "";
        const photoId = query.get("photoId") || "";
        const size = Number(request.headers.get("content-length"));
        const contentType = request.headers.get("content-type") || "";
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId) || !/^[A-Za-z0-9_-]{20,128}$/.test(shareId) || !/^[a-f0-9]{32}$/i.test(photoId) || !Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_SIZE || !Object.hasOwn(ALLOWED_TYPES, contentType) || !request.body) {
            return NextResponse.json({ success: false, error: "INVALID_UPLOAD" }, { status: 400 });
        }
        await authorizeUpload(request, bookingId, shareId);
        if (!(await getAlbum(bookingId, shareId))) return NextResponse.json({ success: false, error: "ALBUM_UNAVAILABLE" }, { status: 404 });
        const photoRef = adminDb.collection("bookings").doc(bookingId).collection("photos").doc(photoId);
        const photoSnapshot = await photoRef.get();
        const photo = photoSnapshot.data();
        if (!photoSnapshot.exists || photo?.albumId !== shareId || photo.size !== size || photo.contentType !== contentType || typeof photo.key !== "string") {
            return NextResponse.json({ success: false, error: "UPLOAD_METADATA_MISMATCH" }, { status: 409 });
        }
        if (photo.status === "ready") return NextResponse.json({ success: true, photoId, status: "ready" });
        const { client, bucketName } = getStorage();
        await client.send(new PutObjectCommand({ Bucket: bucketName, Key: photo.key, Body: Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), ContentLength: size, ContentType: contentType }));
        await photoRef.update({ status: "ready", uploadedAt: FieldValue.serverTimestamp(), uploadExpiresAt: FieldValue.delete() });
        return NextResponse.json({ success: true, photoId, status: "ready" });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        if (error instanceof Error && error.message === "R2_NOT_CONFIGURED") return NextResponse.json({ success: false, error: "R2_NOT_CONFIGURED" }, { status: 503 });
        return NextResponse.json({ success: false, error: "UPLOAD_FAILED" }, { status: 500 });
    }
}
