"use client";

import Image from "next/image";
import brandLogo from "../../../public/logo/icon.svg";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { CalendarDays, ChevronRight, Home, LayoutDashboard, LoaderCircle, LogOut, Menu, Monitor, Printer, ShieldCheck, UserRound, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import UserMenu from "@/components/layout/UserMenu";
import ThemeToggle from "@/components/layout/ThemeToggle";

type Label = { th: string; en: string };
type NavItem = { href: string; label: Label; icon: typeof LayoutDashboard };

/**
 * One short list, one entry per thing a customer has with us. Sub-pages (quotes, orders, security) live inside their entry.
 * `match` lists the paths that keep an entry highlighted.
 */
const navLinks: (NavItem & { match: string[] })[] = [
    { href: "/account", label: { th: "ภาพรวม", en: "Overview" }, icon: LayoutDashboard, match: [] },
    { href: "/account/bookings", label: { th: "การจองบูธ", en: "Booth bookings" }, icon: CalendarDays, match: ["/account/bookings"] },
    { href: "/account/koko-studio", label: { th: "KOKO Studio", en: "KOKO Studio" }, icon: Monitor, match: ["/account/koko-studio"] },
    { href: "/account/3d-printing", label: { th: "งานพิมพ์ 3D", en: "3D printing" }, icon: Printer, match: ["/account/3d-printing"] },
    { href: "/account/profile", label: { th: "บัญชีของฉัน", en: "My account" }, icon: UserRound, match: ["/account/profile", "/account/security"] },
];
const accountTabs = [
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
    const [authReady, setAuthReady] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLElement>(null);
    const isPublicPage = publicPages.includes(pathname);

    useEffect(() => onAuthStateChanged(auth, (current) => {
        setUser(current);
        setAuthReady(true);
        if (!current && !isPublicPage) {
            const redirectTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            router.replace(`/account/login?redirect=${encodeURIComponent(redirectTarget)}`);
        }
    }), [isPublicPage, pathname, router]);

    useEffect(() => {
        if (!open) return;
        const menuButton = menuButtonRef.current;
        const focusable = () => menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        focusable()?.[0]?.focus();
        const handleMenuKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                menuButton?.focus();
                return;
            }
            if (event.key !== "Tab") return;
            const items = focusable();
            if (!items?.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", handleMenuKey);
        return () => {
            window.removeEventListener("keydown", handleMenuKey);
            if (document.activeElement !== menuButton) menuButton?.focus();
        };
    }, [open]);

    if (isPublicPage) return <>{children}</>;
    if (!authReady || !user) return <main className="flex min-h-screen items-center justify-center bg-[#fafaf9] px-5"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm"><LoaderCircle size={19} className="animate-spin text-[#7a6cc0]" />{locale === "th" ? "กำลังตรวจสอบบัญชีของคุณ…" : "Checking your account…"}</div></main>;

    const text = (label: Label) => label[locale];
    const isActive = (item: (typeof navLinks)[number]) => pathname === item.href || item.match.some(path => pathname === path || pathname.startsWith(`${path}/`));
    const pageTitle = pathname.startsWith("/account/3d-printing") ? "KOKO 3D" : pathname === "/account/bookings" ? text({ th: "การจองบูธ", en: "Booth bookings" }) : pathname === "/account/profile" || pathname === "/account/security" ? text({ th: "บัญชีของฉัน", en: "My account" }) : pathname.startsWith("/account/koko-studio") ? "KOKO Studio" : text({ th: "ภาพรวม", en: "Overview" });

    const renderLink = (item: (typeof navLinks)[number], mobile = false) => {
        const active = isActive(item);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} onClick={mobile ? () => setOpen(false) : undefined} aria-current={active ? "page" : undefined} className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition ${active ? "bg-[#f2f1fa] font-semibold text-[#151515]" : "text-[#3d3d3d] hover:bg-[#f5f5f3] hover:text-[#151515]"}`}>
            <Icon size={18} strokeWidth={1.75} className={active ? "text-[#7a6cc0]" : "text-[#6b6b6b] group-hover:text-[#151515]"} />
            <span>{text(item.label)}</span>
        </Link>;
    };

    const navigation = (mobile = false) => <nav aria-label={locale === "th" ? "เมนูบัญชี" : "Account menu"} className={mobile ? "min-h-0 flex-1 space-y-1 overflow-y-auto" : "space-y-1"}>
        {navLinks.map((item) => renderLink(item, mobile))}
    </nav>;

    // Profile and security are one menu entry with two tabs.
    const tabs = accountTabs.some(tab => tab.href === pathname) ? <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-8"><div role="tablist" className="inline-flex gap-1 rounded-full border border-[#e8e8e6] bg-white p-1">{accountTabs.map(tab => { const selected = tab.href === pathname; const Icon = tab.icon; return <Link key={tab.href} role="tab" aria-selected={selected} href={tab.href} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition ${selected ? "bg-neutral-900 text-white" : "text-[#3d3d3d] hover:bg-[#f5f5f3]"}`}><Icon size={16} />{text(tab.label)}</Link>; })}</div></div> : null;

    const secondary = (mobile = false) => <div className="space-y-1 border-t border-[#e8e8e6] pt-4">
        <Link href="/" onClick={mobile ? () => setOpen(false) : undefined} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-[#3d3d3d] hover:bg-[#f5f5f3]"><Home size={18} strokeWidth={1.75} />{locale === "th" ? "กลับเว็บไซต์" : "Back to website"}</Link>
        <button type="button" onClick={() => void signOut(auth)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] text-[#3d3d3d] hover:bg-red-50 hover:text-red-600"><LogOut size={18} strokeWidth={1.75} />{locale === "th" ? "ออกจากระบบ" : "Sign out"}</button>
    </div>;

    return <div data-account-shell className="min-h-screen bg-[#fafaf9] text-[#111116]"><style jsx global>{`[data-account-shell] main.bg-slate-50 > header{display:none}[data-account-shell] main.bg-slate-50{background:#fafaf9;min-height:calc(100vh - 72px)}`}</style>
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[264px] flex-col border-r border-[#e8e8e6] bg-white px-4 py-6 lg:flex">
            <Link href="/account" className="mb-8 flex items-center gap-3 px-2"><Image src={brandLogo} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" priority /><span><b className="block text-[16px] font-semibold tracking-[0.12em]">KOKO MEMORY</b><small className="text-[13px] text-[#4a4a4a]">{locale === "th" ? "บัญชีลูกค้า" : "Customer account"}</small></span></Link>
            {navigation()}
            <div className="mt-auto">{secondary()}</div>
        </aside>
        <div className="lg:pl-[264px]">
            <header className="sticky top-0 z-40 border-b border-[#e8e8e6] bg-white/95 backdrop-blur-xl">
                <div className="flex h-[72px] items-center justify-between gap-3 px-3 sm:gap-4 sm:px-8"><div className="flex min-w-0 items-center gap-2 sm:gap-3"><button ref={menuButtonRef} type="button" className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 lg:hidden" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="account-mobile-menu" aria-label={locale === "th" ? "เปิดเมนู" : "Open menu"}><Menu size={20} /></button><h1 className="min-w-0 truncate text-[20px] font-semibold">{pageTitle}</h1></div><div className="flex shrink-0 items-center gap-2 sm:gap-3"><ThemeToggle /><LanguageSwitcher appearance="light" />{user && <UserMenu user={user} />}</div></div>
            </header>
            <div>{breadcrumb(pathname, locale)}{tabs}{children}</div>
        </div>
        {open && <div className="fixed inset-0 z-[60] bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}><aside id="account-mobile-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label={locale === "th" ? "เมนูบัญชี" : "Account menu"} className="flex h-dvh w-[min(320px,88vw)] flex-col bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex shrink-0 items-center justify-between"><Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3"><Image src={brandLogo} alt="KOKO Memory" width={38} height={38} className="h-9 w-9 rounded-full object-cover" /><b>KOKO Memory</b></Link><button type="button" onClick={() => setOpen(false)} aria-label={locale === "th" ? "ปิดเมนู" : "Close menu"} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50"><X size={21} /></button></div>{navigation(true)}<div className="mt-auto shrink-0">{secondary(true)}</div></aside></div>}
    </div>;
}


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
            : [{ label: th ? "ภาพรวม" : "Overview", href: "/account" }, { label: th ? "การจองบูธ" : "Booth bookings", href: "/account/bookings" }, { label: detail }];
    return <nav aria-label={th ? "เส้นทางหน้า" : "Breadcrumb"} className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-4 pt-5 text-xs text-slate-400 sm:px-8">{items.map((item, index) => <span key={`${item.label}-${index}`} className={isBooking && !item.href ? "inline-flex max-w-full min-w-0 items-start gap-1.5" : "inline-flex items-center gap-1.5"}>{index > 0 && <ChevronRight size={13} className={isBooking && !item.href ? "shrink-0" : undefined}/>} {item.href ? <Link href={item.href} className="font-semibold hover:text-[#7a6cc0]">{item.label}</Link> : <span className={isBooking ? "min-w-0 break-all font-semibold text-slate-700" : "font-semibold text-slate-700"}>{item.label}</span>}</span>)}</nav>;
}
