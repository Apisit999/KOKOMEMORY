"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface AdminSidebarProps {
    open?: boolean;
    onClose?: () => void;
}

type MenuItem = {
    label: string;
    href: string;
    icon: ReactNode;
    disabled?: boolean;
};

function Icon({ children }: { children: ReactNode }) {
    return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {children}
        </span>
    );
}

function DashboardIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}

function PaymentIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
            <path d="M7 15h4" />
        </svg>
    );
}

function GalleryIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
        </svg>
    );
}

function PortfolioIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 5V3h8v2" />
            <path d="M3 10h18" />
            <path d="M10 14h4" />
        </svg>
    );
}

function PrinterIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path d="M6 9V3h12v6" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="7" rx="1" />
            <path d="M18 12h.01" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6.6v-2.4h.24A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.67 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.24v2.4h-.24A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
    );
}

const menuItems: MenuItem[] = [
    {
        label: "แดชบอร์ด",
        href: "/admin/dashboard",
        icon: <DashboardIcon />,
    },
    {
        label: "การจอง",
        href: "/admin/bookings",
        icon: <CalendarIcon />,
    },
    {
        label: "การชำระเงิน",
        href: "/admin/payments",
        icon: <PaymentIcon />,
    },
    {
        label: "Live Gallery",
        href: "/admin/gallery",
        icon: <GalleryIcon />,
    },
    {
        label: "Portfolio",
        href: "/admin/portfolio",
        icon: <PortfolioIcon />,
    },
    {
        label: "หมวดหมู่ Portfolio",
        href: "/admin/portfolio/categories",
        icon: <PortfolioIcon />,
    },
    {
        label: "3D Printing",
        href: "/admin/3d-printing",
        icon: <PrinterIcon />,
    },
    {
        label: "ตั้งค่า",
        href: "/admin/settings",
        icon: <SettingsIcon />,
    },
];

export default function AdminSidebar({
    open = false,
    onClose,
}: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed left-0 top-0 z-50
                    flex h-screen w-72 flex-col
                    border-r border-slate-200
                    bg-white
                    transition-transform duration-300
                    lg:translate-x-0
                    ${
                        open
                            ? "translate-x-0"
                            : "-translate-x-full"
                    }
                `}
            >
                {/* Header */}
                <div className="flex h-20 items-center border-b border-slate-100 px-6">
                    <Link
                        href="/admin/dashboard"
                        onClick={onClose}
                        className="flex items-center gap-3"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500 text-sm font-bold text-white">
                            K
                        </div>

                        <div>
                            <div className="text-sm font-bold text-slate-900">
                                KOKO Memory
                            </div>

                            <div className="text-xs text-slate-400">
                                Admin Panel
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Management
                    </div>

                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                pathname.startsWith(
                                    `${item.href}/`,
                                );

                            if (item.disabled) {
                                return (
                                    <div
                                        key={item.href}
                                        className="
                                            group
                                            flex
                                            cursor-not-allowed
                                            items-center
                                            gap-3
                                            rounded-2xl
                                            px-3
                                            py-2.5
                                            opacity-50
                                        "
                                        title="กำลังพัฒนา"
                                    >
                                        <Icon>{item.icon}</Icon>

                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-600">
                                                {item.label}
                                            </div>

                                            <div className="mt-0.5 text-[10px] text-slate-400">
                                                กำลังพัฒนา
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`
                                        group
                                        flex
                                        items-center
                                        gap-3
                                        rounded-2xl
                                        px-3
                                        py-2.5
                                        transition
                                        ${
                                            isActive
                                                ? "bg-pink-50 text-pink-600"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }
                                    `}
                                >
                                    <Icon>{item.icon}</Icon>

                                    <div className="flex-1">
                                        <div className="text-sm font-medium">
                                            {item.label}
                                        </div>
                                    </div>

                                    {isActive && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-5">
                    <div className="text-xs text-slate-400">
                        KOKO Memory Admin
                    </div>

                    <div className="mt-1 text-[11px] text-slate-300">
                        Management System
                    </div>
                </div>
            </aside>
        </>
    );
}