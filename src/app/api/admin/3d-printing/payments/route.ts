import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

const COLLECTION = "threeDPayments";

async function requireAdmin(request: Request) {
    return requireAdminApi(request);
}

function normalizePayment(
    id: string,
    data: FirebaseFirestore.DocumentData
) {
    return {
        id,

        orderId: String(
            data.orderId || ""
        ),

        orderNumber: String(
            data.orderNumber || ""
        ),

        amount:
            Number(data.amount) || 0,

        method: data.method,

        status: data.status,

        ...(typeof data.reference === "string"
            ? {
                  reference: data.reference,
              }
            : {}),

        ...(typeof data.note === "string"
            ? {
                  note: data.note,
              }
            : {}),

        ...(typeof data.paidAt === "string"
            ? {
                  paidAt: data.paidAt,
              }
            : {}),

        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

function getTimestampMillis(value: unknown) {
    if (!value) {
        return 0;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof value.toMillis === "function"
    ) {
        return value.toMillis();
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "_seconds" in value &&
        typeof value._seconds === "number"
    ) {
        const nanoseconds =
            "_nanoseconds" in value &&
            typeof value._nanoseconds === "number"
                ? value._nanoseconds
                : 0;

        return (
            value._seconds * 1000 +
            nanoseconds / 1_000_000
        );
    }

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        const time = new Date(value).getTime();

        return Number.isNaN(time)
            ? 0
            : time;
    }

    return 0;
}

/* =========================================================
   GET
   GET /api/admin/3d-printing/payments
   GET /api/admin/3d-printing/payments?orderId=xxx

   NOTE:
   ไม่ใช้ orderBy(createdAt) ร่วมกับ where(orderId)
   เพราะ Firestore จะบังคับ Composite Index

   เราดึงเฉพาะ Payment ของ Order แล้ว sort
   ที่ Server แทน เพื่อไม่ต้องสร้าง Index เพิ่ม
========================================================= */

export async function GET(request: Request) {
    try {
        await requireAdmin(request);

        const url = new URL(request.url);

        const orderId =
            url.searchParams.get("orderId");

        let query: FirebaseFirestore.Query =
            adminDb.collection(COLLECTION);

        if (orderId) {
            query = query.where(
                "orderId",
                "==",
                orderId
            );
        }

        const snapshot = await query.get();

        const payments = snapshot.docs
            .map((doc) =>
                normalizePayment(
                    doc.id,
                    doc.data()
                )
            )
            .sort(
                (a, b) =>
                    getTimestampMillis(b.createdAt) -
                    getTimestampMillis(a.createdAt)
            );

        return NextResponse.json({
            payments,
        });
    } catch (error) {
        const denied = authErrorResponse(error);

        if (denied) return denied;

        console.error(
            "GET 3D payments error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "ไม่สามารถโหลด Payment ได้",
            },
            {
                status: 500,
            }
        );
    }
}

/* =========================================================
   POST
   POST /api/admin/3d-printing/payments
========================================================= */

export async function POST(request: Request) {
    try {
        // รับข้อมูล Admin เพื่อใช้บันทึก auditLogs
        const admin = await requireAdmin(request);

        const body =
            (await request.json()) as {
                orderId?: string;
                orderNumber?: string;
                amount?: number;
                method?: string;
                status?: string;
                reference?: string;
                note?: string;
                paidAt?: string;
            };

        const orderId =
            String(
                body.orderId || ""
            ).trim();

        const orderNumber =
            String(
                body.orderNumber || ""
            ).trim();

        const amount =
            Number(body.amount);

        const method =
            String(
                body.method || ""
            );

        const status =
            String(
                body.status || ""
            );

        if (!orderId) {
            return NextResponse.json(
                {
                    error:
                        "กรุณาระบุ Order ID",
                },
                {
                    status: 400,
                }
            );
        }

        if (!orderNumber) {
            return NextResponse.json(
                {
                    error:
                        "กรุณาระบุเลข Order",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "จำนวนเงินไม่ถูกต้อง",
                },
                {
                    status: 400,
                }
            );
        }

        const allowedMethods = [
            "bank_transfer",
            "promptpay",
            "cash",
            "other",
        ];

        if (
            !allowedMethods.includes(
                method
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "วิธีชำระเงินไม่ถูกต้อง",
                },
                {
                    status: 400,
                }
            );
        }

        const allowedStatuses = [
            "pending_verification",
            "verified",
            "rejected",
            "refunded",
        ];

        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "สถานะ Payment ไม่ถูกต้อง",
                },
                {
                    status: 400,
                }
            );
        }

        const orderRef =
            adminDb
                .collection(
                    "threeDOrders"
                )
                .doc(orderId);

        const orderSnapshot =
            await orderRef.get();

        if (!orderSnapshot.exists) {
            return NextResponse.json(
                {
                    error:
                        "ไม่พบ Order ที่ระบุ",
                },
                {
                    status: 404,
                }
            );
        }

        const paymentRef =
            adminDb
                .collection(
                    COLLECTION
                )
                .doc();

        const paymentData: Record<
            string,
            unknown
        > = {
            orderId,
            orderNumber,
            amount,
            method,
            status,
            createdAt:
                FieldValue.serverTimestamp(),
            updatedAt:
                FieldValue.serverTimestamp(),
        };

        if (
            typeof body.reference ===
                "string" &&
            body.reference.trim()
        ) {
            paymentData.reference =
                body.reference.trim();
        }

        if (
            typeof body.note ===
                "string" &&
            body.note.trim()
        ) {
            paymentData.note =
                body.note.trim();
        }

        if (
            typeof body.paidAt ===
                "string" &&
            body.paidAt.trim()
        ) {
            paymentData.paidAt =
                body.paidAt.trim();
        }

        await adminDb.runTransaction(
            async (transaction) => {
                const latestOrder =
                    await transaction.get(
                        orderRef
                    );

                if (!latestOrder.exists) {
                    throw new Error(
                        "ORDER_NOT_FOUND"
                    );
                }

                const latestOrderNumber =
                    latestOrder.data()
                        ?.orderNumber ||
                    orderNumber;

                transaction.create(
                    paymentRef,
                    {
                        ...paymentData,
                        orderNumber:
                            latestOrderNumber,
                    }
                );

                transaction.set(
                    adminDb
                        .collection(
                            "auditLogs"
                        )
                        .doc(),
                    {
                        action:
                            "CREATE_3D_PAYMENT",
                        paymentId:
                            paymentRef.id,
                        orderId,
                        amount,
                        status,
                        adminUid:
                            admin.uid,
                        createdAt:
                            FieldValue.serverTimestamp(),
                    }
                );
            }
        );

        const createdSnapshot =
            await paymentRef.get();

        return NextResponse.json(
            {
                payment:
                    normalizePayment(
                        createdSnapshot.id,
                        createdSnapshot.data() ||
                            {}
                    ),
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        const denied =
            authErrorResponse(error);

        if (denied) return denied;

        console.error(
            "POST 3D payment error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "ไม่สามารถสร้าง Payment ได้",
            },
            {
                status: 500,
            }
        );
    }
}