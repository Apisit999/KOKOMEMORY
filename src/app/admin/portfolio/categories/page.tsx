"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { auth } from "@/lib/firebase";
import type {
    PortfolioCategory,
    PortfolioCategoryInput,
} from "@/types/portfolioCategory";

type CategoryForm = PortfolioCategoryInput;

const emptyForm: CategoryForm = {
    name: "",
    slug: "",
    description: "",
    active: true,
    order: 0,
};

export default function AdminPortfolioCategoriesPage() {
    const [user, setUser] = useState<User | null>(null);
    const [categories, setCategories] = useState<PortfolioCategory[]>([]);
    const [form, setForm] = useState<CategoryForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        return onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
    }, []);

    const request = useCallback(async function request(
        path: string,
        options: RequestInit = {}
    ): Promise<Record<string, unknown>> {
        if (!user) throw new Error("กรุณาเข้าสู่ระบบ Admin");

        const token = await user.getIdToken();
        const response = await fetch(path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });
        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok || data.success !== true) {
            throw new Error(
                typeof data.error === "string"
                    ? data.error
                    : "ไม่สามารถดำเนินการได้"
            );
        }

        return data;
    }, [user]);

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await request("/api/admin/portfolio-categories");
            setCategories(
                Array.isArray(data.categories)
                    ? (data.categories as PortfolioCategory[])
                    : []
            );
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถโหลดหมวดหมู่ได้"
            );
        } finally {
            setLoading(false);
        }
    }, [request]);

    useEffect(() => {
        if (user) void loadCategories();
    }, [loadCategories, user]);

    function startEdit(category: PortfolioCategory) {
        setEditingId(category.id);
        setForm({
            name: category.name,
            slug: category.slug,
            description: category.description,
            active: category.active,
            order: category.order,
        });
        setMessage("");
        setError("");
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
    }

    async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setMessage("");

            await request(
                editingId
                    ? `/api/admin/portfolio-categories/${editingId}`
                    : "/api/admin/portfolio-categories",
                {
                    method: editingId ? "PATCH" : "POST",
                    body: JSON.stringify(form),
                }
            );

            resetForm();
            setMessage(editingId ? "แก้ไขหมวดหมู่แล้ว" : "เพิ่มหมวดหมู่แล้ว");
            await loadCategories();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถบันทึกหมวดหมู่ได้"
            );
        } finally {
            setSaving(false);
        }
    }

    async function removeCategory(category: PortfolioCategory) {
        if (!window.confirm(`ต้องการลบหมวดหมู่ ${category.name} หรือไม่?`)) {
            return;
        }

        try {
            setError("");
            setMessage("");
            await request(`/api/admin/portfolio-categories/${category.id}`, {
                method: "DELETE",
            });
            setMessage("ลบหมวดหมู่แล้ว");
            await loadCategories();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถลบหมวดหมู่ได้"
            );
        }
    }

    if (!user) {
        return (
            <main className="p-8 text-center text-sm text-slate-500">
                กรุณาเข้าสู่ระบบ Admin
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500">
                        PORTFOLIO TAXONOMY
                    </p>
                    <h1 className="mt-2 text-3xl font-black text-slate-900">
                        จัดการหมวดหมู่ Portfolio
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        จัดระเบียบผลงานสำหรับ Gallery และการค้นหาในอนาคต
                    </p>
                </div>
            </header>

            {(error || message) && (
                <div
                    className={`rounded-2xl border px-5 py-4 text-sm ${
                        error
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-green-200 bg-green-50 text-green-700"
                    }`}
                >
                    {error || message}
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Slug ต้องเป็นภาษาอังกฤษตัวพิมพ์เล็กและใช้ขีดกลาง
                        </p>
                    </div>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            <X size={16} /> ยกเลิก
                        </button>
                    )}
                </div>

                <form
                    onSubmit={saveCategory}
                    className="grid gap-4 md:grid-cols-2"
                >
                    <label className="text-sm font-semibold text-slate-700">
                        ชื่อหมวดหมู่
                        <input
                            required
                            value={form.name}
                            onChange={(event) =>
                                setForm({ ...form, name: event.target.value })
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        Slug
                        <input
                            required
                            value={form.slug}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    slug: event.target.value,
                                })
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                        คำอธิบาย
                        <textarea
                            value={form.description || ""}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    description: event.target.value,
                                })
                            }
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                        ลำดับ
                        <input
                            type="number"
                            value={form.order ?? 0}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    order: Number(event.target.value),
                                })
                            }
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        />
                    </label>
                    <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.active !== false}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    active: event.target.checked,
                                })
                            }
                            className="h-4 w-4 accent-pink-500"
                        />
                        เปิดใช้งานหมวดหมู่นี้
                    </label>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 font-bold text-white transition hover:bg-pink-400 disabled:opacity-50 md:col-span-2 md:justify-self-start"
                    >
                        <Plus size={18} />
                        {saving
                            ? "กำลังบันทึก..."
                            : editingId
                                ? "บันทึกการแก้ไข"
                                : "เพิ่มหมวดหมู่"}
                    </button>
                </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
                    <h2 className="font-bold text-slate-900">หมวดหมู่ทั้งหมด</h2>
                </div>
                {loading ? (
                    <p className="px-5 py-12 text-center text-sm text-slate-400">
                        กำลังโหลดหมวดหมู่...
                    </p>
                ) : categories.length === 0 ? (
                    <p className="px-5 py-12 text-center text-sm text-slate-400">
                        ยังไม่มีหมวดหมู่
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {categories.map((category) => (
                            <div
                                key={category.id}
                                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-slate-900">
                                            {category.name}
                                        </h3>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                                            {category.slug}
                                        </span>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                category.active
                                                    ? "bg-green-50 text-green-600"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}
                                        >
                                            {category.active
                                                ? "Active"
                                                : "Inactive"}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {category.description || "ไม่มีคำอธิบาย"} · ลำดับ {category.order}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(category)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        <Pencil size={15} /> แก้ไข
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void removeCategory(category)}
                                        className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 size={15} /> ลบ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
