"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    writeBatch,
} from "firebase/firestore";

import {
    getAuth,
} from "firebase/auth";

import { db } from "@/lib/firebase";

type PaymentStatus =
    | "pending"
    | "submitted"
    | "verified"
    | "rejected";

type Payment = {
    id: string;

    bookingId?: string;

    amount?: number;

    currency?: string;

    method?: string;

    status?: PaymentStatus;

    slipUrl?: string;

    customerName?: string;

    customerPhone?: string;

    customerEmail?: string;

    bankName?: string;

    accountName?: string;

    accountNumber?: string;

    submittedAt?: any;

    createdAt?: any;

    verifiedAt?: any;

    verifiedBy?: string;

    rejectReason?: string;

    rejectedAt?: any;

    rejectedBy?: string;
};

const STATUS_LABEL: Record<string, string> = {
    pending: "รอชำระเงิน",
    submitted: "รอตรวจสอบ",
    verified: "ชำระเงินแล้ว",
    rejected: "ถูกปฏิเสธ",
};

function formatMoney(value?: number) {
    if (typeof value !== "number") {
        return "-";
    }

    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(value);
}

function getStatusClass(status?: string) {
    switch (status) {
        case "verified":
            return "bg-green-100 text-green-700";

        case "submitted":
            return "bg-purple-100 text-purple-700";

        case "rejected":
            return "bg-red-100 text-red-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function getStatusDot(status?: string) {
    switch (status) {
        case "verified":
            return "bg-green-500";

        case "submitted":
            return "bg-purple-500";

        case "rejected":
            return "bg-red-500";

        default:
            return "bg-yellow-500";
    }
}

function getTimestampValue(value: any) {
    if (!value) {
        return 0;
    }

    if (typeof value?.toMillis === "function") {
        return value.toMillis();
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value?.seconds === "number") {
        return value.seconds * 1000;
    }

    return 0;
}

function formatDate(value: any) {
    const timestamp = getTimestampValue(value);

    if (!timestamp) {
        return "-";
    }

    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(timestamp));
}

function playNotificationSound() {
    try {
        const AudioContext =
            window.AudioContext ||
            (window as any).webkitAudioContext;

        if (!AudioContext) {
            return;
        }

        const context = new AudioContext();

        const oscillator =
            context.createOscillator();

        const gain =
            context.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
            880,
            context.currentTime
        );

        oscillator.frequency.setValueAtTime(
            660,
            context.currentTime + 0.15
        );

        gain.gain.setValueAtTime(
            0.0001,
            context.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.18,
            context.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.5
        );

        oscillator.connect(gain);

        gain.connect(context.destination);

        oscillator.start();

        oscillator.stop(
            context.currentTime + 0.5
        );
    } catch (error) {
        console.log(
            "Notification sound unavailable:",
            error
        );
    }
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] =
        useState<Payment[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("all");

    const [processingId, setProcessingId] =
        useState<string | null>(null);

    const [notificationsEnabled, setNotificationsEnabled] =
        useState(false);

    const previousSubmittedCount =
        useRef<number | null>(null);

    /*
    ============================================================
    REALTIME PAYMENTS
    ============================================================
    */

    useEffect(() => {
        setLoading(true);
        setError("");

        const paymentsRef =
            collection(db, "payments");

        const unsubscribe =
            onSnapshot(
                paymentsRef,
                (snapshot) => {
                    const data =
                        snapshot.docs.map(
                            (item) =>
                                ({
                                    id: item.id,
                                    ...item.data(),
                                }) as Payment
                        );

                    data.sort(
                        (a, b) =>
                            getTimestampValue(
                                b.submittedAt ||
                                b.createdAt
                            ) -
                            getTimestampValue(
                                a.submittedAt ||
                                a.createdAt
                            )
                    );

                    const submittedCount =
                        data.filter(
                            (payment) =>
                                payment.status ===
                                "submitted"
                        ).length;

                    /*
                    ====================================================
                    NEW PAYMENT DETECTION
                    ====================================================
                    */

                    if (
                        previousSubmittedCount.current !==
                        null &&
                        submittedCount >
                        previousSubmittedCount.current
                    ) {
                        playNotificationSound();

                        if (
                            "Notification" in window &&
                            Notification.permission ===
                            "granted"
                        ) {
                            new Notification(
                                "KOKO Memory",
                                {
                                    body:
                                        "มีหลักฐานการชำระเงินใหม่ กรุณาตรวจสอบ",
                                    icon: "/favicon.ico",
                                }
                            );
                        }
                    }

                    previousSubmittedCount.current =
                        submittedCount;

                    setPayments(data);

                    setLoading(false);
                },
                (err) => {
                    console.error(
                        "Payments realtime error:",
                        err
                    );

                    setError(
                        err?.message ||
                        "ไม่สามารถโหลดข้อมูลการชำระเงินได้"
                    );

                    setLoading(false);
                }
            );

        return () => unsubscribe();
    }, []);

    /*
    ============================================================
    ENABLE BROWSER NOTIFICATION
    ============================================================
    */

    async function enableNotifications() {
        try {
            if (
                !("Notification" in window)
            ) {
                alert(
                    "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน"
                );

                return;
            }

            const permission =
                await Notification.requestPermission();

            if (
                permission === "granted"
            ) {
                setNotificationsEnabled(
                    true
                );

                new Notification(
                    "KOKO Memory",
                    {
                        body:
                            "เปิดการแจ้งเตือนเรียบร้อยแล้ว",
                        icon: "/favicon.ico",
                    }
                );
            }
        } catch (error) {
            console.error(
                "Notification permission error:",
                error
            );
        }
    }

    /*
    ============================================================
    FILTER
    ============================================================
    */

    const filteredPayments =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return payments.filter(
                (payment) => {
                    const matchesSearch =
                        !keyword ||
                        payment.id
                            .toLowerCase()
                            .includes(keyword) ||
                        payment.bookingId
                            ?.toLowerCase()
                            .includes(keyword) ||
                        payment.customerName
                            ?.toLowerCase()
                            .includes(keyword) ||
                        payment.customerPhone
                            ?.toLowerCase()
                            .includes(keyword) ||
                        payment.customerEmail
                            ?.toLowerCase()
                            .includes(keyword);

                    const matchesStatus =
                        statusFilter ===
                        "all" ||
                        payment.status ===
                        statusFilter;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );
        }, [
            payments,
            search,
            statusFilter,
        ]);

    /*
    ============================================================
    STATISTICS
    ============================================================
    */

    const statistics =
        useMemo(
            () => ({
                total:
                    payments.length,

                pending:
                    payments.filter(
                        (p) =>
                            p.status ===
                            "pending"
                    ).length,

                submitted:
                    payments.filter(
                        (p) =>
                            p.status ===
                            "submitted"
                    ).length,

                verified:
                    payments.filter(
                        (p) =>
                            p.status ===
                            "verified"
                    ).length,

                rejected:
                    payments.filter(
                        (p) =>
                            p.status ===
                            "rejected"
                    ).length,
            }),
            [payments]
        );

    /*
    ============================================================
    VERIFY PAYMENT
    ============================================================
    */

    async function handleVerify(
        payment: Payment
    ) {
        if (
            processingId
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `ยืนยันว่าตรวจสอบการชำระเงินแล้ว?\n\nลูกค้า: ${payment.customerName ||
                "-"
                }\nยอดเงิน: ${formatMoney(
                    payment.amount
                )}`
            );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingId(
                payment.id
            );

            const auth =
                getAuth();

            const adminEmail =
                auth.currentUser
                    ?.email ||
                "admin";

            const paymentRef =
                doc(
                    db,
                    "payments",
                    payment.id
                );

            /*
            ใช้ Batch เพื่ออัปเดต Payment
            และ Booking พร้อมกัน
            */

            const batch =
                writeBatch(db);

            batch.update(
                paymentRef,
                {
                    status:
                        "verified",

                    verifiedAt:
                        serverTimestamp(),

                    verifiedBy:
                        adminEmail,

                    updatedAt:
                        serverTimestamp(),
                }
            );

            if (
                payment.bookingId
            ) {
                const bookingRef =
                    doc(
                        db,
                        "bookings",
                        payment.bookingId
                    );

                batch.update(
                    bookingRef,
                    {
                        bookingStatus:
                            "confirmed",

                        paymentStatus:
                            "verified",

                        paymentId:
                            payment.id,

                        paymentAmount:
                            payment.amount ||
                            0,

                        "payment.status":
                            "verified",

                        "payment.paidAmount":
                            payment.amount ||
                            0,

                        "payment.paidAt":
                            serverTimestamp(),

                        "payment.verifiedAt":
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }

            await batch.commit();

            alert(
                "ยืนยันการชำระเงินเรียบร้อยแล้ว"
            );
        } catch (error: any) {
            console.error(
                "Verify payment error:",
                error
            );

            alert(
                error?.message ||
                "ไม่สามารถยืนยันการชำระเงินได้"
            );
        } finally {
            setProcessingId(null);
        }
    }

    /*
    ============================================================
    REJECT PAYMENT
    ============================================================
    */

    async function handleReject(
        payment: Payment
    ) {
        if (
            processingId
        ) {
            return;
        }

        const reason =
            window.prompt(
                "กรุณาระบุเหตุผลที่ปฏิเสธหลักฐานการชำระเงิน"
            );

        if (
            reason === null
        ) {
            return;
        }

        const cleanReason =
            reason.trim();

        if (
            !cleanReason
        ) {
            alert(
                "กรุณาระบุเหตุผล"
            );

            return;
        }

        try {
            setProcessingId(
                payment.id
            );

            const auth =
                getAuth();

            const adminEmail =
                auth.currentUser
                    ?.email ||
                "admin";

            const paymentRef =
                doc(
                    db,
                    "payments",
                    payment.id
                );

            const batch =
                writeBatch(db);

            batch.update(
                paymentRef,
                {
                    status:
                        "rejected",

                    rejectReason:
                        cleanReason,

                    rejectedAt:
                        serverTimestamp(),

                    rejectedBy:
                        adminEmail,

                    updatedAt:
                        serverTimestamp(),
                }
            );

            if (
                payment.bookingId
            ) {
                const bookingRef =
                    doc(
                        db,
                        "bookings",
                        payment.bookingId
                    );

                batch.update(
                    bookingRef,
                    {
                        bookingStatus:
                            "payment_rejected",

                        paymentStatus:
                            "rejected",

                        "payment.status":
                            "rejected",

                        "payment.rejectReason":
                            cleanReason,

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }

            await batch.commit();

            alert(
                "ปฏิเสธหลักฐานการชำระเงินเรียบร้อยแล้ว"
            );
        } catch (error: any) {
            console.error(
                "Reject payment error:",
                error
            );

            alert(
                error?.message ||
                "ไม่สามารถปฏิเสธรายการได้"
            );
        } finally {
            setProcessingId(null);
        }
    }

    /*
    ============================================================
    COPY
    ============================================================
    */

    async function copyText(
        value: string
    ) {
        try {
            await navigator.clipboard.writeText(
                value
            );

            alert(
                "คัดลอกแล้ว"
            );
        } catch {
            alert(
                "ไม่สามารถคัดลอกได้"
            );
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5 md:px-8 md:py-10">
            <div className="mx-auto max-w-7xl">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">
                            KOKO Memory
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                            การชำระเงิน
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            ตรวจสอบหลักฐานการชำระเงินของลูกค้าแบบ Realtime
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">

                        <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                            Realtime
                        </div>

                        <button
                            type="button"
                            onClick={
                                enableNotifications
                            }
                            className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${notificationsEnabled ||
                                    (typeof Notification !==
                                        "undefined" &&
                                        Notification.permission ===
                                        "granted")
                                    ? "bg-green-100 text-green-700"
                                    : "bg-pink-500 text-white hover:bg-pink-600"
                                }`}
                        >
                            🔔{" "}
                            {notificationsEnabled ||
                                (typeof Notification !==
                                    "undefined" &&
                                    Notification.permission ===
                                    "granted")
                                ? "เปิดแจ้งเตือนแล้ว"
                                : "เปิดแจ้งเตือน"}
                        </button>

                    </div>
                </div>

                {/* =================================================
                    NEW PAYMENT ALERT
                ================================================= */}

                {statistics.submitted >
                    0 && (
                        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-purple-200 bg-purple-50 p-5 sm:flex-row sm:items-center sm:justify-between">

                            <div className="flex items-start gap-3">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xl">
                                    🔔
                                </div>

                                <div>
                                    <p className="font-bold text-purple-900">
                                        มีหลักฐานการชำระเงินรอตรวจสอบ
                                    </p>

                                    <p className="mt-1 text-sm text-purple-700">
                                        ตอนนี้มี{" "}
                                        <b>
                                            {
                                                statistics.submitted
                                            }{" "}
                                            รายการ
                                        </b>{" "}
                                        ที่รอการตรวจสอบ
                                    </p>
                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setStatusFilter(
                                        "submitted"
                                    )
                                }
                                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700"
                            >
                                ดูรายการรอตรวจสอบ
                            </button>

                        </div>
                    )}

                {/* =================================================
                    STATISTICS
                ================================================= */}

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            ทั้งหมด
                        </p>

                        <p className="mt-2 text-3xl font-bold text-slate-900">
                            {statistics.total}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            รอชำระ
                        </p>

                        <p className="mt-2 text-3xl font-bold text-yellow-500">
                            {statistics.pending}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm ring-2 ring-purple-100">
                        <p className="text-sm text-slate-500">
                            รอตรวจสอบ
                        </p>

                        <p className="mt-2 text-3xl font-bold text-purple-500">
                            {statistics.submitted}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            ยืนยันแล้ว
                        </p>

                        <p className="mt-2 text-3xl font-bold text-green-500">
                            {statistics.verified}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            ปฏิเสธ
                        </p>

                        <p className="mt-2 text-3xl font-bold text-red-500">
                            {statistics.rejected}
                        </p>
                    </div>

                </div>

                {/* =================================================
                    FILTER
                ================================================= */}

                <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm sm:p-5">

                    <div className="grid gap-4 md:grid-cols-[1fr_220px]">

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                ค้นหารายการ
                            </label>

                            <input
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="ชื่อ, เบอร์โทร, Email, Payment ID หรือ Booking ID"
                                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                สถานะ
                            </label>

                            <select
                                value={
                                    statusFilter
                                }
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value
                                    )
                                }
                                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none"
                            >
                                <option value="all">
                                    ทุกสถานะ
                                </option>

                                <option value="submitted">
                                    🔔 รอตรวจสอบ
                                </option>

                                <option value="pending">
                                    รอชำระเงิน
                                </option>

                                <option value="verified">
                                    ✓ ชำระเงินแล้ว
                                </option>

                                <option value="rejected">
                                    ✕ ถูกปฏิเสธ
                                </option>
                            </select>
                        </div>

                    </div>
                </div>

                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                        <b>
                            ไม่สามารถโหลดข้อมูลการชำระเงินได้
                        </b>

                        <br />

                        <span>
                            {error}
                        </span>
                    </div>
                )}

                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (
                    <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />

                        <p className="text-slate-500">
                            กำลังเชื่อมต่อข้อมูล Realtime...
                        </p>

                    </div>
                )}

                {/* =================================================
                    EMPTY
                ================================================= */}

                {!loading &&
                    !error &&
                    filteredPayments.length ===
                    0 && (
                        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

                            <div className="text-5xl">
                                💳
                            </div>

                            <h2 className="mt-4 text-xl font-bold text-slate-900">
                                ไม่มีรายการ
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                ยังไม่มีรายการที่ตรงกับเงื่อนไข
                            </p>

                        </div>
                    )}

                {/* =================================================
                    PAYMENT CARDS
                ================================================= */}

                {!loading &&
                    !error &&
                    filteredPayments.length >
                    0 && (
                        <div className="space-y-4">

                            {filteredPayments.map(
                                (payment) => {

                                    const isProcessing =
                                        processingId ===
                                        payment.id;

                                    const waiting =
                                        payment.status ===
                                        "submitted";

                                    return (
                                        <article
                                            key={
                                                payment.id
                                            }
                                            className={`overflow-hidden rounded-2xl bg-white shadow-sm transition ${waiting
                                                    ? "ring-2 ring-purple-100"
                                                    : ""
                                                }`}
                                        >

                                            {/* TOP */}

                                            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-start lg:justify-between">

                                                <div className="min-w-0">

                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <span
                                                            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                                                                payment.status
                                                            )}`}
                                                        >
                                                            <span
                                                                className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                                                                    payment.status
                                                                )}`}
                                                            />

                                                            {STATUS_LABEL[
                                                                payment.status ||
                                                                ""
                                                            ] ||
                                                                "ไม่ระบุ"}
                                                        </span>

                                                        {waiting && (
                                                            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">
                                                                ใหม่
                                                            </span>
                                                        )}

                                                    </div>

                                                    <div className="mt-3 flex flex-wrap items-center gap-2">

                                                        <code className="text-xs text-slate-500">
                                                            Payment ID:{" "}
                                                            {
                                                                payment.id
                                                            }
                                                        </code>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyText(
                                                                    payment.id
                                                                )
                                                            }
                                                            className="text-xs font-semibold text-pink-500 hover:text-pink-700"
                                                        >
                                                            คัดลอก
                                                        </button>

                                                    </div>

                                                </div>

                                                <div className="text-left lg:text-right">

                                                    <p className="text-xs text-slate-400">
                                                        จำนวนเงิน
                                                    </p>

                                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                                        {formatMoney(
                                                            payment.amount
                                                        )}
                                                    </p>

                                                </div>

                                            </div>

                                            {/* CONTENT */}

                                            <div className="grid gap-4 p-5 lg:grid-cols-3">

                                                {/* CUSTOMER */}

                                                <div className="rounded-2xl bg-slate-50 p-4">

                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                        ลูกค้า
                                                    </p>

                                                    <p className="mt-2 font-bold text-slate-900">
                                                        {
                                                            payment.customerName ||
                                                            "-"
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {
                                                            payment.customerPhone ||
                                                            "-"
                                                        }
                                                    </p>

                                                    <p className="mt-1 break-all text-sm text-slate-500">
                                                        {
                                                            payment.customerEmail ||
                                                            "-"
                                                        }
                                                    </p>

                                                </div>

                                                {/* BOOKING */}

                                                <div className="rounded-2xl bg-slate-50 p-4">

                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                        Booking
                                                    </p>

                                                    <code className="mt-2 block break-all text-xs text-slate-700">
                                                        {
                                                            payment.bookingId ||
                                                            "-"
                                                        }
                                                    </code>

                                                    {payment.bookingId && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyText(
                                                                    payment.bookingId!
                                                                )
                                                            }
                                                            className="mt-3 text-xs font-semibold text-pink-500"
                                                        >
                                                            📋 คัดลอก Booking ID
                                                        </button>
                                                    )}

                                                </div>

                                                {/* TIME */}

                                                <div className="rounded-2xl bg-slate-50 p-4">

                                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                        ส่งหลักฐานเมื่อ
                                                    </p>

                                                    <p className="mt-2 text-sm font-semibold text-slate-800">
                                                        {formatDate(
                                                            payment.submittedAt ||
                                                            payment.createdAt
                                                        )}
                                                    </p>

                                                    <p className="mt-3 text-xs text-slate-400">
                                                        วิธีชำระ
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                                        {payment.method ===
                                                            "bank_transfer"
                                                            ? "โอนผ่านธนาคาร"
                                                            : payment.method ||
                                                            "-"}
                                                    </p>

                                                </div>

                                            </div>

                                            {/* BANK */}

                                            {(payment.bankName ||
                                                payment.accountName ||
                                                payment.accountNumber) && (
                                                    <div className="mx-5 mb-5 rounded-2xl border border-green-100 bg-green-50 p-4">

                                                        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
                                                            บัญชีรับเงิน
                                                        </p>

                                                        <div className="mt-2 grid gap-2 sm:grid-cols-3">

                                                            <div>
                                                                <p className="text-xs text-green-600">
                                                                    ธนาคาร
                                                                </p>

                                                                <p className="font-bold text-green-900">
                                                                    {payment.bankName ||
                                                                        "-"}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-green-600">
                                                                    ชื่อบัญชี
                                                                </p>

                                                                <p className="font-bold text-green-900">
                                                                    {payment.accountName ||
                                                                        "-"}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-green-600">
                                                                    เลขบัญชี
                                                                </p>

                                                                <p className="font-bold text-green-900">
                                                                    {payment.accountNumber ||
                                                                        "-"}
                                                                </p>
                                                            </div>

                                                        </div>

                                                    </div>
                                                )}

                                            {/* ACTIONS */}

                                            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:flex-wrap">

                                                {payment.slipUrl ? (
                                                    <a
                                                        href={
                                                            payment.slipUrl
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
                                                    >
                                                        📷 ดูหลักฐานการชำระเงิน
                                                    </a>
                                                ) : (
                                                    <span className="flex min-h-11 items-center justify-center rounded-xl bg-slate-200 px-5 text-sm text-slate-500">
                                                        ไม่มีสลิป
                                                    </span>
                                                )}

                                                {waiting && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isProcessing
                                                            }
                                                            onClick={() =>
                                                                handleVerify(
                                                                    payment
                                                                )
                                                            }
                                                            className="min-h-11 rounded-xl bg-green-500 px-6 text-sm font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {isProcessing
                                                                ? "กำลังบันทึก..."
                                                                : "✓ ยืนยันการชำระเงิน"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isProcessing
                                                            }
                                                            onClick={() =>
                                                                handleReject(
                                                                    payment
                                                                )
                                                            }
                                                            className="min-h-11 rounded-xl border border-red-200 bg-white px-6 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            ✕ ปฏิเสธ
                                                        </button>
                                                    </>
                                                )}

                                            </div>

                                            {/* REJECT REASON */}

                                            {payment.status ===
                                                "rejected" &&
                                                payment.rejectReason && (
                                                    <div className="mx-5 mb-5 rounded-xl border border-red-200 bg-red-50 p-4">

                                                        <p className="text-xs font-bold text-red-600">
                                                            เหตุผลที่ปฏิเสธ
                                                        </p>

                                                        <p className="mt-1 text-sm text-red-800">
                                                            {
                                                                payment.rejectReason
                                                            }
                                                        </p>

                                                    </div>
                                                )}

                                        </article>
                                    );
                                }
                            )}

                        </div>
                    )}

            </div>
        </main>
    );
}