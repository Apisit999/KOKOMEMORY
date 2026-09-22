"use client";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            void (async () => {
                try {
                    const res = await fetch("/api/3d/quotes", {
                        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
                        cache: "no-store",
                    });
                    const data = await res.json();
                    setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
                } finally {
                    setLoading(false);
                }
            })();
        });

        return unsubscribe;
    }, []);

    return <main className="min-h-screen bg-[#f8f7f9] px-5 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-900">คำขอใบเสนอราคา</h1><p className="mt-2 text-sm text-slate-500">คำขอ Custom 3D Printing ของคุณ</p></div><Link href="/account/3d-printing/quotes/new" className="rounded-xl bg-pink-500 px-4 py-3 text-sm font-bold text-white">สร้างคำขอ</Link></div>{loading ? <p className="mt-8 text-sm text-slate-500">กำลังโหลด...</p> : <div className="mt-8 space-y-3">{quotes.length ? quotes.map((quote) => <Link key={String(quote.id)} href={`/account/3d-printing/quotes/${quote.id}`} className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-900">{String(quote.quoteNumber || quote.id)}</p><p className="mt-1 text-sm text-slate-500">{String(quote.material)} / {String(quote.color)} · {String(quote.quantity)} ชิ้น</p></div><span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">{String(quote.status)}</span></div></Link>) : <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">ยังไม่มีคำขอใบเสนอราคา</div>}</div>}</div></main>;
}
