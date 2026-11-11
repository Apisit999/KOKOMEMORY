"use client";

import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
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
    const drawerItem = "flex min-h-11 items-center gap-3 border-l border-transparent px-4 py-3 text-[15px] text-[#5c5c5c] transition [&_svg]:text-[#9a9a96] hover:bg-[#fafaf9] hover:text-[#151515] hover:[&_svg]:text-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]";
    const drawerActive = "border-[#a79bd8] bg-[#fafaf9] font-medium text-[#151515] [&_svg]:text-[#151515]";
    const drawerSectionLabel = "eyebrow mb-2 px-4 !text-[11px]";
    const renderDrawerLink = (item: { title: string; href: string }, nested = false) => <Link key={item.href} href={item.href} onClick={close} aria-current={isActive(item.href) ? "page" : undefined} className={`${drawerItem} ${nested ? "ml-3 w-[calc(100%-0.75rem)]" : ""} ${isActive(item.href) ? drawerActive : ""}`}>{menuLabel(item)}</Link>;
    const navLink = (active: boolean) => `relative inline-flex min-h-11 items-center gap-1 whitespace-nowrap px-2.5 py-2 text-[14px] transition 2xl:px-3 after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:bg-[linear-gradient(90deg,#d98aae,#a79bd8,#7fb2ee)] after:transition-transform after:duration-500 ${active ? "text-[#151515] after:scale-x-100" : "text-[#5c5c5c] hover:text-[#151515] after:scale-x-0 hover:after:scale-x-100"}`;

    return <>
        <header className={`fixed left-0 right-0 top-0 z-[9999] border-b pt-[env(safe-area-inset-top)] text-[#151515] backdrop-blur-xl transition-colors duration-500 ${scrolled ? "border-[#e8e8e6] bg-white/95" : "border-transparent bg-white/80"}`}>
            <div className="mx-auto flex min-h-[72px] max-w-[90rem] items-center justify-between gap-3 px-4 sm:min-h-20 sm:px-6 lg:gap-4 lg:px-8">
                <Link href="/" className="flex shrink-0 items-center" aria-label={locale === "en" ? "KOKO Memory home" : "KOKO Memory หน้าหลัก"}>
                    <span className="sm:hidden"><BrandLogo size="sm" /></span>
                    <span className="hidden sm:block"><BrandLogo size="md" /></span>
                </Link>

                <nav aria-label={t("common.menu")} className="hidden shrink-0 items-center gap-1 xl:flex 2xl:gap-2">
                    {(["services", "software"] as const).map((group) => {
                        const isServices = group === "services";
                        const items = isServices ? serviceItems : softwareItems;
                        const title = isServices ? t("common.services") : t("common.software");
                        const active = isServices ? isServiceActive : isSoftwareActive;
                        const expanded = openDropdown === group;
                        return <div key={group} className="relative" data-nav-dropdown>
                            <button type="button" aria-haspopup="true" aria-expanded={expanded} aria-controls={`nav-${group}-menu`} onClick={() => setOpenDropdown(expanded ? null : group)} className={navLink(active)}>
                                {title}<ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            {expanded && <div id={`nav-${group}-menu`} className="absolute left-0 top-full z-[10001] mt-2 min-w-56 border border-[#e8e8e6] bg-white p-2 shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
                                {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpenDropdown(null)} aria-current={isActive(item.href) ? "page" : undefined} className={`block whitespace-nowrap px-4 py-3 text-[14px] transition ${isActive(item.href) ? "bg-[#fafaf9] font-medium text-[#151515]" : "text-[#5c5c5c] hover:bg-[#fafaf9] hover:text-[#151515]"}`}>{menuLabel(item)}</Link>)}
                            </div>}
                        </div>;
                    })}
                    {otherNavItems.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={navLink(isActive(item.href))}>{menuLabel(item)}</Link>)}
                </nav>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <LanguageSwitcher appearance="light" />
                    <Link href="/booking" aria-label={t("common.bookNow")} className="flex h-11 min-h-11 w-11 items-center justify-center gap-2 whitespace-nowrap rounded-[2px] bg-[#151515] px-0 text-[13px] font-medium tracking-[0.08em] text-white transition hover:bg-[#2e2e2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] min-[380px]:h-auto min-[380px]:w-auto min-[380px]:px-3 min-[380px]:py-2.5 sm:px-5"><CalendarDays size={16} /><span className="hidden min-[380px]:inline sm:hidden">{locale === "th" ? "จอง" : "Book"}</span><span className="hidden sm:inline">{t("common.bookNow")}</span></Link>
                    {user
                        ? <Link href="/account" aria-label={t("common.account")} title={user.displayName || user.email || undefined} className="hidden h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d98aae,#a79bd8,#7fb2ee)] p-px transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] focus-visible:ring-offset-2 md:flex"><span className="flex h-full w-full items-center justify-center rounded-full bg-white font-display text-[18px] italic text-[#151515]">{(user.displayName || user.email || "K").trim().charAt(0).toUpperCase()}</span></Link>
                        : <Link href="/account/login" className="hidden min-h-11 items-center gap-2 border-b border-transparent text-[13px] tracking-[0.06em] text-[#5c5c5c] transition hover:border-[#151515] hover:text-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] md:inline-flex"><UserRound size={16} strokeWidth={1.5} />{t("common.login")}</Link>}
                    <button ref={menuButtonRef} type="button" aria-label={t("common.openMenu")} aria-expanded={menuOpen} aria-controls="public-navigation-drawer" onClick={() => setMenuOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e8e8e6] bg-white text-[#151515] transition hover:border-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] xl:hidden"><Menu size={22} /></button>
                </div>
            </div>
        </header>

        <div aria-hidden={!menuOpen} onClick={close} className={`fixed inset-0 z-[10000] overflow-hidden bg-black/30 backdrop-blur-[2px] ${menuOpen ? "flex" : "hidden"}`}>
            <aside ref={menuPanelRef} id="public-navigation-drawer" role="dialog" aria-modal="true" aria-label={t("common.menu")} onClick={(event) => event.stopPropagation()} className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-[#e8e8e6] bg-white text-[#151515] transition-transform duration-300 supports-[height:100dvh]:h-dvh ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e8e8e6] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]"><Link href="/" onClick={close} className="flex min-w-0 items-center" aria-label="KOKO Memory"><BrandLogo size="sm" /></Link><button ref={closeButtonRef} type="button" aria-label={t("common.closeMenu")} onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8e8e6] bg-white text-[#151515] transition hover:border-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]"><X size={23} /></button></div>
                <nav aria-label={t("common.menu")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6">
                    <p className={drawerSectionLabel}>{t("common.services")}</p>
                    <div className="space-y-1">{serviceItems.map((item) => renderDrawerLink(item))}</div>
                    <p className={`${drawerSectionLabel} mt-5`}>{t("common.software")}</p>
                    <div className="space-y-1">{softwareItems.map((item) => renderDrawerLink(item))}</div>
                    <div className="my-5 h-px bg-[#e8e8e6]" />
                    {otherNavItems.map((item) => renderDrawerLink(item))}
                    <div className="my-5 h-px bg-[#e8e8e6]" />
                    <p className={drawerSectionLabel}>{t("common.account")}</p>
                    {user ? <div className="space-y-1">
                        {accountLinks.map(({ href, icon: Icon, label }) => <Link key={href} href={href} onClick={close} aria-current={isAccountActive(href) ? "page" : undefined} className={`${drawerItem} ${isAccountActive(href) ? drawerActive : ""}`}><Icon size={17} />{t(label)}</Link>)}
                        <button type="button" onClick={() => void logout()} className={`${drawerItem} w-full`}><LogOut size={17} />{t("common.logout")}</button>
                    </div> : <div className="grid grid-cols-2 gap-2">
                        <Link href="/account/login" onClick={close} className="rounded-[2px] border border-[#e8e8e6] px-3 py-3 text-center text-sm font-medium text-[#151515] transition hover:border-[#151515]"><LogIn className="mx-auto mb-1" size={17} />{t("common.login")}</Link>
                        <Link href="/account/register" onClick={close} className="rounded-[2px] border border-[#e8e8e6] px-3 py-3 text-center text-sm font-medium text-[#151515] transition hover:border-[#151515]"><UserPlus className="mx-auto mb-1" size={17} />{t("common.register")}</Link>
                    </div>}
                </nav>
                <div className="shrink-0 border-t border-[#e8e8e6] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Link href="/booking" onClick={close} className="flex min-h-11 items-center justify-center gap-2 rounded-[2px] bg-[#151515] py-3.5 font-medium tracking-[0.08em] text-white transition hover:bg-[#2e2e2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]"><CalendarDays size={18} />{t("common.bookNow")}</Link>
                </div>
            </aside>
        </div>
    </>;
}
