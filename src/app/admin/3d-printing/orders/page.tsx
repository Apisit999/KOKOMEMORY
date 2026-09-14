"use client";

import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    DollarSign,
    Eye,
    Filter,
    Loader2,
    Package,
    Plus,
    RefreshCw,
    Search,
    ShoppingBag,
    Truck,
    Wallet,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    getThreeDOrders,
    type ThreeDOrder,
    type ThreeDOrderStatus,
    type ThreeDPaymentStatus,
} from "@/services/threeDOrders";


/* =========================================================
   TYPES
========================================================= */

type StatusFilter =
    | "all"
    | "quote"
    | "pending_confirmation"
    | "waiting_payment"
    | "queued"
    | "printing"
    | "quality_check"
    | "ready"
    | "shipping"
    | "completed"
    | "cancelled";

type PaymentFilter =
    | "all"
    | "unpaid"
    | "pending_verification"
    | "partial"
    | "paid"
    | "refunded";


/* =========================================================
   STATUS CONFIG
========================================================= */

const ORDER_STATUS: Record<
    ThreeDOrderStatus,
    {
        label: string;
        className: string;
        icon: typeof Package;
    }
> = {
    quote: {
        label: "ใบเสนอราคา",
        className:
            "bg-slate-100 text-slate-700 ring-slate-200",
        icon: ShoppingBag,
    },

    pending_confirmation: {
        label: "รอยืนยัน Order",
        className:
            "bg-amber-50 text-amber-700 ring-amber-200",
        icon: Clock3,
    },

    waiting_payment: {
        label: "รอชำระเงิน",
        className:
            "bg-orange-50 text-orange-700 ring-orange-200",
        icon: Wallet,
    },

    queued: {
        label: "เข้าคิวผลิต",
        className:
            "bg-blue-50 text-blue-700 ring-blue-200",
        icon: Package,
    },

    printing: {
        label: "กำลังพิมพ์",
        className:
            "bg-violet-50 text-violet-700 ring-violet-200",
        icon: Package,
    },

    quality_check: {
        label: "ตรวจคุณภาพ",
        className:
            "bg-purple-50 text-purple-700 ring-purple-200",
        icon: CheckCircle2,
    },

    ready: {
        label: "พร้อมรับ",
        className:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",
        icon: CheckCircle2,
    },

    shipping: {
        label: "กำลังจัดส่ง",
        className:
            "bg-cyan-50 text-cyan-700 ring-cyan-200",
        icon: Truck,
    },

    completed: {
        label: "เสร็จสิ้น",
        className:
            "bg-green-50 text-green-700 ring-green-200",
        icon: CheckCircle2,
    },

    cancelled: {
        label: "ยกเลิก",
        className:
            "bg-red-50 text-red-700 ring-red-200",
        icon: XCircle,
    },
};


const PAYMENT_STATUS: Record<
    ThreeDPaymentStatus,
    {
        label: string;
        className: string;
    }
> = {
    unpaid: {
        label: "ยังไม่ชำระ",
        className:
            "bg-red-50 text-red-700 ring-red-200",
    },

    pending_verification: {
        label: "รอตรวจสอบ",
        className:
            "bg-amber-50 text-amber-700 ring-amber-200",
    },

    partial: {
        label: "ชำระบางส่วน",
        className:
            "bg-orange-50 text-orange-700 ring-orange-200",
    },

    paid: {
        label: "ชำระครบ",
        className:
            "bg-green-50 text-green-700 ring-green-200",
    },

    refunded: {
        label: "คืนเงิน",
        className:
            "bg-slate-100 text-slate-700 ring-slate-200",
    },
};


/* =========================================================
   HELPERS
========================================================= */

function formatMoney(value: number) {
    return new Intl.NumberFormat("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(
        Number.isFinite(value) ? value : 0
    );
}


function formatCount(value: number) {
    return new Intl.NumberFormat("th-TH").format(
        Number.isFinite(value) ? value : 0
    );
}


function getTimestampMillis(value: unknown) {
    if (!value) {
        return 0;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? 0
            : date.getTime();
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof (
            value as {
                toMillis?: unknown;
            }
        ).toMillis === "function"
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
        "seconds" in value &&
        typeof (
            value as {
                seconds?: unknown;
            }
        ).seconds === "number"
    ) {
        return (
            value as {
                seconds: number;
            }
        ).seconds * 1000;
    }

    return 0;
}


function formatDate(value: unknown) {
    const timestamp =
        getTimestampMillis(value);

    if (!timestamp) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "th-TH",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    ).format(
        new Date(timestamp)
    );
}


function getCustomerInitial(
    name?: string
) {
    return (
        name?.trim()?.charAt(0)?.toUpperCase() ||
        "?"
    );
}


function getOrderItemsSummary(
    order: ThreeDOrder
) {
    const first = order.items?.[0];

    if (!first) {
        return {
            title: "ไม่มีรายการสินค้า",
            detail: "",
            count: 0,
        };
    }

    const additional =
        Math.max(
            (order.items?.length || 0) - 1,
            0
        );

    return {
        title:
            additional > 0
                ? `${first.productName} +${additional} รายการ`
                : first.productName,

        detail: `${first.quantity} ชิ้น`,

        count:
            order.items?.length || 0,
    };
}


function isOutstanding(
    order: ThreeDOrder
) {
    return (
        Number(order.remainingAmount) > 0 &&
        order.paymentStatus !== "refunded" &&
        order.orderStatus !== "cancelled"
    );
}


function isProduction(
    order: ThreeDOrder
) {
    return [
        "queued",
        "printing",
        "quality_check",
        "ready",
        "shipping",
    ].includes(order.orderStatus);
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    tone = "default",
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: typeof Package;
    tone?:
        | "default"
        | "green"
        | "orange"
        | "blue"
        | "violet";
}) {
    const toneClasses = {
        default:
            "bg-white border-slate-200 text-slate-900",

        green:
            "bg-gradient-to-br from-white to-emerald-50/70 border-emerald-100 text-emerald-950",

        orange:
            "bg-gradient-to-br from-white to-orange-50/70 border-orange-100 text-orange-950",

        blue:
            "bg-gradient-to-br from-white to-blue-50/70 border-blue-100 text-blue-950",

        violet:
            "bg-gradient-to-br from-white to-violet-50/70 border-violet-100 text-violet-950",
    };

    const iconClasses = {
        default:
            "bg-slate-100 text-slate-700",

        green:
            "bg-emerald-100 text-emerald-700",

        orange:
            "bg-orange-100 text-orange-700",

        blue:
            "bg-blue-100 text-blue-700",

        violet:
            "bg-violet-100 text-violet-700",
    };

    return (
        <div
            className={`rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}
        >
            <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 truncate text-2xl font-bold tracking-tight">
                        {value}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        {subtitle}
                    </p>

                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClasses[tone]}`}
                >
                    <Icon className="h-5 w-5" />
                </div>

            </div>
        </div>
    );
}


/* =========================================================
   STATUS BADGES
========================================================= */

function OrderStatusBadge({
    status,
}: {
    status: ThreeDOrderStatus;
}) {
    const config =
        ORDER_STATUS[status] ||
        ORDER_STATUS.quote;

    const Icon = config.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${config.className}`}
        >
            <Icon className="h-3.5 w-3.5" />

            {config.label}
        </span>
    );
}


function PaymentStatusBadge({
    status,
}: {
    status: ThreeDPaymentStatus;
}) {
    const config =
        PAYMENT_STATUS[status] ||
        PAYMENT_STATUS.unpaid;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${config.className}`}
        >
            {config.label}
        </span>
    );
}


/* =========================================================
   PAGE
========================================================= */

export default function ThreeDOrdersPage() {

    const [orders, setOrders] =
        useState<ThreeDOrder[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("all");

    const [paymentFilter, setPaymentFilter] =
        useState<PaymentFilter>("all");

    const [sortField, setSortField] =
        useState<
            "date" | "total" | "remaining"
        >("date");

    const [sortDirection, setSortDirection] =
        useState<
            "asc" | "desc"
        >("desc");


    /* =====================================================
       LOAD
    ===================================================== */

    const loadOrders = useCallback(
        async (
            showRefresh = false
        ) => {

            try {

                if (showRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                const result =
                    await getThreeDOrders();

                setOrders(
                    Array.isArray(result)
                        ? result
                        : []
                );

            } catch (err) {

                console.error(
                    "Failed to load 3D orders:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "ไม่สามารถโหลดรายการ Order ได้"
                );

            } finally {

                setLoading(false);
                setRefreshing(false);

            }
        },
        []
    );


    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);


    /* =====================================================
       STATS
    ===================================================== */

    const stats = useMemo(() => {

        const now = new Date();

        const currentMonth =
            now.getMonth();

        const currentYear =
            now.getFullYear();


        const monthOrders =
            orders.filter(
                (order) => {

                    const timestamp =
                        getTimestampMillis(
                            order.createdAt
                        );

                    if (!timestamp) {
                        return false;
                    }

                    const date =
                        new Date(timestamp);

                    return (
                        date.getMonth() ===
                            currentMonth &&
                        date.getFullYear() ===
                            currentYear
                    );
                }
            );


        const revenue =
            monthOrders.reduce(
                (sum, order) =>
                    sum +
                    (
                        order.orderStatus !==
                        "cancelled"
                            ? Number(
                                  order.totalPrice
                              ) || 0
                            : 0
                    ),
                0
            );


        const paid =
            monthOrders.reduce(
                (sum, order) =>
                    sum +
                    (
                        order.orderStatus !==
                        "cancelled"
                            ? Number(
                                  order.paidAmount
                              ) || 0
                            : 0
                    ),
                0
            );


        const outstanding =
            orders.reduce(
                (sum, order) =>
                    sum +
                    (
                        isOutstanding(order)
                            ? Number(
                                  order.remainingAmount
                              ) || 0
                            : 0
                    ),
                0
            );


        const production =
            orders.filter(
                isProduction
            ).length;


        const completed =
            orders.filter(
                (order) =>
                    order.orderStatus ===
                    "completed"
            ).length;


        const pendingPayments =
            orders.filter(
                (order) =>
                    order.paymentStatus ===
                        "pending_verification" ||
                    order.paymentStatus ===
                        "unpaid"
            ).length;


        return {
            total: orders.length,
            monthOrders:
                monthOrders.length,
            revenue,
            paid,
            outstanding,
            production,
            completed,
            pendingPayments,
        };

    }, [orders]);


    /* =====================================================
       FILTER
    ===================================================== */

    const filteredOrders =
        useMemo(() => {

            const query =
                search
                    .trim()
                    .toLowerCase();


            const result =
                orders.filter(
                    (order) => {

                        const customerName =
                            order.customer?.name?.toLowerCase() ||
                            "";

                        const phone =
                            order.customer?.phone?.toLowerCase() ||
                            "";

                        const email =
                            order.customer?.email?.toLowerCase() ||
                            "";

                        const orderNumber =
                            order.orderNumber?.toLowerCase() ||
                            "";

                        const productNames =
                            order.items
                                ?.map(
                                    (item) =>
                                        item.productName?.toLowerCase()
                                )
                                .join(" ") ||
                            "";


                        const matchesSearch =
                            !query ||
                            orderNumber.includes(query) ||
                            customerName.includes(query) ||
                            phone.includes(query) ||
                            email.includes(query) ||
                            productNames.includes(query);


                        const matchesStatus =
                            statusFilter ===
                                "all" ||
                            order.orderStatus ===
                                statusFilter;


                        const matchesPayment =
                            paymentFilter ===
                                "all" ||
                            order.paymentStatus ===
                                paymentFilter;


                        return (
                            matchesSearch &&
                            matchesStatus &&
                            matchesPayment
                        );
                    }
                );


            result.sort(
                (a, b) => {

                    if (
                        sortField ===
                        "total"
                    ) {

                        return (
                            sortDirection ===
                            "asc"
                                ? Number(
                                      a.totalPrice
                                  ) -
                                      Number(
                                          b.totalPrice
                                      )
                                : Number(
                                      b.totalPrice
                                  ) -
                                      Number(
                                          a.totalPrice
                                      )
                        );
                    }


                    if (
                        sortField ===
                        "remaining"
                    ) {

                        return (
                            sortDirection ===
                            "asc"
                                ? Number(
                                      a.remainingAmount
                                  ) -
                                      Number(
                                          b.remainingAmount
                                      )
                                : Number(
                                      b.remainingAmount
                                  ) -
                                      Number(
                                          a.remainingAmount
                                      )
                        );
                    }


                    const aTime =
                        getTimestampMillis(
                            a.createdAt
                        );

                    const bTime =
                        getTimestampMillis(
                            b.createdAt
                        );


                    return (
                        sortDirection ===
                        "asc"
                            ? aTime - bTime
                            : bTime - aTime
                    );
                }
            );


            return result;

        }, [
            orders,
            search,
            statusFilter,
            paymentFilter,
            sortField,
            sortDirection,
        ]);


    /* =====================================================
       MONTHLY REVENUE
    ===================================================== */

    const monthlyRevenue =
        useMemo(() => {

            const months: {
                key: string;
                label: string;
                value: number;
            }[] = [];


            const now =
                new Date();


            for (
                let index = 5;
                index >= 0;
                index -= 1
            ) {

                const date =
                    new Date(
                        now.getFullYear(),
                        now.getMonth() -
                            index,
                        1
                    );


                const key =
                    `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                    ).padStart(2, "0")}`;


                const value =
                    orders.reduce(
                        (sum, order) => {

                            const orderDate =
                                getTimestampMillis(
                                    order.createdAt
                                );

                            const orderDateObject =
                                orderDate
                                    ? new Date(
                                          orderDate
                                      )
                                    : null;


                            if (
                                !orderDateObject ||
                                order.orderStatus ===
                                    "cancelled" ||
                                orderDateObject.getFullYear() !==
                                    date.getFullYear() ||
                                orderDateObject.getMonth() !==
                                    date.getMonth()
                            ) {
                                return sum;
                            }


                            return (
                                sum +
                                (
                                    Number(
                                        order.totalPrice
                                    ) || 0
                                )
                            );
                        },
                        0
                    );


                months.push({
                    key,

                    label:
                        new Intl.DateTimeFormat(
                            "th-TH",
                            {
                                month: "short",
                            }
                        ).format(date),

                    value,
                });
            }


            return months;

        }, [orders]);


    const maxMonthlyRevenue =
        Math.max(
            ...monthlyRevenue.map(
                (month) =>
                    month.value
            ),
            1
        );


    /* =====================================================
       SORT
    ===================================================== */

    function changeSort(
        field:
            | "date"
            | "total"
            | "remaining"
    ) {

        if (
            sortField === field
        ) {

            setSortDirection(
                (current) =>
                    current === "asc"
                        ? "desc"
                        : "asc"
            );

            return;
        }


        setSortField(field);

        setSortDirection(
            "desc"
        );
    }


    /* =====================================================
       QUICK FILTERS
    ===================================================== */

    function clearFilters() {
        setSearch("");
        setStatusFilter("all");
        setPaymentFilter("all");
    }


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <main className="min-h-screen bg-[#f7f8fc]">

            <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="mb-6">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                        <div>

                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">

                                <Link
                                    href="/admin/3d-printing"
                                    className="transition-colors hover:text-slate-900"
                                >
                                    3D Printing
                                </Link>

                                <ChevronRight className="h-4 w-4" />

                                <span className="font-medium text-slate-900">
                                    Orders
                                </span>

                            </div>


                            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                3D Printing Orders
                            </h1>


                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                                จัดการคำสั่งซื้อ ตรวจสอบยอดชำระ
                                และติดตามสถานะการผลิตทั้งหมดในที่เดียว
                            </p>

                        </div>


                        <div className="flex flex-wrap gap-2">

                            <button
                                type="button"
                                onClick={() =>
                                    void loadOrders(
                                        true
                                    )
                                }
                                disabled={
                                    refreshing
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >

                                <RefreshCw
                                    className={`h-4 w-4 ${
                                        refreshing
                                            ? "animate-spin"
                                            : ""
                                    }`}
                                />

                                รีเฟรช

                            </button>


                            <Link
                                href="/admin/3d-printing/orders/new"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                            >

                                <Plus className="h-4 w-4" />

                                สร้าง Order

                            </Link>

                        </div>

                    </div>

                </div>


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (

                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">

                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                        <div className="min-w-0 flex-1">

                            <p className="font-semibold">
                                ไม่สามารถโหลดข้อมูลได้
                            </p>

                            <p className="mt-1 text-sm">
                                {error}
                            </p>

                        </div>


                        <button
                            type="button"
                            onClick={() =>
                                void loadOrders(
                                    true
                                )
                            }
                            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-red-200 hover:bg-red-50"
                        >
                            ลองอีกครั้ง
                        </button>

                    </div>
                )}


                {/* =================================================
                    KPI
                ================================================= */}

                <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">

                    <StatCard
                        title="Orders ทั้งหมด"
                        value={formatCount(
                            stats.total
                        )}
                        subtitle={`${formatCount(
                            stats.monthOrders
                        )} Orders เดือนนี้`}
                        icon={ShoppingBag}
                    />


                    <StatCard
                        title="รายรับเดือนนี้"
                        value={`฿${formatMoney(
                            stats.revenue
                        )}`}
                        subtitle="ยอด Order ที่เกิดขึ้นเดือนนี้"
                        icon={DollarSign}
                        tone="blue"
                    />


                    <StatCard
                        title="รับเงินแล้ว"
                        value={`฿${formatMoney(
                            stats.paid
                        )}`}
                        subtitle="จาก Order เดือนนี้"
                        icon={Wallet}
                        tone="green"
                    />


                    <StatCard
                        title="ค้างชำระ"
                        value={`฿${formatMoney(
                            stats.outstanding
                        )}`}
                        subtitle="ยอดที่ยังต้องเก็บ"
                        icon={AlertCircle}
                        tone="orange"
                    />


                    <StatCard
                        title="กำลังผลิต"
                        value={formatCount(
                            stats.production
                        )}
                        subtitle="Queued → Shipping"
                        icon={Package}
                        tone="violet"
                    />


                    <StatCard
                        title="เสร็จสิ้น"
                        value={formatCount(
                            stats.completed
                        )}
                        subtitle={`${formatCount(
                            stats.pendingPayments
                        )} รายการต้องตรวจสอบเงิน`}
                        icon={CheckCircle2}
                        tone="green"
                    />

                </section>


                {/* =================================================
                    REVENUE + ALERTS
                ================================================= */}

                <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">

                    {/* Revenue */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                        <div className="mb-5 flex items-start justify-between gap-4">

                            <div>

                                <h2 className="font-bold text-slate-950">
                                    รายรับ 6 เดือนล่าสุด
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    คำนวณจากยอด Order จริงในระบบ
                                </p>

                            </div>


                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">

                                <p className="text-[11px] font-medium text-slate-500">
                                    เดือนนี้
                                </p>

                                <p className="text-sm font-bold text-slate-950">
                                    ฿
                                    {formatMoney(
                                        stats.revenue
                                    )}
                                </p>

                            </div>

                        </div>


                        <div className="flex h-48 items-end gap-2 sm:gap-4">

                            {monthlyRevenue.map(
                                (month) => {

                                    const height =
                                        month.value >
                                        0
                                            ? Math.max(
                                                  (
                                                      month.value /
                                                      maxMonthlyRevenue
                                                  ) *
                                                      100,
                                                  7
                                              )
                                            : 3;


                                    return (
                                        <div
                                            key={
                                                month.key
                                            }
                                            className="group flex h-full flex-1 flex-col justify-end"
                                        >

                                            <div className="relative flex flex-1 items-end">

                                                <div
                                                    className="w-full rounded-t-xl bg-gradient-to-t from-slate-900 to-slate-600 transition-all duration-500 group-hover:from-slate-800 group-hover:to-slate-500"
                                                    style={{
                                                        height: `${height}%`,
                                                    }}
                                                >

                                                    {month.value >
                                                        0 && (

                                                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">

                                                            ฿
                                                            {formatMoney(
                                                                month.value
                                                            )}

                                                        </div>
                                                    )}

                                                </div>

                                            </div>


                                            <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                                                {
                                                    month.label
                                                }
                                            </p>

                                        </div>
                                    );
                                }
                            )}

                        </div>

                    </div>


                    {/* Alerts */}

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                        <div className="mb-4">

                            <h2 className="font-bold text-slate-950">
                                สิ่งที่ต้องจัดการ
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                รายการที่ควรตรวจสอบก่อน
                            </p>

                        </div>


                        <div className="space-y-3">

                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentFilter(
                                        "pending_verification"
                                    );
                                    setStatusFilter(
                                        "all"
                                    );
                                }}
                                className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-left transition hover:bg-amber-50"
                            >

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                    <Clock3 className="h-5 w-5" />
                                </div>


                                <div className="min-w-0 flex-1">

                                    <p className="text-sm font-semibold text-slate-900">
                                        รอตรวจสอบการชำระเงิน
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        {
                                            orders.filter(
                                                (
                                                    order
                                                ) =>
                                                    order.paymentStatus ===
                                                    "pending_verification"
                                            ).length
                                        }{" "}
                                        Orders
                                    </p>

                                </div>


                                <ChevronRight className="h-4 w-4 text-slate-400" />

                            </button>


                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentFilter(
                                        "unpaid"
                                    );
                                    setStatusFilter(
                                        "all"
                                    );
                                }}
                                className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3 text-left transition hover:bg-red-50"
                            >

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                                    <Wallet className="h-5 w-5" />
                                </div>


                                <div className="min-w-0 flex-1">

                                    <p className="text-sm font-semibold text-slate-900">
                                        ยังไม่ชำระเงิน
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        {
                                            orders.filter(
                                                (
                                                    order
                                                ) =>
                                                    order.paymentStatus ===
                                                    "unpaid"
                                            ).length
                                        }{" "}
                                        Orders
                                    </p>

                                </div>


                                <ChevronRight className="h-4 w-4 text-slate-400" />

                            </button>


                            <button
                                type="button"
                                onClick={() => {
                                    setStatusFilter(
                                        "printing"
                                    );
                                    setPaymentFilter(
                                        "all"
                                    );
                                }}
                                className="flex w-full items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-left transition hover:bg-violet-50"
                            >

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                                    <Package className="h-5 w-5" />
                                </div>


                                <div className="min-w-0 flex-1">

                                    <p className="text-sm font-semibold text-slate-900">
                                        กำลังพิมพ์
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        {
                                            orders.filter(
                                                (
                                                    order
                                                ) =>
                                                    order.orderStatus ===
                                                    "printing"
                                            ).length
                                        }{" "}
                                        Orders
                                    </p>

                                </div>


                                <ChevronRight className="h-4 w-4 text-slate-400" />

                            </button>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    ORDERS
                ================================================= */}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-200 p-5">

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                            <div>

                                <h2 className="font-bold text-slate-950">
                                    รายการ Orders
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    แสดง{" "}
                                    {formatCount(
                                        filteredOrders.length
                                    )}{" "}
                                    จาก{" "}
                                    {formatCount(
                                        orders.length
                                    )}{" "}
                                    Orders
                                </p>

                            </div>


                            <div className="flex flex-col gap-2 sm:flex-row">

                                {/* Search */}

                                <div className="relative min-w-0 sm:w-72">

                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                    <input
                                        value={
                                            search
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSearch(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="ค้นหา Order / ลูกค้า / เบอร์..."
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                                    />

                                </div>


                                {/* Production */}

                                <div className="relative">

                                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                    <select
                                        value={
                                            statusFilter
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setStatusFilter(
                                                event
                                                    .target
                                                    .value as StatusFilter
                                            )
                                        }
                                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 sm:w-44"
                                    >

                                        <option value="all">
                                            ทุกสถานะการผลิต
                                        </option>

                                        {Object.entries(
                                            ORDER_STATUS
                                        ).map(
                                            ([
                                                value,
                                                config,
                                            ]) => (

                                                <option
                                                    key={
                                                        value
                                                    }
                                                    value={
                                                        value
                                                    }
                                                >
                                                    {
                                                        config.label
                                                    }
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                {/* Payment */}

                                <select
                                    value={
                                        paymentFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setPaymentFilter(
                                            event
                                                .target
                                                .value as PaymentFilter
                                        )
                                    }
                                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400"
                                >

                                    <option value="all">
                                        ทุกสถานะการเงิน
                                    </option>

                                    {Object.entries(
                                        PAYMENT_STATUS
                                    ).map(
                                        ([
                                            value,
                                            config,
                                        ]) => (

                                            <option
                                                key={
                                                    value
                                                }
                                                value={
                                                    value
                                                }
                                            >
                                                {
                                                    config.label
                                                }
                                            </option>

                                        )
                                    )}

                                </select>


                                {(search ||
                                    statusFilter !==
                                        "all" ||
                                    paymentFilter !==
                                        "all") && (

                                    <button
                                        type="button"
                                        onClick={
                                            clearFilters
                                        }
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        ล้างตัวกรอง
                                    </button>
                                )}

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        LOADING
                    ================================================= */}

                    {loading ? (

                        <div className="flex min-h-[360px] items-center justify-center">

                            <div className="text-center">

                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />

                                <p className="mt-3 text-sm font-medium text-slate-600">
                                    กำลังโหลด Orders...
                                </p>

                            </div>

                        </div>

                    ) : filteredOrders.length === 0 ? (

                        /* =================================================
                           EMPTY
                        ================================================= */

                        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

                                <ShoppingBag className="h-7 w-7 text-slate-400" />

                            </div>


                            <h3 className="mt-4 font-bold text-slate-900">
                                ไม่พบ Order
                            </h3>


                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                ลองเปลี่ยนคำค้นหา
                                หรือตัวกรอง หรือสร้าง Order ใหม่
                            </p>


                            {(search ||
                                statusFilter !==
                                    "all" ||
                                paymentFilter !==
                                    "all") ? (

                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    ล้างตัวกรอง
                                </button>

                            ) : (

                                <Link
                                    href="/admin/3d-printing/orders/new"
                                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                                >

                                    <Plus className="h-4 w-4" />

                                    สร้าง Order แรก

                                </Link>
                            )}

                        </div>

                    ) : (

                        <>
                            {/* =================================================
                                DESKTOP TABLE
                            ================================================= */}

                            <div className="hidden overflow-x-auto lg:block">

                                <table className="w-full min-w-[1050px]">

                                    <thead>

                                        <tr className="border-b border-slate-100 bg-slate-50/70 text-left">

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Order
                                            </th>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                ลูกค้า
                                            </th>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                สินค้า
                                            </th>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                สถานะผลิต
                                            </th>

                                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                การเงิน
                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        changeSort(
                                                            "total"
                                                        )
                                                    }
                                                    className="ml-auto inline-flex items-center gap-1 hover:text-slate-900"
                                                >

                                                    ยอดรวม

                                                    {sortField ===
                                                        "total" &&
                                                        (
                                                            sortDirection ===
                                                            "asc"
                                                                ? (
                                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                                )
                                                                : (
                                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                                )
                                                        )}

                                                </button>

                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        changeSort(
                                                            "remaining"
                                                        )
                                                    }
                                                    className="ml-auto inline-flex items-center gap-1 hover:text-slate-900"
                                                >

                                                    ค้างชำระ

                                                    {sortField ===
                                                        "remaining" &&
                                                        (
                                                            sortDirection ===
                                                            "asc"
                                                                ? (
                                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                                )
                                                                : (
                                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                                )
                                                        )}

                                                </button>

                                            </th>

                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                จัดการ
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody className="divide-y divide-slate-100">

                                        {filteredOrders.map(
                                            (
                                                order
                                            ) => {

                                                const summary =
                                                    getOrderItemsSummary(
                                                        order
                                                    );

                                                const outstanding =
                                                    isOutstanding(
                                                        order
                                                    );


                                                return (
                                                    <tr
                                                        key={
                                                            order.id
                                                        }
                                                        className="group transition hover:bg-slate-50/70"
                                                    >

                                                        {/* Order */}

                                                        <td className="px-5 py-4">

                                                            <Link
                                                                href={`/admin/3d-printing/orders/${encodeURIComponent(
                                                                    order.id
                                                                )}`}
                                                                className="block"
                                                            >

                                                                <p className="font-bold text-slate-950 group-hover:text-blue-700">
                                                                    {
                                                                        order.orderNumber
                                                                    }
                                                                </p>

                                                                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">

                                                                    <CalendarDays className="h-3 w-3" />

                                                                    {formatDate(
                                                                        order.createdAt
                                                                    )}

                                                                </p>

                                                            </Link>

                                                        </td>


                                                        {/* Customer */}

                                                        <td className="px-5 py-4">

                                                            <div className="flex items-center gap-3">

                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">

                                                                    {getCustomerInitial(
                                                                        order
                                                                            .customer
                                                                            ?.name
                                                                    )}

                                                                </div>


                                                                <div className="min-w-0">

                                                                    <p className="truncate font-semibold text-slate-900">
                                                                        {
                                                                            order
                                                                                .customer
                                                                                ?.name ||
                                                                            "-"
                                                                        }
                                                                    </p>

                                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                        {
                                                                            order
                                                                                .customer
                                                                                ?.phone ||
                                                                            "-"
                                                                        }
                                                                    </p>

                                                                </div>

                                                            </div>

                                                        </td>


                                                        {/* Product */}

                                                        <td className="max-w-[220px] px-5 py-4">

                                                            <p className="truncate text-sm font-medium text-slate-800">
                                                                {
                                                                    summary.title
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-400">

                                                                {
                                                                    summary.detail
                                                                }

                                                                {summary.count >
                                                                    1 &&
                                                                    ` · ${summary.count} รายการ`}

                                                            </p>

                                                        </td>


                                                        {/* Production */}

                                                        <td className="px-5 py-4">

                                                            <OrderStatusBadge
                                                                status={
                                                                    order.orderStatus
                                                                }
                                                            />

                                                        </td>


                                                        {/* Payment */}

                                                        <td className="px-5 py-4">

                                                            <PaymentStatusBadge
                                                                status={
                                                                    order.paymentStatus
                                                                }
                                                            />

                                                            <p className="mt-1 text-xs text-slate-400">

                                                                จ่ายแล้ว ฿
                                                                {formatMoney(
                                                                    Number(
                                                                        order.paidAmount
                                                                    ) ||
                                                                        0
                                                                )}

                                                            </p>

                                                        </td>


                                                        {/* Total */}

                                                        <td className="px-5 py-4 text-right">

                                                            <p className="font-bold text-slate-950">
                                                                ฿
                                                                {formatMoney(
                                                                    Number(
                                                                        order.totalPrice
                                                                    ) ||
                                                                        0
                                                                )}
                                                            </p>

                                                        </td>


                                                        {/* Remaining */}

                                                        <td className="px-5 py-4 text-right">

                                                            <p
                                                                className={`font-bold ${
                                                                    outstanding
                                                                        ? "text-orange-600"
                                                                        : "text-emerald-600"
                                                                }`}
                                                            >
                                                                ฿
                                                                {formatMoney(
                                                                    Number(
                                                                        order.remainingAmount
                                                                    ) ||
                                                                        0
                                                                )}
                                                            </p>

                                                        </td>


                                                        {/* Action */}

                                                        <td className="px-5 py-4 text-right">

                                                            <Link
                                                                href={`/admin/3d-printing/orders/${encodeURIComponent(
                                                                    order.id
                                                                )}`}
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                                                                aria-label={`ดู ${order.orderNumber}`}
                                                            >

                                                                <Eye className="h-4 w-4" />

                                                            </Link>

                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )}

                                    </tbody>

                                </table>

                            </div>


                            {/* =================================================
                                MOBILE
                            ================================================= */}

                            <div className="divide-y divide-slate-100 lg:hidden">

                                {filteredOrders.map(
                                    (
                                        order
                                    ) => {

                                        const summary =
                                            getOrderItemsSummary(
                                                order
                                            );

                                        const outstanding =
                                            isOutstanding(
                                                order
                                            );


                                        return (
                                            <Link
                                                key={
                                                    order.id
                                                }
                                                href={`/admin/3d-printing/orders/${encodeURIComponent(
                                                    order.id
                                                )}`}
                                                className="block p-4 transition hover:bg-slate-50 sm:p-5"
                                            >

                                                <div className="flex items-start justify-between gap-3">

                                                    <div className="min-w-0">

                                                        <p className="font-bold text-slate-950">
                                                            {
                                                                order.orderNumber
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {
                                                                formatDate(
                                                                    order.createdAt
                                                                )
                                                            }
                                                        </p>

                                                    </div>


                                                    <OrderStatusBadge
                                                        status={
                                                            order.orderStatus
                                                        }
                                                    />

                                                </div>


                                                <div className="mt-4 flex items-center gap-3">

                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600">

                                                        {getCustomerInitial(
                                                            order
                                                                .customer
                                                                ?.name
                                                        )}

                                                    </div>


                                                    <div className="min-w-0">

                                                        <p className="truncate font-semibold text-slate-900">
                                                            {
                                                                order
                                                                    .customer
                                                                    ?.name ||
                                                                "-"
                                                            }
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-slate-500">
                                                            {
                                                                order
                                                                    .customer
                                                                    ?.phone ||
                                                                "-"
                                                            }
                                                        </p>

                                                    </div>

                                                </div>


                                                <div className="mt-4 rounded-xl bg-slate-50 p-3">

                                                    <p className="truncate text-sm font-medium text-slate-800">
                                                        {
                                                            summary.title
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {
                                                            summary.detail
                                                        }
                                                    </p>

                                                </div>


                                                <div className="mt-4 grid grid-cols-2 gap-3">

                                                    <div>

                                                        <p className="text-xs text-slate-400">
                                                            ยอดรวม
                                                        </p>

                                                        <p className="mt-1 font-bold text-slate-950">
                                                            ฿
                                                            {formatMoney(
                                                                Number(
                                                                    order.totalPrice
                                                                ) ||
                                                                    0
                                                            )}
                                                        </p>

                                                    </div>


                                                    <div>

                                                        <p className="text-xs text-slate-400">
                                                            ค้างชำระ
                                                        </p>

                                                        <p
                                                            className={`mt-1 font-bold ${
                                                                outstanding
                                                                    ? "text-orange-600"
                                                                    : "text-emerald-600"
                                                            }`}
                                                        >
                                                            ฿
                                                            {formatMoney(
                                                                Number(
                                                                    order.remainingAmount
                                                                ) ||
                                                                    0
                                                            )}
                                                        </p>

                                                    </div>

                                                </div>


                                                <div className="mt-4 flex items-center justify-between">

                                                    <PaymentStatusBadge
                                                        status={
                                                            order.paymentStatus
                                                        }
                                                    />


                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">

                                                        ดูรายละเอียด

                                                        <ChevronRight className="h-4 w-4" />

                                                    </span>

                                                </div>

                                            </Link>
                                        );
                                    }
                                )}

                            </div>

                        </>
                    )}

                </section>

            </div>

        </main>
    );
}