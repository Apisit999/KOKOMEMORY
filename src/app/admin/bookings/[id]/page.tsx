"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    type Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { adminApiFetch } from "@/lib/admin-api-client";
import { auth } from "@/lib/firebase";

import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Clock3,
    ExternalLink,
    FileImage,
    Loader2,
    ShieldCheck,
    X,
    ZoomIn,
} from "lucide-react";

type PaymentRecord = {
    id: string;
    bookingId?: string;
    amount?: number;
    currency?: string;
    method?: string;
    status?: string;
    slipUrl?: string | null;
    proofUrl?: string | null;
    secureSlipUrl?: string | null;
    submittedAt?: Timestamp | string | Date | null;
    verifiedAt?: Timestamp | string | Date | null;
    verifiedBy?: string | null;
    rejectReason?: string | null;
    rejectedAt?: Timestamp | string | Date | null;
    rejectedBy?: string | null;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
};

type Booking = {
    id: string;

    bookingStatus?: string;
    bookingVersion?: number;
    paymentStatus?: string;

    createdAt?: Timestamp | string | Date | null;
    updatedAt?: Timestamp | string | Date | null;

    customer?: {
        name?: string;
        phone?: string;
        line?: string;
        email?: string;
    };

    event?: {
        date?: string;
        type?: string;
        guests?: string | number;
        location?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        postcode?: string;
    };

    package?: {
        name?: string;
        price?: number;
        duration?: string;
    };

    totalPrice?: number;
    travelFee?: number;

    payment?: {
        status?: string;
        method?: string | null;
        proofUrl?: string | null;
        proofKey?: string | null;
        secureSlipUrl?: string | null;
        paidAmount?: number;
        slipFileName?: string;
        slipSize?: number;
        paidAt?: Timestamp | string | Date | null;
        submittedAt?: Timestamp | string | Date | null;
        verifiedAt?: Timestamp | string | Date | null;
        verifiedBy?: string | null;
        rejectReason?: string | null;
    };

    paymentId?: string;
    paymentAmount?: number;
    paymentSubmittedAt?: Timestamp | string | Date | null;
};

const STATUS_LABEL: Record<string, string> = {
    pending_payment: "รอชำระเงิน",
    payment_submitted: "ส่งหลักฐานแล้ว",
    payment_verified: "ตรวจสอบแล้ว",
    payment_rejected: "สลิปถูกปฏิเสธ",
    confirmed: "ยืนยันแล้ว",
    cancelled: "ยกเลิก",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
    wedding: "งานแต่งงาน",
    birthday: "วันเกิด",
    corporate: "งานบริษัท",
    graduation: "งานรับปริญญา",
    party: "งานเลี้ยง",
    other: "อื่น ๆ",
};

function normalizeStatus(value?: string | null) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function formatMoney(value?: number) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "-";
    }

    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value?: string) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function getStatusClass(status?: string) {
    switch (status) {
        case "confirmed":
            return "bg-green-100 text-green-700";

        case "payment_verified":
            return "bg-blue-100 text-blue-700";

        case "payment_submitted":
            return "bg-purple-100 text-purple-700";

        case "cancelled":
        case "payment_rejected":
            return "bg-red-100 text-red-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function getStatusDot(status?: string) {
    switch (status) {
        case "confirmed":
            return "bg-green-500";

        case "payment_verified":
            return "bg-blue-500";

        case "payment_submitted":
            return "bg-purple-500";

        case "cancelled":
        case "payment_rejected":
            return "bg-red-500";

        default:
            return "bg-yellow-500";
    }
}

function getCreatedAtMillis(value?: Booking["createdAt"]) {
    if (!value) return 0;

    if (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof value.toMillis === "function"
    ) {
        return value.toMillis();
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "string") {
        const time = new Date(value).getTime();

        return Number.isNaN(time) ? 0 : time;
    }

    return 0;
}

function formatCreatedAt(value?: Booking["createdAt"]) {
    const millis = getCreatedAtMillis(value);

    if (!millis) return "-";

    return new Date(millis).toLocaleString("th-TH", {
        dateStyle: "long",
        timeStyle: "short",
    });
}

function formatPaymentStatus(status?: string) {
    switch (normalizeStatus(status)) {
        case "submitted":
            return "รอตรวจสอบ";

        case "pending":
        case "pending_verification":
            return "รอตรวจสอบ";

        case "verified":
            return "ยืนยันแล้ว";

        case "paid":
            return "ชำระเงินแล้ว";

        case "rejected":
            return "ถูกปฏิเสธ";

        default:
            return "ยังไม่มีหลักฐาน";
    }
}

function getPaymentStatusClass(status?: string) {
    switch (normalizeStatus(status)) {
        case "verified":
        case "paid":
            return "bg-green-100 text-green-700";

        case "rejected":
            return "bg-red-100 text-red-700";

        case "submitted":
        case "pending":
        case "pending_verification":
            return "bg-amber-100 text-amber-700";

        default:
            return "bg-slate-100 text-slate-500";
    }
}

function isPdfUrl(url?: string | null) {
    if (!url) return false;

    return url
        .toLowerCase()
        .split("?")[0]
        .endsWith(".pdf");
}

function formatFileSize(bytes?: number) {
    if (!bytes || bytes <= 0) return "-";

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getStatusLabel(status?: string) {
    return (
        STATUS_LABEL[
            normalizeStatus(status)
        ] || "ไม่ระบุสถานะ"
    );
}

function getPaymentStatusTone(status?: string) {
    switch (normalizeStatus(status)) {
        case "verified":
        case "paid":
            return "success";

        case "rejected":
            return "danger";

        case "submitted":
        case "pending":
        case "pending_verification":
        case "payment_submitted":
            return "warning";

        default:
            return "neutral";
    }
}

function getPaymentStatusIcon(status?: string) {
    const tone =
        getPaymentStatusTone(status);

    if (tone === "success") {
        return (
            <CheckCircle2
                size={15}
                strokeWidth={2.5}
            />
        );
    }

    if (tone === "danger") {
        return (
            <AlertCircle
                size={15}
                strokeWidth={2.5}
            />
        );
    }

    if (tone === "warning") {
        return (
            <Clock3
                size={15}
                strokeWidth={2.5}
            />
        );
    }

    return (
        <ShieldCheck
            size={15}
            strokeWidth={2.5}
        />
    );
}

function getInitials(value?: string) {
    const text =
        String(value || "KOKO")
            .trim();

    if (!text) return "K";

    return text
        .split(/\\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();
}

function InfoItem({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 transition duration-200 hover:bg-slate-100/80">
            <p className="text-xs font-medium text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                {value === undefined ||
                value === null ||
                value === ""
                    ? "-"
                    : value}
            </p>
        </div>
    );
}

function getEffectivePaymentStatus(booking: Booking) {
    const nested = normalizeStatus(
        booking.payment?.status
    );

    const flat = normalizeStatus(
        booking.paymentStatus
    );

    if (nested) return nested;
    if (flat === "payment_submitted") return "submitted";
    if (flat === "payment_verified") return "verified";
    if (flat) return flat;

    const bookingStatus =
        normalizeStatus(
            booking.bookingStatus
        );

    if (bookingStatus === "payment_submitted") {
        return "submitted";
    }

    if (
        bookingStatus === "payment_verified" ||
        bookingStatus === "confirmed"
    ) {
        return "verified";
    }

    if (
        typeof booking.payment?.paidAmount === "number" &&
        booking.payment.paidAmount > 0
    ) {
        return "paid";
    }

    if (
        typeof booking.paymentAmount === "number" &&
        booking.paymentAmount > 0
    ) {
        return "paid";
    }

    if (
        booking.payment?.proofUrl ||
        booking.payment?.submittedAt ||
        booking.paymentSubmittedAt
    ) {
        return "submitted";
    }

    return "unpaid";
}

/*
 * Payment Protection
 *
 * ถ้ามีข้อมูลเกี่ยวกับการชำระเงินแม้เพียงอย่างเดียว
 * จะไม่อนุญาตให้ลบถาวรจากหน้า Admin
 */
function isPaymentProtected(booking: Booking) {
    const paymentStatus =
        getEffectivePaymentStatus(booking);

    const bookingStatus =
        normalizeStatus(
            booking.bookingStatus
        );

    return (
        paymentStatus === "submitted" ||
        paymentStatus === "pending" ||
        paymentStatus === "pending_verification" ||
        paymentStatus === "verified" ||
        paymentStatus === "paid" ||
        bookingStatus === "payment_submitted" ||
        bookingStatus === "payment_verified" ||
        bookingStatus === "confirmed" ||
        Boolean(booking.paymentId) ||
        Boolean(booking.payment?.proofUrl) ||
        Boolean(booking.payment?.verifiedAt) ||
        Boolean(booking.payment?.paidAt) ||
        Boolean(booking.payment?.submittedAt) ||
        Boolean(booking.paymentSubmittedAt) ||
        (typeof booking.payment?.paidAmount === "number" &&
            booking.payment.paidAmount > 0) ||
        (typeof booking.paymentAmount === "number" &&
            booking.paymentAmount > 0)
    );
}

function canDeleteBooking(booking: Booking) {
    const status = normalizeStatus(
        booking.bookingStatus
    );

    /*
     * Hard Delete อนุญาตเฉพาะ:
     *
     * - pending_payment
     * - cancelled / canceled
     * - ไม่มีสถานะ
     *
     * และต้องไม่มี Payment evidence ทุกชนิด
     */
    return (
        !isPaymentProtected(booking) &&
        (
            status === "pending_payment" ||
            status === "cancelled" ||
            status === "canceled" ||
            status === ""
        )
    );
}

function getDeleteBlockedReason(booking: Booking) {
    if (isPaymentProtected(booking)) {
        return "รายการนี้มีข้อมูลการชำระเงินหรือหลักฐานการชำระเงินแล้ว จึงถูกป้องกันการลบถาวร";
    }

    const status = normalizeStatus(
        booking.bookingStatus
    );

    if (
        status !== "pending_payment" &&
        status !== "cancelled" &&
        status !== "canceled" &&
        status !== ""
    ) {
        return "สถานะของ Booking นี้ไม่ใช่ข้อมูลทดสอบที่ระบบอนุญาตให้ลบ";
    }

    return "";
}

export default function AdminBookingDetailPage() {
    const params = useParams();
    const router = useRouter();

    const id =
        typeof params?.id === "string"
            ? params.id
            : Array.isArray(params?.id)
                ? params.id[0]
                : "";

    const [booking, setBooking] =
        useState<Booking | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [status, setStatus] =
        useState("");

    const [deleteModalOpen, setDeleteModalOpen] =
        useState(false);

    const [deleteConfirmText, setDeleteConfirmText] =
        useState("");

    const [slipViewerOpen, setSlipViewerOpen] =
        useState(false);

    const [paymentProcessing, setPaymentProcessing] =
        useState(false);

    const [paymentActionError, setPaymentActionError] =
        useState("");

    const [paymentRecord, setPaymentRecord] =
        useState<PaymentRecord | null>(null);

    const [secureSlipObjectUrl, setSecureSlipObjectUrl] =
        useState("");

    useEffect(() => {
        let active = true;
        const paymentId = paymentRecord?.id || booking?.paymentId;
        if (!paymentId) {
            setSecureSlipObjectUrl("");
            return;
        }
        (async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                const response = await fetch(`/api/payment-slip/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
                if (!response.ok) return;
                const objectUrl = URL.createObjectURL(await response.blob());
                if (active) setSecureSlipObjectUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
            } catch {
                if (active) setSecureSlipObjectUrl("");
            }
        })();
        return () => { active = false; };
    }, [paymentRecord?.id, booking?.paymentId]);

    useEffect(() => {
        if (!id) return;

        let active = true;

        async function loadBooking() {
            try {
                setLoading(true);
                setError("");

                const result = await adminApiFetch<{
                    booking: Booking;
                    payment: PaymentRecord | null;
                }>(`/api/admin/booking/${encodeURIComponent(id)}`);

                const data = result.booking;

                if (!active) return;

                setBooking(data);

                setStatus(
                    data.bookingStatus ||
                        "pending_payment"
                );

                /*
                 * โหลด Payment record จริงจาก collection payments
                 * เพื่อให้หน้า Booking Detail ใช้สถานะเดียวกับ
                 * Admin Payments เช่น pending / submitted /
                 * verified / rejected
                 */
                if (active) {
                    setPaymentRecord(result.payment);
                }
            } catch (err: unknown) {
                console.error(
                    "Load booking detail error:",
                    err
                );

                if (!active) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : "ไม่สามารถโหลดรายละเอียดการจองได้"
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadBooking();

        return () => {
            active = false;
        };
    }, [id]);

    async function handleVerifyPayment() {
        if (
            !booking ||
            paymentProcessing
        ) {
            return;
        }

        const paymentId =
            paymentRecord?.id ||
            booking.paymentId;

        if (!paymentId) {
            setPaymentActionError(
                "ไม่พบ Payment Record ของ Booking นี้ จึงยังไม่สามารถยืนยันการชำระเงินได้"
            );
            return;
        }

        const paymentStatus =
            normalizeStatus(
                paymentRecord?.status ||
                    booking.payment?.status ||
                    booking.paymentStatus
            );

        if (paymentStatus === "verified") {
            setPaymentActionError(
                "รายการนี้ถูกยืนยันการชำระเงินแล้ว"
            );
            return;
        }

        const proofUrl =
            paymentRecord?.proofUrl ||
            paymentRecord?.slipUrl ||
            booking.payment?.proofUrl;

        if (!proofUrl) {
            setPaymentActionError(
                "ยังไม่มีหลักฐานการชำระเงิน กรุณารอให้ลูกค้าอัปโหลดสลิปก่อน"
            );
            return;
        }

        const paidAmount =
            paymentRecord?.amount ??
            booking.payment?.paidAmount ??
            booking.paymentAmount ??
            0;

        const confirmed =
            window.confirm(
                `ยืนยันการชำระเงินรายการนี้?\n\n` +
                `ลูกค้า: ${
                    booking.customer?.name || "-"
                }\n` +
                `ยอดที่แจ้งชำระ: ${formatMoney(
                    paidAmount
                )}\n\n` +
                `กรุณาตรวจสอบยอดเงินจริงในบัญชีธนาคารและรายละเอียดบนสลิปก่อนกดยืนยัน`
            );

        if (!confirmed) {
            return;
        }

        try {
            setPaymentProcessing(true);
            setPaymentActionError("");
            setError("");
            setSuccess("");

            const auth =
                getAuth();

            const currentUser =
                auth.currentUser;

            if (!currentUser) {
                throw new Error(
                    "ไม่พบบัญชี Admin กรุณาเข้าสู่ระบบใหม่"
                );
            }

            const token =
                await currentUser.getIdToken(
                    true
                );

            const response =
                await fetch(
                    `/api/admin/payment/${encodeURIComponent(
                        paymentId
                    )}`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                            Accept:
                                "application/json",
                        },
                        body: JSON.stringify({
                            action: "verify",
                            bookingId: id,
                        }),
                        cache: "no-store",
                    }
                );

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            let result: {
                success?: boolean;
                error?: string;
                code?: string;
                bookingStatus?: string;
                paymentStatus?: string;
                paymentAmount?: number;
            } = {};

            if (
                contentType
                    .toLowerCase()
                    .includes(
                        "application/json"
                    )
            ) {
                result =
                    (await response.json()) as typeof result;
            } else {
                const responseText =
                    await response.text();

                console.error(
                    "Admin payment verify API returned non-JSON:",
                    responseText.slice(
                        0,
                        1000
                    )
                );

                throw new Error(
                    "Admin Payment API ไม่สามารถตอบกลับเป็น JSON ได้"
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                        `ไม่สามารถยืนยันการชำระเงินได้ (${response.status})`
                );
            }

            const latestAmount =
                result.paymentAmount ??
                paidAmount;

            setPaymentRecord(
                (previous) =>
                    previous
                        ? {
                            ...previous,
                            status: "verified",
                            amount: latestAmount,
                            verifiedBy:
                                currentUser.email ||
                                currentUser.uid,
                        }
                        : previous
            );

            setBooking(
                (previous) =>
                    previous
                        ? {
                            ...previous,
                            bookingStatus:
                                "confirmed",
                            paymentStatus:
                                "verified",
                            paymentId,
                            paymentAmount:
                                latestAmount,
                            payment: {
                                ...previous.payment,
                                status:
                                    "verified",
                                paidAmount:
                                    latestAmount,
                            },
                        }
                        : previous
            );

            setStatus("confirmed");

            setSuccess(
                "ยืนยันการชำระเงินเรียบร้อยแล้ว และ Booking ถูกเปลี่ยนเป็นยืนยันแล้ว"
            );
        } catch (err: unknown) {
            console.error(
                "Verify payment error:",
                err
            );

            setPaymentActionError(
                err instanceof Error
                    ? err.message
                    : "ไม่สามารถยืนยันการชำระเงินได้"
            );
        } finally {
            setPaymentProcessing(false);
        }
    }

    async function handleRejectPayment() {
        if (
            !booking ||
            paymentProcessing
        ) {
            return;
        }

        const paymentId =
            paymentRecord?.id ||
            booking.paymentId;

        if (!paymentId) {
            setPaymentActionError(
                "ไม่พบ Payment Record ของ Booking นี้"
            );
            return;
        }

        const proofUrl =
            paymentRecord?.proofUrl ||
            paymentRecord?.slipUrl ||
            booking.payment?.proofUrl;

        if (!proofUrl) {
            setPaymentActionError(
                "ยังไม่มีหลักฐานการชำระเงินให้ตรวจสอบ"
            );
            return;
        }

        const reason =
            window.prompt(
                "กรุณาระบุเหตุผลที่ปฏิเสธหลักฐานการชำระเงิน"
            );

        if (reason === null) {
            return;
        }

        const cleanReason =
            reason.trim();

        if (!cleanReason) {
            setPaymentActionError(
                "กรุณาระบุเหตุผลก่อนปฏิเสธหลักฐาน"
            );
            return;
        }

        try {
            setPaymentProcessing(true);
            setPaymentActionError("");
            setError("");
            setSuccess("");

            const auth =
                getAuth();

            const currentUser =
                auth.currentUser;

            if (!currentUser) {
                throw new Error(
                    "ไม่พบบัญชี Admin กรุณาเข้าสู่ระบบใหม่"
                );
            }

            const token =
                await currentUser.getIdToken(
                    true
                );

            const response =
                await fetch(
                    `/api/admin/payment/${encodeURIComponent(
                        paymentId
                    )}`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                            Accept:
                                "application/json",
                        },
                        body: JSON.stringify({
                            action: "reject",
                            bookingId: id,
                            reason: cleanReason,
                        }),
                        cache: "no-store",
                    }
                );

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            let result: {
                success?: boolean;
                error?: string;
                code?: string;
            } = {};

            if (
                contentType
                    .toLowerCase()
                    .includes(
                        "application/json"
                    )
            ) {
                result =
                    (await response.json()) as typeof result;
            } else {
                const responseText =
                    await response.text();

                console.error(
                    "Admin payment reject API returned non-JSON:",
                    responseText.slice(
                        0,
                        1000
                    )
                );

                throw new Error(
                    "Admin Payment API ไม่สามารถตอบกลับเป็น JSON ได้"
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                        `ไม่สามารถปฏิเสธหลักฐานการชำระเงินได้ (${response.status})`
                );
            }

            setPaymentRecord(
                (previous) =>
                    previous
                        ? {
                            ...previous,
                            status: "rejected",
                            rejectReason:
                                cleanReason,
                            rejectedBy:
                                currentUser.email ||
                                currentUser.uid,
                        }
                        : previous
            );

            setBooking(
                (previous) =>
                    previous
                        ? {
                            ...previous,
                            bookingStatus:
                                "payment_rejected",
                            paymentStatus:
                                "rejected",
                            payment: {
                                ...previous.payment,
                                status:
                                    "rejected",
                                rejectReason:
                                    cleanReason,
                            },
                        }
                        : previous
            );

            setStatus(
                "payment_rejected"
            );

            setSuccess(
                "ปฏิเสธหลักฐานการชำระเงินเรียบร้อยแล้ว"
            );
        } catch (err: unknown) {
            console.error(
                "Reject payment error:",
                err
            );

            setPaymentActionError(
                err instanceof Error
                    ? err.message
                    : "ไม่สามารถปฏิเสธหลักฐานการชำระเงินได้"
            );
        } finally {
            setPaymentProcessing(false);
        }
    }

    async function updateStatus() {
        if (!id || !booking) return;

        const paymentStatus =
            getEffectivePaymentStatus(
                booking
            );

        if (
            (
                status === "confirmed" ||
                status === "payment_verified"
            ) &&
            paymentStatus !== "verified"
        ) {
            setError(
                "ไม่สามารถตั้งสถานะเป็นยืนยันแล้วได้จนกว่าจะตรวจสอบการชำระเงินเป็น verified"
            );

            return;
        }

        if (
            booking.bookingStatus ===
                "confirmed" &&
            status !== "confirmed"
        ) {
            setError(
                "Booking ที่ยืนยันแล้วไม่ควรถูกลดสถานะจากหน้านี้ กรุณาใช้ขั้นตอนยกเลิก/แก้ไขที่เหมาะสม"
            );

            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            await adminApiFetch(
                `/api/admin/booking/${encodeURIComponent(id)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ bookingStatus: status }),
                },
            );

            setBooking(
                (previous) =>
                    previous
                        ? {
                            ...previous,
                            bookingStatus:
                                status,
                        }
                        : previous
            );

            setSuccess(
                "อัปเดตสถานะการจองเรียบร้อยแล้ว"
            );
        } catch (err: unknown) {
            console.error(
                "Update booking status error:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "ไม่สามารถอัปเดตสถานะได้"
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteBooking() {
        if (
            !booking ||
            !id ||
            deleting
        ) {
            return;
        }

        if (
            !canDeleteBooking(
                booking
            )
        ) {
            setError(
                getDeleteBlockedReason(
                    booking
                ) ||
                    "รายการนี้ไม่สามารถลบได้"
            );

            setDeleteModalOpen(
                false
            );

            return;
        }

        if (
            deleteConfirmText
                .trim()
                .toUpperCase() !==
            "DELETE"
        ) {
            setError(
                'กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบ'
            );

            return;
        }

        try {
            setDeleting(true);
            setError("");
            setSuccess("");

            const auth =
                getAuth();

            if (
                !auth.currentUser
            ) {
                throw new Error(
                    "ไม่พบผู้ดูแลระบบที่เข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่ก่อนลบข้อมูล"
                );
            }

            /*
             * ขอ Firebase ID Token
             *
             * Server จะตรวจสอบสิทธิ์ Admin
             * และตรวจสอบ Payment จาก Firestore
             * อีกครั้งก่อนลบ
             */
            const token =
                await auth.currentUser.getIdToken(
                    true
                );

            /*
             * IMPORTANT
             *
             * ต้องเป็น:
             *
             * /api/admin/booking/[id]
             *
             * ไม่ใช่:
             *
             * /api/admin/bookings/[id]
             *
             * เพราะ route ใช้ชื่อ folder แบบ singular
             */
            const response =
                await fetch(
                    `/api/admin/booking/${encodeURIComponent(
                        id
                    )}`,
                    {
                        method: "DELETE",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                confirmation:
                                    "DELETE",
                            }),

                        cache:
                            "no-store",
                    }
                );

            /*
             * อย่าเรียก response.json()
             * ทันที เพราะถ้า Next.js route
             * ไม่พบ อาจส่ง HTML กลับมา
             * และทำให้เกิด:
             *
             * Unexpected token '<'
             */
            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            let result: {
                success?: boolean;
                error?: string;
                code?: string;
            } = {};

            if (
                contentType
                    .toLowerCase()
                    .includes(
                        "application/json"
                    )
            ) {
                result =
                    (await response.json()) as {
                        success?: boolean;
                        error?: string;
                        code?: string;
                    };
            } else {
                const responseText =
                    await response.text();

                console.error(
                    "Admin Delete API returned non-JSON response:",
                    responseText.slice(
                        0,
                        1000
                    )
                );

                if (
                    response.status ===
                        404
                ) {
                    throw new Error(
                        "ไม่พบ Admin Delete API (404) กรุณาตรวจสอบว่าไฟล์อยู่ที่ src/app/api/admin/booking/[id]/route.ts"
                    );
                }

                throw new Error(
                    "Admin Delete API ไม่สามารถตอบกลับเป็น JSON ได้ กรุณาตรวจสอบ Terminal ของ Next.js และไฟล์ route.ts"
                );
            }

            if (
                !response.ok
            ) {
                throw new Error(
                    result.error ||
                        `ไม่สามารถลบรายการจองได้ (${response.status})`
                );
            }

            setDeleteModalOpen(
                false
            );

            setDeleteConfirmText("");

            setSuccess(
                "ลบข้อมูล Booking เรียบร้อยแล้ว"
            );

            /*
             * กลับหน้ารายการหลัง Server
             * ยืนยันการลบสำเร็จ
             */
            window.setTimeout(
                () => {
                    router.push(
                        "/admin/bookings"
                    );
                },
                500
            );
        } catch (err: unknown) {
            console.error(
                "Delete booking error:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "ไม่สามารถลบรายการจองได้"
            );
        } finally {
            setDeleting(false);
        }
    }

    async function copyBookingId() {
        if (!booking?.id) return;

        try {
            await navigator.clipboard.writeText(
                booking.id
            );

            setSuccess(
                "คัดลอก Booking ID แล้ว"
            );
        } catch {
            setError(
                "ไม่สามารถคัดลอก Booking ID ได้"
            );
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.10),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-3 py-5 sm:px-5 sm:py-8 md:px-8 md:py-10">
                <div className="mx-auto max-w-6xl">
                    <div className="animate-in fade-in duration-500">
                        <div className="mb-6 h-5 w-32 animate-pulse rounded-full bg-slate-200" />
                        <div className="mb-8 h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
                        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                            <div className="space-y-5">
                                {[1, 2, 3].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-3xl border border-white bg-white p-6 shadow-sm"
                                    >
                                        <div className="mb-5 h-5 w-40 animate-pulse rounded bg-slate-200" />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {[1, 2, 3, 4].map((cell) => (
                                                <div
                                                    key={cell}
                                                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-5">
                                {[1, 2, 3].map((item) => (
                                    <div
                                        key={item}
                                        className="h-44 animate-pulse rounded-3xl bg-white shadow-sm"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (
        error &&
        !booking
    ) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-10">
                <div className="mx-auto max-w-3xl">
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/admin/bookings"
                            )
                        }
                        className="mb-5 text-sm font-semibold text-pink-600 hover:text-pink-700"
                    >
                        ← กลับรายการจอง
                    </button>

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        <h1 className="font-bold">
                            ไม่สามารถโหลดข้อมูล
                        </h1>

                        <p className="mt-2 break-words text-sm">
                            {error}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (!booking) {
        return null;
    }

    const paymentDisplayStatus =
        paymentRecord?.status ||
        booking.payment?.status ||
        booking.paymentStatus;

    const normalizedPaymentStatus =
        normalizeStatus(
            paymentDisplayStatus
        );

    const paymentProofUrl =
        secureSlipObjectUrl ||
        "";

    const hasPaymentProof = Boolean(paymentProofUrl);

    const canVerifyPayment =
        hasPaymentProof &&
        (
            normalizedPaymentStatus ===
                "submitted" ||
            normalizedPaymentStatus ===
                "pending" ||
            normalizedPaymentStatus ===
                "pending_verification"
        );

    const canRejectPayment =
        hasPaymentProof &&
        (
            normalizedPaymentStatus ===
                "submitted" ||
            normalizedPaymentStatus ===
                "pending" ||
            normalizedPaymentStatus ===
                "pending_verification"
        );

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(236,72,153,0.08),_transparent_28%),radial-gradient(circle_at_20%_20%,_rgba(168,85,247,0.06),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-3 py-4 sm:px-5 sm:py-7 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-6xl">

                {/* HEADER */}
                <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/admin/bookings"
                                )
                            }
                            className="group mb-3 inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-pink-600 transition duration-200 hover:-translate-x-0.5 hover:bg-pink-50 hover:text-pink-700 active:scale-95"
                        >
                            <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
                            กลับรายการจอง
                        </button>

                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">
                            KOKO Memory
                        </p>

                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            รายละเอียดการจอง
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            ตรวจสอบและจัดการข้อมูลการจอง
                        </p>
                    </div>

                    <div
                        className={`inline-flex w-fit items-center gap-2 rounded-full border border-white/80 px-4 py-2.5 text-sm font-bold shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 ${getStatusClass(
                            booking.bookingStatus
                        )}`}
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span
                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${getStatusDot(
                                    booking.bookingStatus
                                )}`}
                            />
                            <span
                                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${getStatusDot(
                                    booking.bookingStatus
                                )}`}
                            />
                        </span>

                        {getStatusLabel(
                            booking.bookingStatus
                        )}
                    </div>
                </div>

                {/* SUCCESS */}
                {success && (
                    <div className="animate-in slide-in-from-top-2 fade-in mb-5 rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-700 shadow-sm ring-1 ring-green-100 duration-300">
                        ✓ {success}
                    </div>
                )}

                {/* ERROR */}
                {error && (
                    <div className="animate-in slide-in-from-top-2 fade-in mb-5 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-100 duration-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

                    {/* LEFT */}
                    <div className="space-y-5">

                        {/* CUSTOMER */}
                        <section className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                    Customer
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    ข้อมูลลูกค้า
                                </h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="ชื่อ - นามสกุล"
                                    value={
                                        booking.customer?.name
                                    }
                                />

                                <InfoItem
                                    label="เบอร์โทรศัพท์"
                                    value={
                                        booking.customer?.phone
                                    }
                                />

                                <InfoItem
                                    label="Email"
                                    value={
                                        booking.customer?.email
                                    }
                                />

                                <InfoItem
                                    label="LINE ID"
                                    value={
                                        booking.customer?.line
                                    }
                                />
                            </div>
                        </section>

                        {/* EVENT */}
                        <section className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                    Event
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    รายละเอียดงาน
                                </h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="วันที่จัดงาน"
                                    value={formatDate(
                                        booking.event?.date
                                    )}
                                />

                                <InfoItem
                                    label="ประเภทงาน"
                                    value={
                                        EVENT_TYPE_LABEL[
                                            booking.event?.type ||
                                                ""
                                        ] ||
                                        booking.event?.type ||
                                        "-"
                                    }
                                />

                                <InfoItem
                                    label="จำนวนแขกโดยประมาณ"
                                    value={
                                        booking.event?.guests
                                            ? `${booking.event.guests} คน`
                                            : "-"
                                    }
                                />

                                <InfoItem
                                    label="สถานที่"
                                    value={
                                        booking.event?.location
                                    }
                                />

                                <InfoItem
                                    label="จังหวัด"
                                    value={
                                        booking.event?.province
                                    }
                                />

                                <InfoItem
                                    label="เขต / อำเภอ"
                                    value={
                                        booking.event?.district
                                    }
                                />

                                <InfoItem
                                    label="แขวง / ตำบล"
                                    value={
                                        booking.event?.subdistrict
                                    }
                                />

                                <InfoItem
                                    label="รหัสไปรษณีย์"
                                    value={
                                        booking.event?.postcode
                                    }
                                />
                            </div>
                        </section>

                        {/* PAYMENT PROOF */}
                        <section className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition duration-300 hover:shadow-md">
                            <div className="border-b border-slate-100 p-5 sm:p-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                            Payment
                                        </p>

                                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                                            หลักฐานการชำระเงิน
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            สลิปที่ลูกค้าอัปโหลดจากหน้า Payment
                                        </p>
                                    </div>

                                    <span
                                        className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${getPaymentStatusClass(
                                            paymentDisplayStatus
                                        )}`}
                                    >
                                        <span className="h-2 w-2 rounded-full bg-current" />

                                        {formatPaymentStatus(
                                            paymentDisplayStatus
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 sm:p-6">
                                {paymentProofUrl ? (
                                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">

                                        {/* SLIP PREVIEW */}
                                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <FileImage
                                                        size={18}
                                                        className="shrink-0 text-pink-500"
                                                    />

                                                    <span className="truncate text-sm font-semibold text-slate-700">
                                                        {booking.payment?.slipFileName ||
                                                            "หลักฐานการชำระเงิน"}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSlipViewerOpen(
                                                            true
                                                        )
                                                    }
                                                    className="group flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-95"
                                                >
                                                    <ZoomIn
                                                        size={15}
                                                        className="transition-transform duration-200 group-hover:scale-110"
                                                    />
                                                    ดูเต็ม
                                                </button>
                                            </div>

                                            <div className="flex min-h-[360px] items-center justify-center p-4 sm:min-h-[460px]">
                                                {isPdfUrl(
                                                    paymentRecord?.secureSlipUrl ||
                                                    booking.payment?.secureSlipUrl ||
                                                    ""
                                                ) ? (
                                                    <div className="flex flex-col items-center justify-center text-center">
                                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                                                            <FileImage size={30} />
                                                        </div>

                                                        <p className="mt-4 font-bold text-slate-900">
                                                            ไฟล์ PDF
                                                        </p>

                                                        <p className="mt-1 text-sm text-slate-500">
                                                            เปิดไฟล์เพื่อดูหลักฐานการชำระเงิน
                                                        </p>

                                                        <a
                                                            href={paymentProofUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="group mt-5 inline-flex items-center gap-2 rounded-full bg-pink-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-pink-600"
                                                        >
                                                            <ExternalLink size={16} />
                                                            เปิดสลิป
                                                            <ChevronRight
                                                                size={15}
                                                                className="transition-transform duration-200 group-hover:translate-x-0.5"
                                                            />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSlipViewerOpen(
                                                                true
                                                            )
                                                        }
                                                        className="group relative block max-h-[520px] w-full overflow-hidden rounded-xl bg-white"
                                                    >
                                                        <img
                                                            src={paymentProofUrl}
                                                            alt="หลักฐานการชำระเงิน"
                                                            className="mx-auto max-h-[520px] w-auto max-w-full object-contain transition duration-500 group-hover:scale-[1.025]"
                                                        />

                                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/50 to-transparent px-4 pb-4 pt-10 opacity-0 transition group-hover:opacity-100">
                                                            <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-slate-900 shadow-lg">
                                                                <ZoomIn size={14} />
                                                                คลิกเพื่อดูสลิปเต็ม
                                                            </span>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* PAYMENT DETAILS */}
                                        <div className="space-y-3">
                                            <div className="rounded-2xl border border-pink-100 bg-[linear-gradient(135deg,#fff1f8,#fdf4ff)] p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
                                                <p className="text-xs font-medium text-pink-600">
                                                    ยอดที่ลูกค้าแจ้งชำระ
                                                </p>

                                                <p className="mt-1 text-3xl font-black text-pink-600">
                                                    {formatMoney(
                                                        booking.payment?.paidAmount ??
                                                            booking.paymentAmount
                                                    )}
                                                </p>
                                            </div>

                                            <InfoItem
                                                label="วิธีชำระ"
                                                value={
                                                    paymentRecord?.method ===
                                                    "bank_transfer" ||
                                                    booking.payment?.method ===
                                                        "bank_transfer"
                                                        ? "โอนผ่านธนาคาร"
                                                        : paymentRecord?.method ||
                                                          booking.payment?.method ||
                                                          "-"
                                                }
                                            />

                                            <InfoItem
                                                label="Payment ID"
                                                value={
                                                    paymentRecord?.id ||
                                                    booking.paymentId
                                                }
                                            />

                                            <InfoItem
                                                label="ขนาดไฟล์"
                                                value={formatFileSize(
                                                    booking.payment
                                                        ?.slipSize
                                                )}
                                            />

                                            <InfoItem
                                                label="ส่งหลักฐานเมื่อ"
                                                value={formatCreatedAt(
                                                    booking.paymentSubmittedAt ??
                                                        paymentRecord?.submittedAt ??
                                                        booking.payment
                                                            ?.submittedAt
                                                )}
                                            />

                                            {(paymentRecord?.verifiedBy ||
                                                booking.payment?.verifiedBy) && (
                                                <InfoItem
                                                    label="ตรวจสอบโดย"
                                                    value={
                                                        paymentRecord?.verifiedBy ||
                                                        booking.payment?.verifiedBy
                                                    }
                                                />
                                            )}

                                            {paymentActionError && (
                                                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                                    <div className="flex items-start gap-2 text-sm font-bold text-red-800">
                                                        <AlertCircle
                                                            size={18}
                                                            className="mt-0.5 shrink-0"
                                                        />
                                                        <span>{paymentActionError}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {canVerifyPayment ? (
                                                <div className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#fff7ed)] p-4 shadow-sm transition duration-300">
                                                    <div className="flex gap-3">
                                                        <span className="text-lg">
                                                            🔎
                                                        </span>

                                                        <div>
                                                            <p className="text-sm font-bold text-amber-800">
                                                                รอ Admin ตรวจสอบการชำระเงิน
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                                                กรุณาตรวจสอบยอดเงินจริงในบัญชีธนาคาร ชื่อบัญชี วันที่ เวลา และยอดบนสลิปก่อนกดยืนยัน
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                handleVerifyPayment
                                                            }
                                                            disabled={
                                                                paymentProcessing
                                                            }
                                                            className="group relative min-h-12 overflow-hidden rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {paymentProcessing ? (
                                                                <span className="inline-flex items-center justify-center gap-2">
                                                                    <Loader2
                                                                        size={16}
                                                                        className="animate-spin"
                                                                    />
                                                                    กำลังตรวจสอบ...
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center gap-2">
                                                                    <CheckCircle2 size={16} />
                                                                    ยืนยันการชำระเงิน
                                                                </span>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                handleRejectPayment
                                                            }
                                                            disabled={
                                                                paymentProcessing
                                                            }
                                                            className="min-h-12 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {paymentProcessing ? (
                                                                <span className="inline-flex items-center justify-center gap-2">
                                                                    <Loader2
                                                                        size={16}
                                                                        className="animate-spin"
                                                                    />
                                                                    กำลังดำเนินการ...
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center gap-2">
                                                                    <X size={16} />
                                                                    ปฏิเสธสลิป
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                                    <div className="flex gap-3">
                                                        <CheckCircle2
                                                            size={19}
                                                            className="mt-0.5 shrink-0 text-emerald-600"
                                                        />

                                                        <div>
                                                            <p className="text-sm font-bold text-emerald-800">
                                                                {normalizedPaymentStatus ===
                                                                "verified"
                                                                    ? "ตรวจสอบการชำระเงินแล้ว"
                                                                    : normalizedPaymentStatus ===
                                                                      "rejected"
                                                                    ? "หลักฐานการชำระเงินถูกปฏิเสธ"
                                                                    : "มีหลักฐานส่งเข้ามาแล้ว"}
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-emerald-700">
                                                                {normalizedPaymentStatus ===
                                                                "verified"
                                                                    ? "การชำระเงินได้รับการยืนยันแล้ว Booking นี้ไม่ควรถูกลบถาวร"
                                                                    : normalizedPaymentStatus ===
                                                                      "rejected"
                                                                    ? `เหตุผล: ${
                                                                        paymentRecord?.rejectReason ||
                                                                        booking.payment?.rejectReason ||
                                                                        "-"
                                                                    }`
                                                                    : "ตรวจสอบชื่อบัญชี ยอดเงินจริง และรายละเอียดบนสลิปก่อนดำเนินการ"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#fff)] px-5 py-14 text-center transition duration-300 hover:border-pink-200 hover:bg-pink-50/30">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                                            <FileImage size={27} />
                                        </div>

                                        <h3 className="mt-4 font-bold text-slate-800">
                                            ยังไม่มีหลักฐานการชำระเงิน
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            รอลูกค้าอัปโหลดสลิปจากหน้า Payment
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* PACKAGE */}
                        <section className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                    Package
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    แพ็กเกจและราคา
                                </h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="แพ็กเกจ"
                                    value={
                                        booking.package?.name
                                    }
                                />

                                <InfoItem
                                    label="ระยะเวลา"
                                    value={
                                        booking.package?.duration
                                    }
                                />

                                <InfoItem
                                    label="ราคาแพ็กเกจ"
                                    value={formatMoney(
                                        booking.package?.price
                                    )}
                                />

                                <InfoItem
                                    label="ค่าเดินทาง"
                                    value={formatMoney(
                                        booking.travelFee
                                    )}
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between rounded-2xl border border-pink-100 bg-[linear-gradient(135deg,rgba(253,242,248,1),rgba(250,245,255,1))] p-5 shadow-sm transition duration-300 hover:shadow-md">
                                <div>
                                    <p className="text-sm text-slate-500">
                                        ยอดรวม
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-pink-600">
                                        {formatMoney(
                                            booking.totalPrice ??
                                                booking.package
                                                    ?.price
                                        )}
                                    </p>
                                </div>

                                <span className="text-3xl">
                                    💰
                                </span>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT */}
                    <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">

                        {/* STATUS */}
                        <section className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                Booking Status
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                                จัดการสถานะ
                            </h2>

                            <div className="mt-5">
                                <label
                                    htmlFor="booking-status"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    สถานะการจอง
                                </label>

                                <select
                                    id="booking-status"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(
                                            e.target.value
                                        )
                                    }
                                    className="min-h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition duration-200 hover:border-slate-300 hover:bg-white focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-100"
                                >
                                    <option value="pending_payment">
                                        รอชำระเงิน
                                    </option>

                                    <option value="payment_submitted">
                                        ส่งหลักฐานแล้ว
                                    </option>

                                    <option value="payment_verified">
                                        ตรวจสอบแล้ว
                                    </option>

                                    <option value="payment_rejected">
                                        สลิปถูกปฏิเสธ
                                    </option>

                                    <option value="confirmed">
                                        ยืนยันแล้ว
                                    </option>

                                    <option value="cancelled">
                                        ยกเลิก
                                    </option>
                                </select>

                                <button
                                    type="button"
                                    onClick={
                                        updateStatus
                                    }
                                    disabled={
                                        saving ||
                                        status ===
                                            booking.bookingStatus
                                    }
                                    className="mt-3 min-h-12 w-full rounded-xl bg-pink-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-pink-600 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving
                                        ? "กำลังบันทึก..."
                                        : "บันทึกสถานะ"}
                                </button>
                            </div>
                        </section>

                        {/* DANGEROUS ACTIONS */}
                        <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm ring-1 ring-red-50 transition duration-300 hover:shadow-md sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                                Danger Zone
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                                การจัดการรายการ
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                การลบถาวรใช้สำหรับข้อมูลทดสอบที่ยังไม่มีการชำระเงินเท่านั้น
                            </p>

                            {canDeleteBooking(
                                booking
                            ) ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeleteConfirmText(
                                            ""
                                        );
                                        setError("");
                                        setDeleteModalOpen(
                                            true
                                        );
                                    }}
                                    disabled={
                                        deleting
                                    }
                                    className="mt-5 min-h-12 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    🗑️ ลบข้อมูลทดสอบ
                                </button>
                            ) : (
                                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex gap-3">
                                        <span className="text-lg">
                                            🔒
                                        </span>

                                        <div>
                                            <p className="text-sm font-bold text-amber-800">
                                                ป้องกันการลบ
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                                {getDeleteBlockedReason(
                                                    booking
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* BOOKING ID */}
                        <section className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                Booking ID
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-900">
                                รหัสรายการจอง
                            </h2>

                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                <code className="block break-all text-xs leading-5 text-slate-600">
                                    {booking.id}
                                </code>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    copyBookingId
                                }
                                className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]"
                            >
                                📋 คัดลอก Booking ID
                            </button>
                        </section>

                        {/* CREATED */}
                        <section className="group rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                System
                            </p>

                            <div className="mt-4 space-y-4">
                                <div>
                                    <p className="text-xs text-slate-400">
                                        สร้างรายการเมื่อ
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {formatCreatedAt(
                                            booking.createdAt
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">
                                        เวอร์ชันรายการ
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {booking.bookingVersion ??
                                            1}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModalOpen && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-md sm:p-5"
                    onClick={() => {
                        if (!deleting) {
                            setDeleteModalOpen(
                                false
                            );

                            setDeleteConfirmText(
                                ""
                            );
                        }
                    }}
                >
                    <div
                        className="animate-in zoom-in-95 fade-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl duration-200"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="border-b border-red-100 bg-red-50 px-5 py-5 sm:px-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl">
                                    ⚠️
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                                        Permanent Delete
                                    </p>

                                    <h2 className="mt-1 text-xl font-bold text-red-900">
                                        ลบ Booking นี้ถาวร?
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-red-700">
                                        การกระทำนี้ย้อนกลับไม่ได้ ใช้เฉพาะข้อมูลทดสอบที่ยังไม่มีการชำระเงิน
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 p-5 sm:p-6">

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="ลูกค้า"
                                    value={
                                        booking.customer?.name
                                    }
                                />

                                <InfoItem
                                    label="วันที่จัดงาน"
                                    value={formatDate(
                                        booking.event?.date
                                    )}
                                />

                                <InfoItem
                                    label="แพ็กเกจ"
                                    value={
                                        booking.package?.name
                                    }
                                />

                                <InfoItem
                                    label="ยอดรวม"
                                    value={formatMoney(
                                        booking.totalPrice ??
                                            booking.package
                                                ?.price
                                    )}
                                />
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-400">
                                    Booking ID
                                </p>

                                <code className="mt-1 block break-all text-xs leading-5 text-slate-700">
                                    {booking.id}
                                </code>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-bold text-amber-800">
                                    ⚠️ ระบบจะตรวจสอบข้อมูลล่าสุดอีกครั้งก่อนลบ
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    หากพบ Payment, สลิป หรือข้อมูลการชำระเงิน ระบบจะยกเลิกการลบทันที
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="delete-confirm"
                                    className="block text-sm font-bold text-slate-800"
                                >
                                    พิมพ์{" "}
                                    <span className="text-red-600">
                                        DELETE
                                    </span>{" "}
                                    เพื่อยืนยัน
                                </label>

                                <input
                                    id="delete-confirm"
                                    value={
                                        deleteConfirmText
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setDeleteConfirmText(
                                            event.target.value
                                        )
                                    }
                                    autoComplete="off"
                                    autoFocus
                                    disabled={
                                        deleting
                                    }
                                    placeholder="DELETE"
                                    className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] outline-none transition placeholder:font-normal placeholder:tracking-normal focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeleteModalOpen(
                                            false
                                        );

                                        setDeleteConfirmText(
                                            ""
                                        );
                                    }}
                                    disabled={
                                        deleting
                                    }
                                    className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    ยกเลิก
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleDeleteBooking
                                    }
                                    disabled={
                                        deleting ||
                                        deleteConfirmText
                                            .trim()
                                            .toUpperCase() !==
                                            "DELETE"
                                    }
                                    className="min-h-12 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {deleting
                                        ? "กำลังตรวจสอบและลบ..."
                                        : "ยืนยันการลบถาวร"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT SLIP VIEWER */}
            {slipViewerOpen &&
                (
                    paymentProofUrl
                ) && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-5"
                        onClick={() =>
                            setSlipViewerOpen(
                                false
                            )
                        }
                    >
                        <div
                            className="animate-in zoom-in-95 fade-in relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl duration-200"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        >
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-5">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                        Payment Proof
                                    </p>

                                    <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                                        {booking
                                            .payment
                                            ?.slipFileName ||
                                            "หลักฐานการชำระเงิน"}
                                    </h3>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <a
                                        href={
                                            paymentProofUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
                                    >
                                        <ExternalLink size={15} />
                                        เปิดแท็บใหม่
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSlipViewerOpen(
                                                false
                                            )
                                        }
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm transition duration-200 hover:rotate-90 hover:bg-slate-200 active:scale-90"
                                        aria-label="ปิดสลิป"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-6">
                                {isPdfUrl(
                                    paymentProofUrl
                                ) ? (
                                    <iframe
                                        src={
                                            paymentProofUrl
                                        }
                                        title="หลักฐานการชำระเงิน"
                                        className="h-[75vh] w-full rounded-2xl bg-white"
                                    />
                                ) : (
                                    <div className="flex min-h-full items-center justify-center">
                                        <img
                                            src={
                                                paymentProofUrl
                                            }
                                            alt="หลักฐานการชำระเงิน"
                                            className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
        </main>
    );
}
