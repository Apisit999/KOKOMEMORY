import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

const COLLECTION = "threeDPayments";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

async function requireAdmin(
    request: Request
) {
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
        const admin = await requireAdmin(
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
            "submitted",
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

        await adminDb.runTransaction(async transaction => {
            const latest = await transaction.get(paymentRef);
            if (!latest.exists) throw new Error("PAYMENT_NOT_FOUND");
            const current = latest.data() || {};
            if (current.status === body.status) return;
            if (current.status === "refunded" || (current.status === "verified" && body.status !== "refunded")) {
                throw new Error("PAYMENT_STATUS_PROTECTED");
            }
            const orderId = typeof current.orderId === "string" ? current.orderId : "";
            const orderRef = adminDb.collection("threeDOrders").doc(orderId);
            const order = await transaction.get(orderRef);
            if (!order.exists) throw new Error("ORDER_NOT_FOUND");
            const orderData = order.data() || {};
            if (body.status === "verified") {
                const authoritativeAmount = Number(orderData.totalPrice);
                if (!Number.isFinite(authoritativeAmount) || Number(current.amount) !== authoritativeAmount) throw new Error("PAYMENT_AMOUNT_MISMATCH");
                transaction.update(orderRef, { paidAmount: authoritativeAmount, remainingAmount: 0, paymentStatus: "paid", orderStatus: orderData.orderStatus === "pending_payment" ? "paid" : orderData.orderStatus, updatedAt: FieldValue.serverTimestamp() });
            } else if (body.status === "rejected") {
                transaction.update(orderRef, { paymentStatus: "unpaid", updatedAt: FieldValue.serverTimestamp() });
            }
            transaction.update(paymentRef, { status: body.status, updatedAt: FieldValue.serverTimestamp() });
            transaction.set(adminDb.collection("auditLogs").doc(), { action: body.status === "verified" ? "3d_payment_verified" : body.status === "rejected" ? "3d_payment_rejected" : "UPDATE_3D_PAYMENT_STATUS", paymentId: id, orderId, previousStatus: current.status, status: body.status, adminUid: admin.uid, amount: Number(current.amount) || 0, createdAt: FieldValue.serverTimestamp() });
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
        if (error instanceof Error && error.message === "PAYMENT_STATUS_PROTECTED") return NextResponse.json({ error: error.message }, { status: 409 });
        if (error instanceof Error && ["PAYMENT_AMOUNT_MISMATCH", "ORDER_NOT_FOUND"].includes(error.message)) return NextResponse.json({ error: error.message, code: error.message }, { status: error.message === "ORDER_NOT_FOUND" ? 404 : 409 });
        const denied = authErrorResponse(error);
        if (denied) return denied;
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
