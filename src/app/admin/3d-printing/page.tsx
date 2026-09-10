"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArchiveX, Box, CheckCircle2, Loader2, Plus, RefreshCw } from "lucide-react";

import { getThreeDProducts, type ThreeDProduct } from "@/services/threeDProducts";

export default function ThreeDPrintingDashboardPage() {
    const [products, setProducts] = useState<ThreeDProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const loadProducts = useCallback(async (refresh = false) => {
        try {
            if (refresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError("");
            setProducts(await getThreeDProducts());
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูล 3D Printing ได้");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { void loadProducts(); }, [loadProducts]);

    const active = useMemo(() => products.filter((item) => item.status === "active"), [products]);
    const inactive = useMemo(() => products.filter((item) => item.status === "inactive"), [products]);
    const categoryCount = new Set(products.map((item) => item.category.trim()).filter(Boolean)).size;

    if (loading) return <main className="flex min-h-[70vh] items-center justify-center gap-3 text-slate-500"><Loader2 size={24} className="animate-spin text-pink-500" />กำลังโหลด 3D Printing...</main>;

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6">
            <section className="rounded-[32px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/50 to-rose-50 p-7 shadow-sm sm:p-10">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div><span className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-xs font-black tracking-[0.2em] text-pink-600"><Box size={15} />3D PRINTING</span><h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">3D Printing</h1><p className="mt-4 text-slate-500">จัดการสินค้า รูปภาพ และข้อมูลสำหรับบริการพิมพ์ 3D</p></div>
                    <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void loadProducts(true)} disabled={refreshing} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm disabled:opacity-50"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />รีเฟรช</button><Link href="/admin/3d-printing/products/new" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-pink-500 px-6 text-sm font-bold text-white shadow-lg shadow-pink-200 hover:bg-pink-600"><Plus size={18} />เพิ่มสินค้าใหม่</Link></div>
                </div>
            </section>
            {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"><AlertCircle size={21} /><div><p className="font-bold">เกิดข้อผิดพลาด</p><p className="mt-1 text-sm">{error}</p></div></div>}
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<Box size={23} />} title="Product ทั้งหมด" value={products.length} /><Stat icon={<CheckCircle2 size={23} />} title="เปิดใช้งาน" value={active.length} /><Stat icon={<ArchiveX size={23} />} title="ปิดใช้งาน" value={inactive.length} /><Stat icon={<Box size={23} />} title="จำนวน Category" value={categoryCount} /></section>
            <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-black tracking-[0.2em] text-pink-500">PRODUCT MANAGEMENT</p><h2 className="mt-2 text-2xl font-black text-slate-900">จัดการ Product</h2><p className="mt-2 text-sm text-slate-400">เพิ่ม แก้ไข เปิด/ปิด และลบสินค้า</p></div><Link href="/admin/3d-printing/products" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800">จัดการทั้งหมด</Link></div></section>
        </main>
    );
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) { return <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">{icon}</div><p className="mt-5 text-sm text-slate-400">{title}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>; }
