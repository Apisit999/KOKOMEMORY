"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    ArrowLeft,
    Edit3,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from "lucide-react";

import {
    deleteThreeDProduct,
    getThreeDProducts,
    updateThreeDProduct,
    type ThreeDProduct,
} from "@/services/threeDProducts";

export default function ThreeDProductsPage() {
    const [products, setProducts] = useState<ThreeDProduct[]>([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | ThreeDProduct["status"]>("all");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState("");

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            setProducts(await getThreeDProducts());
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถโหลดรายการ 3D Product ได้"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filteredProducts = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !keyword ||
                [
                    product.name,
                    product.category,
                    product.material,
                    product.description,
                ].some((value) => value.toLowerCase().includes(keyword));

            return (
                matchesSearch &&
                (status === "all" || product.status === status)
            );
        });
    }, [products, search, status]);

    async function toggleStatus(product: ThreeDProduct) {
        try {
            setBusyId(product.id);
            setError("");
            await updateThreeDProduct(product.id, {
                status: product.status === "active" ? "inactive" : "active",
            });
            await loadProducts();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถเปลี่ยนสถานะ Product ได้"
            );
        } finally {
            setBusyId(null);
        }
    }

    async function removeProduct(product: ThreeDProduct) {
        if (!window.confirm(`ลบ ${product.name || "Product นี้"} หรือไม่?`)) {
            return;
        }

        try {
            setBusyId(product.id);
            setError("");
            await deleteThreeDProduct(product.id);
            setProducts((current) =>
                current.filter((item) => item.id !== product.id)
            );
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถลบ Product ได้"
            );
        } finally {
            setBusyId(null);
        }
    }

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link
                        href="/admin/3d-printing"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-pink-500"
                    >
                        <ArrowLeft size={16} />
                        กลับไป 3D Printing
                    </Link>
                    <h1 className="mt-3 text-3xl font-black text-slate-900">
                        3D Products
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        จัดการรายการสินค้าใน collection 3dProducts
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={loadProducts}
                        disabled={loading}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        รีเฟรช
                    </button>
                    <Link
                        href="/admin/3d-printing/products/new"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-pink-500 px-4 text-sm font-bold text-white hover:bg-pink-600"
                    >
                        <Plus size={16} />
                        เพิ่ม Product
                    </Link>
                </div>
            </header>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
                <label className="relative flex-1">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="ค้นหาชื่อ หมวดหมู่ หรือวัสดุ"
                        className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-pink-400"
                    />
                </label>
                <select
                    value={status}
                    onChange={(event) =>
                        setStatus(event.target.value as "all" | ThreeDProduct["status"])
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-pink-400"
                >
                    <option value="all">ทุกสถานะ</option>
                    <option value="active">เปิดใช้งาน</option>
                    <option value="inactive">ปิดใช้งาน</option>
                </select>
            </section>

            {loading ? (
                <div className="flex min-h-48 items-center justify-center gap-3 text-slate-500">
                    <Loader2 size={22} className="animate-spin text-pink-500" />
                    กำลังโหลด Product...
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                    ไม่พบ Product ตามเงื่อนไข
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                        <article
                            key={product.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="aspect-[4/3] bg-slate-100">
                                {product.previewImage ? (
                                    <img
                                        src={product.previewImage}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        ไม่มีภาพตัวอย่าง
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="truncate font-bold text-slate-900">
                                            {product.name || "ไม่มีชื่อ Product"}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {product.category || "ไม่ระบุหมวดหมู่"} · {product.material || "ไม่ระบุวัสดุ"}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                        {product.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                    </span>
                                </div>
                                <p className="text-lg font-black text-pink-600">
                                    ฿{product.price.toLocaleString("th-TH")}
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Link
                                        href={`/admin/3d-printing/products/${product.id}`}
                                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:border-pink-200 hover:text-pink-600"
                                    >
                                        <Edit3 size={14} />
                                        แก้ไข
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => toggleStatus(product)}
                                        disabled={busyId === product.id}
                                        className="rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:border-pink-200 hover:text-pink-600 disabled:opacity-50"
                                    >
                                        {product.status === "active" ? "ปิด" : "เปิด"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeProduct(product)}
                                        disabled={busyId === product.id}
                                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-100 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Trash2 size={14} />
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
