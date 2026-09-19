export type BookingLifecycleStatus =
    | "pending_payment" | "payment_submitted" | "payment_rejected"
    | "confirmed" | "completed" | "cancelled" | "expired";

export function normalizeBookingStatus(value: unknown): BookingLifecycleStatus | null {
    const raw = typeof value === "string" ? value.toLowerCase() : "";
    if (raw === "canceled") return "cancelled";
    if (raw === "payment_verified") return "confirmed";
    return (["pending_payment", "payment_submitted", "payment_rejected", "confirmed", "completed", "cancelled", "expired"] as const)
        .includes(raw as BookingLifecycleStatus) ? raw as BookingLifecycleStatus : null;
}

const transitions: Record<BookingLifecycleStatus, readonly BookingLifecycleStatus[]> = {
    pending_payment: ["payment_submitted", "payment_rejected", "cancelled", "expired"],
    payment_submitted: ["confirmed", "payment_rejected", "cancelled", "expired"],
    payment_rejected: ["pending_payment", "payment_submitted", "cancelled", "expired"],
    confirmed: ["completed", "cancelled"],
    completed: [], cancelled: [], expired: [],
};

export function isAllowedBookingTransition(from: unknown, to: unknown): boolean {
    const source = normalizeBookingStatus(from);
    const target = normalizeBookingStatus(to);
    return Boolean(source && target && transitions[source].includes(target));
}

export function isBookingHoldExpired(value: unknown, now = Date.now()): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isFinite(date.getTime()) && date.getTime() <= now;
}
