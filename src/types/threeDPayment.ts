export type ThreeDPaymentMethod =
    | "bank_transfer"
    | "promptpay"
    | "cash"
    | "other";

export type ThreeDPaymentStatus =
    | "unpaid"
    | "submitted"
    | "pending_verification"
    | "verified"
    | "rejected"
    | "refunded";

export type ThreeDPayment = {
    id: string;

    orderId: string;
    orderNumber: string;

    quoteId?: string;
    userId?: string;

    amount: number;
    currency?: string;

    method: ThreeDPaymentMethod;
    status: ThreeDPaymentStatus;

    reference?: string;
    note?: string;

    paidAt?: string;

    proof?: {
        fileName: string;
        contentType: string;
        size: number;
    };
    submittedAt?: unknown;
    verifiedAt?: unknown;
    rejectedAt?: unknown;
    verifiedBy?: string;
    rejectedBy?: string;
    rejectReason?: string;

    createdAt?: unknown;
    updatedAt?: unknown;
};

export type ThreeDPaymentInput = Omit<
    ThreeDPayment,
    "id" | "createdAt" | "updatedAt"
>;
