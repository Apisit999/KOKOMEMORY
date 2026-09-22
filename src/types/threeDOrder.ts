export type ThreeDOrderStatus =
    | "quote"
    | "pending_confirmation"
    | "pending_payment"
    | "paid"
    | "waiting_payment"
    | "queued"
    | "printing"
    | "quality_check"
    | "ready"
    | "shipping"
    | "completed"
    | "cancelled";

export type ThreeDPaymentStatus =
    | "submitted"
    | "unpaid"
    | "pending_verification"
    | "partial"
    | "paid"
    | "refunded";

export type ThreeDOrderPaymentMethod =
    | "bank_transfer"
    | "promptpay"
    | "cash"
    | "other";

export type ThreeDOrderItem = {
    productId?: string;
    productName: string;

    quantity: number;

    unitPrice: number;
    totalPrice: number;

    material?: string;
    color?: string;

    notes?: string;
};

export type ThreeDOrderCustomer = {
    name: string;
    phone: string;
    email?: string;
    line?: string;
};

export type ThreeDShippingAddress = {
    address?: string;
    district?: string;
    province?: string;
    postcode?: string;
};

export type ThreeDOrder = {
    id: string;

    /**
     * เลขที่ Order สำหรับใช้อ้างอิงกับลูกค้าและบัญชี
     * เช่น 3D-20260910-001
     */
    orderNumber: string;

    userId?: string;
    quoteId?: string;
    source?: string;
    isArchived?: boolean;
    archivedAt?: unknown;
    archivedBy?: string;

    customer: ThreeDOrderCustomer;

    items: ThreeDOrderItem[];

    /**
     * สรุปยอดเงิน
     */
    subtotal: number;
    discount: number;
    shippingFee: number;
    totalPrice: number;

    /**
     * ยอดที่ลูกค้าชำระแล้วและยอดค้างชำระ
     */
    paidAmount: number;
    remainingAmount: number;

    /**
     * สถานะของงานผลิต
     */
    orderStatus: ThreeDOrderStatus;

    /**
     * สถานะทางการเงิน
     */
    paymentStatus: ThreeDPaymentStatus;

    paymentMethod?: ThreeDOrderPaymentMethod;

    /**
     * หมายเหตุสำหรับฝ่ายผลิต
     */
    productionNote?: string;

    /**
     * หมายเหตุจากลูกค้า
     */
    customerNote?: string;

    dueDate?: string;

    shippingAddress?: ThreeDShippingAddress;

    createdAt?: unknown;
    updatedAt?: unknown;
};

/**
 * ข้อมูลที่ใช้สร้าง / แก้ไข Order
 * ไม่รวม id และ timestamp
 */
export type ThreeDOrderInput = Omit<
    ThreeDOrder,
    "id" | "createdAt" | "updatedAt"
>;
