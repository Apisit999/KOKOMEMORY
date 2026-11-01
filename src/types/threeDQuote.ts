export type ThreeDQuoteStatus =
    | "inquiry"
    | "quoted"
    | "accepted"
    | "rejected"
    | "expired"
    | "converted";

export type ThreeDQuoteFile = {
    id: string;
    fileName: string;
    contentType: string;
    size: number;
    kind: "model" | "reference";
};

export type ThreeDQuote = {
    id: string;
    quoteNumber: string;
    userId: string;
    status: ThreeDQuoteStatus;
    files: ThreeDQuoteFile[];
    material: string;
    color: string;
    quantity: number;
    deadline?: string;
    customerNote?: string;
    adminNote?: string;
    subtotal?: number;
    shippingFee?: number;
    discount?: number;
    total?: number;
    validUntil?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    quotedAt?: unknown;
    acceptedAt?: unknown;
    rejectedAt?: unknown;
    convertedAt?: unknown;
};
