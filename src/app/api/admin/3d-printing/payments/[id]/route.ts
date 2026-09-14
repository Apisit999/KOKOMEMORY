import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "threeDPayments";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

async function requireAdmin(
    request: Request
) {
    const authorization =
        request.headers.get("authorization");

    if (
        !authorization?.startsWith(
            "Bearer "
        )
    ) {
        throw new Error(
            "ไม่ได้รับสิทธิ์การเข้าสู่ระบบ"
        );
    }

    const token =
        authorization.slice(
            "Bearer ".length
        );

    /*
     * ใช้ Firebase Admin ที่มีอยู่แล้วในโปรเจกต์
     * แต่การตรวจสอบ token ต้องใช้ Admin Auth
     */
    const { getAuth } =
        await import("firebase-admin/auth");

    const adminAuth = getAuth();

    const decoded =
        await adminAuth.verifyIdToken(
            token
        );

    const adminSnapshot =
        await adminDb
            .collection("admins")
            .doc(decoded.uid)
            .get();

    if (!adminSnapshot.exists) {
        throw new Error(
            "บัญชีนี้ไม่มีสิทธิ์ Admin"
        );
    }

    const adminData =
        adminSnapshot.data();

    if (
        adminData?.role !== "admin" ||
        adminData?.active !== true
    ) {
        throw new Error(
            "บัญชีนี้ไม่มีสิทธิ์ Admin"
        );
    }

    return decoded;
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

        ...(typeof data.reference ===
        "string"
            ? {
                  reference:
                      data.reference,
              }
            : {}),

        ...(typeof data.note ===
        "string"
            ? {
                  note: data.note,
              }
            : {}),

        ...(typeof data.paidAt ===
        "string"
            ? {
                  paidAt: data.paidAt,
              }
            : {}),

        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

/* =========================================================
   PATCH
   PATCH /api/admin/3d-printing/payments/[id]
========================================================= */

export async function PATCH(
    request: Request,
    context: RouteContext
) {
    try {
        await requireAdmin(
            request
        );

        const { id } =
            await context.params;

        if (!id) {
            return NextResponse.json(
                {
                    error:
                        "ไม่พบ Payment ID",
                },
                {
                    status: 400,
                }
            );
        }

        const paymentRef =
            adminDb
                .collection(COLLECTION)
                .doc(id);

        const snapshot =
            await paymentRef.get();

        if (!snapshot.exists) {
            return NextResponse.json(
                {
                    error:
                        "ไม่พบ Payment",
                },
                {
                    status: 404,
                }
            );
        }

        const body =
            (await request.json()) as {
                status?: string;
            };

        const allowedStatuses = [
            "pending_verification",
            "verified",
            "rejected",
            "refunded",
        ];

        if (
            !body.status ||
            !allowedStatuses.includes(
                body.status
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

        await paymentRef.update({
            status: body.status,
            updatedAt:
                FieldValue.serverTimestamp(),
        });

        const updated =
            await paymentRef.get();

        return NextResponse.json({
            payment:
                normalizePayment(
                    updated.id,
                    updated.data() || {}
                ),
        });
    } catch (error) {
        console.error(
            "PATCH 3D payment error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "ไม่สามารถแก้ไข Payment ได้",
            },
            {
                status: 500,
            }
        );
    }
}