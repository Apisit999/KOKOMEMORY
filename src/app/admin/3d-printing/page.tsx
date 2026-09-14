"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    AlertCircle,
    ArchiveX,
    ArrowLeft,
    ArrowRight,
    Box,
    CheckCircle2,
    ClipboardList,
    Loader2,
    Plus,
    RefreshCw,
    ShoppingCart,
} from "lucide-react";

import {
    getThreeDProducts,
    type ThreeDProduct,
} from "@/services/threeDProducts";

/* =========================================================
   PAGE
========================================================= */

export default function ThreeDPrintingDashboardPage() {
    const [products, setProducts] =
        useState<ThreeDProduct[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const loadProducts = useCallback(
        async (refresh = false) => {
            try {
                if (refresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                const result =
                    await getThreeDProducts();

                setProducts(result);
            } catch (cause) {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "ไม่สามารถโหลดข้อมูล 3D Printing ได้"
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    const active = useMemo(
        () =>
            products.filter(
                (item) =>
                    item.status === "active"
            ),
        [products]
    );

    const inactive = useMemo(
        () =>
            products.filter(
                (item) =>
                    item.status === "inactive"
            ),
        [products]
    );

    const categoryCount = useMemo(
        () =>
            new Set(
                products
                    .map((item) =>
                        item.category.trim()
                    )
                    .filter(Boolean)
            ).size,
        [products]
    );

    return (
        <main className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
            {/* =====================================================
                HEADER
            ===================================================== */}

            <section className="overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-rose-50 shadow-sm sm:rounded-[32px]">
                <div className="p-5 sm:p-7 lg:p-9">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <Link
                                href="/admin/dashboard"
                                className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-pink-500 sm:text-sm"
                            >
                                <ArrowLeft size={15} />
                                กลับ Dashboard
                            </Link>

                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500 text-white shadow-lg shadow-pink-200">
                                    <Box size={22} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[10px] font-black tracking-[0.22em] text-pink-500 sm:text-xs">
                                        KOKO MEMORY · ADMIN
                                    </p>

                                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                                        3D Printing
                                    </h1>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                                        จัดการคำสั่งซื้อและสินค้า 3D
                                        ได้จากหน้านี้
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                            <button
                                type="button"
                                onClick={() =>
                                    void loadProducts(true)
                                }
                                disabled={refreshing}
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:rounded-2xl"
                            >
                                <RefreshCw
                                    size={16}
                                    className={
                                        refreshing
                                            ? "animate-spin"
                                            : ""
                                    }
                                />
                                {refreshing
                                    ? "กำลังรีเฟรช..."
                                    : "รีเฟรชข้อมูล"}
                            </button>

                            <Link
                                href="/admin/3d-printing/orders/new"
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 sm:w-auto sm:rounded-2xl"
                            >
                                <Plus size={18} />
                                สร้าง Order ใหม่
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
                        >
                            <AlertCircle
                                size={20}
                                className="mt-0.5 shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                                <p className="font-bold">
                                    โหลดข้อมูลไม่สำเร็จ
                                </p>

                                <p className="mt-1 break-words text-sm leading-5">
                                    {error}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    void loadProducts(true)
                                }
                                className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm ring-1 ring-red-200 transition hover:bg-red-50"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* =====================================================
                MAIN MANAGEMENT
            ===================================================== */}

            <section className="grid gap-4 md:grid-cols-2">
                {/* ORDERS */}

                <ManagementCard
                    href="/admin/3d-printing/orders"
                    type="orders"
                    title="จัดการ Orders"
                    description="จัดการคำสั่งซื้อ 3D Printing ตั้งแต่สร้าง Order ไปจนถึงปิดงาน"
                    items={[
                        "สร้างและแก้ไข Order",
                        "ตรวจสอบการชำระเงิน",
                        "อัปเดตสถานะการผลิต",
                        "ดูรายละเอียดลูกค้าและสินค้า",
                    ]}
                    action="ไปหน้า Orders"
                />

                {/* PRODUCTS */}

                <div className="flex min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/60 p-5 shadow-sm sm:rounded-[30px] sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                                <Box size={23} />
                            </div>

                            <div className="min-w-0">
                                <p className="text-[10px] font-black tracking-[0.2em] text-violet-500 sm:text-xs">
                                    PRODUCT MANAGEMENT
                                </p>

                                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                                    จัดการ Products
                                </h2>

                                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                                    จัดการสินค้าและโมเดล 3D ที่ใช้ในระบบ
                                </p>
                            </div>
                        </div>

                        <div className="hidden rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-violet-600 ring-1 ring-violet-100 sm:block">
                            {products.length} Products
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <ProductStat
                                label="ทั้งหมด"
                                value={products.length}
                            />

                            <ProductStat
                                label="เปิดใช้งาน"
                                value={active.length}
                            />

                            <ProductStat
                                label="ปิดใช้งาน"
                                value={inactive.length}
                            />

                            <ProductStat
                                label="Category"
                                value={categoryCount}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex-1">
                        <p className="text-sm font-bold text-slate-800">
                            จัดการอะไรได้บ้าง
                        </p>

                        <ul className="mt-3 space-y-2.5">
                            {[
                                "เพิ่มและแก้ไขข้อมูลสินค้า",
                                "จัดการราคา รูปภาพ และโมเดล 3D",
                                "เปิด / ปิดการแสดงสินค้า",
                            ].map((item) => (
                                <li
                                    key={item}
                                    className="flex items-center gap-2.5 text-sm text-slate-600"
                                >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                                        <CheckCircle2 size={13} />
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <Link
                        href="/admin/3d-printing/products"
                        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 sm:rounded-2xl"
                    >
                        ไปหน้า Products
                        <ArrowRight size={17} />
                    </Link>
                </div>
            </section>

            {/* =====================================================
                SIMPLE GUIDE
            ===================================================== */}

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[30px] sm:p-7">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                        <ClipboardList size={19} />
                    </div>

                    <div>
                        <h2 className="font-bold text-slate-950 sm:text-lg">
                            ใช้งาน 3D Printing ยังไง?
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                            ใช้หน้านี้เป็นจุดเริ่มต้น แล้วเข้าไปจัดการรายละเอียดในหน้าที่เกี่ยวข้อง
                        </p>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <GuideStep
                        number="1"
                        title="เลือก Product"
                        description="เพิ่มหรือแก้ไขสินค้าที่ต้องการให้ลูกค้าสั่ง"
                    />

                    <GuideStep
                        number="2"
                        title="สร้าง Order"
                        description="สร้างคำสั่งซื้อใหม่จากข้อมูลลูกค้าและสินค้า"
                    />

                    <GuideStep
                        number="3"
                        title="จัดการงาน"
                        description="ติดตาม Payment และสถานะการผลิตจากหน้า Orders"
                    />
                </div>
            </section>
        </main>
    );
}

/* =========================================================
   MANAGEMENT CARD
========================================================= */

function ManagementCard({
    href,
    type,
    title,
    description,
    items,
    action,
}: {
    href: string;
    type: "orders";
    title: string;
    description: string;
    items: string[];
    action: string;
}) {
    return (
        <div className="flex min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/30 to-rose-50/70 p-5 shadow-sm sm:rounded-[30px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                        <ShoppingCart size={23} />
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] font-black tracking-[0.2em] text-pink-500 sm:text-xs">
                            ORDER MANAGEMENT
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                            {title}
                        </h2>

                        <p className="mt-1.5 text-sm leading-6 text-slate-500">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-pink-400 ring-1 ring-pink-100 sm:flex">
                    <ClipboardList size={18} />
                </div>
            </div>

            <div className="mt-7 flex-1">
                <p className="text-sm font-bold text-slate-800">
                    จัดการอะไรได้บ้าง
                </p>

                <ul className="mt-3 space-y-2.5">
                    {items.map((item) => (
                        <li
                            key={item}
                            className="flex items-center gap-2.5 text-sm text-slate-600"
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                                <CheckCircle2 size={13} />
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            <Link
                href={href}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-pink-600 sm:rounded-2xl"
            >
                {action}
                <ArrowRight size={17} />
            </Link>
        </div>
    );
}

/* =========================================================
   PRODUCT STAT
========================================================= */

function ProductStat({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="min-w-0 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="truncate text-[10px] font-semibold text-slate-400 sm:text-xs">
                {label}
            </p>

            <p className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {value}
            </p>
        </div>
    );
}

/* =========================================================
   GUIDE STEP
========================================================= */

function GuideStep({
    number,
    title,
    description,
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {number}
            </div>

            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                    {title}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}
