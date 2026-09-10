"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    AlertCircle,
    ArchiveX,
    Box,
    CheckCircle2,
    Loader2,
    Plus,
    RefreshCw,
} from "lucide-react";

import {
    getThreeDProducts,
    type ThreeDProduct,
} from "@/services/threeDProducts";

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

                const data =
                    await getThreeDProducts();

                setProducts(data);
            } catch (err) {
                console.error(
                    "LOAD 3D DASHBOARD ERROR:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
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
        loadProducts();
    }, [loadProducts]);

    const active =
        useMemo(
            () =>
                products.filter(
                    (item) =>
                        item.status ===
                        "active"
                ),
            [products]
        );

    const inactive =
        useMemo(
            () =>
                products.filter(
                    (item) =>
                        item.status ===
                        "inactive"
                ),
            [products]
        );

    if (loading) {
        return (
            <main className="flex min-h-[70vh] items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2
                        size={24}
                        className="animate-spin text-pink-500"
                    />
                    กำลังโหลด 3D Printing...
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6">

            <section className="rounded-[32px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/50 to-rose-50 p-7 shadow-sm sm:p-10">

                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

                    <div>

                        <span className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-xs font-black tracking-[0.2em] text-pink-600">
                            <Box size={15} />
                            3D PRINTING
                        </span>

                        <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                            3D Printing
                        </h1>

                        <p className="mt-4 text-slate-500">
                            จัดการโมเดล 3D และข้อมูลสำหรับบริการพิมพ์ 3D
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-3">

                        <button
                            type="button"
                            onClick={() =>
                                loadProducts(
                                    true
                                )
                            }
                            disabled={
                                refreshing
                            }
                            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    refreshing
                                        ? "animate-spin"
                                        : ""
                                }
                            />
                            รีเฟรช
                        </button>

                        <Link
                            href="/admin/3d-printing/products/new"
                            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-pink-500 px-6 text-sm font-bold text-white shadow-lg shadow-pink-200 hover:bg-pink-600"
                        >
                            <Plus size={18} />
                            เพิ่มโมเดล
                        </Link>

                    </div>

                </div>

            </section>

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                    <AlertCircle size={21} />

                    <div>
                        <p className="font-bold">
                            เกิดข้อผิดพลาด
                        </p>

                        <p className="mt-1 text-sm">
                            {error}
                        </p>
                    </div>
                </div>
            )}

            <section className="grid gap-5 md:grid-cols-3">

                <Stat
                    icon={
                        <Box size={23} />
                    }
                    title="โมเดลทั้งหมด"
                    value={
                        products.length
                    }
                />

                <Stat
                    icon={
                        <CheckCircle2
                            size={23}
                        />
                    }
                    title="เปิดบริการ"
                    value={active.length}
                />

                <Stat
                    icon={
                        <ArchiveX
                            size={23}
                        />
                    }
                    title="ปิดบริการ"
                    value={inactive.length}
                />

            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                    <div>
                        <p className="text-xs font-black tracking-[0.2em] text-pink-500">
                            PRODUCT MANAGEMENT
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-slate-900">
                            จัดการ Product
                        </h2>

                        <p className="mt-2 text-sm text-slate-400">
                            เพิ่ม แก้ไข เปิด/ปิด และลบโมเดล
                        </p>
                    </div>

                    <Link
                        href="/admin/3d-printing/products"
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        จัดการทั้งหมด →
                    </Link>

                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">

                    <Link
                        href="/admin/3d-printing/products"
                        className="rounded-2xl border border-slate-200 p-6 transition hover:border-pink-200 hover:bg-pink-50"
                    >
                        <Box
                            size={28}
                            className="text-pink-500"
                        />

                        <h3 className="mt-4 font-black text-slate-900">
                            Product ทั้งหมด
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                            {products.length} โมเดล
                        </p>
                    </Link>

                    <Link
                        href="/admin/3d-printing/products/new"
                        className="rounded-2xl border border-slate-200 p-6 transition hover:border-pink-200 hover:bg-pink-50"
                    >
                        <Plus
                            size={28}
                            className="text-pink-500"
                        />

                        <h3 className="mt-4 font-black text-slate-900">
                            เพิ่มโมเดลใหม่
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                            เพิ่ม Product เข้าระบบ
                        </p>
                    </Link>

                </div>

            </section>

        </main>
    );
}

function Stat({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
}) {
    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                {icon}
            </div>

            <p className="mt-5 text-sm text-slate-400">
                {title}
            </p>

            <p className="mt-1 text-3xl font-black text-slate-900">
                {value}
            </p>

        </div>
    );
}