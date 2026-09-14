import { NextResponse } from "next/server";
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "application/pdf",
]);

const PAYMENT_COLLECTION = "payments";
const BOOKING_COLLECTION = "bookings";

function getR2Client() {
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
        throw new Error(
            "R2 Environment Variables ไม่ครบ"
        );
    }

    return {
        client: new S3Client({
            region: "auto",
            endpoint:
                `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        }),
        bucketName,
    };
}

function getPublicUrl(key: string) {
    const publicUrl =
        process.env.R2_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (!publicUrl) {
        throw new Error(
            "ยังไม่ได้ตั้งค่า R2 Public URL"
        );
    }

    return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

function sanitizeFileName(name: string) {
    return name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-100);
}

function getExtension(file: File) {
    if (file.type === "image/jpeg") {
        return "jpg";
    }

    if (file.type === "image/png") {
        return "png";
    }

    if (file.type === "application/pdf") {
        return "pdf";
    }

    return "bin";
}

function getPaymentData(
    booking: Record<string, unknown>
): Record<string, unknown> {
    const payment = booking.payment;

    if (
        payment &&
        typeof payment === "object" &&
        !Array.isArray(payment)
    ) {
        return payment as Record<string, unknown>;
    }

    return {};
}

function isAlreadySubmitted(
    booking: Record<string, unknown>
) {
    const payment = getPaymentData(booking);

    return (
        booking.bookingStatus === "payment_submitted" ||
        booking.bookingStatus === "payment_verified" ||
        booking.bookingStatus === "confirmed" ||
        booking.paymentStatus === "submitted" ||
        booking.paymentStatus === "verified" ||
        payment.status === "submitted" ||
        payment.status === "verified"
    );
}

function getCustomerField(
    booking: Record<string, unknown>,
    field: "name" | "phone" | "email"
): string {
    const customer = booking.customer;

    if (
        customer &&
        typeof customer === "object" &&
        !Array.isArray(customer)
    ) {
        const value =
            (customer as Record<string, unknown>)[field];

        return typeof value === "string" ? value : "";
    }

    return "";
}

function getExpectedPaymentAmount(
    booking: Record<string, unknown>
) {
    const pricing =
        booking.pricing &&
        typeof booking.pricing === "object" &&
        !Array.isArray(booking.pricing)
            ? (booking.pricing as Record<string, unknown>)
            : {};

    const deposit = pricing.deposit;

    if (
        typeof deposit === "number" &&
        Number.isFinite(deposit) &&
        deposit > 0
    ) {
        return deposit;
    }

    const depositAmount =
        booking.depositAmount;

    if (
        typeof depositAmount === "number" &&
        Number.isFinite(depositAmount) &&
        depositAmount > 0
    ) {
        return depositAmount;
    }

    const packageData =
        booking.package &&
        typeof booking.package === "object" &&
        !Array.isArray(booking.package)
            ? (booking.package as Record<string, unknown>)
            : {};

    const packageDeposit = packageData.deposit;

    if (
        typeof packageDeposit === "number" &&
        Number.isFinite(packageDeposit) &&
        packageDeposit > 0
    ) {
        return packageDeposit;
    }

    return 3000;
}

export async function POST(
    request: Request
) {
    let uploadedKey: string | null = null;
    let r2Client: S3Client | null = null;
    let bucketName: string | null = null;

    let bookingId = "";
    let lockToken = "";
    let lockAcquired = false;

    try {
        /* =====================================================
           1. FORM DATA
        ===================================================== */

        const formData =
            await request.formData();

        const file =
            formData.get("file");

        const bookingIdValue =
            formData.get("bookingId");

        /*
         * amount จาก Browser รับไว้เพื่อ compatibility
         * แต่ Server จะไม่เชื่อยอดนี้เป็นแหล่งความจริง
         */
        const amountValue =
            formData.get("amount");

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบไฟล์สลิป",
                },
                { status: 400 }
            );
        }

        if (
            typeof bookingIdValue !== "string" ||
            !bookingIdValue.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบ Booking ID",
                },
                { status: 400 }
            );
        }

        bookingId =
            bookingIdValue.trim();

        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "รองรับเฉพาะ JPG, PNG หรือ PDF เท่านั้น",
                },
                { status: 415 }
            );
        }

        if (file.size <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไฟล์สลิปว่างเปล่า",
                },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ไฟล์สลิปต้องมีขนาดไม่เกิน 20 MB",
                },
                { status: 413 }
            );
        }

        const requestedAmount =
            Number(amountValue);

        if (
            amountValue !== null &&
            (
                !Number.isFinite(requestedAmount) ||
                requestedAmount <= 0
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ยอดชำระไม่ถูกต้อง",
                },
                { status: 400 }
            );
        }


        /* =====================================================
           2. BOOKING + DUPLICATE LOCK
           -----------------------------------------------------
           ใช้ Transaction เพื่อกัน:
           - double click
           - เปิดหลายแท็บ
           - request ซ้ำพร้อมกัน
           - race condition
        ===================================================== */

        const bookingRef =
            adminDb
                .collection(BOOKING_COLLECTION)
                .doc(bookingId);

        lockToken =
            randomUUID();

        await adminDb.runTransaction(
            async (transaction) => {
                const snapshot =
                    await transaction.get(
                        bookingRef
                    );

                if (!snapshot.exists) {
                    throw new Error(
                        "BOOKING_NOT_FOUND"
                    );
                }

                const booking =
                    snapshot.data() || {};

                if (
                    isAlreadySubmitted(
                        booking
                    )
                ) {
                    throw new Error(
                        "PAYMENT_ALREADY_SUBMITTED"
                    );
                }

                if (
                    booking.paymentUploadLock
                ) {
                    throw new Error(
                        "PAYMENT_UPLOAD_IN_PROGRESS"
                    );
                }

                transaction.update(
                    bookingRef,
                    {
                        paymentUploadLock: {
                            token: lockToken,
                            startedAt:
                                FieldValue.serverTimestamp(),
                        },
                        updatedAt:
                            FieldValue.serverTimestamp(),
                    }
                );
            }
        );

        lockAcquired = true;


        /* =====================================================
           3. R2 CLIENT
        ===================================================== */

        const r2 =
            getR2Client();

        r2Client =
            r2.client;

        bucketName =
            r2.bucketName;


        /* =====================================================
           4. FILE NAME + R2 KEY
        ===================================================== */

        const safeFileName =
            sanitizeFileName(
                file.name
            );

        const extension =
            getExtension(file);

        const fileName =
            `${Date.now()}-${randomUUID()}-${safeFileName || `slip.${extension}`}`;

        const key =
            `payment-slips/${bookingId}/${fileName}`;

        uploadedKey = key;


        /* =====================================================
           5. UPLOAD TO R2
        ===================================================== */

        const buffer =
            Buffer.from(
                await file.arrayBuffer()
            );

        await r2Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: buffer,
                ContentType: file.type,
                ContentLength: buffer.length,

                CacheControl:
                    "public, max-age=31536000, immutable",

                Metadata: {
                    bookingId,
                    originalName:
                        safeFileName,
                },
            })
        );


        /* =====================================================
           6. PUBLIC URL
        ===================================================== */

        const slipUrl =
            getPublicUrl(key);


        /* =====================================================
           7. ATOMIC PAYMENT + BOOKING UPDATE
           -----------------------------------------------------
           Payment document และ Booking status เปลี่ยนพร้อมกัน
           ใน Firestore transaction

           ถ้าขั้นนี้ fail:
           - Payment จะไม่ถูก commit
           - R2 จะถูก rollback ใน catch
           - lock จะถูกปล่อย
        ===================================================== */

        const paymentRef =
            adminDb
                .collection(PAYMENT_COLLECTION)
                .doc();

        const now =
            FieldValue.serverTimestamp();

        let finalAmount = 0;

        await adminDb.runTransaction(
            async (transaction) => {
                const snapshot =
                    await transaction.get(
                        bookingRef
                    );

                if (!snapshot.exists) {
                    throw new Error(
                        "BOOKING_NOT_FOUND"
                    );
                }

                const booking =
                    snapshot.data() || {};

                if (
                    isAlreadySubmitted(
                        booking
                    )
                ) {
                    throw new Error(
                        "PAYMENT_ALREADY_SUBMITTED"
                    );
                }

                if (
                    booking.paymentUploadLock?.token !==
                    lockToken
                ) {
                    throw new Error(
                        "PAYMENT_LOCK_LOST"
                    );
                }

                /*
                 * ใช้ยอดจาก Booking เป็นหลัก
                 * ไม่เชื่อ amount ที่ Browser ส่งมา
                 */
                finalAmount =
                    getExpectedPaymentAmount(
                        booking
                    );

                transaction.set(
                    paymentRef,
                    {
                        bookingId,

                        amount:
                            finalAmount,

                        currency:
                            "THB",

                        method:
                            "bank_transfer",

                        status:
                            "submitted",

                        bankName:
                            "ธนาคารกสิกรไทย",

                        accountName:
                            "KOKO Memory",

                        accountNumber:
                            "180-172-8606",

                        slipUrl,

                        slipPath:
                            key,

                        slipKey:
                            key,

                        slipFileName:
                            file.name,

                        slipContentType:
                            file.type,

                        slipSize:
                            file.size,

                        customerName:
                            getCustomerField(
                                booking,
                                "name"
                            ),

                        customerPhone:
                            getCustomerField(
                                booking,
                                "phone"
                            ),

                        customerEmail:
                            getCustomerField(
                                booking,
                                "email"
                            ),

                        submittedAt:
                            now,

                        createdAt:
                            now,
                    }
                );

                transaction.update(
                    bookingRef,
                    {
                        bookingStatus:
                            "payment_submitted",

                        paymentId:
                            paymentRef.id,

                        paymentStatus:
                            "submitted",

                        paymentAmount:
                            finalAmount,

                        "payment.status":
                            "submitted",

                        "payment.method":
                            "bank_transfer",

                        "payment.proofUrl":
                            slipUrl,

                        "payment.proofKey":
                            key,

                        "payment.paidAmount":
                            finalAmount,

                        "payment.paidAt":
                            now,

                        paymentSubmittedAt:
                            now,

                        paymentUploadLock:
                            FieldValue.delete(),

                        updatedAt:
                            now,
                    }
                );
            }
        );

        lockAcquired = false;


        /* =====================================================
           8. SUCCESS
        ===================================================== */

        return NextResponse.json(
            {
                success: true,

                paymentId:
                    paymentRef.id,

                bookingId,

                amount:
                    finalAmount,

                slipUrl,

                slipKey:
                    key,
            },
            {
                status: 201,
            }
        );

    } catch (error) {
        console.error(
            "Payment R2 upload error:",
            error
        );


        /* =====================================================
           9. RELEASE LOCK
           -----------------------------------------------------
           ถ้าระบบล้มก่อน commit สำเร็จ
           ต้องปล่อย lock เพื่อให้ลูกค้าลองใหม่ได้
        ===================================================== */

        if (
            lockAcquired &&
            bookingId &&
            lockToken
        ) {
            try {
                await adminDb.runTransaction(
                    async (transaction) => {
                        const bookingRef =
                            adminDb
                                .collection(
                                    BOOKING_COLLECTION
                                )
                                .doc(
                                    bookingId
                                );

                        const snapshot =
                            await transaction.get(
                                bookingRef
                            );

                        if (!snapshot.exists) {
                            return;
                        }

                        const booking =
                            snapshot.data() || {};

                        if (
                            booking.paymentUploadLock?.token ===
                            lockToken
                        ) {
                            transaction.update(
                                bookingRef,
                                {
                                    paymentUploadLock:
                                        FieldValue.delete(),

                                    updatedAt:
                                        FieldValue.serverTimestamp(),
                                }
                            );
                        }
                    }
                );
            } catch (unlockError) {
                console.error(
                    "Payment lock release failed:",
                    unlockError
                );
            }
        }


        /* =====================================================
           10. ROLLBACK R2
        ===================================================== */

        if (
            uploadedKey &&
            r2Client &&
            bucketName
        ) {
            try {
                await r2Client.send(
                    new DeleteObjectCommand({
                        Bucket:
                            bucketName,
                        Key:
                            uploadedKey,
                    })
                );
            } catch (rollbackError) {
                console.error(
                    "R2 rollback failed:",
                    rollbackError
                );
            }
        }


        const message =
            error instanceof Error
                ? error.message
                : "UNKNOWN_ERROR";

        if (
            message ===
            "BOOKING_NOT_FOUND"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ไม่พบรายการจองนี้ในระบบ",
                },
                { status: 404 }
            );
        }

        if (
            message ===
            "PAYMENT_ALREADY_SUBMITTED"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "รายการนี้มีการส่งหลักฐานหรือชำระเงินแล้ว ไม่สามารถส่งซ้ำได้",
                },
                { status: 409 }
            );
        }

        if (
            message ===
            "PAYMENT_UPLOAD_IN_PROGRESS"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "รายการนี้กำลังอัปโหลดหลักฐานอยู่ กรุณารอสักครู่",
                },
                { status: 409 }
            );
        }

        if (
            message ===
            "PAYMENT_LOCK_LOST"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "รายการชำระเงินถูกเปลี่ยนแปลง กรุณารีเฟรชแล้วตรวจสอบอีกครั้ง",
                },
                { status: 409 }
            );
        }

        if (
            message.includes(
                "R2 Environment Variables"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ระบบ R2 ยังตั้งค่าไม่ครบ",
                },
                { status: 500 }
            );
        }

        if (
            message.includes(
                "R2 Public URL"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "ระบบ R2 ยังไม่ได้ตั้งค่า Public URL",
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error:
                    "ไม่สามารถส่งหลักฐานการชำระเงินได้ กรุณาลองใหม่อีกครั้ง",
            },
            { status: 500 }
        );
    }
}
