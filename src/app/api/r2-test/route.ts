import { requireAdminApi } from "@/lib/require-admin-api";
import { authErrorResponse } from "@/lib/api-error";
import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";



import {
    Timestamp,
} from "firebase-admin/firestore";

import { randomUUID } from "crypto";

export const runtime = "nodejs";

// =====================================================
// POST
// =====================================================

export async function POST(request: Request) {
    console.log("=================================");
    console.log("R2 + FIRESTORE UPLOAD START");
    console.log("=================================");

    let uploadedR2Key: string | null = null;
    let s3Client: S3Client | null = null;
    let bucketName: string | null = null;

    try {
        await requireAdminApi(request);
        // =====================================================
        // 1. R2 ENV
        // =====================================================

        const accountId =
            process.env.R2_ACCOUNT_ID ||
            process.env.CLOUDFLARE_ACCOUNT_ID;

        const accessKeyId =
            process.env.R2_ACCESS_KEY_ID;

        const secretAccessKey =
            process.env.R2_SECRET_ACCESS_KEY;

        bucketName =
            process.env.R2_BUCKET_NAME || null;

        console.log("R2 ENV CHECK:", {
            accountId: !!accountId,
            accessKeyId: !!accessKeyId,
            secretAccessKey: !!secretAccessKey,
            bucketName: !!bucketName,
        });

        if (
            !accountId ||
            !accessKeyId ||
            !secretAccessKey ||
            !bucketName
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "R2 Environment Variables ไม่ครบ",
                },
                { status: 500 }
            );
        }

        // =====================================================
        // 2. FIREBASE ENV
        // =====================================================

        const db = adminDb;

        console.log(
            "FIREBASE ADMIN READY"
        );

        // =====================================================
        // 4. R2 CLIENT
        // =====================================================

        s3Client =
            new S3Client({
                region: "auto",

                endpoint:
                    `https://${accountId}.r2.cloudflarestorage.com`,

                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

        console.log(
            "R2 CLIENT READY"
        );

        // =====================================================
        // 5. FORM DATA
        // =====================================================

        const formData =
            await request.formData();

        const file =
            formData.get("file");

        const bookingIdValue =
            formData.get("bookingId");

        // =====================================================
        // 6. CHECK FILE
        // =====================================================

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบไฟล์",
                },
                { status: 400 }
            );
        }

        // =====================================================
        // 7. CHECK BOOKING ID
        // =====================================================

        if (
            typeof bookingIdValue !== "string" ||
            !bookingIdValue.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ไม่พบ Booking ID",
                },
                { status: 400 }
            );
        }

        const bookingId =
            bookingIdValue.trim();
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) return NextResponse.json({ error: "INVALID_BOOKING_ID" }, { status: 400 });
        if (!(await db.collection("bookings").doc(bookingId).get()).exists) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });

        console.log(
            "BOOKING ID:",
            bookingId
        );

        // =====================================================
        // 8. CHECK IMAGE
        // =====================================================

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "รองรับเฉพาะไฟล์รูปภาพ",
                },
                { status: 400 }
            );
        }

        // =====================================================
        // 9. CHECK SIZE
        // =====================================================

        const maxSize =
            20 * 1024 * 1024;

        if (file.size > maxSize) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ไฟล์มีขนาดใหญ่เกิน 20MB",
                },
                { status: 400 }
            );
        }

        // =====================================================
        // 10. FILE EXTENSION
        // =====================================================

        const extension =
            file.name
                .split(".")
                .pop()
                ?.toLowerCase()
                .replace(
                    /[^a-z0-9]/g,
                    ""
                ) || "jpg";

        // =====================================================
        // 11. FILE NAME
        // =====================================================

        const fileName =
            `${Date.now()}-${randomUUID()}.${extension}`;

        // =====================================================
        // 12. R2 KEY
        // =====================================================

        const key =
            `photos/${bookingId}/${fileName}`;

        uploadedR2Key = key;

        console.log(
            "R2 KEY:",
            key
        );

        // =====================================================
        // 13. FILE → BUFFER
        // =====================================================

        const buffer =
            Buffer.from(
                await file.arrayBuffer()
            );

        // =====================================================
        // 14. UPLOAD TO R2
        // =====================================================

        await s3Client.send(
            new PutObjectCommand({
                Bucket:
                    bucketName,

                Key:
                    key,

                Body:
                    buffer,

                ContentType:
                    file.type,
            })
        );

        console.log(
            "R2 UPLOAD SUCCESS"
        );

        // =====================================================
        // 15. FIRESTORE PHOTO DOCUMENT
        // =====================================================

        const photoRef =
            db
                .collection("bookings")
                .doc(bookingId)
                .collection("photos")
                .doc();

        // =====================================================
        // 16. SAVE FIRESTORE
        // =====================================================

        await photoRef.set({
            bookingId,

            fileName,

            key,

            contentType:
                file.type,

            size:
                file.size,

            storage:
                "cloudflare-r2",

            createdAt:
                Timestamp.now(),
        });

        console.log(
            "FIRESTORE SAVE SUCCESS"
        );

        // =====================================================
        // 17. SUCCESS
        // =====================================================

        return NextResponse.json({
            success: true,

            message:
                "Upload รูปและบันทึก Firestore สำเร็จ",

            photoId:
                photoRef.id,

            bookingId,

            fileName,

            key,

            bucket:
                bucketName,
        });

    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;

        console.error(
            "================================="
        );

        console.error(
            "R2 + FIRESTORE ERROR"
        );

        console.error(error);

        // =====================================================
        // ถ้า R2 Upload สำเร็จ
        // แต่ Firestore พัง
        // → ลบรูปออกจาก R2
        // =====================================================

        if (
            uploadedR2Key &&
            s3Client &&
            bucketName
        ) {
            try {

                console.log(
                    "ROLLBACK R2:",
                    uploadedR2Key
                );

                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket:
                            bucketName,

                        Key:
                            uploadedR2Key,
                    })
                );

                console.log(
                    "R2 ROLLBACK SUCCESS"
                );

            } catch (
            rollbackError
            ) {

                console.error(
                    "R2 ROLLBACK FAILED",
                    rollbackError
                );
            }
        }

        // =====================================================
        // ส่ง JSON กลับเสมอ
        // =====================================================

        return NextResponse.json(
            {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาด",

                step:
                    uploadedR2Key
                        ? "firestore"
                        : "r2-or-validation",
            },
            {
                status: 500,
            }
        );
    }
}
