"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Box, BookOpen, CalendarDays, FileText, LogIn, LogOut, Menu, Search, Settings2, Sparkles, UserCircle2, UserPlus, UserRound, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n, type MessageKey } from "@/i18n";

const navItems = [
    { title: "common.home", href: "/" },
    { title: "common.services", href: "/services" },
    { title: "common.portfolio", href: "/gallery/portfolio" },
    { title: "common.threeD", href: "/3d-printing" },
    { title: "common.about", href: "/about" },
    { title: "common.contact", href: "/contact" },
] as const;

const accountLinks = [
    { href: "/account", icon: UserCircle2, label: "common.overview" },
    { href: "/account/bookings", icon: BookOpen, label: "common.bookings" },
    { href: "/account/3d-printing", icon: Sparkles, label: "common.threeD" },
    { href: "/account/3d-printing/quotes", icon: FileText, label: "common.quotes" },
    { href: "/account/3d-printing/orders", icon: Box, label: "common.orders" },
    { href: "/account/profile", icon: UserCircle2, label: "common.profile" },
    { href: "/account/security", icon: Settings2, label: "common.security" },
] as const;

export default function Navbar() {
    const { t, locale } = useI18n();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => onAuthStateChanged(auth, setUser), []);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    useEffect(() => {
        if (menuOpen) closeButtonRef.current?.focus();
        else menuButtonRef.current?.focus();
    }, [menuOpen]);
    useEffect(() => {
        if (!menuOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    const close = () => setMenuOpen(false);
    const logout = async () => { await signOut(auth); close(); };
    const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/3d-printing" && (pathname.startsWith("/account/3d-printing") || pathname.startsWith("/admin/3d-printing")));
    const isAccountActive = (href: string) => href === "/account" ? pathname === "/account" : pathname === href || pathname.startsWith(`${href}/`);
    const menuLabel = (item: (typeof navItems)[number]) => t(item.title as MessageKey) || (item.href === "/3d-printing" ? "3D Printing" : item.title);
    const drawerItem = "flex items-center gap-3 rounded-xl border-l-2 border-transparent px-4 py-3 text-sm text-[#EDEDF0] transition [&_svg]:text-[#8F8F99] hover:bg-[#FF4FA3]/10 hover:text-white hover:[&_svg]:text-[#FF4FA3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]";

    return <>
        <header className={`fixed left-0 right-0 top-0 z-[9999] border-b border-white/[0.08] text-white transition ${scrolled ? "bg-[#0B0B0F]/95 shadow-2xl backdrop-blur-xl" : "bg-[#0B0B0F]/92 backdrop-blur-xl"}`}>
            <div className="mx-auto flex min-h-20 max-w-[90rem] items-center justify-between gap-4 px-4 sm:min-h-24 sm:px-6 lg:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={locale === "en" ? "KOKO Memory home" : "KOKO Memory หน้าหลัก"}>
                    <Image src="/logo/logo.jpg" alt="KOKO Memory" width={56} height={56} priority className="h-11 w-11 rounded-full object-cover sm:h-14 sm:w-14" />
                    <div><h1 className="text-xl font-bold sm:text-2xl">KOKO Memory</h1><p className="hidden text-[10px] uppercase tracking-[.18em] text-white/55 sm:block">Photobooth &amp; Event</p></div>
                </Link>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="hidden sm:block"><LanguageSwitcher /></div>
                    <Link href="/search" aria-label={t("common.search")} className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#1C1C22] px-4 py-2.5 text-sm text-[#F8F8FA] transition hover:border-[#FF4FA3] hover:bg-[#FF4FA3] sm:flex"><Search size={17} />{t("common.search")}</Link>
                    <Link href="/account" aria-label={t("common.account")} className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#1C1C22] px-4 py-2.5 text-sm font-medium text-[#F8F8FA] transition hover:border-[#FF4FA3] hover:bg-[#FF4FA3] sm:flex"><UserRound size={17} />{t("common.account")}</Link>
                    <button ref={menuButtonRef} type="button" aria-label={t("common.openMenu")} aria-expanded={menuOpen} aria-controls="public-navigation-drawer" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#FF4FA3] bg-[#1C1C22] text-white transition hover:bg-[#FF4FA3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]"><Menu size={22} /></button>
                </div>
            </div>
        </header>

        <div aria-hidden={!menuOpen} onClick={close} className={`fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${menuOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
            <aside id="public-navigation-drawer" role="dialog" aria-modal="true" aria-label={t("common.menu")} onClick={(event) => event.stopPropagation()} className={`absolute right-0 top-0 flex h-full w-[min(420px,90vw)] flex-col border-l border-white/10 bg-[#0B0B0F] text-[#F8F8FA] shadow-2xl transition-transform duration-200 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><Link href="/" onClick={close} className="flex items-center gap-3"><Image src="/logo/logo.jpg" alt="KOKO Memory" width={46} height={46} className="rounded-full" /><span className="text-xl font-bold text-white">KOKO Memory</span></Link><button ref={closeButtonRef} type="button" aria-label={t("common.closeMenu")} onClick={close} className="rounded-full border border-[#FF4FA3] bg-[#1C1C22] p-2 text-white transition hover:bg-[#FF4FA3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]"><X size={23} /></button></div>
                <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-5 py-6"><p className="mb-3 px-4 text-[11px] font-bold uppercase tracking-[.15em] text-[#8F8F99]">MAIN</p>{navItems.map((item) => <Link key={item.href} href={item.href} onClick={close} aria-current={isActive(item.href) ? "page" : undefined} className={`${drawerItem} ${isActive(item.href) ? "border-[#FF4FA3] bg-gradient-to-r from-[#FF4FA3]/[.18] to-[#FF4FA3]/[.06] font-semibold text-white [&_svg]:text-[#FF4FA3]" : "font-medium"}`}>{menuLabel(item)}</Link>)}<div className="my-5 h-px bg-white/10" /><p className="mb-3 px-4 text-[11px] font-bold uppercase tracking-[.15em] text-[#8F8F99]">ACCOUNT</p>{user ? <div className="space-y-1">{accountLinks.map(({ href, icon: Icon, label }) => <Link key={href} href={href} onClick={close} className={`${drawerItem} ${isAccountActive(href) ? "border-[#FF4FA3] bg-gradient-to-r from-[#FF4FA3]/[.18] to-[#FF4FA3]/[.06] font-semibold text-white [&_svg]:text-[#FF4FA3]" : ""}`}><Icon size={17} />{t(label)}</Link>)}<button type="button" onClick={() => void logout()} className={`${drawerItem} w-full`}><LogOut size={17} />{t("common.logout")}</button></div> : <div className="grid grid-cols-2 gap-2"><Link href="/account/login" onClick={close} className="rounded-xl bg-[#1C1C22] px-3 py-3 text-center text-sm font-semibold text-[#EDEDF0] transition hover:bg-[#FF4FA3]"><LogIn className="mx-auto mb-1" size={17} />{t("common.login")}</Link><Link href="/account/register" onClick={close} className="rounded-xl bg-[#1C1C22] px-3 py-3 text-center text-sm font-semibold text-[#EDEDF0] transition hover:bg-[#FF4FA3]"><UserPlus className="mx-auto mb-1" size={17} />{t("common.register")}</Link></div>}<Link href="/booking" onClick={close} className="mt-6 flex items-center justify-center gap-2 rounded-[14px] bg-[#FF4FA3] py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(255,79,163,0.25)] transition hover:bg-[#D93687] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]"><CalendarDays size={18} />{t("common.bookNow")}</Link></nav>
            </aside>
        </div>
    </>;
}
