"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    Image as ImageIcon,
    Package,
    Settings,
    LogOut,
    X,
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const menus = [
    {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "การจอง",
        href: "/admin/bookings",
        icon: CalendarDays,
    },
    {
        title: "ลูกค้า",
        href: "/admin/customers",
        icon: Users,
    },
    {
        title: "Gallery",
        href: "/admin/gallery",
        icon: ImageIcon,
    },
    {
        title: "แพ็กเกจ",
        href: "/admin/packages",
        icon: Package,
    },
    {
        title: "ตั้งค่า",
        href: "/admin/settings",
        icon: Settings,
    },
];

interface AdminSidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

export default function AdminSidebar({
    mobileOpen = false,
    onClose,
}: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}

            {mobileOpen && (
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
                    ${mobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                    }
                `}
            >
                {/* Logo */}

                <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">

                    <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3"
                        onClick={onClose}
                    >

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500 text-white">
                            K
                        </div>

                        <div>
                            <h1 className="font-bold text-slate-900">
                                KOKO Memory
                            </h1>

                            <p className="text-xs text-slate-400">
                                Admin Panel
                            </p>
                        </div>

                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                    >
                        <X size={20} />
                    </button>

                </div>


                {/* Navigation */}

                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">

                    <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Management
                    </p>

                    {menus.map((item) => {
                        const Icon = item.icon;

                        const active =
                            pathname === item.href ||
                            pathname.startsWith(item.href + "/");

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`
                                    flex items-center gap-3 rounded-xl
                                    px-4 py-3.5
                                    text-sm font-medium
                                    transition
                                    ${active
                                        ? "bg-pink-50 text-pink-600"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-pink-500"
                                    }
                                `}
                            >
                                <Icon size={19} />

                                <span>
                                    {item.title}
                                </span>
                            </Link>
                        );
                    })}

                </nav>


                {/* Bottom */}

                <div className="border-t border-slate-100 p-4">

                    <div className="mb-4 rounded-xl bg-slate-50 p-4">

                        <p className="text-xs text-slate-400">
                            Logged in as
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                            Admin
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-500"
                    >
                        <LogOut size={19} />

                        ออกจากระบบ
                    </button>

                </div>

            </aside>
        </>
    );
}