import { NextResponse } from "next/server";

import {
    S3Client,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { adminDb } from "@/lib/firebase-admin";
import { adminAuth } from "@/lib/firebase-admin";
import { getGalleryShare } from "@/lib/gallery-share";

export const runtime = "nodejs";

export async function GET(
    request: Request,
    context: {
        params: Promise<{
            bookingId: string;
            photoId: string;
        }>;
    }
) {
    try {
        // =========================================
        // PARAMS
        // =========================================

        const { bookingId, photoId } =
            await context.params;

        if (!bookingId || !photoId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ข้อมูลรูปไม่ครบ",
                },
                { status: 400 }
            );
        }

        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId) || !/^[A-Za-z0-9_-]{1,128}$/.test(photoId)) {
            return NextResponse.json({ success: false, error: "ข้อมูลรูปไม่ถูกต้อง" }, { status: 400 });
        }

        const query = new URL(request.url).searchParams;
        const guestToken = query.get("guestToken") || query.get("token");
        const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
        const guestShare = guestToken ? await getGalleryShare(bookingId, guestToken) : null;
        if (guestShare) {
            // Guest access is scoped to this booking and checked again below.
        } else if (!token) return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
        if (guestShare) {
            // Skip customer/admin identity checks for a valid scoped share token.
        } else {
        if (!token) return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(token, true);
        const authUser = await adminAuth.getUser(decoded.uid);
        if (authUser.disabled) return NextResponse.json({ success: false, error: "บัญชีถูกระงับ" }, { status: 401 });
        const isAdmin = decoded.admin === true || decoded.isAdmin === true || decoded.role === "admin";
        const bookingSnapshot = await adminDb.collection("bookings").doc(bookingId).get();
        if (!bookingSnapshot.exists) return NextResponse.json({ success: false, error: "ไม่พบรายการจองนี้" }, { status: 404 });
        if (!isAdmin && bookingSnapshot.data()?.userId !== decoded.uid) return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์เข้าถึงรูปนี้" }, { status: 403 });
        }


        // =========================================
        // ENV
        // =========================================

        const accountId =
            process.env.R2_ACCOUNT_ID ||
            process.env.CLOUDFLARE_ACCOUNT_ID;

        const accessKeyId =
            process.env.R2_ACCESS_KEY_ID;

        const secretAccessKey =
            process.env.R2_SECRET_ACCESS_KEY;

        const bucketName =
            process.env.R2_BUCKET_NAME;

        if (
            !accountId ||
            !accessKeyId ||
            !secretAccessKey ||
            !bucketName
        ) {
            console.error(
                "R2 ENVIRONMENT VARIABLES ไม่ครบ"
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "R2 Environment Variables ไม่ครบ",
                },
                { status: 500 }
            );
        }

        // =========================================
        // FIRESTORE
        // =========================================

        const photoRef =
            adminDb
                .collection("bookings")
                .doc(bookingId)
                .collection("photos")
                .doc(photoId);

        const photoSnapshot =
            await photoRef.get();

        if (!photoSnapshot.exists) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบรูปภาพ",
                },
                { status: 404 }
            );
        }

        const photo =
            photoSnapshot.data();

        if (!photo) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ไม่พบข้อมูลรูปภาพ",
                },
                { status: 404 }
            );
        }

        const photoStatus = typeof photo.status === "string" ? photo.status.toLowerCase() : "published";
        if (photo.deleted === true || photo.deletedAt || !["published", "active", "ready"].includes(photoStatus)) {
            return NextResponse.json({ success: false, error: "รูปนี้ยังไม่พร้อมให้ดาวน์โหลด" }, { status: 404 });
        }
        if (guestShare?.albumId && photo.albumId !== guestShare.albumId) {
            return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์เข้าถึงรูปนี้" }, { status: 404 });
        }

        // =========================================
        // CHECK R2 KEY
        // =========================================

        if (
            typeof photo.key !== "string" ||
            !photo.key
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ไม่พบ R2 Object Key",
                },
                { status: 404 }
            );
        }


        // =========================================
        // R2 CLIENT
        // =========================================

        const s3 =
            new S3Client({
                region: "auto",

                endpoint:
                    `https://${accountId}.r2.cloudflarestorage.com`,

                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

        // =========================================
        // FILE NAME
        // =========================================

        const fileName =
            typeof photo.fileName === "string" &&
                photo.fileName
                ? photo.fileName
                : "koko-memory-photo.jpg";

        // =========================================
        // CONTENT TYPE
        // =========================================

        const contentType =
            typeof photo.contentType === "string"
                ? photo.contentType
                : photo.contentType ||
                "application/octet-stream";

        // =========================================
        // SAFE FILE NAME
        // =========================================

        const safeFileName =
            fileName.replace(
                /["\\]/g,
                ""
            );

        const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
            Bucket: bucketName,
            Key: photo.key,
            ResponseContentType: contentType,
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        }), { expiresIn: 60 });
        return NextResponse.json({ success: true, downloadUrl }, {
            headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate", Pragma: "no-cache", Expires: "0" },
        });

    } catch (error) {
        console.error(
            "===== DOWNLOAD ERROR ====="
        );

        console.error(error);

        return NextResponse.json(
            {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "ดาวน์โหลดรูปไม่สำเร็จ",
            },
            { status: 500 }
        );
    }
}
