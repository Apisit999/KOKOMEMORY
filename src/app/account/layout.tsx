"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    CalendarDays,
    FileText,
    Home,
    LayoutDashboard,
    LogOut,
    Menu,
    Printer,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";

const mainLinks = [
    { href: "/account", label: "ภาพรวม", icon: LayoutDashboard },
    { href: "/account/bookings", label: "การจองของฉัน", icon: CalendarDays },
];

const threeDLinks = [
    { href: "/account/3d-printing", label: "3D Printing", icon: Printer },
    { href: "/account/3d-printing/orders", label: "งาน 3D ของฉัน", icon: Printer },
    { href: "/account/3d-printing/quotes", label: "ใบเสนอราคาของฉัน", icon: FileText },
];

const accountLinks = [
    { href: "/account/profile", label: "โปรไฟล์", icon: UserRound },
    { href: "/account/security", label: "ความปลอดภัย", icon: ShieldCheck },
];

const publicPages = [
    "/account/login",
    "/account/register",
    "/account/forgot-password",
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { t, translate } = useI18n();
    const [open, setOpen] = useState(false);
    const isPublicPage = publicPages.includes(pathname);

    useEffect(
        () =>
            onAuthStateChanged(auth, (current) => {
                if (!current && !isPublicPage) {
                    router.replace(`/account/login?redirect=${encodeURIComponent(pathname)}`);
                }
            }),
        [isPublicPage, pathname, router]
    );

    if (isPublicPage) return <>{children}</>;

    const isActive = (href: string) =>
        pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));

    const renderLink = (item: (typeof mainLinks)[number] | (typeof threeDLinks)[number] | (typeof accountLinks)[number], mobile = false) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={mobile ? () => setOpen(false) : undefined}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
                    active
                        ? "bg-gradient-to-r from-pink-50 to-blue-50 text-[#e83d91] shadow-sm ring-1 ring-pink-100"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
                <Icon
                    size={19}
                    strokeWidth={active ? 2.5 : 2}
                    className={active ? "text-[#e83d91]" : "text-slate-400 group-hover:text-slate-700"}
                />
                <span>{translate(item.label)}</span>
                {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#ff4fa3]" />}
            </Link>
        );
    };

    const navigation = (mobile = false) => (
        <nav aria-label={t("common.menu")} className="space-y-6">
            <div>
                <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t("common.menu")}</p>
                <div className="space-y-1">{mainLinks.map((item) => renderLink(item, mobile))}</div>
            </div>
            <div>
                <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">KOKO 3D</p>
                <div className="space-y-1">{threeDLinks.map((item) => renderLink(item, mobile))}</div>
            </div>
            <div>
                <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t("common.account")}</p>
                <div className="space-y-1">{accountLinks.map((item) => renderLink(item, mobile))}</div>
            </div>
        </nav>
    );

    const secondaryActions = (mobile = false) => (
        <div className="space-y-1 border-t border-slate-100 pt-4">
            <Link
                href="/"
                onClick={mobile ? () => setOpen(false) : undefined}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-[#4f8cff]"
            >
                <Home size={19} />
                {translate("กลับเว็บไซต์")}
            </Link>
            <button
                type="button"
                onClick={() => void signOut(auth)}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
                <LogOut size={19} />
                {t("common.logout")}
            </button>
        </div>
    );

    return (
        <div data-account-shell className="min-h-screen bg-[#f8f7f9] text-slate-900">
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-slate-200/80 bg-white/95 px-4 py-6 shadow-sm backdrop-blur-xl lg:flex lg:flex-col">
                <Link href="/" className="group mb-9 flex items-center gap-3 px-3">
                    <Image src="/logo/logo.jpg" alt="KOKO Memory" width={48} height={48} priority className="h-11 w-11 rounded-full object-cover shadow-md transition duration-200 group-hover:scale-[1.02]" />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-black tracking-tight">KOKO Memory</p>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{t("common.myAccount")}</p>
                    </div>
                </Link>
                {navigation()}
                <div className="mt-auto">{secondaryActions()}</div>
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl lg:hidden">
                    <Link href="/" aria-label={`${t("common.home")} KOKO Memory`}>
                        <Image src="/logo/logo.jpg" alt="KOKO Memory" width={38} height={38} className="h-9 w-9 rounded-full object-cover" />
                    </Link>
                    <button type="button" aria-label={translate("เปิดเมนูบัญชี")} aria-expanded={open} onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-pink-200 hover:text-[#e83d91]">
                        <Menu size={20} />
                    </button>
                </header>
                <main>{children}</main>
            </div>

            {open && (
                <div className="fixed inset-0 z-[60] bg-slate-900/35 lg:hidden" onClick={() => setOpen(false)}>
                    <aside className="flex h-full w-[min(320px,88vw)] flex-col bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <p className="text-lg font-black">KOKO Memory</p>
                                <p className="text-xs text-slate-400">{t("common.myAccount")}</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label={translate("ปิดเมนู")} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                                <X size={22} />
                            </button>
                        </div>
                        {navigation(true)}
                        <div className="mt-auto">{secondaryActions(true)}</div>
                    </aside>
                </div>
            )}
        </div>
    );
}
