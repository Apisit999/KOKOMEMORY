import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";
import type {
    ThreeDOrder,
    ThreeDOrderCustomer,
    ThreeDOrderInput,
    ThreeDOrderItem,
    ThreeDOrderPaymentMethod,
    ThreeDOrderStatus,
    ThreeDPaymentStatus,
    ThreeDShippingAddress,
} from "@/types/threeDOrder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ id: string }>;
};

const ORDER_COLLECTION = "threeDOrders";
const PRODUCT_COLLECTION = "threeDProducts";

const VALID_ORDER_STATUSES: ThreeDOrderStatus[] = [
    "quote",
    "pending_confirmation",
    "pending_payment",
    "paid",
    "waiting_payment",
    "queued",
    "printing",
    "quality_check",
    "ready",
    "shipping",
    "completed",
    "cancelled",
];

const VALID_PAYMENT_METHODS: ThreeDOrderPaymentMethod[] = [
    "bank_transfer",
    "promptpay",
    "cash",
    "other",
];

const VALID_PAYMENT_STATUSES: ThreeDPaymentStatus[] = [
    "unpaid",
    "pending_verification",
    "partial",
    "paid",
    "refunded",
];

function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown, fallback = 0): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function normalizeCustomer(value: unknown): ThreeDOrderCustomer {
    if (!value || typeof value !== "object") {
        return {
            name: "",
            phone: "",
        };
    }

    const customer = value as Record<string, unknown>;

    return {
        name:
            typeof customer.name === "string"
                ? customer.name
                : "",
        phone:
            typeof customer.phone === "string"
                ? customer.phone
                : "",
        ...(typeof customer.email === "string" &&
        customer.email.trim()
            ? { email: customer.email.trim() }
            : {}),
        ...(typeof customer.line === "string" &&
        customer.line.trim()
            ? { line: customer.line.trim() }
            : {}),
    };
}

function normalizeShippingAddress(
    value: unknown,
): ThreeDShippingAddress | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const result: ThreeDShippingAddress = {};

    if (
        typeof source.address === "string" &&
        source.address.trim()
    ) {
        result.address = source.address.trim();
    }

    if (
        typeof source.district === "string" &&
        source.district.trim()
    ) {
        result.district = source.district.trim();
    }

    if (
        typeof source.province === "string" &&
        source.province.trim()
    ) {
        result.province = source.province.trim();
    }

    if (
        typeof source.postcode === "string" &&
        source.postcode.trim()
    ) {
        result.postcode = source.postcode.trim();
    }

    return Object.keys(result).length > 0
        ? result
        : undefined;
}

function normalizeItems(value: unknown): ThreeDOrderItem[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(
            (item): item is Record<string, unknown> =>
                Boolean(
                    item &&
                        typeof item === "object",
                ),
        )
        .map((item) => {
            const quantity = Math.max(
                1,
                Math.floor(
                    toNumber(item.quantity, 1),
                ),
            );

            const unitPrice = roundMoney(
                Math.max(
                    0,
                    toNumber(item.unitPrice),
                ),
            );

            return {
                ...(typeof item.productId === "string" &&
                item.productId
                    ? {
                          productId:
                              item.productId,
                      }
                    : {}),
                productName:
                    typeof item.productName ===
                    "string"
                        ? item.productName
                        : "",
                quantity,
                unitPrice,
                totalPrice: roundMoney(
                    quantity * unitPrice,
                ),
                ...(typeof item.material === "string" &&
                item.material.trim()
                    ? {
                          material:
                              item.material.trim(),
                      }
                    : {}),
                ...(typeof item.color === "string" &&
                item.color.trim()
                    ? {
                          color:
                              item.color.trim(),
                      }
                    : {}),
                ...(typeof item.notes === "string" &&
                item.notes.trim()
                    ? {
                          notes:
                              item.notes.trim(),
                      }
                    : {}),
            };
        })
        .filter((item) => item.productName);
}

function normalizeOrder(
    id: string,
    data: Record<string, unknown>,
): ThreeDOrder {
    const items = normalizeItems(data.items);

    const totalPrice = roundMoney(
        Math.max(
            0,
            toNumber(data.totalPrice),
        ),
    );

    const paidAmount = roundMoney(
        Math.min(
            totalPrice,
            Math.max(
                0,
                toNumber(data.paidAmount),
            ),
        ),
    );

    const remainingAmount = roundMoney(
        Math.max(
            0,
            totalPrice - paidAmount,
        ),
    );

    const orderStatus = VALID_ORDER_STATUSES.includes(
        data.orderStatus as ThreeDOrderStatus,
    )
        ? (data.orderStatus as ThreeDOrderStatus)
        : "quote";

    let paymentStatus: ThreeDPaymentStatus;

    if (data.paymentStatus === "refunded") {
        paymentStatus = "refunded";
    } else if (
        data.paymentStatus ===
        "pending_verification"
    ) {
        paymentStatus =
            "pending_verification";
    } else if (paidAmount <= 0) {
        paymentStatus = "unpaid";
    } else if (remainingAmount > 0) {
        paymentStatus = "partial";
    } else {
        paymentStatus = "paid";
    }

    return {
        id,
        orderNumber:
            typeof data.orderNumber === "string"
                ? data.orderNumber
                : "",

        ...(typeof data.userId === "string" ? { userId: data.userId } : {}),
        ...(typeof data.quoteId === "string" ? { quoteId: data.quoteId } : {}),
        ...(typeof data.source === "string" ? { source: data.source } : {}),
        isArchived: data.isArchived === true,
        ...(data.archivedAt ? { archivedAt: data.archivedAt } : {}),
        ...(typeof data.archivedBy === "string" ? { archivedBy: data.archivedBy } : {}),

        customer:
            normalizeCustomer(data.customer),

        items,

        subtotal: roundMoney(
            Math.max(
                0,
                toNumber(data.subtotal),
            ),
        ),

        discount: roundMoney(
            Math.max(
                0,
                toNumber(data.discount),
            ),
        ),

        shippingFee: roundMoney(
            Math.max(
                0,
                toNumber(data.shippingFee),
            ),
        ),

        totalPrice,

        paidAmount,
        remainingAmount,

        orderStatus,
        paymentStatus,

        ...(VALID_PAYMENT_METHODS.includes(
            data.paymentMethod as ThreeDOrderPaymentMethod,
        )
            ? {
                  paymentMethod:
                      data.paymentMethod as ThreeDOrderPaymentMethod,
              }
            : {}),

        ...(typeof data.productionNote === "string" &&
        data.productionNote.trim()
            ? {
                  productionNote:
                      data.productionNote.trim(),
              }
            : {}),

        ...(typeof data.customerNote === "string" &&
        data.customerNote.trim()
            ? {
                  customerNote:
                      data.customerNote.trim(),
              }
            : {}),

        ...(typeof data.dueDate === "string" &&
        data.dueDate.trim()
            ? {
                  dueDate:
                      data.dueDate.trim(),
              }
            : {}),

        ...(normalizeShippingAddress(
            data.shippingAddress,
        )
            ? {
                  shippingAddress:
                      normalizeShippingAddress(
                          data.shippingAddress,
                      ),
              }
            : {}),

        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

function errorResponse(error: unknown) {
    const message =
        error instanceof Error
            ? error.message
            : "INTERNAL";

    let status = 500;
    let errorText =
        "ไม่สามารถจัดการ Order ได้";

    if (message === "UNAUTHORIZED") {
        status = 401;
        errorText =
            "กรุณาเข้าสู่ระบบ Admin ใหม่";
    } else if (message === "FORBIDDEN") {
        status = 403;
        errorText =
            "บัญชีนี้ไม่มีสิทธิ์ Admin";
    } else if (message === "NOT_FOUND") {
        status = 404;
        errorText = "ไม่พบ Order นี้";
    } else if (
        [
            "INVALID_INPUT",
            "INVALID_CUSTOMER",
            "INVALID_ITEMS",
            "INVALID_PRODUCT",
            "PRODUCT_NOT_FOUND",
            "PRODUCT_INACTIVE",
            "INVALID_AMOUNT",
            "INVALID_DISCOUNT",
            "INVALID_SHIPPING_FEE",
            "INVALID_STATUS",
            "INVALID_PAYMENT_STATUS",
            "INVALID_PAYMENT_METHOD",
            "INVALID_PAYMENT_AMOUNT",
        ].includes(message)
    ) {
        status = 400;
        errorText =
            "ข้อมูล Order ไม่ถูกต้อง";
    }

    if (message === "PRODUCT_NOT_FOUND") {
        errorText =
            "ไม่พบ Product ที่เลือก";
    }

    if (message === "PRODUCT_INACTIVE") {
        errorText =
            "Product ที่เลือกไม่ได้เปิดขายอยู่";
    }

    if (["USE_WORKFLOW_ACTION", "USE_PAYMENT_WORKFLOW"].includes(message)) {
        status = 409;
        errorText = "การเปลี่ยนสถานะต้องทำผ่าน Workflow Action";
    }

    if (status === 500) {
        console.error(
            "3D order detail admin API error:",
            error,
        );
    }

    return NextResponse.json(
        {
            success: false,
            error: errorText,
            ...(status === 409 ? { code: message } : {}),
        },
        { status },
    );
}

function validateCustomer(
    value: unknown,
): ThreeDOrderCustomer {
    if (
        !value ||
        typeof value !== "object"
    ) {
        throw new Error(
            "INVALID_CUSTOMER",
        );
    }

    const customer =
        value as Record<string, unknown>;

    const name =
        typeof customer.name === "string"
            ? customer.name.trim()
            : "";

    const phone =
        typeof customer.phone === "string"
            ? customer.phone.trim()
            : "";

    if (!name || !phone) {
        throw new Error(
            "INVALID_CUSTOMER",
        );
    }

    return {
        name,
        phone,
        ...(typeof customer.email === "string" &&
        customer.email.trim()
            ? {
                  email:
                      customer.email.trim(),
              }
            : {}),
        ...(typeof customer.line === "string" &&
        customer.line.trim()
            ? {
                  line:
                      customer.line.trim(),
              }
            : {}),
    };
}

function validateItems(
    value: unknown,
): ThreeDOrderItem[] {
    if (
        !Array.isArray(value) ||
        value.length === 0
    ) {
        throw new Error(
            "INVALID_ITEMS",
        );
    }

    return value.map((item) => {
        if (
            !item ||
            typeof item !== "object"
        ) {
            throw new Error(
                "INVALID_ITEMS",
            );
        }

        const source =
            item as Record<string, unknown>;

        const productId =
            typeof source.productId ===
                "string" &&
            source.productId.trim()
                ? source.productId.trim()
                : undefined;

        const productName =
            typeof source.productName ===
            "string"
                ? source.productName.trim()
                : "";

        const quantity = Number(
            source.quantity,
        );

        const unitPrice = Number(
            source.unitPrice,
        );

        if (
            !productName ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {
            throw new Error(
                "INVALID_ITEMS",
            );
        }

        return {
            ...(productId
                ? { productId }
                : {}),
            productName,
            quantity,
            unitPrice:
                roundMoney(unitPrice),
            totalPrice: roundMoney(
                quantity * unitPrice,
            ),
            ...(typeof source.material ===
                "string" &&
            source.material.trim()
                ? {
                      material:
                          source.material.trim(),
                  }
                : {}),
            ...(typeof source.color ===
                "string" &&
            source.color.trim()
                ? {
                      color:
                          source.color.trim(),
                  }
                : {}),
            ...(typeof source.notes ===
                "string" &&
            source.notes.trim()
                ? {
                      notes:
                          source.notes.trim(),
                  }
                : {}),
        };
    });
}

function calculatePaymentStatus(
    totalPrice: number,
    paidAmount: number,
): ThreeDPaymentStatus {
    if (paidAmount <= 0) {
        return "unpaid";
    }

    if (paidAmount < totalPrice) {
        return "partial";
    }

    return "paid";
}

export async function GET(
    request: Request,
    context: RouteContext,
) {
    try {
        await requireAdminApi(request);

        const { id } = await context.params;

        if (!id) {
            throw new Error("NOT_FOUND");
        }

        const snapshot = await adminDb
            .collection(ORDER_COLLECTION)
            .doc(id)
            .get();

        if (!snapshot.exists) {
            throw new Error("NOT_FOUND");
        }

        return NextResponse.json({
            success: true,
            order: normalizeOrder(
                id,
                snapshot.data() as Record<
                    string,
                    unknown
                >,
            ),
        });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}

export async function PATCH(
    request: Request,
    context: RouteContext,
) {
    try {
        await requireAdminApi(request);

        const { id } = await context.params;

        if (!id) {
            throw new Error("NOT_FOUND");
        }

        const reference = adminDb
            .collection(ORDER_COLLECTION)
            .doc(id);

        const snapshot =
            await reference.get();

        if (!snapshot.exists) {
            throw new Error("NOT_FOUND");
        }

        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;

        const previous =
            snapshot.data() as Record<
                string,
                unknown
            >;

        if (body.orderStatus !== undefined && body.orderStatus !== previous.orderStatus) {
            throw new Error("USE_WORKFLOW_ACTION");
        }
        if (body.paymentStatus !== undefined && body.paymentStatus !== previous.paymentStatus) {
            throw new Error("USE_PAYMENT_WORKFLOW");
        }

        /*
         * ถ้าแก้เฉพาะ Status / Payment
         * เราจะไม่บังคับให้ส่ง Customer / Items
         */
        const hasFinancialFields =
            body.items !== undefined ||
            body.discount !== undefined ||
            body.shippingFee !== undefined ||
            body.paidAmount !== undefined;

        const hasCustomer =
            body.customer !== undefined;

        let customer =
            normalizeCustomer(
                previous.customer,
            );

        if (hasCustomer) {
            customer =
                validateCustomer(
                    body.customer,
                );
        }

        let items =
            normalizeItems(
                previous.items,
            );

        if (body.items !== undefined) {
            items = validateItems(
                body.items,
            );
        }

        if (items.length === 0) {
            throw new Error(
                "INVALID_ITEMS",
            );
        }

        /*
         * Product Snapshot
         *
         * ถ้ามี productId
         * Server จะอ่าน Product จริง
         * และอัปเดตชื่อ / ราคา / material
         */
        const productIds = [
            ...new Set(
                items
                    .map(
                        (item) =>
                            item.productId,
                    )
                    .filter(
                        (
                            productId,
                        ): productId is string =>
                            typeof productId ===
                                "string" &&
                            productId.length > 0,
                    ),
            ),
        ];

        const productSnapshots =
            new Map<
                string,
                FirebaseFirestore.DocumentSnapshot
            >();

        if (productIds.length > 0) {
            for (const productId of productIds) {
                if (
                    !/^[a-zA-Z0-9_-]{1,128}$/.test(
                        productId,
                    )
                ) {
                    throw new Error(
                        "INVALID_PRODUCT",
                    );
                }

                const productSnapshot =
                    await adminDb
                        .collection(
                            PRODUCT_COLLECTION,
                        )
                        .doc(productId)
                        .get();

                if (
                    !productSnapshot.exists
                ) {
                    throw new Error(
                        "PRODUCT_NOT_FOUND",
                    );
                }

                const product =
                    productSnapshot.data() as Record<
                        string,
                        unknown
                    >;

                if (
                    product.status !==
                    "active"
                ) {
                    throw new Error(
                        "PRODUCT_INACTIVE",
                    );
                }

                productSnapshots.set(
                    productId,
                    productSnapshot,
                );
            }
        }

        if (
            body.items !== undefined
        ) {
            items = items.map(
                (item) => {
                    if (!item.productId) {
                        return item;
                    }

                    const productSnapshot =
                        productSnapshots.get(
                            item.productId,
                        );

                    if (
                        !productSnapshot
                    ) {
                        throw new Error(
                            "PRODUCT_NOT_FOUND",
                        );
                    }

                    const product =
                        productSnapshot.data() as Record<
                            string,
                            unknown
                        >;

                    const name =
                        typeof product.name ===
                        "string"
                            ? product.name.trim()
                            : "";

                    const material =
                        typeof product.material ===
                        "string"
                            ? product.material.trim()
                            : "";

                    const price =
                        Number(
                            product.price,
                        );

                    if (
                        !name ||
                        !Number.isFinite(
                            price,
                        ) ||
                        price < 0
                    ) {
                        throw new Error(
                            "INVALID_PRODUCT",
                        );
                    }

                    return {
                        ...item,
                        productName:
                            name,
                        material:
                            material ||
                            item.material,
                        unitPrice:
                            roundMoney(
                                price,
                            ),
                        totalPrice:
                            roundMoney(
                                item.quantity *
                                    price,
                            ),
                    };
                },
            );
        }

        const subtotal =
            roundMoney(
                items.reduce(
                    (
                        sum,
                        item,
                    ) =>
                        sum +
                        item.totalPrice,
                    0,
                ),
            );

        const discount = roundMoney(
            Math.max(
                0,
                body.discount !==
                    undefined
                    ? toNumber(
                          body.discount,
                      )
                    : toNumber(
                          previous.discount,
                      ),
            ),
        );

        const shippingFee =
            roundMoney(
                Math.max(
                    0,
                    body.shippingFee !==
                        undefined
                        ? toNumber(
                              body.shippingFee,
                          )
                        : toNumber(
                              previous.shippingFee,
                          ),
                ),
            );

        const safeDiscount =
            Math.min(
                discount,
                subtotal,
            );

        const totalPrice =
            roundMoney(
                Math.max(
                    0,
                    subtotal -
                        safeDiscount +
                        shippingFee,
                ),
            );

        const paidAmount =
            roundMoney(
                Math.max(
                    0,
                    body.paidAmount !==
                        undefined
                        ? toNumber(
                              body.paidAmount,
                          )
                        : toNumber(
                              previous.paidAmount,
                          ),
                ),
            );

        if (
            paidAmount >
            totalPrice
        ) {
            throw new Error(
                "INVALID_PAYMENT_AMOUNT",
            );
        }

        const remainingAmount =
            roundMoney(
                Math.max(
                    0,
                    totalPrice -
                        paidAmount,
                ),
            );

        const previousPaymentStatus =
            previous.paymentStatus as
                | ThreeDPaymentStatus
                | undefined;

        let paymentStatus =
            calculatePaymentStatus(
                totalPrice,
                paidAmount,
            );

        /*
         * pending_verification / refunded
         * ต้องไม่ถูกลบโดยอัตโนมัติ
         * ถ้า Admin ไม่ได้แก้ payment status
         */
        if (
            body.paymentStatus !==
            undefined
        ) {
            if (
                !VALID_PAYMENT_STATUSES.includes(
                    body.paymentStatus as ThreeDPaymentStatus,
                )
            ) {
                throw new Error(
                    "INVALID_PAYMENT_STATUS",
                );
            }

            paymentStatus =
                body.paymentStatus as ThreeDPaymentStatus;

            /*
             * refunded เป็นสถานะพิเศษ
             * ไม่บังคับให้ paidAmount เป็น 0
             * เพื่อเก็บประวัติยอดเงินเดิมได้
             */
        } else if (
            previousPaymentStatus ===
                "pending_verification" ||
            previousPaymentStatus ===
                "refunded"
        ) {
            paymentStatus =
                previousPaymentStatus;
        }

        const orderStatus =
            VALID_ORDER_STATUSES.includes(
                body.orderStatus as ThreeDOrderStatus,
            )
                ? (body.orderStatus as ThreeDOrderStatus)
                : (VALID_ORDER_STATUSES.includes(
                        previous.orderStatus as ThreeDOrderStatus,
                    )
                      ? (previous.orderStatus as ThreeDOrderStatus)
                      : "quote");

        const paymentMethod =
            body.paymentMethod !==
            undefined
                ? body.paymentMethod
                : previous.paymentMethod;

        if (
            paymentMethod !==
                undefined &&
            paymentMethod !== null &&
            !VALID_PAYMENT_METHODS.includes(
                paymentMethod as ThreeDOrderPaymentMethod,
            )
        ) {
            throw new Error(
                "INVALID_PAYMENT_METHOD",
            );
        }

        const productionNote =
            body.productionNote !==
            undefined
                ? typeof body.productionNote ===
                  "string"
                    ? body.productionNote.trim()
                    : ""
                : typeof previous.productionNote ===
                    "string"
                  ? previous.productionNote
                  : "";

        const customerNote =
            body.customerNote !==
            undefined
                ? typeof body.customerNote ===
                  "string"
                    ? body.customerNote.trim()
                    : ""
                : typeof previous.customerNote ===
                    "string"
                  ? previous.customerNote
                  : "";

        const dueDate =
            body.dueDate !==
            undefined
                ? typeof body.dueDate ===
                  "string" &&
                  body.dueDate.trim()
                    ? body.dueDate.trim()
                    : undefined
                : typeof previous.dueDate ===
                    "string"
                  ? previous.dueDate
                  : undefined;

        const shippingAddress =
            body.shippingAddress !==
            undefined
                ? normalizeShippingAddress(
                      body.shippingAddress,
                  )
                : normalizeShippingAddress(
                      previous.shippingAddress,
                  );

        /*
         * ไม่ใช้ undefined ใน Firestore
         */
        const payload: Record<
            string,
            unknown
        > = {
            customer,
            items,

            subtotal,
            discount: safeDiscount,
            shippingFee,

            totalPrice,

            paidAmount,
            remainingAmount,

            orderStatus,
            paymentStatus,

            updatedAt:
                FieldValue.serverTimestamp(),
        };

        if (
            paymentMethod !==
                undefined &&
            paymentMethod !== null
        ) {
            payload.paymentMethod =
                paymentMethod;
        } else {
            payload.paymentMethod =
                FieldValue.delete();
        }

        if (productionNote) {
            payload.productionNote =
                productionNote;
        } else {
            payload.productionNote =
                FieldValue.delete();
        }

        if (customerNote) {
            payload.customerNote =
                customerNote;
        } else {
            payload.customerNote =
                FieldValue.delete();
        }

        if (dueDate) {
            payload.dueDate =
                dueDate;
        } else {
            payload.dueDate =
                FieldValue.delete();
        }

        if (shippingAddress) {
            payload.shippingAddress =
                shippingAddress;
        } else {
            payload.shippingAddress =
                FieldValue.delete();
        }

        await reference.update(
            payload,
        );

        return NextResponse.json({
            success: true,
            order: {
                id,
                orderNumber:
                    typeof previous.orderNumber ===
                    "string"
                        ? previous.orderNumber
                        : "",
                customer,
                items,
                subtotal,
                discount: safeDiscount,
                shippingFee,
                totalPrice,
                paidAmount,
                remainingAmount,
                orderStatus,
                paymentStatus,
                ...(paymentMethod
                    ? {
                          paymentMethod:
                              paymentMethod as ThreeDOrderPaymentMethod,
                      }
                    : {}),
                ...(productionNote
                    ? {
                          productionNote,
                      }
                    : {}),
                ...(customerNote
                    ? {
                          customerNote,
                      }
                    : {}),
                ...(dueDate
                    ? {
                          dueDate,
                      }
                    : {}),
                ...(shippingAddress
                    ? {
                          shippingAddress,
                      }
                    : {}),
            },
        });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}

export async function DELETE(
    request: Request,
    context: RouteContext,
) {
    try {
        await requireAdminApi(request);

        const { id } = await context.params;

        if (!id) {
            throw new Error("NOT_FOUND");
        }

        const reference = adminDb
            .collection(ORDER_COLLECTION)
            .doc(id);

        const snapshot =
            await reference.get();

        if (!snapshot.exists) {
            throw new Error("NOT_FOUND");
        }

        const orderData = snapshot.data() || {};
        const payments = await adminDb.collection("threeDPayments").where("orderId", "==", id).limit(1).get();
        if (!payments.empty || orderData.isArchived === true || orderData.orderStatus === "completed" || orderData.orderStatus === "production" || orderData.orderStatus === "printing" || orderData.orderStatus === "quality_check" || orderData.orderStatus === "ready" || orderData.orderStatus === "shipping" || orderData.paymentStatus === "paid") {
            return NextResponse.json({ success: false, error: "ORDER_HAS_HISTORY", code: "ORDER_HAS_HISTORY" }, { status: 409 });
        }

        await reference.delete();

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}
