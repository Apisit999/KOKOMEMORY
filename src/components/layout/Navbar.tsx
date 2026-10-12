"use client";

import Image from "next/image";
import brandLogo from "../../../public/logo/logo.jpg";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Box, BookOpen, CalendarDays, ChevronDown, FileText, LogIn, LogOut, Menu, Monitor, Settings2, Sparkles, UserCircle2, UserPlus, UserRound, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n, type MessageKey } from "@/i18n";

const serviceItems = [
    { title: "common.allServices", href: "/services" },
    { title: "common.photoboothRental", href: "/photobooth" },
    { title: "common.threeD", href: "/3d-printing" },
] as const;

const softwareItems = [
    { title: "common.software", href: "/software" },
    { title: "common.kokoStudio", href: "/koko-studio" },
] as const;

const otherNavItems = [
    { title: "common.home", href: "/" },
    { title: "common.portfolio", href: "/gallery/portfolio" },
    { title: "common.about", href: "/about" },
    { title: "common.contact", href: "/contact" },
] as const;

const accountLinks = [
    { href: "/account", icon: UserCircle2, label: "common.overview" },
    { href: "/account/bookings", icon: BookOpen, label: "common.bookings" },
    { href: "/account/koko-studio", icon: Monitor, label: "common.kokoStudio" },
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
    const [openDropdown, setOpenDropdown] = useState<"services" | "software" | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const menuPanelRef = useRef<HTMLElement>(null);
    const wasMenuOpenRef = useRef(false);

    useEffect(() => onAuthStateChanged(auth, setUser), []);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    useEffect(() => {
        if (menuOpen) closeButtonRef.current?.focus();
        else if (wasMenuOpenRef.current && menuButtonRef.current?.offsetParent !== null) menuButtonRef.current?.focus();
        wasMenuOpenRef.current = menuOpen;
    }, [menuOpen]);
    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 1280px)");
        const closeHiddenNavigation = () => {
            if (desktop.matches) setMenuOpen(false);
            else setOpenDropdown(null);
        };
        desktop.addEventListener("change", closeHiddenNavigation);
        return () => desktop.removeEventListener("change", closeHiddenNavigation);
    }, []);
    useEffect(() => {
        if (!menuOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = menuPanelRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    useEffect(() => {
        if (!openDropdown) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpenDropdown(null);
        };
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (event.target instanceof Element && !event.target.closest("[data-nav-dropdown]")) setOpenDropdown(null);
        };
        document.addEventListener("keydown", closeOnEscape);
        document.addEventListener("click", closeOnOutsideClick);
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.removeEventListener("click", closeOnOutsideClick);
        };
    }, [openDropdown]);

    const close = () => setMenuOpen(false);
    const logout = async () => { await signOut(auth); close(); };
    const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/3d-printing" && (pathname.startsWith("/account/3d-printing") || pathname.startsWith("/admin/3d-printing")));
    const isAccountActive = (href: string) => href === "/account" ? pathname === "/account" : pathname === href || pathname.startsWith(`${href}/`);
    const menuLabel = (item: { title: string }) => item.title.startsWith("common.") ? t(item.title as MessageKey) || item.title : item.title;
    const isServiceActive = serviceItems.some((item) => isActive(item.href));
    const isSoftwareActive = softwareItems.some((item) => isActive(item.href));
    const drawerItem = "flex min-h-11 items-center gap-3 rounded-xl border-l-2 border-transparent px-4 py-3 text-sm text-[#EDEDF0] transition [&_svg]:text-[#8F8F99] hover:bg-[#FF4FA3]/10 hover:text-white hover:[&_svg]:text-[#FF4FA3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]";
    const drawerSectionLabel = "mb-2 px-4 text-[11px] font-bold uppercase tracking-[.15em] text-[#8F8F99]";
    const renderDrawerLink = (item: { title: string; href: string }, nested = false) => <Link key={item.href} href={item.href} onClick={close} aria-current={isActive(item.href) ? "page" : undefined} className={`${drawerItem} ${nested ? "ml-3 w-[calc(100%-0.75rem)]" : ""} ${isActive(item.href) ? "border-[#FF4FA3] bg-gradient-to-r from-[#FF4FA3]/[.18] to-[#FF4FA3]/[.06] font-semibold text-white [&_svg]:text-[#FF4FA3]" : "font-medium"}`}>{menuLabel(item)}</Link>;

    return <>
        <header className={`fixed left-0 right-0 top-0 z-[9999] border-b border-white/[0.08] pt-[env(safe-area-inset-top)] text-white transition ${scrolled ? "bg-[#0B0B0F]/95 shadow-2xl backdrop-blur-xl" : "bg-[#0B0B0F]/92 backdrop-blur-xl"}`}>
            <div className="mx-auto flex min-h-[72px] max-w-[90rem] items-center justify-between gap-3 px-4 sm:min-h-20 sm:px-6 lg:gap-4 lg:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={locale === "en" ? "KOKO Memory home" : "KOKO Memory หน้าหลัก"}>
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full sm:h-12 sm:w-12">
                        <Image src={brandLogo} alt="KOKO Memory" fill sizes="(max-width: 639px) 44px, 48px" priority className="object-cover" />
                    </span>
                    <div className="hidden whitespace-nowrap sm:block"><h1 className="text-xl font-bold xl:text-2xl">KOKO Memory</h1><p className="hidden text-[10px] uppercase tracking-[.18em] text-white/55 lg:block">Photobooth &amp; Event</p></div>
                </Link>

                <nav aria-label={t("common.menu")} className="hidden shrink-0 items-center gap-1 xl:flex 2xl:gap-2">
                    {(["services", "software"] as const).map((group) => {
                        const isServices = group === "services";
                        const items = isServices ? serviceItems : softwareItems;
                        const title = isServices ? t("common.services") : t("common.software");
                        const active = isServices ? isServiceActive : isSoftwareActive;
                        const expanded = openDropdown === group;
                        return <div key={group} className="relative" data-nav-dropdown>
                            <button type="button" aria-haspopup="true" aria-expanded={expanded} aria-controls={`nav-${group}-menu`} onClick={() => setOpenDropdown(expanded ? null : group)} className={`inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition 2xl:px-3 ${active ? "bg-white/10 text-[#FF8CC4]" : "text-white/75 hover:bg-white/5 hover:text-white"}`}>
                                {title}<ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            {expanded && <div id={`nav-${group}-menu`} className="absolute left-0 top-full z-[10001] mt-2 min-w-52 rounded-2xl border border-white/10 bg-[#111116] p-2 shadow-2xl shadow-black/40">
                                {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpenDropdown(null)} aria-current={isActive(item.href) ? "page" : undefined} className={`block whitespace-nowrap rounded-xl px-4 py-3 text-sm transition ${isActive(item.href) ? "bg-[#FF4FA3]/15 font-semibold text-[#FF8CC4]" : "text-white/80 hover:bg-white/[.06] hover:text-white"}`}>{menuLabel(item)}</Link>)}
                            </div>}
                        </div>;
                    })}
                    {otherNavItems.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition 2xl:px-3 ${isActive(item.href) ? "bg-white/10 text-[#FF8CC4]" : "text-white/75 hover:bg-white/5 hover:text-white"}`}>{menuLabel(item)}</Link>)}
                </nav>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <LanguageSwitcher appearance="dark" />
                    <Link href="/booking" aria-label={t("common.bookNow")} className="flex h-11 min-h-11 w-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#FF4FA3] px-0 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(255,79,163,.2)] transition hover:bg-[#e83d91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8CC4] min-[380px]:h-auto min-[380px]:w-auto min-[380px]:px-3 min-[380px]:py-2.5 sm:px-4"><CalendarDays size={16} /><span className="hidden min-[380px]:inline sm:hidden">{locale === "th" ? "จอง" : "Book"}</span><span className="hidden sm:inline">{t("common.bookNow")}</span></Link>
                    <Link href="/account" aria-label={t("common.account")} className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1C1C22] text-[#F8F8FA] transition hover:border-[#FF4FA3] hover:text-[#FF8CC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3] md:flex"><UserRound size={18} /></Link>
                    <button ref={menuButtonRef} type="button" aria-label={t("common.openMenu")} aria-expanded={menuOpen} aria-controls="public-navigation-drawer" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#FF4FA3] bg-[#1C1C22] text-white transition hover:bg-[#FF4FA3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3] xl:hidden"><Menu size={22} /></button>
                </div>
            </div>
        </header>

        <div aria-hidden={!menuOpen} onClick={close} className={`fixed inset-0 z-[10000] overflow-hidden bg-black/60 backdrop-blur-[2px] ${menuOpen ? "flex" : "hidden"}`}>
            <aside ref={menuPanelRef} id="public-navigation-drawer" role="dialog" aria-modal="true" aria-label={t("common.menu")} onClick={(event) => event.stopPropagation()} className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#0B0B0F] text-[#F8F8FA] shadow-2xl transition-transform duration-200 supports-[height:100dvh]:h-dvh ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]"><Link href="/" onClick={close} className="flex min-w-0 items-center gap-2"><span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full"><Image src={brandLogo} alt="KOKO Memory" fill sizes="40px" className="object-cover" /></span><span className="whitespace-nowrap text-lg font-bold text-white sm:text-xl">KOKO Memory</span></Link><button ref={closeButtonRef} type="button" aria-label={t("common.closeMenu")} onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#FF4FA3] bg-[#1C1C22] text-white transition hover:bg-[#FF4FA3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]"><X size={23} /></button></div>
                <nav aria-label={t("common.menu")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6">
                    <p className={drawerSectionLabel}>{t("common.services")}</p>
                    <div className="space-y-1">{serviceItems.map((item) => renderDrawerLink(item))}</div>
                    <p className={`${drawerSectionLabel} mt-5`}>{t("common.software")}</p>
                    <div className="space-y-1">{softwareItems.map((item) => renderDrawerLink(item))}</div>
                    <div className="my-5 h-px bg-white/10" />
                    {otherNavItems.map((item) => renderDrawerLink(item))}
                    <div className="my-5 h-px bg-white/10" />
                    <p className={drawerSectionLabel}>{t("common.account")}</p>
                    {user ? <div className="space-y-1">
                        {accountLinks.map(({ href, icon: Icon, label }) => <Link key={href} href={href} onClick={close} aria-current={isAccountActive(href) ? "page" : undefined} className={`${drawerItem} ${isAccountActive(href) ? "border-[#FF4FA3] bg-gradient-to-r from-[#FF4FA3]/[.18] to-[#FF4FA3]/[.06] font-semibold text-white [&_svg]:text-[#FF4FA3]" : ""}`}><Icon size={17} />{t(label)}</Link>)}
                        <button type="button" onClick={() => void logout()} className={`${drawerItem} w-full`}><LogOut size={17} />{t("common.logout")}</button>
                    </div> : <div className="grid grid-cols-2 gap-2">
                        <Link href="/account/login" onClick={close} className="rounded-xl bg-[#1C1C22] px-3 py-3 text-center text-sm font-semibold text-[#EDEDF0] transition hover:bg-[#FF4FA3]"><LogIn className="mx-auto mb-1" size={17} />{t("common.login")}</Link>
                        <Link href="/account/register" onClick={close} className="rounded-xl bg-[#1C1C22] px-3 py-3 text-center text-sm font-semibold text-[#EDEDF0] transition hover:bg-[#FF4FA3]"><UserPlus className="mx-auto mb-1" size={17} />{t("common.register")}</Link>
                    </div>}
                </nav>
                <div className="shrink-0 border-t border-white/10 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Link href="/booking" onClick={close} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#FF4FA3] py-3.5 font-semibold text-white shadow-[0_8px_24px_rgba(255,79,163,0.25)] transition hover:bg-[#D93687] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]"><CalendarDays size={18} />{t("common.bookNow")}</Link>
                </div>
            </aside>
        </div>
    </>;
}
