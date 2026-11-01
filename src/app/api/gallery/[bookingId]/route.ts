import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getGalleryShare } from "@/lib/gallery-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPrivateStorage() {
    const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) throw new Error("R2_NOT_CONFIGURED");
    return {
        bucketName,
        client: new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } }),
    };
}

async function authorizeBooking(request: Request, bookingId: string) {
    const query = new URL(request.url).searchParams;
    const guestToken = query.get("guestToken") || query.get("token");
    const guestShare = guestToken ? await getGalleryShare(bookingId, guestToken) : null;
    if (guestShare) return guestShare;
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Error("UNAUTHORIZED");
    const decoded = await adminAuth.verifyIdToken(token, true);
    const user = await adminAuth.getUser(decoded.uid);
    if (user.disabled) throw new Error("UNAUTHORIZED");
    const isAdmin = decoded.admin === true || decoded.isAdmin === true || decoded.role === "admin";
    if (isAdmin) return null;
    const booking = await adminDb.collection("bookings").doc(bookingId).get();
    if (!booking.exists || booking.data()?.userId !== decoded.uid) throw new Error("FORBIDDEN");
    return null;
}

export async function GET(request: Request, context: { params: Promise<{ bookingId: string }> }) {
    try {
        const { bookingId } = await context.params;
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) return NextResponse.json({ success: false, error: "INVALID_BOOKING_ID" }, { status: 400 });
        const guestShare = await authorizeBooking(request, bookingId);
        const now = Timestamp.now();
        const booking = await adminDb.collection("bookings").doc(bookingId).get();
        if (!booking.exists) return NextResponse.json({ success: false, error: "ไม่พบรายการจองนี้" }, { status: 404 });
        const photosCollection = adminDb.collection("bookings").doc(bookingId).collection("photos");
        const sinceValue = new URL(request.url).searchParams.get("since");
        const sinceParts = sinceValue?.match(/^(\d{1,12})\.(\d{1,9})$/);
        const olderId = new URL(request.url).searchParams.get("older");
        let snapshot;
        if (sinceParts) {
            const query = guestShare?.albumId
                ? photosCollection.where("albumId", "==", guestShare.albumId)
                : photosCollection;
            snapshot = await query
                .where("status", "==", "ready")
                .where("uploadedAt", ">", new Timestamp(Number(sinceParts[1]), Number(sinceParts[2].padEnd(9, "0"))))
                .orderBy("uploadedAt", "asc")
                .limit(101)
                .get();
        } else {
            const albumQuery = guestShare?.albumId ? photosCollection.where("albumId", "==", guestShare.albumId) : photosCollection;
            let pageQuery = albumQuery.orderBy("createdAt", "desc");
            if (olderId && /^[a-f0-9]{32}$/i.test(olderId)) {
                const olderDocument = await photosCollection.doc(olderId).get();
                if (olderDocument.exists) pageQuery = pageQuery.startAfter(olderDocument);
            }
            snapshot = await pageQuery.limit(101).get();
        }
        const pageDocs = snapshot.docs.slice(0, 100);
        const { client, bucketName } = getPrivateStorage();
        const photos = await Promise.all(pageDocs.map(async (doc) => {
            const data = doc.data();
            const status = typeof data.status === "string" ? data.status.toLowerCase() : "published";
            const deleted = data.deleted === true || Boolean(data.deletedAt);
            const visible = !deleted && ["published", "active", "ready"].includes(status) && (!guestShare?.albumId || data.albumId === guestShare.albumId);
            if (!visible || typeof data.key !== "string") return null;
            const fileName = typeof data.fileName === "string" ? data.fileName : "koko-memory-photo.jpg";
            const contentType = typeof data.contentType === "string" ? data.contentType : "image/jpeg";
            const url = await getSignedUrl(client, new GetObjectCommand({
                Bucket: bucketName,
                Key: data.key,
                ResponseContentType: contentType,
                ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            }), { expiresIn: 30 * 60 });
            return { id: doc.id, bookingId, fileName, contentType, size: typeof data.size === "number" ? data.size : 0, status, url };
        }));
        const visiblePhotos = photos.filter((photo): photo is NonNullable<typeof photo> => photo !== null);
        const lastPhoto = snapshot.docs[99]?.data().uploadedAt;
        const nextSince = sinceParts && snapshot.size === 101 && lastPhoto?.seconds !== undefined
            ? `${lastPhoto.seconds}.${String(lastPhoto.nanoseconds).padStart(9, "0")}`
            : null;
        const olderCursor = !sinceParts && snapshot.size === 101 ? snapshot.docs[99].id : null;
        return NextResponse.json({ success: true, bookingId, photos: visiblePhotos, nextSince, olderCursor, serverCursor: `${now.seconds}.${String(now.nanoseconds).padStart(9, "0")}` }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
        return NextResponse.json({ success: false, error: status === 500 ? "โหลด Gallery ไม่สำเร็จ" : "ไม่มีสิทธิ์เข้าถึง Gallery", code: code || "GALLERY_FAILED" }, { status });
    }
}
