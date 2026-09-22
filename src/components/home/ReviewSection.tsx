"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useI18n } from "@/i18n";

type PublicReview = { id: string; customerName?: string; rating?: number; comment?: string; eventType?: string };

export default function ReviewSection() {
    const { locale, translate } = useI18n();
    const [reviews, setReviews] = useState<PublicReview[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/reviews", { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) throw new Error("REVIEWS_LOAD_FAILED");
                return response.json() as Promise<{ reviews?: PublicReview[] }>;
            })
            .then((data) => { if (!cancelled) setReviews(Array.isArray(data.reviews) ? data.reviews : []); })
            .catch(() => { if (!cancelled) setReviews([]); })
            .finally(() => { if (!cancelled) setLoaded(true); });
        return () => { cancelled = true; };
    }, []);

    return (
        <section className="bg-[#FFF9FC] py-16 sm:py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="text-center">
                    <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">TESTIMONIALS</span>
                    <h2 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">{translate("รีวิวจากลูกค้า")}</h2>
                    <p className="mx-auto mt-6 max-w-3xl text-base text-gray-500 sm:text-lg">{translate("ความประทับใจจากลูกค้าที่ใช้บริการ KOKO Memory")}</p>
                </div>

                {!loaded ? <div className="mt-16 text-center text-sm text-slate-400">{translate("กำลังโหลด...")}</div> : reviews.length === 0 ? <p className="mt-16 text-center text-sm font-semibold text-slate-500">{locale === "en" ? "No customer reviews yet" : "ยังไม่มีรีวิวจากลูกค้า"}</p> : (
                    <div className="mt-12 grid gap-8 sm:mt-16 lg:mt-20 lg:grid-cols-3">
                        {reviews.map((item) => {
                            const rating = Math.max(1, Math.min(5, Number(item.rating) || 5));
                            return <article key={item.id} className="rounded-[28px] bg-white p-6 shadow-xl transition hover:-translate-y-2 hover:shadow-2xl sm:rounded-[35px] sm:p-8 lg:p-10">
                                <div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={20} className={value <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />)}</div>
                                <p className="mt-8 leading-7 text-gray-600 sm:leading-8">&quot;{item.comment}&quot;</p>
                                <div className="mt-10 flex items-center gap-4"><div className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-pink-100 text-xl font-black text-pink-500">{(item.customerName || "K").slice(0, 1).toUpperCase()}</div><div><h3 className="font-bold text-slate-900">{item.customerName || "KOKO Memory customer"}</h3>{item.eventType && <p className="text-gray-500">{item.eventType}</p>}</div></div>
                            </article>;
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
