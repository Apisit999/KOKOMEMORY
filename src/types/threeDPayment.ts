export type ThreeDPaymentMethod =
    | "bank_transfer"
    | "promptpay"
    | "cash"
    | "other";

export type ThreeDPaymentStatus =
    | "submitted"
    | "pending_verification"
    | "verified"
    | "rejected"
    | "refunded";

export type ThreeDPayment = {
    id: string;

    orderId: string;
    orderNumber: string;

    amount: number;

    method: ThreeDPaymentMethod;
    status: ThreeDPaymentStatus;

    reference?: string;
    note?: string;

    paidAt?: string;

    createdAt?: unknown;
    updatedAt?: unknown;
};

export type ThreeDPaymentInput = Omit<
    ThreeDPayment,
    "id" | "createdAt" | "updatedAt"
>;
