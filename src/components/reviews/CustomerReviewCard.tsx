"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import type { User } from "firebase/auth";
import { useI18n } from "@/i18n";

type ReviewState = { status?: string; rating?: number; comment?: string } | null;

export default function CustomerReviewCard({ bookingId, user }: { bookingId: string; user: User }) {
    const { locale, translate } = useI18n();
    const [review, setReview] = useState<ReviewState>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch(`/api/reviews/${encodeURIComponent(bookingId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "REVIEW_LOAD_FAILED");
            setReview(data.review || null);
            if (data.review) { setRating(data.review.rating || 0); setComment(data.review.comment || ""); }
        } catch { setMessage(locale === "en" ? "Unable to load the review. Please try again." : "ไม่สามารถโหลดรีวิวได้ กรุณาลองใหม่อีกครั้ง"); }
        finally { setLoading(false); }
    }, [bookingId, locale, user]);

    useEffect(() => { void load(); }, [load]);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!rating || comment.trim().length < 10) { setMessage(locale === "en" ? "Please choose a rating and write at least 10 characters." : "กรุณาให้คะแนนและเขียนความคิดเห็นอย่างน้อย 10 ตัวอักษร"); return; }
        setSubmitting(true); setMessage("");
        try {
            const token = await user.getIdToken();
            const response = await fetch(`/api/reviews/${encodeURIComponent(bookingId)}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ rating, comment }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "REVIEW_SUBMIT_FAILED");
            await load();
        } catch (error) {
            setMessage(error instanceof Error && error.message === "REVIEW_ALREADY_SUBMITTED" ? (locale === "en" ? "You have already submitted a review for this booking." : "คุณส่งรีวิวสำหรับรายการนี้แล้ว") : (locale === "en" ? "Unable to submit the review. Please try again." : "ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง"));
        } finally { setSubmitting(false); }
    }

    const statusText = review?.status === "approved" ? (locale === "en" ? "Your review has been published." : "รีวิวของคุณได้รับการเผยแพร่แล้ว") : review?.status === "rejected" ? (locale === "en" ? "Your review was not approved." : "รีวิวนี้ไม่ผ่านการอนุมัติ") : (locale === "en" ? "Your review is pending approval." : "รีวิวของคุณกำลังรอตรวจสอบ");

    return (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-pink-100 sm:p-7" aria-live="polite">
            <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">KOKO Memory</p><h2 className="mt-2 text-2xl font-black text-slate-900">{locale === "en" ? "Leave a Review" : "รีวิวการใช้บริการ"}</h2></div>
                <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">{review ? statusText : (locale === "en" ? "Share your experience" : "แบ่งปันประสบการณ์")}</span>
            </div>
            {loading ? <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} />{translate("กำลังโหลด...")}</div> : review ? <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{statusText}</p> : (
                <form onSubmit={submit} className="mt-6 space-y-5">
                    <div><p className="mb-2 text-sm font-bold text-slate-700">{locale === "en" ? "Rate your experience" : "ให้คะแนนประสบการณ์ของคุณ"}</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} ${locale === "en" ? "stars" : "ดาว"}`} className="rounded-lg p-1 transition hover:scale-110"><Star size={28} className={value <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"} /></button>)}</div></div>
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={5} placeholder={locale === "en" ? "Tell us about your experience..." : "บอกเล่าประสบการณ์ของคุณ..."} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100" />
                    {message && <p className="text-sm font-semibold text-red-600">{message}</p>}
                    <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-pink-600 disabled:opacity-50"><Send size={16} />{locale === "en" ? "Submit Review" : "ส่งรีวิว"}</button>
                </form>
            )}
        </section>
    );
}
