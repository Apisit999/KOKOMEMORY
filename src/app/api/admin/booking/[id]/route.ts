import { NextResponse } from "next/server";

import {
    FieldValue,
    type DocumentData,
    type DocumentReference,
    type DocumentSnapshot,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/* ============================================================
   TYPES
============================================================ */

type RouteContext = {
    params:
        | Promise<{
              id: string;
          }>
        | {
              id: string;
          };
};

type AdminUser = {
    uid: string;
    email?: string | null;
};


/* ============================================================
   COLLECTIONS
============================================================ */

const BOOKING_COLLECTION =
    "bookings";

const BOOKING_DATE_COLLECTION =
    "bookingDates";

const PAYMENT_COLLECTION =
    "payments";

const AUDIT_COLLECTION =
    "auditLogs";


/* ============================================================
   RESPONSE HELPERS
============================================================ */

function jsonError(
    error: string,
    status: number,
    code: string,
) {
    return NextResponse.json(
        {
            success: false,
            error,
            code,
        },
        {
            status,
        },
    );
}


function jsonSuccess(
    data: Record<string, unknown>,
) {
    return NextResponse.json(
        {
            success: true,
            ...data,
        },
        {
            status: 200,
        },
    );
}


/* ============================================================
   HELPERS
============================================================ */

function normalizeStatus(
    value: unknown,
): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function getNestedPayment(
    booking: Record<string, unknown>,
): Record<string, unknown> {
    const payment =
        booking.payment;

    if (
        payment &&
        typeof payment === "object" &&
        !Array.isArray(payment)
    ) {
        return payment as Record<
            string,
            unknown
        >;
    }

    return {};
}


function getPaidAmount(
    booking: Record<string, unknown>,
): number {
    const payment =
        getNestedPayment(booking);

    const candidates = [
        payment.paidAmount,
        booking.paidAmount,
        booking.paymentAmount,
    ];

    for (
        const candidate of candidates
    ) {
        const amount =
            typeof candidate ===
            "number"
                ? candidate
                : Number(candidate);

        if (
            Number.isFinite(amount) &&
            amount > 0
        ) {
            return amount;
        }
    }

    return 0;
}


/* ============================================================
   PAYMENT PROTECTION
   ------------------------------------------------------------
   ถ้ามีหลักฐานการชำระเงินแล้ว
   ห้ามลบ Booking ถาวร
============================================================ */

function isPaymentProtected(
    booking: Record<string, unknown>,
): boolean {
    const payment =
        getNestedPayment(
            booking,
        );

    const bookingStatus =
        normalizeStatus(
            booking.bookingStatus,
        );

    const paymentStatus =
        normalizeStatus(
            payment.status ??
                booking.paymentStatus,
        );


    /*
     * --------------------------------------------------------
     * Payment ID
     * --------------------------------------------------------
     */

    if (
        typeof booking.paymentId ===
            "string" &&
        booking.paymentId.trim()
    ) {
        return true;
    }


    /*
     * --------------------------------------------------------
     * Payment Proof
     * --------------------------------------------------------
     */

    if (
        payment.proofUrl
    ) {
        return true;
    }


    /*
     * --------------------------------------------------------
     * Payment Timestamps
     * --------------------------------------------------------
     */

    if (
        payment.paidAt ||
        payment.submittedAt ||
        payment.verifiedAt
    ) {
        return true;
    }


    /*
     * --------------------------------------------------------
     * Paid Amount
     * --------------------------------------------------------
     */

    if (
        getPaidAmount(
            booking,
        ) > 0
    ) {
        return true;
    }


    /*
     * --------------------------------------------------------
     * Payment Status
     * --------------------------------------------------------
     */

    if (
        paymentStatus ===
            "submitted" ||
        paymentStatus ===
            "pending" ||
        paymentStatus ===
            "pending_verification" ||
        paymentStatus ===
            "verified" ||
        paymentStatus ===
            "paid"
    ) {
        return true;
    }


    /*
     * --------------------------------------------------------
     * Booking Status
     * --------------------------------------------------------
     */

    if (
        bookingStatus ===
            "payment_submitted" ||
        bookingStatus ===
            "payment_verified" ||
        bookingStatus ===
            "confirmed"
    ) {
        return true;
    }


    return false;
}


/* ============================================================
   DELETE POLICY
============================================================ */

function canDeleteBooking(
    booking: Record<string, unknown>,
): boolean {

    /*
     * Payment protection
     */
    if (
        isPaymentProtected(
            booking,
        )
    ) {
        return false;
    }


    const status =
        normalizeStatus(
            booking.bookingStatus,
        );


    /*
     * Hard Delete อนุญาตเฉพาะ
     * ข้อมูลที่ยังไม่ชำระเงิน / ข้อมูล Test
     */
    return (
        status === "" ||
        status ===
            "pending_payment" ||
        status ===
            "cancelled" ||
        status ===
            "canceled"
    );
}


/* ============================================================
   EVENT DATE
============================================================ */

function getEventDate(
    booking: Record<string, unknown>,
): string {
    const event =
        booking.event;

    if (
        !event ||
        typeof event !== "object" ||
        Array.isArray(event)
    ) {
        return "";
    }

    const eventData =
        event as Record<
            string,
            unknown
        >;

    return typeof eventData.date ===
        "string"
        ? eventData.date.trim()
        : "";
}


/* ============================================================
   ERROR CODE
============================================================ */

function getErrorCode(
    error: unknown,
): string {
    if (
        error instanceof Error
    ) {
        return error.message;
    }

    return "";
}


/* ============================================================
   DELETE BOOKING
============================================================ */

export async function DELETE(
    request: Request,
    context: RouteContext,
) {
    try {

        /* ======================================================
           1. ADMIN AUTHENTICATION
        ====================================================== */

        const adminUser =
            (await requireAdminApi(
                request,
            )) as AdminUser;


        if (
            !adminUser ||
            !adminUser.uid
        ) {
            return jsonError(
                "ไม่พบสิทธิ์ Admin",
                403,
                "NOT_ADMIN",
            );
        }


        /* ======================================================
           2. BOOKING ID
        ====================================================== */

        const params =
            await context.params;

        const bookingId =
            typeof params?.id ===
            "string"
                ? params.id.trim()
                : "";


        if (!bookingId) {
            return jsonError(
                "ไม่พบ Booking ID",
                400,
                "MISSING_BOOKING_ID",
            );
        }


        /* ======================================================
           3. CONFIRMATION
        ====================================================== */

        let body: unknown =
            {};


        const contentType =
            request.headers.get(
                "content-type",
            ) || "";


        if (
            contentType
                .toLowerCase()
                .includes(
                    "application/json",
                )
        ) {
            try {
                body =
                    await request.json();
            } catch {
                body = {};
            }
        }


        const confirmation =
            body &&
            typeof body ===
                "object" &&
            !Array.isArray(body)
                ? (
                      body as {
                          confirmation?: unknown;
                      }
                  ).confirmation
                : undefined;


        if (
            typeof confirmation !==
                "string" ||
            confirmation
                .trim()
                .toUpperCase() !==
                "DELETE"
        ) {
            return jsonError(
                'กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบ',
                400,
                "DELETE_CONFIRMATION_REQUIRED",
            );
        }


        /* ======================================================
           4. BOOKING REFERENCE
        ====================================================== */

        const bookingRef =
            adminDb
                .collection(
                    BOOKING_COLLECTION,
                )
                .doc(
                    bookingId,
                );


        /* ======================================================
           5. FIRESTORE TRANSACTION
        ====================================================== */

        const result =
            await adminDb.runTransaction(
                async (
                    transaction,
                ) => {

                    /*
                     * IMPORTANT:
                     *
                     * Firestore Transaction
                     * ต้องอ่านข้อมูลให้เสร็จก่อน
                     * จึงค่อยเริ่มเขียน / ลบ
                     */


                    /* ==========================================
                       BOOKING
                    ========================================== */

                    const bookingSnapshot =
                        await transaction.get(
                            bookingRef,
                        );


                    if (
                        !bookingSnapshot.exists
                    ) {
                        throw new Error(
                            "BOOKING_NOT_FOUND",
                        );
                    }


                    const booking =
                        bookingSnapshot.data() as Record<
                            string,
                            unknown
                        >;


                    /* ==========================================
                       LATEST PAYMENT CHECK
                    ========================================== */

                    if (
                        isPaymentProtected(
                            booking,
                        )
                    ) {
                        throw new Error(
                            "BOOKING_PAYMENT_PROTECTED",
                        );
                    }


                    /* ==========================================
                       DELETE POLICY
                    ========================================== */

                    if (
                        !canDeleteBooking(
                            booking,
                        )
                    ) {
                        throw new Error(
                            "BOOKING_DELETE_NOT_ALLOWED",
                        );
                    }


                    /* ==========================================
                       PAYMENT RECORD
                    ========================================== */

                    const paymentId =
                        typeof booking.paymentId ===
                            "string"
                            ? booking.paymentId.trim()
                            : "";


                    let paymentSnapshot:
                        DocumentSnapshot<DocumentData> |
                        null =
                        null;


                    let paymentRef:
                        DocumentReference<DocumentData> |
                        null =
                        null;


                    if (
                        paymentId
                    ) {

                        paymentRef =
                            adminDb
                                .collection(
                                    PAYMENT_COLLECTION,
                                )
                                .doc(
                                    paymentId,
                                );


                        paymentSnapshot =
                            await transaction.get(
                                paymentRef,
                            );


                        /*
                         * ถ้ามี Payment Record จริง
                         * ห้ามลบ
                         */

                        if (
                            paymentSnapshot.exists
                        ) {
                            throw new Error(
                                "BOOKING_PAYMENT_RECORD_EXISTS",
                            );
                        }
                    }


                    /* ==========================================
                       DATE LOCK
                    ========================================== */

                    const eventDate =
                        getEventDate(
                            booking,
                        );


                    let dateLockRef:
                        DocumentReference<DocumentData> |
                        null =
                        null;


                    let dateLockSnapshot:
                        DocumentSnapshot<DocumentData> |
                        null =
                        null;


                    if (
                        eventDate
                    ) {

                        dateLockRef =
                            adminDb
                                .collection(
                                    BOOKING_DATE_COLLECTION,
                                )
                                .doc(
                                    eventDate,
                                );


                        dateLockSnapshot =
                            await transaction.get(
                                dateLockRef,
                            );
                    }


                    /* ==========================================
                       VERIFY DATE LOCK OWNERSHIP
                    ========================================== */

                    let dateLockDeleted =
                        false;


                    if (
                        dateLockSnapshot?.exists &&
                        dateLockRef
                    ) {

                        const lockData =
                            dateLockSnapshot.data() ||
                            {};


                        const lockedBookingId =
                            typeof lockData.bookingId ===
                                "string"
                                ? lockData.bookingId.trim()
                                : "";


                        /*
                         * ถ้า Date Lock เป็นของ Booking อื่น
                         * หยุดทันที
                         */

                        if (
                            lockedBookingId &&
                            lockedBookingId !==
                                bookingId
                        ) {
                            throw new Error(
                                "DATE_LOCK_OWNED_BY_OTHER",
                            );
                        }


                        /*
                         * ลบ Date Lock เฉพาะกรณี
                         * พิสูจน์ได้ว่าเป็นของ Booking นี้
                         */

                        if (
                            lockedBookingId ===
                            bookingId
                        ) {

                            transaction.delete(
                                dateLockRef,
                            );

                            dateLockDeleted =
                                true;
                        }
                    }


                    /* ==========================================
                       DELETE BOOKING
                    ========================================== */

                    transaction.delete(
                        bookingRef,
                    );


                    /* ==========================================
                       AUDIT LOG
                    ========================================== */

                    const auditRef =
                        adminDb
                            .collection(
                                AUDIT_COLLECTION,
                            )
                            .doc();


                    transaction.set(
                        auditRef,
                        {
                            action:
                                "DELETE_BOOKING",

                            resource:
                                "booking",

                            bookingId,

                            adminUid:
                                adminUser.uid,

                            adminEmail:
                                adminUser.email ||
                                null,

                            eventDate:
                                eventDate ||
                                null,

                            dateLockDeleted,

                            createdAt:
                                FieldValue.serverTimestamp(),
                        },
                    );


                    return {
                        bookingId,

                        eventDate:
                            eventDate ||
                            null,

                        dateLockDeleted,
                    };
                },
            );


        /* ======================================================
           6. SUCCESS RESPONSE
        ====================================================== */

        return jsonSuccess({

            message:
                "ลบข้อมูล Booking เรียบร้อยแล้ว",

            bookingId:
                result.bookingId,

            eventDate:
                result.eventDate,

            dateLockDeleted:
                result.dateLockDeleted,

        });

    } catch (
        error: unknown
    ) {

        console.error(
            "Admin delete booking error:",
            error,
        );


        const code =
            getErrorCode(
                error,
            );


        /* ======================================================
           BOOKING NOT FOUND
        ====================================================== */

        if (
            code ===
            "BOOKING_NOT_FOUND"
        ) {
            return jsonError(
                "ไม่พบ Booking นี้แล้ว",
                404,
                "BOOKING_NOT_FOUND",
            );
        }


        /* ======================================================
           PAYMENT PROTECTED
        ====================================================== */

        if (
            code ===
                "BOOKING_PAYMENT_PROTECTED" ||
            code ===
                "BOOKING_PAYMENT_RECORD_EXISTS"
        ) {
            return jsonError(
                "Booking นี้มีข้อมูลการชำระเงินหรือ Payment Record แล้ว ระบบจึงป้องกันการลบถาวร",
                409,
                "BOOKING_PAYMENT_PROTECTED",
            );
        }


        /* ======================================================
           DELETE NOT ALLOWED
        ====================================================== */

        if (
            code ===
            "BOOKING_DELETE_NOT_ALLOWED"
        ) {
            return jsonError(
                "สถานะของ Booking นี้ไม่อนุญาตให้ลบถาวร",
                409,
                "BOOKING_DELETE_NOT_ALLOWED",
            );
        }


        /* ======================================================
           DATE LOCK CONFLICT
        ====================================================== */

        if (
            code ===
            "DATE_LOCK_OWNED_BY_OTHER"
        ) {
            return jsonError(
                "ตัวล็อกวันที่เป็นของ Booking อื่น ระบบหยุดการลบเพื่อป้องกันข้อมูลเสียหาย",
                409,
                "DATE_LOCK_OWNED_BY_OTHER",
            );
        }


        /* ======================================================
           DELETE CONFIRMATION
        ====================================================== */

        if (
            code ===
            "DELETE_CONFIRMATION_REQUIRED"
        ) {
            return jsonError(
                'กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบ',
                400,
                "DELETE_CONFIRMATION_REQUIRED",
            );
        }


        /* ======================================================
           AUTH ERRORS
        ====================================================== */

        if (
            code ===
                "UNAUTHORIZED" ||
            code ===
                "INVALID_AUTH_HEADER" ||
            code ===
                "MISSING_TOKEN" ||
            code ===
                "INVALID_TOKEN"
        ) {
            return jsonError(
                "กรุณาเข้าสู่ระบบ Admin ใหม่",
                401,
                code,
            );
        }


        /* ======================================================
           ADMIN PERMISSION
        ====================================================== */

        if (
            code ===
                "FORBIDDEN" ||
            code ===
                "NOT_ADMIN"
        ) {
            return jsonError(
                "บัญชีนี้ไม่มีสิทธิ์ Admin",
                403,
                code,
            );
        }


        /* ======================================================
           DISABLED ACCOUNT
        ====================================================== */

        if (
            code ===
                "ADMIN_DISABLED" ||
            code ===
                "ACCOUNT_DISABLED"
        ) {
            return jsonError(
                "บัญชี Admin ถูกปิดการใช้งาน",
                403,
                code,
            );
        }


        /* ======================================================
           UNKNOWN ERROR
        ====================================================== */

        return jsonError(
            "ไม่สามารถลบ Booking ได้ กรุณาตรวจสอบ Terminal ของ Next.js",
            500,
            "DELETE_BOOKING_FAILED",
        );
    }
}