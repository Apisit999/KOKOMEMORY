"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    DollarSign,
    Loader2,
    Package,
    Plus,
    RefreshCw,
    ShoppingBag,
    Wallet,
    XCircle,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { adminApiFetch } from "@/lib/admin-api-client";

import {
    getThreeDOrders,
    type ThreeDOrder,
    type ThreeDOrderStatus,
} from "@/services/threeDOrders";

/* =========================================================
   TYPES
========================================================= */

type Booking = {
    id: string;
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    customerName?: string;
    name?: string;
    email?: string;
    phone?: string;
    bookingStatus?: string;
    status?: string;
    eventDate?: unknown;
    date?: unknown;
    createdAt?: unknown;
    totalPrice?: number;
    price?: number;
    total?: number;
    package?: {
        name?: string;
        packageName?: string;
        price?: number;
    };
    pricing?: {
        total?: number;
    };
};

type Payment = {
    id: string;
    status?: string;
    amount?: number;
    bookingId?: string;
    submittedAt?: unknown;
    createdAt?: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function timestampToNumber(value: unknown): number {
    if (!value) {
        return 0;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof (value as { toMillis?: unknown }).toMillis ===
            "function"
    ) {
        return (
            value as {
                toMillis: () => number;
            }
        ).toMillis();
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "seconds" in value
    ) {
        const seconds = Number(
            (value as { seconds?: unknown }).seconds
        );

        const nanoseconds = Number(
            (value as { nanoseconds?: unknown }).nanoseconds ??
                0
        );

        if (Number.isFinite(seconds)) {
            return (
                seconds * 1000 +
                Math.floor(nanoseconds / 1_000_000)
            );
        }
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "number") {
        return value < 10_000_000_000
            ? value * 1000
            : value;
    }

    if (typeof value === "string") {
        const parsed = Date.parse(value);

        return Number.isNaN(parsed)
            ? 0
            : parsed;
    }

    return 0;
}

function getCurrentMonthRange() {
    const now = new Date();

    return {
        start: new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        ).getTime(),

        end: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        ).getTime(),
    };
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function formatDate(value: unknown) {
    const timestamp = timestampToNumber(value);

    if (!timestamp) {
        return "-";
    }

    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
    }).format(new Date(timestamp));
}

function getBookingName(booking: Booking) {
    return (
        booking.customer?.name ||
        booking.customerName ||
        booking.name ||
        "ไม่ระบุชื่อ"
    );
}

function getBookingPhone(booking: Booking) {
    return (
        booking.customer?.phone ||
        booking.phone ||
        "-"
    );
}

function getBookingStatus(booking: Booking) {
    return (
        booking.bookingStatus ||
        booking.status ||
        "pending"
    );
}

function getBookingPrice(booking: Booking) {
    return Number(
        booking.totalPrice ??
            booking.pricing?.total ??
            booking.package?.price ??
            booking.price ??
            booking.total ??
            0
    );
}

function getBookingEvent(booking: Booking) {
    return (
        booking.package?.name ||
        booking.package?.packageName ||
        "Photobooth"
    );
}

function isCancelledBooking(booking: Booking) {
    const status = getBookingStatus(booking);

    return (
        status === "cancelled" ||
        status === "canceled" ||
        status === "ยกเลิก"
    );
}

function isConfirmedBooking(booking: Booking) {
    const status = getBookingStatus(booking);

    return (
        status === "confirmed" ||
        status === "ยืนยันแล้ว"
    );
}

function getOrderStatusLabel(
    status: ThreeDOrderStatus
) {
    const labels: Record<
        ThreeDOrderStatus,
        string
    > = {
        quote: "ใบเสนอราคา",
        pending_confirmation: "รอยืนยัน",
        waiting_payment: "รอชำระเงิน",
        queued: "เข้าคิวผลิต",
        printing: "กำลังพิมพ์",
        quality_check: "ตรวจคุณภาพ",
        ready: "พร้อมรับ",
        shipping: "กำลังจัดส่ง",
        completed: "เสร็จสิ้น",
        cancelled: "ยกเลิก",
    };

    return labels[status];
}

function getOrderStatusClass(
    status: ThreeDOrderStatus
) {
    switch (status) {
        case "completed":
            return "bg-emerald-50 text-emerald-700";

        case "printing":
        case "quality_check":
            return "bg-violet-50 text-violet-700";

        case "queued":
        case "ready":
            return "bg-blue-50 text-blue-700";

        case "shipping":
            return "bg-cyan-50 text-cyan-700";

        case "waiting_payment":
            return "bg-orange-50 text-orange-700";

        case "pending_confirmation":
            return "bg-amber-50 text-amber-700";

        case "cancelled":
            return "bg-red-50 text-red-700";

        default:
            return "bg-slate-100 text-slate-700";
    }
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    tone = "pink",
    href,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: typeof DollarSign;
    tone?: "pink" | "blue" | "green" | "orange" | "violet";
    href?: string;
}) {
    const toneClasses = {
        pink: "bg-pink-50 text-pink-500",
        blue: "bg-blue-50 text-blue-500",
        green: "bg-emerald-50 text-emerald-600",
        orange: "bg-orange-50 text-orange-500",
        violet: "bg-violet-50 text-violet-600",
    };

    const content = (
        <div className="h-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl sm:p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                        {title}
                    </p>

                    <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 sm:mt-3 sm:text-3xl">
                        {value}
                    </p>

                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-400 sm:mt-2 sm:text-xs">
                        {subtitle}
                    </p>
                </div>

                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${toneClasses[tone]}`}
                >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
            </div>
        </div>
    );

    if (!href) {
        return content;
    }

    return (
        <Link
            href={href}
            className="block h-full"
        >
            {content}
        </Link>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminDashboardPage() {
    const router = useRouter();

    const [userReady, setUserReady] =
        useState(false);

    const [user, setUser] =
        useState(auth.currentUser);

    const [bookings, setBookings] =
        useState<Booking[]>([]);

    const [payments, setPayments] =
        useState<Payment[]>([]);

    const [threeDOrders, setThreeDOrders] =
        useState<ThreeDOrder[]>([]);

    const [loadingBookings, setLoadingBookings] =
        useState(true);

    const [loadingThreeD, setLoadingThreeD] =
        useState(true);

    const [bookingError, setBookingError] =
        useState("");

    const [threeDError, setThreeDError] =
        useState("");

    const [refreshingThreeD, setRefreshingThreeD] =
        useState(false);

    /* =====================================================
       AUTH
    ===================================================== */

    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                (currentUser) => {
                    if (!currentUser) {
                        router.replace(
                            "/admin/login"
                        );

                        return;
                    }

                    setUser(currentUser);
                    setUserReady(true);
                }
            );

        return unsubscribe;
    }, [router]);

    /* =====================================================
       LOAD BOOKINGS
    ===================================================== */

    useEffect(() => {
        if (!user) {
            return;
        }

        let cancelled = false;

        async function loadBookings() {
            try {
                setLoadingBookings(true);
                setBookingError("");

                const result = await adminApiFetch<{
                    bookings?: Booking[];
                }>("/api/admin/booking");

                if (cancelled) {
                    return;
                }

                const data =
                    (result.bookings || [])
                        .sort(
                            (a, b) =>
                                timestampToNumber(
                                    b.createdAt
                                ) -
                                timestampToNumber(
                                    a.createdAt
                                )
                        );

                setBookings(data);
            } catch (error) {
                console.error(
                    "Dashboard bookings error:",
                    error
                );

                if (!cancelled) {
                    setBookingError(
                        error instanceof Error
                            ? error.message
                            : "ไม่สามารถโหลด Booking ได้"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingBookings(false);
                }
            }
        }

        void loadBookings();

        return () => {
            cancelled = true;
        };
    }, [user]);

    /* =====================================================
       LOAD PAYMENTS
    ===================================================== */

    useEffect(() => {
        if (!user) {
            return;
        }

        let cancelled = false;

        async function loadPayments() {
            try {
                const result = await adminApiFetch<{
                    payments?: Payment[];
                }>("/api/admin/payment");

                if (cancelled) {
                    return;
                }

                const data =
                    (result.payments || [])
                        .sort(
                            (a, b) =>
                                timestampToNumber(
                                    b.submittedAt ||
                                        b.createdAt
                                ) -
                                timestampToNumber(
                                    a.submittedAt ||
                                        a.createdAt
                                )
                        );

                setPayments(data);
            } catch (error) {
                console.error(
                    "Dashboard payments error:",
                    error
                );
            }
        }

        void loadPayments();

        return () => {
            cancelled = true;
        };
    }, [user]);

    /* =====================================================
       LOAD 3D ORDERS
    ===================================================== */

    const loadThreeDOrders =
        useCallback(
            async (
                showRefresh = false
            ) => {
                try {
                    if (showRefresh) {
                        setRefreshingThreeD(
                            true
                        );
                    } else {
                        setLoadingThreeD(
                            true
                        );
                    }

                    setThreeDError("");

                    const result =
                        await getThreeDOrders();

                    setThreeDOrders(
                        Array.isArray(
                            result
                        )
                            ? result
                            : []
                    );
                } catch (error) {
                    console.error(
                        "Dashboard 3D orders error:",
                        error
                    );

                    setThreeDError(
                        error instanceof Error
                            ? error.message
                            : "ไม่สามารถโหลด 3D Orders ได้"
                    );
                } finally {
                    setLoadingThreeD(false);
                    setRefreshingThreeD(
                        false
                    );
                }
            },
            []
        );

    useEffect(() => {
        if (!user) {
            return;
        }

        void loadThreeDOrders();
    }, [user, loadThreeDOrders]);

    /* =====================================================
       BOOKING STATS
    ===================================================== */

    const bookingStats = useMemo(() => {
        const total =
            bookings.length;

        const confirmed =
            bookings.filter(
                isConfirmedBooking
            ).length;

        const cancelled =
            bookings.filter(
                isCancelledBooking
            ).length;

        const pending =
            bookings.filter(
                (booking) => {
                    const status =
                        getBookingStatus(
                            booking
                        );

                    return (
                        status === "pending" ||
                        status ===
                            "pending_payment" ||
                        status ===
                            "payment_submitted" ||
                        status ===
                            "payment_rejected" ||
                        status === "รอยืนยัน" ||
                        status ===
                            "รอชำระเงิน"
                    );
                }
            ).length;

        const revenue =
            bookings
                .filter(
                    isConfirmedBooking
                )
                .reduce(
                    (
                        totalValue,
                        booking
                    ) =>
                        totalValue +
                        getBookingPrice(
                            booking
                        ),
                    0
                );

        return {
            total,
            confirmed,
            cancelled,
            pending,
            revenue,
        };
    }, [bookings]);

    /* =====================================================
       PAYMENT STATS
    ===================================================== */

    const paymentStats = useMemo(() => {
        const pending =
            payments.filter(
                (payment) =>
                    payment.status ===
                        "submitted" ||
                    payment.status ===
                        "pending"
            ).length;

        const verified =
            payments
                .filter(
                    (payment) =>
                        payment.status ===
                        "verified"
                )
                .reduce(
                    (
                        totalValue,
                        payment
                    ) =>
                        totalValue +
                        (Number(
                            payment.amount
                        ) || 0),
                    0
                );

        return {
            pending,
            verified,
        };
    }, [payments]);

    /* =====================================================
       3D STATS
    ===================================================== */

    const threeDStats = useMemo(() => {
        const activeOrders =
            threeDOrders.filter(
                (order) =>
                    order.orderStatus !==
                    "cancelled"
            );

        const revenue =
            activeOrders.reduce(
                (
                    totalValue,
                    order
                ) =>
                    totalValue +
                    (Number(
                        order.totalPrice
                    ) || 0),
                0
            );

        const paid =
            activeOrders.reduce(
                (
                    totalValue,
                    order
                ) =>
                    totalValue +
                    (Number(
                        order.paidAmount
                    ) || 0),
                0
            );

        const outstanding =
            activeOrders.reduce(
                (
                    totalValue,
                    order
                ) =>
                    totalValue +
                    (Number(
                        order.remainingAmount
                    ) || 0),
                0
            );

        const production =
            activeOrders.filter(
                (order) =>
                    [
                        "queued",
                        "printing",
                        "quality_check",
                        "ready",
                        "shipping",
                    ].includes(
                        order.orderStatus
                    )
            ).length;

        const completed =
            activeOrders.filter(
                (order) =>
                    order.orderStatus ===
                    "completed"
            ).length;

        const pendingPayment =
            activeOrders.filter(
                (order) =>
                    order.paymentStatus ===
                        "unpaid" ||
                    order.paymentStatus ===
                        "pending_verification"
            ).length;

        const currentMonthRange =
            getCurrentMonthRange();

        const thisMonthOrders =
            activeOrders.filter(
                (order) => {
                    const created =
                        timestampToNumber(
                            order.createdAt
                        );

                    return (
                        created >=
                            currentMonthRange.start &&
                        created <
                            currentMonthRange.end
                    );
                }
            );

        const thisMonthRevenue =
            thisMonthOrders.reduce(
                (
                    totalValue,
                    order
                ) =>
                    totalValue +
                    (Number(
                        order.totalPrice
                    ) || 0),
                0
            );

        const thisMonthPaid =
            thisMonthOrders.reduce(
                (
                    totalValue,
                    order
                ) =>
                    totalValue +
                    (Number(
                        order.paidAmount
                    ) || 0),
                0
            );

        return {
            total:
                activeOrders.length,
            revenue,
            paid,
            outstanding,
            production,
            completed,
            pendingPayment,
            thisMonthCount:
                thisMonthOrders.length,
            thisMonthRevenue,
            thisMonthPaid,
        };
    }, [threeDOrders]);

    /* =====================================================
       COMBINED STATS
    ===================================================== */

    const combinedStats = useMemo(
        () => ({
            revenue:
                bookingStats.revenue +
                threeDStats.revenue,

            received:
                paymentStats.verified +
                threeDStats.paid,

            outstanding:
                threeDStats.outstanding,

            orders:
                bookingStats.total +
                threeDStats.total,
        }),
        [
            bookingStats,
            paymentStats,
            threeDStats,
        ]
    );

    /* =====================================================
       RECENT DATA
    ===================================================== */

    const recentBookings =
        useMemo(
            () =>
                [...bookings]
                    .sort(
                        (a, b) =>
                            timestampToNumber(
                                b.createdAt
                            ) -
                            timestampToNumber(
                                a.createdAt
                            )
                    )
                    .slice(0, 5),
            [bookings]
        );

    const recentThreeDOrders =
        useMemo(
            () =>
                [...threeDOrders]
                    .sort(
                        (a, b) =>
                            timestampToNumber(
                                b.createdAt
                            ) -
                            timestampToNumber(
                                a.createdAt
                            )
                    )
                    .slice(0, 6),
            [threeDOrders]
        );

    /* =====================================================
       ALERTS
    ===================================================== */

    const threeDAlerts =
        useMemo(() => {
            const paymentAlerts =
                threeDOrders.filter(
                    (order) =>
                        order.orderStatus !==
                            "cancelled" &&
                        (
                            order.paymentStatus ===
                                "unpaid" ||
                            order.paymentStatus ===
                                "pending_verification"
                        )
                );

            const productionAlerts =
                threeDOrders.filter(
                    (order) =>
                        [
                            "queued",
                            "printing",
                            "quality_check",
                            "ready",
                            "shipping",
                        ].includes(
                            order.orderStatus
                        )
                );

            return {
                paymentAlerts,
                productionAlerts,
            };
        }, [threeDOrders]);

    /* =====================================================
       LOGOUT
    ===================================================== */

    async function handleLogout() {
        await signOut(auth);
        router.replace(
            "/admin/login"
        );
    }

    /* =====================================================
       AUTH LOADING
    ===================================================== */

    if (!userReady) {
        return (
            <main className="flex min-h-[70vh] items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-500" />

                    <p className="mt-4 text-sm text-slate-500">
                        กำลังตรวจสอบสิทธิ์...
                    </p>
                </div>
            </main>
        );
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <main className="min-h-full bg-[#f8f9fc]">
            <div className="mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

                {/* =================================================
                    HEADER
                ================================================= */}

                <section className="mb-5 sm:mb-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-500 sm:text-xs">
                                KOKO Memory · Admin
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:mt-2 sm:text-3xl lg:text-4xl">
                                Dashboard
                            </h1>

                            <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                                ภาพรวมธุรกิจ Booking และ
                                3D Printing ในหน้าเดียว
                            </p>
                        </div>

                        <div className="flex w-full gap-2 sm:w-auto">
                            <button
                                type="button"
                                onClick={() =>
                                    void loadThreeDOrders(
                                        true
                                    )
                                }
                                disabled={
                                    refreshingThreeD
                                }
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-pink-200 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:flex-none sm:px-4 sm:text-sm"
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                                        refreshingThreeD
                                            ? "animate-spin"
                                            : ""
                                    }`}
                                />

                                รีเฟรช
                            </button>

                            <Link
                                href="/admin/3d-printing/orders/new"
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 sm:h-11 sm:flex-none sm:px-4 sm:text-sm"
                            >
                                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />

                                สร้าง 3D Order
                            </Link>
                        </div>
                    </div>
                </section>

                {/* =================================================
                    BUSINESS KPI
                ================================================= */}

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    <StatCard
                        title="รายได้รวม"
                        value={formatCurrency(
                            combinedStats.revenue
                        )}
                        subtitle="Booking + 3D · สะสม"
                        icon={DollarSign}
                        tone="green"
                    />

                    <StatCard
                        title="รับเงินแล้ว"
                        value={formatCurrency(
                            combinedStats.received
                        )}
                        subtitle="ยอดที่รับ/ตรวจสอบแล้ว"
                        icon={Wallet}
                        tone="blue"
                    />

                    <StatCard
                        title="ค้างชำระ 3D"
                        value={formatCurrency(
                            combinedStats.outstanding
                        )}
                        subtitle="Order 3D ที่ยังไม่ยกเลิก"
                        icon={Clock3}
                        tone="orange"
                        href="/admin/3d-printing/orders"
                    />

                    <StatCard
                        title="Order ทั้งหมด"
                        value={String(
                            combinedStats.orders
                        )}
                        subtitle="Booking + 3D"
                        icon={ShoppingBag}
                        tone="violet"
                    />
                </section>

                {/* =================================================
                    ACTION / ALERT CENTER
                ================================================= */}

                <section className="mt-5 sm:mt-6">
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-500 sm:text-xs">
                                Action Center
                            </p>

                            <h2 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">
                                สิ่งที่ต้องดำเนินการ
                            </h2>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                        {threeDAlerts.paymentAlerts.length >
                            0 && (
                            <Link
                                href="/admin/3d-printing/orders"
                                className="rounded-2xl border border-orange-100 bg-orange-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl sm:p-5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm">
                                        <Wallet className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-orange-900">
                                            3D รอชำระ/ตรวจสอบ
                                        </p>

                                        <p className="mt-0.5 text-xs text-orange-700">
                                            {
                                                threeDAlerts
                                                    .paymentAlerts
                                                    .length
                                            }{" "}
                                            Order
                                        </p>
                                    </div>

                                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-orange-400" />
                                </div>
                            </Link>
                        )}

                        {threeDAlerts.productionAlerts.length >
                            0 && (
                            <Link
                                href="/admin/3d-printing/orders"
                                className="rounded-2xl border border-violet-100 bg-violet-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl sm:p-5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-500 shadow-sm">
                                        <Package className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-violet-900">
                                            งาน 3D กำลังดำเนินการ
                                        </p>

                                        <p className="mt-0.5 text-xs text-violet-700">
                                            {
                                                threeDAlerts
                                                    .productionAlerts
                                                    .length
                                            }{" "}
                                            Order
                                        </p>
                                    </div>

                                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-violet-400" />
                                </div>
                            </Link>
                        )}

                        {paymentStats.pending > 0 && (
                            <Link
                                href="/admin/payments"
                                className="rounded-2xl border border-pink-100 bg-pink-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl sm:p-5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-500 shadow-sm">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-pink-900">
                                            Payment รอตรวจสอบ
                                        </p>

                                        <p className="mt-0.5 text-xs text-pink-700">
                                            {
                                                paymentStats.pending
                                            }{" "}
                                            รายการ
                                        </p>
                                    </div>

                                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-pink-400" />
                                </div>
                            </Link>
                        )}

                        {threeDAlerts.paymentAlerts.length ===
                            0 &&
                            threeDAlerts.productionAlerts
                                .length === 0 &&
                            paymentStats.pending ===
                                0 && (
                                <div className="col-span-full rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:rounded-3xl sm:p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-500 shadow-sm">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-emerald-900">
                                                ทุกอย่างเรียบร้อย
                                            </p>

                                            <p className="mt-0.5 text-xs text-emerald-700">
                                                ไม่มีรายการที่ต้องดำเนินการเร่งด่วน
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                </section>

                {/* =================================================
                    3D OVERVIEW
                ================================================= */}

                <section className="mt-5 sm:mt-6">
                    <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-500 sm:text-xs">
                                3D Printing
                            </p>

                            <h2 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">
                                ภาพรวมงานพิมพ์
                            </h2>
                        </div>

                        <Link
                            href="/admin/3d-printing/orders"
                            className="shrink-0 text-xs font-bold text-pink-500 hover:text-pink-600 sm:text-sm"
                        >
                            ดู Orders →
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                        <StatCard
                            title="Order เดือนนี้"
                            value={String(
                                threeDStats.thisMonthCount
                            )}
                            subtitle="ไม่รวมยกเลิก"
                            icon={CalendarDays}
                            tone="pink"
                            href="/admin/3d-printing/orders"
                        />

                        <StatCard
                            title="รายได้เดือนนี้"
                            value={formatCurrency(
                                threeDStats.thisMonthRevenue
                            )}
                            subtitle="มูลค่า Order เดือนนี้"
                            icon={DollarSign}
                            tone="green"
                        />

                        <StatCard
                            title="รับเงินเดือนนี้"
                            value={formatCurrency(
                                threeDStats.thisMonthPaid
                            )}
                            subtitle="ยอดชำระของ Order"
                            icon={Wallet}
                            tone="blue"
                        />

                        <StatCard
                            title="กำลังผลิต"
                            value={String(
                                threeDStats.production
                            )}
                            subtitle="Queued → Shipping"
                            icon={Package}
                            tone="violet"
                            href="/admin/3d-printing/orders"
                        />

                        <StatCard
                            title="เสร็จแล้ว"
                            value={String(
                                threeDStats.completed
                            )}
                            subtitle="Order ปิดงานแล้ว"
                            icon={CheckCircle2}
                            tone="green"
                        />
                    </div>
                </section>

                {/* =================================================
                    RECENT 3D + BOOKING
                ================================================= */}

                <section className="mt-5 grid gap-5 lg:mt-6 lg:grid-cols-[1.35fr_0.9fr] lg:gap-6">

                    {/* =================================================
                        RECENT 3D
                    ================================================= */}

                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:rounded-3xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-xs">
                                    Recent Orders
                                </p>

                                <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                                    3D Printing Orders
                                </h2>
                            </div>

                            <Link
                                href="/admin/3d-printing/orders"
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-pink-500 sm:text-sm"
                            >
                                ทั้งหมด
                                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Link>
                        </div>

                        <div className="p-3 sm:p-5">
                            {loadingThreeD ? (
                                <div className="flex min-h-48 items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                                </div>
                            ) : threeDError ? (
                                <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                                    {threeDError}
                                </div>
                            ) : recentThreeDOrders.length ===
                              0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                                    <Package className="mx-auto h-8 w-8 text-slate-300" />

                                    <p className="mt-3 text-sm font-bold text-slate-700">
                                        ยังไม่มี 3D Order
                                    </p>

                                    <Link
                                        href="/admin/3d-printing/orders/new"
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white sm:text-sm"
                                    >
                                        <Plus className="h-4 w-4" />
                                        สร้าง Order
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile */}
                                    <div className="space-y-2.5 md:hidden">
                                        {recentThreeDOrders.map(
                                            (
                                                order
                                            ) => (
                                                <Link
                                                    key={
                                                        order.id
                                                    }
                                                    href={`/admin/3d-printing/orders/${encodeURIComponent(
                                                        order.id
                                                    )}`}
                                                    className="block rounded-2xl border border-slate-100 p-3.5 transition active:bg-slate-50"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="text-sm font-black text-slate-950">
                                                                    {
                                                                        order.orderNumber
                                                                    }
                                                                </span>

                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getOrderStatusClass(
                                                                        order.orderStatus
                                                                    )}`}
                                                                >
                                                                    {getOrderStatusLabel(
                                                                        order.orderStatus
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <p className="mt-2 truncate text-sm font-semibold text-slate-700">
                                                                {
                                                                    order
                                                                        .customer
                                                                        ?.name
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-[11px] text-slate-400">
                                                                {
                                                                    order
                                                                        .items
                                                                        ?.length
                                                                }{" "}
                                                                รายการ
                                                                {" · "}
                                                                {formatDate(
                                                                    order.createdAt
                                                                )}
                                                            </p>
                                                        </div>

                                                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                                        <span className="text-xs text-slate-400">
                                                            ยอดค้าง
                                                        </span>

                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-slate-950">
                                                                {formatCurrency(
                                                                    Number(
                                                                        order.totalPrice
                                                                    ) ||
                                                                        0
                                                                )}
                                                            </p>

                                                            <p className="text-[11px] text-orange-500">
                                                                {formatCurrency(
                                                                    Number(
                                                                        order.remainingAmount
                                                                    ) ||
                                                                        0
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        )}
                                    </div>

                                    {/* Desktop */}
                                    <div className="hidden md:block">
                                        <div className="space-y-2.5">
                                            {recentThreeDOrders.map(
                                                (
                                                    order
                                                ) => (
                                                    <Link
                                                        key={
                                                            order.id
                                                        }
                                                        href={`/admin/3d-printing/orders/${encodeURIComponent(
                                                            order.id
                                                        )}`}
                                                        className="block rounded-2xl border border-slate-100 p-4 transition hover:border-pink-200 hover:bg-pink-50/30"
                                                    >
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-black text-slate-950">
                                                                        {
                                                                            order.orderNumber
                                                                        }
                                                                    </span>

                                                                    <span
                                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getOrderStatusClass(
                                                                            order.orderStatus
                                                                        )}`}
                                                                    >
                                                                        {getOrderStatusLabel(
                                                                            order.orderStatus
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <p className="mt-1.5 truncate text-sm font-semibold text-slate-700">
                                                                    {
                                                                        order
                                                                            .customer
                                                                            ?.name
                                                                    }
                                                                </p>

                                                                <p className="mt-1 text-xs text-slate-400">
                                                                    {
                                                                        order
                                                                            .items
                                                                            ?.length
                                                                    }{" "}
                                                                    รายการ
                                                                    {" · "}
                                                                    {formatDate(
                                                                        order.createdAt
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div className="shrink-0 text-right">
                                                                <p className="font-black text-slate-950">
                                                                    {formatCurrency(
                                                                        Number(
                                                                            order.totalPrice
                                                                        ) ||
                                                                            0
                                                                    )}
                                                                </p>

                                                                <p className="mt-1 text-xs text-orange-500">
                                                                    ค้าง{" "}
                                                                    {formatCurrency(
                                                                        Number(
                                                                            order.remainingAmount
                                                                        ) ||
                                                                            0
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* =================================================
                        BOOKING SUMMARY
                    ================================================= */}

                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:rounded-3xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-xs">
                                    Booking
                                </p>

                                <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                                    ภาพรวมการจอง
                                </h2>
                            </div>

                            <Link
                                href="/admin/bookings"
                                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-pink-500 sm:text-sm"
                            >
                                จัดการ
                                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-5">
                            <div className="rounded-2xl bg-slate-50 p-3.5 sm:p-4">
                                <p className="text-[11px] text-slate-400 sm:text-xs">
                                    Booking ทั้งหมด
                                </p>

                                <p className="mt-1.5 text-xl font-black text-slate-950 sm:text-2xl">
                                    {
                                        bookingStats.total
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-3.5 sm:p-4">
                                <p className="text-[11px] text-emerald-600 sm:text-xs">
                                    ยืนยันแล้ว
                                </p>

                                <p className="mt-1.5 text-xl font-black text-emerald-700 sm:text-2xl">
                                    {
                                        bookingStats.confirmed
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl bg-amber-50 p-3.5 sm:p-4">
                                <p className="text-[11px] text-amber-600 sm:text-xs">
                                    รอดำเนินการ
                                </p>

                                <p className="mt-1.5 text-xl font-black text-amber-700 sm:text-2xl">
                                    {
                                        bookingStats.pending
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl bg-red-50 p-3.5 sm:p-4">
                                <p className="text-[11px] text-red-500 sm:text-xs">
                                    ยกเลิก
                                </p>

                                <p className="mt-1.5 text-xl font-black text-red-600 sm:text-2xl">
                                    {
                                        bookingStats.cancelled
                                    }
                                </p>
                            </div>

                            <div className="col-span-2 rounded-2xl bg-pink-50 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] text-pink-600 sm:text-xs">
                                            รายได้ Booking
                                        </p>

                                        <p className="mt-1.5 text-xl font-black text-slate-950 sm:text-2xl">
                                            {formatCurrency(
                                                bookingStats.revenue
                                            )}
                                        </p>
                                    </div>

                                    <CalendarDays className="h-6 w-6 text-pink-400 sm:h-7 sm:w-7" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* =================================================
                    RECENT BOOKINGS
                ================================================= */}

                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:mt-6 sm:rounded-3xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-xs">
                                Latest Activity
                            </p>

                            <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                                Booking ล่าสุด
                            </h2>
                        </div>

                        <Link
                            href="/admin/bookings"
                            className="text-xs font-bold text-pink-500 hover:text-pink-600 sm:text-sm"
                        >
                            ดูทั้งหมด →
                        </Link>
                    </div>

                    <div className="p-3 sm:p-5">
                        {loadingBookings ? (
                            <div className="flex min-h-32 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                            </div>
                        ) : bookingError ? (
                            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                                {bookingError}
                            </div>
                        ) : recentBookings.length ===
                          0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                                ยังไม่มี Booking
                            </div>
                        ) : (
                            <>
                                {/* Mobile Booking Cards */}
                                <div className="space-y-2.5 md:hidden">
                                    {recentBookings.map(
                                        (
                                            booking
                                        ) => {
                                            const status =
                                                getBookingStatus(
                                                    booking
                                                );

                                            const confirmed =
                                                status ===
                                                    "confirmed" ||
                                                status ===
                                                    "ยืนยันแล้ว";

                                            const cancelled =
                                                status ===
                                                    "cancelled" ||
                                                status ===
                                                    "canceled" ||
                                                status ===
                                                    "ยกเลิก";

                                            return (
                                                <Link
                                                    key={
                                                        booking.id
                                                    }
                                                    href="/admin/bookings"
                                                    className="block rounded-2xl border border-slate-100 p-3.5 transition active:bg-slate-50"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-slate-800">
                                                                {getBookingName(
                                                                    booking
                                                                )}
                                                            </p>

                                                            <p className="mt-1 text-[11px] text-slate-400">
                                                                {getBookingPhone(
                                                                    booking
                                                                )}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                                                confirmed
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : cancelled
                                                                    ? "bg-red-50 text-red-700"
                                                                    : "bg-amber-50 text-amber-700"
                                                            }`}
                                                        >
                                                            {confirmed
                                                                ? "ยืนยันแล้ว"
                                                                : cancelled
                                                                ? "ยกเลิก"
                                                                : "รอดำเนินการ"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400">
                                                                Package
                                                            </p>

                                                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                                                                {getBookingEvent(
                                                                    booking
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="text-[10px] text-slate-400">
                                                                ราคา
                                                            </p>

                                                            <p className="mt-0.5 text-xs font-black text-slate-800">
                                                                {formatCurrency(
                                                                    getBookingPrice(
                                                                        booking
                                                                    )
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        }
                                    )}
                                </div>

                                {/* Desktop Booking Table */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full min-w-[700px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                <th className="px-3 py-3">
                                                    ลูกค้า
                                                </th>

                                                <th className="px-3 py-3">
                                                    Package
                                                </th>

                                                <th className="px-3 py-3">
                                                    วันที่สร้าง
                                                </th>

                                                <th className="px-3 py-3">
                                                    ราคา
                                                </th>

                                                <th className="px-3 py-3">
                                                    สถานะ
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {recentBookings.map(
                                                (
                                                    booking
                                                ) => {
                                                    const status =
                                                        getBookingStatus(
                                                            booking
                                                        );

                                                    const confirmed =
                                                        status ===
                                                            "confirmed" ||
                                                        status ===
                                                            "ยืนยันแล้ว";

                                                    const cancelled =
                                                        status ===
                                                            "cancelled" ||
                                                        status ===
                                                            "canceled" ||
                                                        status ===
                                                            "ยกเลิก";

                                                    return (
                                                        <tr
                                                            key={
                                                                booking.id
                                                            }
                                                            className="border-b border-slate-50 last:border-0"
                                                        >
                                                            <td className="px-3 py-4">
                                                                <p className="font-bold text-slate-800">
                                                                    {getBookingName(
                                                                        booking
                                                                    )}
                                                                </p>

                                                                <p className="mt-1 text-xs text-slate-400">
                                                                    {getBookingPhone(
                                                                        booking
                                                                    )}
                                                                </p>
                                                            </td>

                                                            <td className="px-3 py-4 text-sm text-slate-600">
                                                                {getBookingEvent(
                                                                    booking
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-4 text-sm text-slate-500">
                                                                {formatDate(
                                                                    booking.createdAt
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-4 text-sm font-bold text-slate-800">
                                                                {formatCurrency(
                                                                    getBookingPrice(
                                                                        booking
                                                                    )
                                                                )}
                                                            </td>

                                                            <td className="px-3 py-4">
                                                                <span
                                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                                                        confirmed
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : cancelled
                                                                            ? "bg-red-50 text-red-700"
                                                                            : "bg-amber-50 text-amber-700"
                                                                    }`}
                                                                >
                                                                    {confirmed
                                                                        ? "ยืนยันแล้ว"
                                                                        : cancelled
                                                                        ? "ยกเลิก"
                                                                        : "รอดำเนินการ"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

                <section className="mt-5 sm:mt-6">
                    <div className="mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-xs">
                            Quick Actions
                        </p>

                        <h2 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">
                            จัดการระบบ
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                        <Link
                            href="/admin/3d-printing/orders/new"
                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md sm:p-5"
                        >
                            <Plus className="h-5 w-5 text-pink-500" />

                            <p className="mt-3 text-sm font-bold text-slate-800 sm:mt-4">
                                สร้าง 3D Order
                            </p>

                            <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs">
                                เพิ่มคำสั่งซื้อใหม่
                            </p>
                        </Link>

                        <Link
                            href="/admin/3d-printing/products"
                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md sm:p-5"
                        >
                            <Package className="h-5 w-5 text-pink-500" />

                            <p className="mt-3 text-sm font-bold text-slate-800 sm:mt-4">
                                จัดการโมเดล 3D
                            </p>

                            <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs">
                                Products และโมเดล
                            </p>
                        </Link>

                        <Link
                            href="/admin/payments"
                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md sm:p-5"
                        >
                            <Wallet className="h-5 w-5 text-pink-500" />

                            <p className="mt-3 text-sm font-bold text-slate-800 sm:mt-4">
                                ตรวจสอบ Payment
                            </p>

                            <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs">
                                ตรวจสอบการชำระเงิน
                            </p>
                        </Link>

                        <Link
                            href="/admin/portfolio"
                            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md sm:p-5"
                        >
                            <ShoppingBag className="h-5 w-5 text-pink-500" />

                            <p className="mt-3 text-sm font-bold text-slate-800 sm:mt-4">
                                จัดการ Portfolio
                            </p>

                            <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs">
                                ผลงานบนเว็บไซต์
                            </p>
                        </Link>
                    </div>
                </section>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <section className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
                    <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 sm:text-xs">
                            Logged in as
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-slate-700 sm:text-sm">
                            {user?.email ||
                                "Admin"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void handleLogout()
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 self-stretch rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-500 sm:self-auto sm:text-sm"
                    >
                        <XCircle className="h-4 w-4" />
                        ออกจากระบบ
                    </button>
                </section>
            </div>
        </main>
    );
}
