"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ArrowRight, CalendarDays, ClipboardCheck, FileText, Package, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useI18n } from "@/i18n";

type Profile = { name?: string; email?: string };
type NextStep = { key: string; title: string; detail: string; href: string; kind: "booking" | "quote" | "order" };

async function load3DItems(path: string, user: User): Promise<Record<string, unknown>[]> {
    const response = await fetch(path, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load customer items");
    const data = await response.json() as { quotes?: Record<string, unknown>[]; orders?: Record<string, unknown>[] };
    return path.includes("quotes") ? data.quotes || [] : data.orders || [];
}

export default function AccountPage() {
    const { t, translate } = useI18n();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => onAuthStateChanged(auth, async (current) => {
        setUser(current);
        if (!current) { setLoading(false); return; }
        setError("");
        try {
            const [profileResult, bookingResult, quoteResult, orderResult] = await Promise.allSettled([
                getDoc(doc(db, "users", current.uid)),
                getDocs(query(collection(db, "bookings"), where("userId", "==", current.uid))),
                load3DItems("/api/3d/quotes", current),
                load3DItems("/api/3d/orders", current),
            ]);
            if (profileResult.status === "fulfilled") setProfile(profileResult.value.exists() ? profileResult.value.data() as Profile : {});
            const steps: NextStep[] = [];
            if (bookingResult.status === "fulfilled") for (const item of bookingResult.value.docs) {
                const booking = item.data();
                const paymentStatus = String(booking.payment?.status || "unpaid").toLowerCase();
                if (booking.bookingStatus === "pending_payment" && !["paid", "verified", "submitted"].includes(paymentStatus)) steps.push({ key: `booking-${item.id}`, kind: "booking", title: translate("ชำระเงินสำหรับการจอง"), detail: String(booking.package?.name || translate("การจอง Photobooth")), href: `/booking/payment?bookingId=${encodeURIComponent(item.id)}` });
                if (booking.bookingStatus === "payment_rejected") steps.push({ key: `booking-${item.id}`, kind: "booking", title: translate("ส่งหลักฐานการชำระเงินอีกครั้ง"), detail: String(booking.package?.name || translate("การจอง Photobooth")), href: `/booking/payment?bookingId=${encodeURIComponent(item.id)}` });
            }
            if (quoteResult.status === "fulfilled") for (const quote of quoteResult.value) if (quote.status === "quoted") steps.push({ key: `quote-${String(quote.id)}`, kind: "quote", title: translate("ตรวจสอบใบเสนอราคา"), detail: `#${String(quote.quoteNumber || quote.id)}`, href: `/account/3d-printing/quotes/${quote.id}` });
            if (orderResult.status === "fulfilled") for (const order of orderResult.value) if (order.orderStatus === "pending_payment" || order.paymentStatus === "unpaid") steps.push({ key: `order-${String(order.id)}`, kind: "order", title: translate("ชำระเงินสำหรับงาน 3D"), detail: `#${String(order.orderNumber || order.id)}`, href: `/account/3d-printing/orders/${order.id}` });
            setNextSteps(steps.slice(0, 5));
            if ([bookingResult, quoteResult, orderResult].every((result) => result.status === "rejected")) setError(translate("โหลดรายการบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
        }
        catch { setError(translate("โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")); }
        finally { setLoading(false); }
    }), [refresh, translate]);

    if (loading) return <main className="min-h-[70vh] bg-[#F8F8FB] px-5 py-10"><div className="mx-auto max-w-6xl animate-pulse space-y-6"><div className="h-40 rounded-[28px] bg-slate-200"/><div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-200"/>)}</div></div></main>;

    const name = profile.name || user?.displayName || (user?.email ? user.email.split("@")[0] : "คุณ");
    const email = profile.email || user?.email || "";
    const cards = [
        { href: "/account/bookings", icon: CalendarDays, label: "การจอง", detail: "ดูการจอง Photobooth ของคุณ" },
        { href: "/account/3d-printing/quotes", icon: FileText, label: "ใบเสนอราคา", detail: "ติดตามราคาและไฟล์งาน 3D" },
        { href: "/account/3d-printing/orders", icon: Package, label: "งาน 3D", detail: "ติดตามการผลิตและจัดส่ง" },
        { href: "/account/profile", icon: UserRound, label: "โปรไฟล์", detail: "จัดการข้อมูลส่วนตัว" },
    ];

    return <main className="bg-[#F8F8FB] px-4 py-7 sm:px-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-8">
        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }} className="font-bold underline">{translate("ลองอีกครั้ง")}</button></div>}
        {!user?.emailVerified && user?.email && <section className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center"><div><p className="font-black text-amber-950">{translate("ยืนยันอีเมลเพื่อดูแลบัญชีให้ปลอดภัย")}</p><p className="mt-1 text-sm leading-6 text-amber-800">{translate("ตรวจสอบกล่องจดหมายของคุณ หรือส่งอีเมลยืนยันอีกครั้งได้ที่หน้าความปลอดภัย")}</p></div><Link href="/account/security" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm ring-1 ring-amber-200">{translate("ตรวจสอบบัญชี")}<ArrowRight size={15}/></Link></section>}
        <section className="relative overflow-hidden rounded-[28px] bg-[#111116] p-7 text-white shadow-xl sm:p-10"><div className="relative z-10 max-w-2xl"><p className="text-xs font-black uppercase tracking-[.24em] text-[#FF4FA3]">KOKO MEMORY CUSTOMER PORTAL</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("account.dashboard.welcome")}, {name}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white/65">{translate("จัดการการจอง บริการ 3D และใบเสนอราคาของคุณได้จากที่นี่")}</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/booking" className="inline-flex items-center gap-2 rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-black text-white hover:bg-[#D93687]">{translate("จอง Photobooth")}<ArrowRight size={16}/></Link><Link href="/account/3d-printing" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">{translate("ดูงาน 3D")}</Link></div></div><Sparkles className="absolute -right-4 -top-5 h-48 w-48 text-[#FF4FA3]/15" /></section>
        <section aria-labelledby="next-steps-title" className="rounded-2xl border border-[#E9E9EF] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#D93687]">{translate("NEXT STEPS")}</p><h2 id="next-steps-title" className="mt-1 text-xl font-black">{translate("สิ่งที่ต้องทำต่อ")}</h2></div><ClipboardCheck className="text-[#D93687]" size={21}/></div>{loading ? <div className="mt-4 h-16 animate-pulse rounded-xl bg-slate-50"/> : nextSteps.length ? <div className="mt-4 divide-y divide-slate-100">{nextSteps.map((step) => <Link key={step.key} href={step.href} className="flex flex-col justify-between gap-2 py-4 first:pt-2 last:pb-0 sm:flex-row sm:items-center"><span><span className="block font-bold text-slate-900">{step.title}</span><span className="mt-1 block text-sm text-slate-500">{step.detail}</span></span><span className="inline-flex items-center gap-1 text-sm font-bold text-[#D93687]">{translate("ดำเนินการ")}<ArrowRight size={15}/></span></Link>)}</div> : <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{translate("ไม่มีรายการที่ต้องดำเนินการในตอนนี้")}</div>}</section>
        <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#D93687]">{translate("Quick access")}</p><h2 className="mt-1 text-xl font-black">{translate("เริ่มต้นจากตรงนี้")}</h2></div><span className="hidden text-sm text-slate-400 sm:block">{translate("เลือกเมนูที่ต้องการ")}</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ href, icon: Icon, label, detail }) => <Link key={href} href={href} className="group rounded-2xl border border-[#E9E9EF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE4F1] text-[#D93687]"><Icon size={20}/></span><ArrowRight size={17} className="text-slate-300 transition group-hover:text-[#FF4FA3]"/></div><h3 className="mt-5 font-black">{translate(label)}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{translate(detail)}</p></Link>)}</div></section>
        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-[#E9E9EF] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-slate-400">KOKO 3D</p><h2 className="mt-1 text-xl font-black">{translate("สร้างชิ้นงาน 3D ของคุณ")}</h2></div><Package className="text-[#FF4FA3]"/></div><p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">{translate("เลือกสินค้า หรือส่งไฟล์ของคุณเพื่อขอใบเสนอราคาและติดตามงานได้ในที่เดียว")}</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/3d-printing" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-pink-200 hover:text-[#D93687]">{translate("เลือกสินค้า 3D")}</Link><Link href="/account/3d-printing/quotes/new" className="rounded-xl bg-[#FF4FA3] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#D93687]">{translate("ขอใบเสนอราคา")}</Link></div></div><div className="rounded-2xl border border-[#E9E9EF] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE4F1] text-[#D93687]"><ShieldCheck size={19}/></span><div><h2 className="font-black">{translate("บัญชีของคุณ")}</h2><p className="text-xs text-slate-500">{email}</p></div></div><Link href="/account/security" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#D93687]">{translate("ดูความปลอดภัยของบัญชี")}<ArrowRight size={16}/></Link></div></section>
    </div></main>;
}
