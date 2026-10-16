"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { adminApiFetch } from "@/lib/admin-api-client";

type Review = { id: string; bookingId?: string; customerName?: string; rating?: number; comment?: string; status?: string; createdAt?: unknown };

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [message, setMessage] = useState("");

    async function load() {
        setLoading(true);
        try { const data = await adminApiFetch<{ reviews: Review[] }>("/api/admin/reviews"); setReviews(data.reviews || []); }
        catch { setMessage("ไม่สามารถโหลดรีวิวได้"); }
        finally { setLoading(false); }
    }

    useEffect(() => { void load(); }, []);

    async function moderate(id: string, status: "approved" | "rejected") {
        setBusy(id); setMessage("");
        try { await adminApiFetch(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
        catch { setMessage("ไม่สามารถอัปเดตรีวิวได้"); }
        finally { setBusy(""); }
    }

    return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">KOKO Memory</p><h1 className="mt-2 text-3xl font-black text-slate-900">Customer Reviews</h1><p className="mt-2 text-sm text-slate-500">ตรวจสอบและอนุมัติรีวิวจากลูกค้า</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><RefreshCw size={16} />รีเฟรช</button></div>{message && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">{message}</p>}{loading ? <div className="mt-10 flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={18} />กำลังโหลด...</div> : reviews.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">ยังไม่มีรีวิวจากลูกค้า</div> : <div className="mt-8 space-y-4">{reviews.map((review) => <article key={review.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold text-slate-900">{review.customerName || "ลูกค้า"}</p><p className="mt-1 text-xs text-slate-400">Booking: {review.bookingId || review.id}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{review.status}</span></div><div className="mt-4 text-yellow-400">{"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}<span className="text-slate-200">{"★".repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span></div><p className="mt-3 leading-7 text-slate-600">{review.comment}</p>{review.status === "pending" && <div className="mt-5 flex gap-2"><button type="button" disabled={busy === review.id} onClick={() => void moderate(review.id, "approved")} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Check size={16} />อนุมัติ</button><button type="button" disabled={busy === review.id} onClick={() => void moderate(review.id, "rejected")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-50"><X size={16} />ไม่อนุมัติ</button></div>}</article>)}</div>}</main>;
}
