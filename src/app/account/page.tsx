"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ArrowRight, CalendarDays, FileText, Package, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useI18n } from "@/i18n";

type Profile = { name?: string; email?: string };

export default function AccountPage() {
    const { t, translate } = useI18n();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => onAuthStateChanged(auth, async (current) => {
        setUser(current);
        if (!current) { setLoading(false); return; }
        try { const snapshot = await getDoc(doc(db, "users", current.uid)); setProfile(snapshot.exists() ? snapshot.data() as Profile : {}); }
        finally { setLoading(false); }
    }), []);

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
        <section className="relative overflow-hidden rounded-[28px] bg-[#111116] p-7 text-white shadow-xl sm:p-10"><div className="relative z-10 max-w-2xl"><p className="text-xs font-black uppercase tracking-[.24em] text-[#FF4FA3]">KOKO MEMORY CUSTOMER PORTAL</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("account.dashboard.welcome")}, {name}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white/65">{translate("จัดการการจอง บริการ 3D และใบเสนอราคาของคุณได้จากที่นี่")}</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/booking" className="inline-flex items-center gap-2 rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-black text-white hover:bg-[#D93687]">{translate("จอง Photobooth")}<ArrowRight size={16}/></Link><Link href="/account/3d-printing" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">{translate("ดูงาน 3D")}</Link></div></div><Sparkles className="absolute -right-4 -top-5 h-48 w-48 text-[#FF4FA3]/15" /></section>
        <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#D93687]">{translate("Quick access")}</p><h2 className="mt-1 text-xl font-black">{translate("เริ่มต้นจากตรงนี้")}</h2></div><span className="hidden text-sm text-slate-400 sm:block">{translate("เลือกเมนูที่ต้องการ")}</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ href, icon: Icon, label, detail }) => <Link key={href} href={href} className="group rounded-2xl border border-[#E9E9EF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE4F1] text-[#D93687]"><Icon size={20}/></span><ArrowRight size={17} className="text-slate-300 transition group-hover:text-[#FF4FA3]"/></div><h3 className="mt-5 font-black">{translate(label)}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{translate(detail)}</p></Link>)}</div></section>
        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-[#E9E9EF] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-slate-400">KOKO 3D</p><h2 className="mt-1 text-xl font-black">{translate("สร้างชิ้นงาน 3D ของคุณ")}</h2></div><Package className="text-[#FF4FA3]"/></div><p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">{translate("เลือกสินค้า หรือส่งไฟล์ของคุณเพื่อขอใบเสนอราคาและติดตามงานได้ในที่เดียว")}</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/3d-printing" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-pink-200 hover:text-[#D93687]">{translate("เลือกสินค้า 3D")}</Link><Link href="/account/3d-printing/quotes/new" className="rounded-xl bg-[#FF4FA3] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#D93687]">{translate("ขอใบเสนอราคา")}</Link></div></div><div className="rounded-2xl border border-[#E9E9EF] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE4F1] text-[#D93687]"><ShieldCheck size={19}/></span><div><h2 className="font-black">{translate("บัญชีของคุณ")}</h2><p className="text-xs text-slate-500">{email}</p></div></div><Link href="/account/security" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#D93687]">{translate("ดูความปลอดภัยของบัญชี")}<ArrowRight size={16}/></Link></div></section>
    </div></main>;
}
