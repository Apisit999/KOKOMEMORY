"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { ArrowRight, CalendarDays, ClipboardCheck, Monitor, Package } from "lucide-react";
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
    const [counts, setCounts] = useState<{ bookings: number | null; threeD: number | null }>({ bookings: null, threeD: null });
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
            setCounts({
                bookings: bookingResult.status === "fulfilled" ? bookingResult.value.size : null,
                threeD: quoteResult.status === "fulfilled" || orderResult.status === "fulfilled" ? (quoteResult.status === "fulfilled" ? quoteResult.value.length : 0) + (orderResult.status === "fulfilled" ? orderResult.value.length : 0) : null,
            });
            if ([bookingResult, quoteResult, orderResult].every((result) => result.status === "rejected")) setError(translate("โหลดรายการบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
        }
        catch { setError(translate("โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")); }
        finally { setLoading(false); }
    }), [refresh, translate]);

    if (loading) return <main className="min-h-[70vh] bg-[#fafaf9] px-5 py-10"><div className="mx-auto max-w-6xl animate-pulse space-y-6"><div className="h-40 rounded-[28px] bg-slate-200"/><div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-200"/>)}</div></div></main>;

    const name = profile.name || user?.displayName || (user?.email ? user.email.split("@")[0] : "คุณ");
    const email = profile.email || user?.email || "";
    // One card per service the customer can have with us; each opens that service's own page.
    const services = [
        { href: "/account/bookings", icon: CalendarDays, label: "การจองบูธ", detail: "วันงาน แพ็กเกจ และการชำระเงิน", count: counts.bookings, unit: "รายการ", action: "ดูการจอง" },
        { href: "/account/koko-studio", icon: Monitor, label: "KOKO Studio", detail: "โปรแกรมบูธ เครื่องที่ใช้ และรูปออนไลน์", count: null, unit: "", action: "จัดการโปรแกรม" },
        { href: "/account/3d-printing", icon: Package, label: "งานพิมพ์ 3D", detail: "ใบเสนอราคา คำสั่งซื้อ และการจัดส่ง", count: counts.threeD, unit: "งาน", action: "ดูงาน 3D" },
    ];

    return <main className="bg-[#fafaf9] px-4 py-7 sm:px-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-6">
        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[15px] text-red-700"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }} className="font-semibold underline">{translate("ลองอีกครั้ง")}</button></div>}
        {!user?.emailVerified && user?.email && <section className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold text-amber-950">{translate("ยืนยันอีเมลเพื่อดูแลบัญชีให้ปลอดภัย")}</p><p className="mt-1 text-[15px] leading-6 text-amber-800">{translate("ตรวจสอบกล่องจดหมายของคุณ หรือส่งอีเมลยืนยันอีกครั้งได้ที่หน้าความปลอดภัย")}</p></div><Link href="/account/security" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-amber-300 bg-white px-4 text-[14px] font-semibold text-amber-900">{translate("ตรวจสอบบัญชี")}<ArrowRight size={15}/></Link></section>}

        <section className="flex flex-col justify-between gap-6 rounded-2xl border border-[#e8e8e6] bg-white p-6 sm:p-8 md:flex-row md:items-center">
            <div><h2 className="text-[26px] font-semibold leading-snug sm:text-[30px]">{t("account.dashboard.welcome")}, {name}</h2><p className="mt-2 text-[16px] leading-7 text-[#3d3d3d]">{translate("ดูการจอง โปรแกรม และงาน 3D ของคุณได้ในหน้านี้")}</p>{email && <p className="mt-1 text-[14px] text-[#6b6b6b]">{email}</p>}</div>
            <div className="flex flex-wrap gap-3"><Link href="/booking" className="inline-flex h-11 items-center gap-2 rounded-full bg-neutral-900 px-5 text-[15px] font-semibold text-white transition hover:bg-neutral-800"><CalendarDays size={17}/>{translate("จองวันงาน")}</Link><Link href="/packages" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#cfcfcb] bg-white px-5 text-[15px] font-medium text-[#151515] transition hover:border-[#151515]">{translate("ดูแพ็กเกจ")}<ArrowRight size={16}/></Link></div>
        </section>

        <section aria-labelledby="next-steps-title" className="rounded-2xl border border-[#e8e8e6] bg-white p-6"><div className="flex items-center gap-3"><ClipboardCheck className="text-[#7a6cc0]" size={20}/><h2 id="next-steps-title" className="text-[18px] font-semibold">{translate("สิ่งที่ต้องทำต่อ")}</h2></div>{nextSteps.length ? <div className="mt-3 divide-y divide-[#efefed]">{nextSteps.map((step) => <Link key={step.key} href={step.href} className="flex flex-col justify-between gap-2 py-4 last:pb-0 sm:flex-row sm:items-center"><span><span className="block text-[16px] font-semibold text-[#151515]">{step.title}</span><span className="mt-1 block text-[14px] text-[#4a4a4a]">{step.detail}</span></span><span className="inline-flex items-center gap-1 text-[15px] font-semibold text-[#7a6cc0]">{translate("ดำเนินการ")}<ArrowRight size={15}/></span></Link>)}</div> : <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-[15px] text-emerald-800">{translate("ไม่มีรายการที่ต้องดำเนินการในตอนนี้")}</p>}</section>

        <section aria-labelledby="services-title"><h2 id="services-title" className="mb-3 text-[18px] font-semibold">{translate("บริการของคุณ")}</h2><div className="grid gap-4 md:grid-cols-3">{services.map(({ href, icon: Icon, label, detail, count, unit, action }) => <Link key={href} href={href} className="group flex flex-col rounded-2xl border border-[#e8e8e6] bg-white p-6 transition hover:border-[#151515]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f1fa] text-[#7a6cc0]"><Icon size={19}/></span><h3 className="text-[17px] font-semibold">{translate(label)}</h3></div>{count !== null && <p className="mt-5 text-[32px] font-semibold leading-none">{count}<span className="ml-2 text-[15px] font-normal text-[#4a4a4a]">{translate(unit)}</span></p>}<p className="mt-4 flex-1 text-[15px] leading-6 text-[#3d3d3d]">{translate(detail)}</p><span className="mt-5 inline-flex items-center gap-1 text-[15px] font-semibold text-[#151515]">{translate(action)}<ArrowRight size={16} className="transition group-hover:translate-x-1"/></span></Link>)}</div></section>
    </div></main>;
}
