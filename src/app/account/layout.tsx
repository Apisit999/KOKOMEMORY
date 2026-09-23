"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { CalendarDays, ChevronRight, FileText, Home, LayoutDashboard, LogOut, Menu, Printer, ShieldCheck, ShoppingBag, UserRound, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

type Label = { th: string; en: string };
type NavItem = { href: string; label: Label; icon: typeof LayoutDashboard };

const mainLinks: NavItem[] = [
    { href: "/account", label: { th: "ภาพรวม", en: "Overview" }, icon: LayoutDashboard },
    { href: "/account/bookings", label: { th: "การจองของฉัน", en: "My bookings" }, icon: CalendarDays },
];
const threeDLinks: NavItem[] = [
    { href: "/account/3d-printing", label: { th: "ภาพรวม 3D", en: "3D overview" }, icon: Printer },
    { href: "/3d-printing", label: { th: "สินค้า 3D", en: "3D products" }, icon: ShoppingBag },
    { href: "/account/3d-printing/orders", label: { th: "งาน 3D ของฉัน", en: "My 3D orders" }, icon: Printer },
    { href: "/account/3d-printing/quotes", label: { th: "ใบเสนอราคาของฉัน", en: "My quotes" }, icon: FileText },
];
const accountLinks: NavItem[] = [
    { href: "/account/profile", label: { th: "โปรไฟล์", en: "Profile" }, icon: UserRound },
    { href: "/account/security", label: { th: "ความปลอดภัย", en: "Security" }, icon: ShieldCheck },
];
const publicPages = ["/account/login", "/account/register", "/account/forgot-password"];

export default function AccountLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { locale } = useI18n();
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const isPublicPage = publicPages.includes(pathname);

    useEffect(() => onAuthStateChanged(auth, (current) => {
        setUser(current);
        if (!current && !isPublicPage) router.replace(`/account/login?redirect=${encodeURIComponent(pathname)}`);
    }), [isPublicPage, pathname, router]);

    if (isPublicPage) return <>{children}</>;

    const text = (label: Label) => label[locale];
    const isActive = (href: string) => pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));
    const pageTitle = pathname.startsWith("/account/3d-printing") ? "KOKO 3D" : pathname === "/account/bookings" ? text({ th: "การจองของฉัน", en: "My bookings" }) : pathname === "/account/profile" ? text({ th: "โปรไฟล์", en: "Profile" }) : pathname === "/account/security" ? text({ th: "ความปลอดภัย", en: "Security" }) : text({ th: "ภาพรวม", en: "Overview" });

    const renderLink = (item: NavItem, mobile = false) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} onClick={mobile ? () => setOpen(false) : undefined} aria-current={active ? "page" : undefined} className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition ${active ? "bg-[#FFE4F1] text-[#D93687]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
            <Icon size={18} className={active ? "text-[#FF4FA3]" : "text-slate-400 group-hover:text-slate-700"} />
            <span>{text(item.label)}</span>
            {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#FF4FA3]" />}
        </Link>;
    };

    const navigation = (mobile = false) => <nav aria-label={locale === "th" ? "เมนูบัญชี" : "Account menu"} className="space-y-6">
        <NavGroup title={locale === "th" ? "เมนู" : "Menu"}>{mainLinks.map((item) => renderLink(item, mobile))}</NavGroup>
        <NavGroup title="KOKO 3D" accent>{threeDLinks.map((item) => renderLink(item, mobile))}</NavGroup>
        <NavGroup title={locale === "th" ? "บัญชี" : "Account"}>{accountLinks.map((item) => renderLink(item, mobile))}</NavGroup>
    </nav>;

    const secondary = (mobile = false) => <div className="space-y-1 border-t border-slate-100 pt-4">
        <Link href="/" onClick={mobile ? () => setOpen(false) : undefined} className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Home size={18} />{locale === "th" ? "กลับเว็บไซต์" : "Back to website"}</Link>
        <button type="button" onClick={() => void signOut(auth)} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"><LogOut size={18} />{locale === "th" ? "ออกจากระบบ" : "Sign out"}</button>
    </div>;

    return <div data-account-shell className="min-h-screen bg-[#F8F8FB] text-[#111116]"><style jsx global>{`[data-account-shell] main > main.bg-slate-50 > header{display:none}[data-account-shell] main > main.bg-slate-50{background:#F8F8FB;min-height:calc(100vh - 72px)}`}</style>
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[264px] flex-col border-r border-[#E9E9EF] bg-white px-4 py-6 lg:flex">
            <Link href="/account" className="mb-8 flex items-center gap-3 px-2"><Image src="/logo/logo.jpg" alt="KOKO Memory" width={44} height={44} className="h-10 w-10 rounded-full object-cover" priority /><span><b className="block text-base tracking-tight">KOKO Memory</b><small className="text-[10px] uppercase tracking-[.2em] text-slate-400">{locale === "th" ? "บัญชีของฉัน" : "My account"}</small></span></Link>
            {navigation()}
            <div className="mt-auto">{secondary()}</div>
        </aside>
        <div className="lg:pl-[264px]">
            <header className="sticky top-0 z-40 border-b border-[#E9E9EF] bg-white/95 backdrop-blur-xl">
                <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 lg:hidden" onClick={() => setOpen(true)} aria-label={locale === "th" ? "เปิดเมนู" : "Open menu"}><Menu size={20} /></button><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-400">KOKO Memory Customer Portal</p><h1 className="truncate text-lg font-black">{pageTitle}</h1></div></div><div className="flex items-center gap-3"><LanguageSwitcher /><div className="hidden items-center gap-2 border-l border-slate-100 pl-3 sm:flex"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE4F1] text-sm font-black text-[#D93687]">{(user?.displayName || user?.email || "K").charAt(0).toUpperCase()}</div><span className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-700 xl:block">{user?.displayName || user?.email || "KOKO"}</span></div></div></div>
            </header>
            <main>{breadcrumb(pathname, locale)}{children}</main>
        </div>
        {open && <div className="fixed inset-0 z-[60] bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}><aside className="flex h-full w-[min(320px,88vw)] flex-col bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center justify-between"><Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3"><Image src="/logo/logo.jpg" alt="KOKO Memory" width={38} height={38} className="h-9 w-9 rounded-full object-cover" /><b>KOKO Memory</b></Link><button type="button" onClick={() => setOpen(false)} aria-label={locale === "th" ? "ปิดเมนู" : "Close menu"} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50"><X size={21} /></button></div>{navigation(true)}<div className="mt-auto">{secondary(true)}</div></aside></div>}
    </div>;
}

function NavGroup({ title, children, accent = false }: { title: string; children: ReactNode; accent?: boolean }) { return <div><p className={`mb-2 px-3 text-[10px] font-black uppercase tracking-[.2em] ${accent ? "text-[#D93687]" : "text-slate-400"}`}>{title}</p><div className="space-y-1">{children}</div></div>; }

function breadcrumb(pathname: string, locale: "th" | "en") {
    const parts = pathname.split("/").filter(Boolean);
    const isQuote = parts[1] === "3d-printing" && parts[2] === "quotes" && Boolean(parts[3]);
    const isOrder = parts[1] === "3d-printing" && parts[2] === "orders" && Boolean(parts[3]);
    const isBooking = parts[1] === "bookings" && Boolean(parts[2]);
    if (!isQuote && !isOrder && !isBooking) return null;
    const th = locale === "th";
    const detail = isQuote ? parts[3] : isOrder ? parts[3] : parts[2];
    const items = isQuote
        ? [{ label: th ? "ภาพรวม" : "Overview", href: "/account" }, { label: th ? "ใบเสนอราคาของฉัน" : "My quotes", href: "/account/3d-printing/quotes" }, { label: detail }]
        : isOrder
            ? [{ label: th ? "ภาพรวม" : "Overview", href: "/account" }, { label: th ? "งาน 3D ของฉัน" : "My 3D orders", href: "/account/3d-printing/orders" }, { label: detail }]
            : [{ label: th ? "ภาพรวม" : "Overview", href: "/account" }, { label: th ? "การจองของฉัน" : "My bookings", href: "/account/bookings" }, { label: detail }];
    return <nav aria-label={th ? "เส้นทางหน้า" : "Breadcrumb"} className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-4 pt-5 text-xs text-slate-400 sm:px-8">{items.map((item, index) => <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">{index > 0 && <ChevronRight size={13}/>} {item.href ? <Link href={item.href} className="font-semibold hover:text-[#D93687]">{item.label}</Link> : <span className="font-semibold text-slate-700">{item.label}</span>}</span>)}</nav>;
}
