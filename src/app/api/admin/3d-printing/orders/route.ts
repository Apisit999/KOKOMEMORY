import { NextResponse } from "next/server";
import {
    FieldValue,
    Timestamp,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

import type {
    ThreeDOrder,
    ThreeDOrderCustomer,
    ThreeDOrderItem,
    ThreeDOrderPaymentMethod,
    ThreeDOrderStatus,
    ThreeDPaymentStatus,
    ThreeDShippingAddress,
} from "@/types/threeDOrder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   COLLECTIONS
========================================================= */

const ORDER_COLLECTION = "threeDOrders";
const PRODUCT_COLLECTION = "threeDProducts";
const SEQUENCE_COLLECTION = "threeDOrderSequences";

/* =========================================================
   VALID VALUES
========================================================= */

const VALID_ORDER_STATUSES: ThreeDOrderStatus[] = [
    "quote",
    "pending_confirmation",
    "waiting_payment",
    "queued",
    "printing",
    "quality_check",
    "ready",
    "shipping",
    "completed",
    "cancelled",
];

const VALID_PAYMENT_STATUSES: ThreeDPaymentStatus[] = [
    "unpaid",
    "pending_verification",
    "partial",
    "paid",
    "refunded",
];

const VALID_PAYMENT_METHODS: ThreeDOrderPaymentMethod[] = [
    "bank_transfer",
    "promptpay",
    "cash",
    "other",
];

/* =========================================================
   HELPERS
========================================================= */

function toNumber(
    value: unknown,
    fallback = 0,
): number {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function roundMoney(
    value: number,
): number {
    return Math.round(
        (value + Number.EPSILON) * 100,
    ) / 100;
}

function normalizeTimestamp(
    value: unknown,
): unknown {
    if (
        value instanceof Timestamp
    ) {
        return value
            .toDate()
            .toISOString();
    }

    if (
        value &&
        typeof value === "object" &&
        "toDate" in value &&
        typeof (
            value as {
                toDate?: unknown;
            }
        ).toDate === "function"
    ) {
        try {
            return (
                value as {
                    toDate: () => Date;
                }
            )
                .toDate()
                .toISOString();
        } catch {
            return value;
        }
    }

    return value;
}

function removeUndefined<T>(
    value: T,
): T {
    if (Array.isArray(value)) {
        return value
            .filter(
                (item) =>
                    item !== undefined,
            )
            .map((item) =>
                removeUndefined(item),
            ) as T;
    }

    if (
        value &&
        typeof value === "object"
    ) {
        const result: Record<
            string,
            unknown
        > = {};

        for (const [
            key,
            item,
        ] of Object.entries(
            value as Record<
                string,
                unknown
            >,
        )) {
            if (
                item === undefined
            ) {
                continue;
            }

            result[key] =
                removeUndefined(item);
        }

        return result as T;
    }

    return value;
}

/* =========================================================
   DATE / ORDER NUMBER
========================================================= */

function getDateKey(): string {
    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1,
        ).padStart(2, "0");

    const day =
        String(
            now.getDate(),
        ).padStart(2, "0");

    return `${year}${month}${day}`;
}

/* =========================================================
   CUSTOMER
========================================================= */

function normalizeCustomer(
    value: unknown,
): ThreeDOrderCustomer {
    if (
        !value ||
        typeof value !== "object"
    ) {
        return {
            name: "",
            phone: "",
        };
    }

    const customer =
        value as Record<
            string,
            unknown
        >;

    return removeUndefined({
        name:
            typeof customer.name ===
            "string"
                ? customer.name
                : "",

        phone:
            typeof customer.phone ===
            "string"
                ? customer.phone
                : "",

        ...(typeof customer.email ===
            "string" &&
        customer.email.trim()
            ? {
                  email:
                      customer.email.trim(),
              }
            : {}),

        ...(typeof customer.line ===
            "string" &&
        customer.line.trim()
            ? {
                  line:
                      customer.line.trim(),
              }
            : {}),
    });
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
        value as Record<
            string,
            unknown
        >;

    const name =
        typeof customer.name ===
        "string"
            ? customer.name.trim()
            : "";

    const phone =
        typeof customer.phone ===
        "string"
            ? customer.phone.trim()
            : "";

    if (!name || !phone) {
        throw new Error(
            "INVALID_CUSTOMER",
        );
    }

    return removeUndefined({
        name,
        phone,

        ...(typeof customer.email ===
            "string" &&
        customer.email.trim()
            ? {
                  email:
                      customer.email.trim(),
              }
            : {}),

        ...(typeof customer.line ===
            "string" &&
        customer.line.trim()
            ? {
                  line:
                      customer.line.trim(),
              }
            : {}),
    });
}

/* =========================================================
   SHIPPING
========================================================= */

function normalizeShippingAddress(
    value: unknown,
): ThreeDShippingAddress | undefined {
    if (
        !value ||
        typeof value !== "object"
    ) {
        return undefined;
    }

    const address =
        value as Record<
            string,
            unknown
        >;

    const normalized: ThreeDShippingAddress =
        {};

    if (
        typeof address.address ===
            "string" &&
        address.address.trim()
    ) {
        normalized.address =
            address.address.trim();
    }

    if (
        typeof address.district ===
            "string" &&
        address.district.trim()
    ) {
        normalized.district =
            address.district.trim();
    }

    if (
        typeof address.province ===
            "string" &&
        address.province.trim()
    ) {
        normalized.province =
            address.province.trim();
    }

    if (
        typeof address.postcode ===
            "string" &&
        address.postcode.trim()
    ) {
        normalized.postcode =
            address.postcode.trim();
    }

    return Object.keys(
        normalized,
    ).length > 0
        ? normalized
        : undefined;
}

function validateShippingAddress(
    value: unknown,
): ThreeDShippingAddress | undefined {
    return normalizeShippingAddress(
        value,
    );
}

/* =========================================================
   ITEMS
========================================================= */

function normalizeItems(
    value: unknown,
): ThreeDOrderItem[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(
            (
                item,
            ): item is Record<
                string,
                unknown
            > =>
                Boolean(
                    item &&
                        typeof item ===
                            "object",
                ),
        )
        .map((item) => {
            const quantity =
                Math.max(
                    1,
                    Math.floor(
                        toNumber(
                            item.quantity,
                            1,
                        ),
                    ),
                );

            const unitPrice =
                roundMoney(
                    Math.max(
                        0,
                        toNumber(
                            item.unitPrice,
                        ),
                    ),
                );

            const calculatedTotal =
                roundMoney(
                    quantity *
                        unitPrice,
                );

            return removeUndefined({
                ...(typeof item.productId ===
                    "string" &&
                item.productId.trim()
                    ? {
                          productId:
                              item.productId.trim(),
                      }
                    : {}),

                productName:
                    typeof item.productName ===
                    "string"
                        ? item.productName.trim()
                        : "",

                quantity,

                unitPrice,

                totalPrice:
                    typeof item.totalPrice ===
                        "number" &&
                    Number.isFinite(
                        item.totalPrice,
                    ) &&
                    item.totalPrice >= 0
                        ? roundMoney(
                              item.totalPrice,
                          )
                        : calculatedTotal,

                ...(typeof item.material ===
                    "string" &&
                item.material.trim()
                    ? {
                          material:
                              item.material.trim(),
                      }
                    : {}),

                ...(typeof item.color ===
                    "string" &&
                item.color.trim()
                    ? {
                          color:
                              item.color.trim(),
                      }
                    : {}),

                ...(typeof item.notes ===
                    "string" &&
                item.notes.trim()
                    ? {
                          notes:
                              item.notes.trim(),
                      }
                    : {}),
            });
        })
        .filter(
            (item) =>
                Boolean(
                    item.productName,
                ),
        );
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

    return value.map(
        (item) => {
            if (
                !item ||
                typeof item !==
                    "object"
            ) {
                throw new Error(
                    "INVALID_ITEMS",
                );
            }

            const data =
                item as Record<
                    string,
                    unknown
                >;

            const productId =
                typeof data.productId ===
                    "string" &&
                data.productId.trim()
                    ? data.productId.trim()
                    : undefined;

            const productName =
                typeof data.productName ===
                "string"
                    ? data.productName.trim()
                    : "";

            const quantity =
                Number(
                    data.quantity,
                );

            const unitPrice =
                Number(
                    data.unitPrice,
                );

            if (
                !productName ||
                !Number.isInteger(
                    quantity,
                ) ||
                quantity <= 0 ||
                !Number.isFinite(
                    unitPrice,
                ) ||
                unitPrice < 0
            ) {
                throw new Error(
                    "INVALID_ITEMS",
                );
            }

            return removeUndefined({
                ...(productId
                    ? {
                          productId,
                      }
                    : {}),

                productName,

                quantity,

                unitPrice:
                    roundMoney(
                        unitPrice,
                    ),

                totalPrice:
                    roundMoney(
                        quantity *
                            unitPrice,
                    ),

                ...(typeof data.material ===
                    "string" &&
                data.material.trim()
                    ? {
                          material:
                              data.material.trim(),
                      }
                    : {}),

                ...(typeof data.color ===
                    "string" &&
                data.color.trim()
                    ? {
                          color:
                              data.color.trim(),
                      }
                    : {}),

                ...(typeof data.notes ===
                    "string" &&
                data.notes.trim()
                    ? {
                          notes:
                              data.notes.trim(),
                      }
                    : {}),
            });
        },
    );
}

/* =========================================================
   PAYMENT
========================================================= */

function calculatePaymentStatus(
    totalPrice: number,
    paidAmount: number,
): ThreeDPaymentStatus {
    if (paidAmount <= 0) {
        return "unpaid";
    }

    if (
        paidAmount <
        totalPrice
    ) {
        return "partial";
    }

    return "paid";
}

/* =========================================================
   ORDER NORMALIZER
========================================================= */

function normalizeOrder(
    id: string,
    data: Record<
        string,
        unknown
    >,
): ThreeDOrder {
    const items =
        normalizeItems(
            data.items,
        );

    const totalPrice =
        roundMoney(
            Math.max(
                0,
                toNumber(
                    data.totalPrice,
                ),
            ),
        );

    const paidAmount =
        Math.min(
            totalPrice,
            Math.max(
                0,
                roundMoney(
                    toNumber(
                        data.paidAmount,
                    ),
                ),
            ),
        );

    const remainingAmount =
        roundMoney(
            Math.max(
                0,
                totalPrice -
                    paidAmount,
            ),
        );

    const orderStatus =
        VALID_ORDER_STATUSES.includes(
            data.orderStatus as ThreeDOrderStatus,
        )
            ? (data.orderStatus as ThreeDOrderStatus)
            : "quote";

    let paymentStatus: ThreeDPaymentStatus;

    if (
        data.paymentStatus ===
        "refunded"
    ) {
        paymentStatus =
            "refunded";
    } else if (
        data.paymentStatus ===
        "pending_verification"
    ) {
        paymentStatus =
            "pending_verification";
    } else {
        paymentStatus =
            calculatePaymentStatus(
                totalPrice,
                paidAmount,
            );
    }

    return removeUndefined({
        id,

        orderNumber:
            typeof data.orderNumber ===
            "string"
                ? data.orderNumber
                : "",

        customer:
            normalizeCustomer(
                data.customer,
            ),

        items,

        subtotal:
            roundMoney(
                Math.max(
                    0,
                    toNumber(
                        data.subtotal,
                    ),
                ),
            ),

        discount:
            roundMoney(
                Math.max(
                    0,
                    toNumber(
                        data.discount,
                    ),
                ),
            ),

        shippingFee:
            roundMoney(
                Math.max(
                    0,
                    toNumber(
                        data.shippingFee,
                    ),
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

        ...(typeof data.productionNote ===
            "string" &&
        data.productionNote.trim()
            ? {
                  productionNote:
                      data.productionNote.trim(),
              }
            : {}),

        ...(typeof data.customerNote ===
            "string" &&
        data.customerNote.trim()
            ? {
                  customerNote:
                      data.customerNote.trim(),
              }
            : {}),

        ...(typeof data.dueDate ===
            "string" &&
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

        createdAt:
            normalizeTimestamp(
                data.createdAt,
            ),

        updatedAt:
            normalizeTimestamp(
                data.updatedAt,
            ),
    });
}

/* =========================================================
   ERROR RESPONSE
========================================================= */

function errorResponse(
    error: unknown,
) {
    const message =
        error instanceof Error
            ? error.message
            : "INTERNAL";

    let status = 500;

    let errorText =
        "ไม่สามารถจัดการ Order ได้";

    if (
        message ===
        "UNAUTHORIZED"
    ) {
        status = 401;
        errorText =
            "กรุณาเข้าสู่ระบบ Admin ใหม่";
    } else if (
        message === "FORBIDDEN"
    ) {
        status = 403;
        errorText =
            "บัญชีนี้ไม่มีสิทธิ์ Admin";
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
            "INVALID_PAYMENT_METHOD",
            "INVALID_PAYMENT_AMOUNT",
            "INVALID_DUE_DATE",
        ].includes(
            message,
        )
    ) {
        status = 400;

        errorText =
            "ข้อมูล Order ไม่ถูกต้องหรือไม่ครบถ้วน";
    }

    if (
        message ===
        "PRODUCT_NOT_FOUND"
    ) {
        errorText =
            "ไม่พบ Product ที่เลือก";
    }

    if (
        message ===
        "PRODUCT_INACTIVE"
    ) {
        errorText =
            "Product ที่เลือกไม่ได้เปิดขายอยู่";
    }

    if (status === 500) {
        console.error(
            "3D order admin API error:",
            error,
        );
    }

    return NextResponse.json(
        {
            success: false,
            error: errorText,
        },
        {
            status,
        },
    );
}

/* =========================================================
   GET
   /api/admin/3d-printing/orders

   IMPORTANT:
   ไม่มี context / params
   เพราะ route นี้ไม่มี [id]
========================================================= */

export async function GET(
    request: Request,
) {
    try {
        await requireAdminApi(
            request,
        );

        const snapshot =
            await adminDb
                .collection(
                    ORDER_COLLECTION,
                )
                .get();

        const orders =
            snapshot.docs
                .map(
                    (
                        document,
                    ) =>
                        normalizeOrder(
                            document.id,
                            document.data() as Record<
                                string,
                                unknown
                            >,
                        ),
                )
                .sort(
                    (
                        a,
                        b,
                    ) => {
                        const aTime =
                            typeof a.createdAt ===
                            "string"
                                ? new Date(
                                      a.createdAt,
                                  ).getTime()
                                : 0;

                        const bTime =
                            typeof b.createdAt ===
                            "string"
                                ? new Date(
                                      b.createdAt,
                                  ).getTime()
                                : 0;

                        return (
                            bTime -
                            aTime
                        );
                    },
                );

        return NextResponse.json({
            success: true,
            orders,
        });
    } catch (error) {
        return errorResponse(
            error,
        );
    }
}

/* =========================================================
   POST
   /api/admin/3d-printing/orders

   สร้าง Order ใหม่
========================================================= */

export async function POST(
    request: Request,
) {
    try {
        await requireAdminApi(
            request,
        );

        const body =
            (await request.json()) as Record<
                string,
                unknown
            >;

        /* -----------------------------------------------------
           Customer
        ----------------------------------------------------- */

        const customer =
            validateCustomer(
                body.customer,
            );

        /* -----------------------------------------------------
           Items
        ----------------------------------------------------- */

        const requestedItems =
            validateItems(
                body.items,
            );

        /* -----------------------------------------------------
           Discount
        ----------------------------------------------------- */

        const discount =
            Number(
                body.discount ?? 0,
            );

        if (
            !Number.isFinite(
                discount,
            ) ||
            discount < 0
        ) {
            throw new Error(
                "INVALID_DISCOUNT",
            );
        }

        /* -----------------------------------------------------
           Shipping Fee
        ----------------------------------------------------- */

        const shippingFee =
            Number(
                body.shippingFee ?? 0,
            );

        if (
            !Number.isFinite(
                shippingFee,
            ) ||
            shippingFee < 0
        ) {
            throw new Error(
                "INVALID_SHIPPING_FEE",
            );
        }

        const normalizedDiscount =
            roundMoney(
                discount,
            );

        const normalizedShippingFee =
            roundMoney(
                shippingFee,
            );

        /* -----------------------------------------------------
           Order Status
        ----------------------------------------------------- */

        if (
            body.orderStatus !==
                undefined &&
            !VALID_ORDER_STATUSES.includes(
                body.orderStatus as ThreeDOrderStatus,
            )
        ) {
            throw new Error(
                "INVALID_STATUS",
            );
        }

        /* -----------------------------------------------------
           Payment Status
        ----------------------------------------------------- */

        if (
            body.paymentStatus !==
                undefined &&
            !VALID_PAYMENT_STATUSES.includes(
                body.paymentStatus as ThreeDPaymentStatus,
            )
        ) {
            throw new Error(
                "INVALID_PAYMENT_STATUS",
            );
        }

        /* -----------------------------------------------------
           Payment Method
        ----------------------------------------------------- */

        if (
            body.paymentMethod !==
                undefined &&
            body.paymentMethod !==
                null &&
            !VALID_PAYMENT_METHODS.includes(
                body.paymentMethod as ThreeDOrderPaymentMethod,
            )
        ) {
            throw new Error(
                "INVALID_PAYMENT_METHOD",
            );
        }

        /* -----------------------------------------------------
           Paid Amount
        ----------------------------------------------------- */

        const paidAmount =
            Number(
                body.paidAmount ?? 0,
            );

        if (
            !Number.isFinite(
                paidAmount,
            ) ||
            paidAmount < 0
        ) {
            throw new Error(
                "INVALID_PAYMENT_AMOUNT",
            );
        }

        /* -----------------------------------------------------
           Due Date
        ----------------------------------------------------- */

        if (
            body.dueDate !==
                undefined &&
            body.dueDate !==
                null &&
            typeof body.dueDate !==
                "string"
        ) {
            throw new Error(
                "INVALID_DUE_DATE",
            );
        }

        /* -----------------------------------------------------
           Product IDs
        ----------------------------------------------------- */

        const uniqueProductIds = [
            ...new Set(
                requestedItems
                    .map(
                        (
                            item,
                        ) =>
                            item.productId,
                    )
                    .filter(
                        (
                            id,
                        ): id is string =>
                            typeof id ===
                                "string" &&
                            id.length >
                                0,
                    ),
            ),
        ];

        /* -----------------------------------------------------
           Firestore References
        ----------------------------------------------------- */

        const orderReference =
            adminDb
                .collection(
                    ORDER_COLLECTION,
                )
                .doc();

        const dateKey =
            getDateKey();

        const sequenceReference =
            adminDb
                .collection(
                    SEQUENCE_COLLECTION,
                )
                .doc(dateKey);

        /* -----------------------------------------------------
           Transaction
        ----------------------------------------------------- */

        const result =
            await adminDb.runTransaction(
                async (
                    transaction,
                ) => {
                    const productSnapshots =
                        new Map<
                            string,
                            FirebaseFirestore.DocumentSnapshot
                        >();

                    /* ---------------------------------------------
                       Read Products
                    --------------------------------------------- */

                    for (
                        const productId of uniqueProductIds
                    ) {
                        if (
                            !/^[a-zA-Z0-9_-]{1,128}$/.test(
                                productId,
                            )
                        ) {
                            throw new Error(
                                "INVALID_PRODUCT",
                            );
                        }

                        const reference =
                            adminDb
                                .collection(
                                    PRODUCT_COLLECTION,
                                )
                                .doc(
                                    productId,
                                );

                        const snapshot =
                            await transaction.get(
                                reference,
                            );

                        if (
                            !snapshot.exists
                        ) {
                            throw new Error(
                                "PRODUCT_NOT_FOUND",
                            );
                        }

                        const productData =
                            snapshot.data() as Record<
                                string,
                                unknown
                            >;

                        if (
                            productData.status !==
                            "active"
                        ) {
                            throw new Error(
                                "PRODUCT_INACTIVE",
                            );
                        }

                        productSnapshots.set(
                            productId,
                            snapshot,
                        );
                    }

                    /* ---------------------------------------------
                       Sequence
                    --------------------------------------------- */

                    const sequenceSnapshot =
                        await transaction.get(
                            sequenceReference,
                        );

                    const previousSequence =
                        sequenceSnapshot.exists
                            ? Number(
                                  sequenceSnapshot.data()
                                      ?.value ??
                                      0,
                              )
                            : 0;

                    const nextSequence =
                        Number.isInteger(
                            previousSequence,
                        ) &&
                        previousSequence >=
                            0
                            ? previousSequence +
                              1
                            : 1;

                    const orderNumber =
                        `3D-${dateKey}-${String(
                            nextSequence,
                        ).padStart(
                            3,
                            "0",
                        )}`;

                    /* ---------------------------------------------
                       Final Items
                    --------------------------------------------- */

                    const finalItems: ThreeDOrderItem[] =
                        requestedItems.map(
                            (
                                item,
                            ) => {
                                /*
                                 * Custom item
                                 * ไม่มี productId
                                 */
                                if (
                                    !item.productId
                                ) {
                                    return removeUndefined({
                                        productName:
                                            item.productName,

                                        quantity:
                                            item.quantity,

                                        unitPrice:
                                            roundMoney(
                                                item.unitPrice,
                                            ),

                                        totalPrice:
                                            roundMoney(
                                                item.quantity *
                                                    item.unitPrice,
                                            ),

                                        ...(item.material
                                            ? {
                                                  material:
                                                      item.material,
                                              }
                                            : {}),

                                        ...(item.color
                                            ? {
                                                  color:
                                                      item.color,
                                              }
                                            : {}),

                                        ...(item.notes
                                            ? {
                                                  notes:
                                                      item.notes,
                                              }
                                            : {}),
                                    });
                                }

                                /*
                                 * Product item
                                 */
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

                                const productName =
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
                                    !productName ||
                                    !Number.isFinite(
                                        price,
                                    ) ||
                                    price < 0
                                ) {
                                    throw new Error(
                                        "INVALID_PRODUCT",
                                    );
                                }

                                return removeUndefined({
                                    productId:
                                        item.productId,

                                    productName,

                                    quantity:
                                        item.quantity,

                                    unitPrice:
                                        roundMoney(
                                            price,
                                        ),

                                    totalPrice:
                                        roundMoney(
                                            item.quantity *
                                                price,
                                        ),

                                    ...(material
                                        ? {
                                              material,
                                          }
                                        : {}),

                                    ...(item.color
                                        ? {
                                              color:
                                                  item.color,
                                          }
                                        : {}),

                                    ...(item.notes
                                        ? {
                                              notes:
                                                  item.notes,
                                          }
                                        : {}),
                                });
                            },
                        );

                    /* ---------------------------------------------
                       Financial Calculation
                    --------------------------------------------- */

                    const subtotal =
                        roundMoney(
                            finalItems.reduce(
                                (
                                    sum,
                                    item,
                                ) =>
                                    sum +
                                    Number(
                                        item.totalPrice ||
                                            0,
                                    ),
                                0,
                            ),
                        );

                    const safeDiscount =
                        Math.min(
                            normalizedDiscount,
                            subtotal,
                        );

                    const totalPrice =
                        roundMoney(
                            Math.max(
                                0,
                                subtotal -
                                    safeDiscount +
                                    normalizedShippingFee,
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

                    const finalPaidAmount =
                        roundMoney(
                            paidAmount,
                        );

                    const remainingAmount =
                        roundMoney(
                            Math.max(
                                0,
                                totalPrice -
                                    finalPaidAmount,
                            ),
                        );

                    /*
                     * ถ้าส่ง paymentStatus มา
                     * และเป็น pending_verification/refunded
                     * ให้เก็บสถานะนั้นไว้
                     *
                     * กรณีทั่วไปคำนวณจากยอดเงินจริง
                     */
                    let paymentStatus =
                        calculatePaymentStatus(
                            totalPrice,
                            finalPaidAmount,
                        );

                    if (
                        body.paymentStatus ===
                        "pending_verification"
                    ) {
                        paymentStatus =
                            "pending_verification";
                    } else if (
                        body.paymentStatus ===
                        "refunded"
                    ) {
                        paymentStatus =
                            "refunded";
                    }

                    /* ---------------------------------------------
                       Order Status
                    --------------------------------------------- */

                    const orderStatus: ThreeDOrderStatus =
                        VALID_ORDER_STATUSES.includes(
                            body.orderStatus as ThreeDOrderStatus,
                        )
                            ? (body.orderStatus as ThreeDOrderStatus)
                            : "quote";

                    /* ---------------------------------------------
                       Optional fields
                    --------------------------------------------- */

                    const paymentMethod =
                        VALID_PAYMENT_METHODS.includes(
                            body.paymentMethod as ThreeDOrderPaymentMethod,
                        )
                            ? (body.paymentMethod as ThreeDOrderPaymentMethod)
                            : undefined;

                    const productionNote =
                        typeof body.productionNote ===
                        "string"
                            ? body.productionNote.trim()
                            : "";

                    const customerNote =
                        typeof body.customerNote ===
                        "string"
                            ? body.customerNote.trim()
                            : "";

                    const shippingAddress =
                        validateShippingAddress(
                            body.shippingAddress,
                        );

                    const dueDate =
                        typeof body.dueDate ===
                            "string" &&
                        body.dueDate.trim()
                            ? body.dueDate.trim()
                            : undefined;

                    /* ---------------------------------------------
                       Firestore Payload
                    --------------------------------------------- */

                    const payload: Record<
                        string,
                        unknown
                    > =
                        removeUndefined({
                            orderNumber,

                            customer,

                            items:
                                finalItems,

                            subtotal,

                            discount:
                                safeDiscount,

                            shippingFee:
                                normalizedShippingFee,

                            totalPrice,

                            paidAmount:
                                finalPaidAmount,

                            remainingAmount,

                            orderStatus,

                            paymentStatus,

                            createdAt:
                                FieldValue.serverTimestamp(),

                            updatedAt:
                                FieldValue.serverTimestamp(),

                            ...(paymentMethod
                                ? {
                                      paymentMethod,
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
                        });

                    /* ---------------------------------------------
                       Sequence + Order
                    --------------------------------------------- */

                    transaction.set(
                        sequenceReference,
                        {
                            value:
                                nextSequence,

                            updatedAt:
                                FieldValue.serverTimestamp(),
                        },
                    );

                    transaction.create(
                        orderReference,
                        payload,
                    );

                    return {
                        id:
                            orderReference.id,

                        orderNumber,

                        customer,

                        items:
                            finalItems,

                        subtotal,

                        discount:
                            safeDiscount,

                        shippingFee:
                            normalizedShippingFee,

                        totalPrice,

                        paidAmount:
                            finalPaidAmount,

                        remainingAmount,

                        orderStatus,

                        paymentStatus,

                        ...(paymentMethod
                            ? {
                                  paymentMethod,
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
                    } satisfies Omit<
                        ThreeDOrder,
                        "createdAt" |
                            "updatedAt"
                    >;
                },
            );

        return NextResponse.json(
            {
                success: true,
                order: result,
            },
            {
                status: 201,
            },
        );
    } catch (error) {
        return errorResponse(
            error,
        );
    }
}