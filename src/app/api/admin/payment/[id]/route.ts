import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
    adminDb,
} from "@/lib/firebase-admin";

import {
    requireAdminApi,
} from "@/lib/require-admin-api";
import { isBookingHoldExpired } from "@/lib/booking-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params:
        | Promise<{
              id: string;
          }>
        | {
              id: string;
          };
};

type AdminAction =
    | "verify"
    | "reject";

export async function GET(
    request: Request,
    context: RouteContext,
) {
    try {
        await requireAdminApi(request);
        const params = await context.params;
        const paymentId = typeof params?.id === "string" ? params.id.trim() : "";

        if (!paymentId) {
            return jsonError("ไม่พบ Payment ID", 400, "MISSING_PAYMENT_ID");
        }

        const snapshot = await adminDb
            .collection("payments")
            .doc(paymentId)
            .get();

        if (!snapshot.exists) {
            return jsonError("ไม่พบ Payment รายการนี้", 404, "PAYMENT_NOT_FOUND");
        }

        return jsonSuccess({
            payment: { id: snapshot.id, ...snapshot.data() },
        });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        console.error("Admin payment detail error:", error);
        const code = error instanceof Error ? error.message : "DATABASE_ERROR";
        const status = ["MISSING_TOKEN", "INVALID_TOKEN", "UNAUTHORIZED"].includes(code)
            ? 401
            : code === "NOT_ADMIN" || code === "ADMIN_DISABLED"
                ? 403
                : 500;
        return NextResponse.json(
            { success: false, error: "ไม่สามารถโหลด Payment Detail ได้", code },
            { status },
        );
    }
}

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

function normalizeStatus(
    value: unknown,
): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function getNestedObject(
    value: unknown,
): Record<string, unknown> {
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value as Record<
            string,
            unknown
        >;
    }

    return {};
}

function getProofUrl(
    payment: Record<string, unknown>,
): string {
    const candidates = [
        payment.proofUrl,
        payment.slipUrl,
    ];

    for (const candidate of candidates) {
        if (
            typeof candidate === "string" &&
            candidate.trim()
        ) {
            return candidate.trim();
        }
    }

    return "";
}

function getPaymentAmount(
    payment: Record<string, unknown>,
    booking: Record<string, unknown>,
): number {
    

    const nestedBookingPayment = getNestedObject(booking.payment);
    const candidates = [
        payment.amount,
        payment.paidAmount,
        nestedBookingPayment.paidAmount,
        booking.paymentAmount,
        booking.paidAmount,
    ];

    for (const candidate of candidates) {
        const amount =
            typeof candidate === "number"
                ? candidate
                : Number(candidate);

        if (
            Number.isFinite(amount) &&
            amount >= 0
        ) {
            return amount;
        }
    }

    return 0;
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    try {
        const adminUser =
            await requireAdminApi(
                request,
            );

        const params =
            await context.params;

        const paymentId =
            typeof params?.id === "string"
                ? params.id.trim()
                : "";

        if (!paymentId) {
            return jsonError(
                "ไม่พบ Payment ID",
                400,
                "MISSING_PAYMENT_ID",
            );
        }

        let body: unknown = {};

        try {
            body =
                await request.json();
        } catch {
            body = {};
        }

        const bodyObject =
            getNestedObject(body);

        const action =
            normalizeStatus(
                bodyObject.action,
            ) as AdminAction;

        const requestedBookingId =
            typeof bodyObject.bookingId ===
            "string"
                ? bodyObject.bookingId.trim()
                : "";

        const reason =
            typeof bodyObject.reason ===
            "string"
                ? bodyObject.reason.trim()
                : "";

        if (
            action !== "verify" &&
            action !== "reject"
        ) {
            return jsonError(
                "คำสั่ง Payment ไม่ถูกต้อง",
                400,
                "INVALID_PAYMENT_ACTION",
            );
        }

        if (!requestedBookingId) {
            return jsonError(
                "ไม่พบ Booking ID",
                400,
                "MISSING_BOOKING_ID",
            );
        }

        if (
            action === "reject" &&
            !reason
        ) {
            return jsonError(
                "กรุณาระบุเหตุผลที่ปฏิเสธหลักฐานการชำระเงิน",
                400,
                "REJECT_REASON_REQUIRED",
            );
        }

        const paymentRef =
            adminDb
                .collection("payments")
                .doc(paymentId);

        const bookingRef =
            adminDb
                .collection("bookings")
                .doc(requestedBookingId);
        let expiredDuringRequest = false;

        const result =
            await adminDb.runTransaction(
                async (
                    transaction,
                ) => {
                    /*
                     * IMPORTANT:
                     * Firestore transaction:
                     * read everything first,
                     * then write.
                     */
                    const paymentSnapshot =
                        await transaction.get(
                            paymentRef,
                        );

                    const bookingSnapshot =
                        await transaction.get(
                            bookingRef,
                        );

                    if (
                        !paymentSnapshot.exists
                    ) {
                        throw new Error(
                            "PAYMENT_NOT_FOUND",
                        );
                    }

                    if (
                        !bookingSnapshot.exists
                    ) {
                        throw new Error(
                            "BOOKING_NOT_FOUND",
                        );
                    }

                    const payment =
                        paymentSnapshot.data() ||
                        {};

                    const booking =
                        bookingSnapshot.data() ||
                        {};

                    /*
                     * Verify that this Payment
                     * belongs to this Booking.
                     */
                    const paymentBookingId =
                        typeof payment.bookingId ===
                        "string"
                            ? payment.bookingId.trim()
                            : "";

                    const bookingPaymentId =
                        typeof booking.paymentId ===
                        "string"
                            ? booking.paymentId.trim()
                            : "";

                    if (
                        paymentBookingId !==
                            requestedBookingId
                    ) {
                        throw new Error(
                            "PAYMENT_BOOKING_MISMATCH",
                        );
                    }

                    if (
                        bookingPaymentId !==
                            paymentId
                    ) {
                        throw new Error(
                            "BOOKING_PAYMENT_MISMATCH",
                        );
                    }

                    const currentStatus =
                        normalizeStatus(
                            payment.status,
                        );

                    if (booking.bookingStatus === "pending_payment" && isBookingHoldExpired(booking.holdExpiresAt?.toDate?.() ?? booking.holdExpiresAt)) {
                        const eventDate = typeof booking.event?.date === "string" ? booking.event.date : "";
                        if (eventDate) {
                            const dateRef = adminDb.collection("bookingDates").doc(eventDate);
                            const dateSnap = await transaction.get(dateRef);
                            if (dateSnap.exists && dateSnap.data()?.bookingId === bookingRef.id) transaction.update(dateRef, { status: "released", updatedAt: FieldValue.serverTimestamp() });
                        }
                        transaction.update(bookingRef, { bookingStatus: "expired", expiredAt: FieldValue.serverTimestamp(), expiredBy: "system", updatedAt: FieldValue.serverTimestamp() });
                        expiredDuringRequest = true;
                        return { expired: true };
                    }

                    /*
                     * Never allow a verified payment
                     * to be changed from this endpoint.
                     */
                    if (
                        currentStatus ===
                        "verified"
                    ) {
                        throw new Error(
                            "PAYMENT_ALREADY_VERIFIED",
                        );
                    }

                    if (!["submitted", "pending", "pending_verification"].includes(currentStatus) ||
                        ["cancelled", "canceled", "expired"].includes(booking.bookingStatus) ||
                        booking.payment?.status === "verified") {
                        throw new Error("PAYMENT_STATE_NOT_ALLOWED");
                    }
                    const proofUrl =
                        getProofUrl(
                            payment,
                        );

                    if (!proofUrl) {
                        throw new Error(
                            "PAYMENT_PROOF_REQUIRED",
                        );
                    }

                    const amount =
                        getPaymentAmount(
                            payment,
                            booking,
                        );

                    const nestedBookingPayment =
                        getNestedObject(
                            booking.payment,
                        );

                    const now =
                        FieldValue.serverTimestamp();

                    if (
                        action === "verify"
                    ) {
                        transaction.update(
                            paymentRef,
                            {
                                status:
                                    "verified",
                                verifiedAt:
                                    now,
                                verifiedBy:
                                    adminUser.email ||
                                    adminUser.uid,
                                updatedAt:
                                    now,
                            },
                        );

                        transaction.update(
                            bookingRef,
                            {
                                bookingStatus:
                                    "confirmed",
                                paymentStatus:
                                    "verified",
                                paymentId:
                                    paymentId,
                                paymentAmount:
                                    amount,
                                "payment.status":
                                    "verified",
                                "payment.paidAmount":
                                    amount,
                                "payment.paidAt":
                                    now,
                                "payment.verifiedAt":
                                    now,
                                "payment.verifiedBy":
                                    adminUser.email ||
                                    adminUser.uid,
                                updatedAt:
                                    now,
                            },
                        );

                        const auditRef =
                            adminDb
                                .collection(
                                    "auditLogs",
                                )
                                .doc();

                        transaction.set(
                            auditRef,
                            {
                                action:
                                    "VERIFY_PAYMENT",
                                resource:
                                    "payment",
                                paymentId,
                                bookingId:
                                    requestedBookingId,
                                amount,
                                adminUid:
                                    adminUser.uid,
                                adminEmail:
                                    adminUser.email ||
                                    null,
                                createdAt:
                                    now,
                            },
                        );

                        return {
                            paymentId,
                            bookingId:
                                requestedBookingId,
                            paymentStatus:
                                "verified",
                            bookingStatus:
                                "confirmed",
                            paymentAmount:
                                amount,
                        };
                    }

                    transaction.update(
                        paymentRef,
                        {
                            status:
                                "rejected",
                            rejectReason:
                                reason,
                            rejectedAt:
                                now,
                            rejectedBy:
                                adminUser.email ||
                                adminUser.uid,
                            updatedAt:
                                now,
                        },
                    );

                    transaction.update(
                        bookingRef,
                        {
                            bookingStatus:
                                "payment_rejected",
                            paymentStatus:
                                "rejected",
                            "payment.status":
                                "rejected",
                            "payment.rejectReason":
                                reason,
                            updatedAt:
                                now,
                        },
                    );

                    const auditRef =
                        adminDb
                            .collection(
                                "auditLogs",
                            )
                            .doc();

                    transaction.set(
                        auditRef,
                        {
                            action:
                                "REJECT_PAYMENT",
                            resource:
                                "payment",
                            paymentId,
                            bookingId:
                                requestedBookingId,
                            amount,
                            reason,
                            adminUid:
                                adminUser.uid,
                            adminEmail:
                                adminUser.email ||
                                null,
                            createdAt:
                                now,
                        },
                    );

                    return {
                        paymentId,
                        bookingId:
                            requestedBookingId,
                        paymentStatus:
                            "rejected",
                        bookingStatus:
                            "payment_rejected",
                        paymentAmount:
                            amount,
                    };
                },
            );

        if (expiredDuringRequest) throw new Error("BOOKING_EXPIRED");
        return jsonSuccess({
            message:
                action === "verify"
                    ? "ยืนยันการชำระเงินเรียบร้อยแล้ว"
                    : "ปฏิเสธหลักฐานการชำระเงินเรียบร้อยแล้ว",
            ...result,
        });
    } catch (
        error: unknown
    ) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        console.error(
            "Admin payment action error:",
            error,
        );

        const code =
            error instanceof Error
                ? error.message
                : "UNKNOWN_ERROR";

        switch (code) {
            case "PAYMENT_NOT_FOUND":
                return jsonError(
                    "ไม่พบ Payment รายการนี้",
                    404,
                    code,
                );

            case "BOOKING_NOT_FOUND":
                return jsonError(
                    "ไม่พบ Booking รายการนี้",
                    404,
                    code,
                );

            case "PAYMENT_BOOKING_MISMATCH":
            case "BOOKING_PAYMENT_MISMATCH":
                return jsonError(
                    "Payment ไม่ตรงกับ Booking นี้ ระบบหยุดการทำรายการเพื่อความปลอดภัย",
                    409,
                    code,
                );

            case "PAYMENT_STATE_NOT_ALLOWED":
            case "PAYMENT_ALREADY_VERIFIED":
                return jsonError(
                    "Payment รายการนี้ถูกยืนยันแล้ว ไม่สามารถแก้ไขซ้ำได้",
                    409,
                    code,
                );

            case "PAYMENT_PROOF_REQUIRED":
                return jsonError(
                    "ไม่พบหลักฐานการชำระเงิน",
                    400,
                    code,
                );

            case "INVALID_PAYMENT_ACTION":
                return jsonError(
                    "คำสั่ง Payment ไม่ถูกต้อง",
                    400,
                    code,
                );

            case "MISSING_PAYMENT_ID":
            case "MISSING_BOOKING_ID":
            case "REJECT_REASON_REQUIRED":
                return jsonError(
                    "ข้อมูลสำหรับทำรายการไม่ครบ",
                    400,
                    code,
                );

            case "MISSING_TOKEN":
            case "INVALID_AUTH_HEADER":
            case "INVALID_TOKEN":
            case "UNAUTHORIZED":
                return jsonError(
                    "ไม่ได้รับอนุญาต",
                    401,
                    code,
                );

            case "NOT_ADMIN":
                return jsonError(
                    "บัญชีนี้ไม่มีสิทธิ์ Admin",
                    403,
                    code,
                );

            case "ADMIN_DISABLED":
                return jsonError(
                    "บัญชี Admin ถูกปิดใช้งาน",
                    403,
                    code,
                );

            default:
                return jsonError(
                    "ไม่สามารถดำเนินการกับ Payment ได้ กรุณาตรวจสอบ Terminal",
                    500,
                    code,
                );
        }
    }
}
