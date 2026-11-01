"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminSidebar from "@/components/admin/AdminSidebar";

import {
    Menu,
} from "lucide-react";


export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    const [sidebarOpen, setSidebarOpen] =
        useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    useEffect(() => {
        if (pathname === "/admin/login") return;
        return onIdTokenChanged(auth, async user => {
            setAuthorized(false);
            try {
                const result = await user?.getIdTokenResult();
                const claims = result?.claims;
                if (!claims || !(claims.admin === true || claims.isAdmin === true || claims.role === "admin")) {
                    router.replace("/admin/login"); return;
                }
                setAuthorized(true);
            } catch { router.replace("/admin/login"); }
        });
    }, [pathname, router]);

    if (pathname === "/admin/login") {
        return (
            <div className="min-h-screen">
                {children}
            </div>
        );
    }


    if (!authorized) return null;
    return (
        <div className="min-h-screen bg-slate-50">

            <div className="flex min-h-screen">

                {/* ==================================================
                    SIDEBAR
                ================================================== */}

                <AdminSidebar
                    open={sidebarOpen}
                    onClose={() =>
                        setSidebarOpen(false)
                    }
                />


                {/* ==================================================
                    MAIN
                ================================================== */}

                <div className="flex min-w-0 flex-1 flex-col lg:ml-72">

                    {/* ==================================================
                        HEADER
                    ================================================== */}

                    <header
                        className="
                            sticky
                            top-0
                            z-30
                            flex
                            h-20
                            items-center
                            justify-between
                            border-b
                            border-slate-200
                            bg-white/90
                            px-4
                            backdrop-blur-xl
                            sm:px-6
                            lg:px-8
                        "
                    >

                        {/* LEFT */}

                        <div className="flex items-center gap-3">

                            <button
                                type="button"
                                onClick={() =>
                                    setSidebarOpen(true)
                                }
                                className="
                                    flex
                                    h-11
                                    w-11
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    text-slate-600
                                    shadow-sm
                                    transition
                                    hover:border-pink-200
                                    hover:bg-pink-50
                                    hover:text-pink-500
                                    lg:hidden
                                "
                                aria-label="เปิดเมนู"
                            >
                                <Menu size={20} />
                            </button>


                            <div>

                                <p
                                    className="
                                        text-sm
                                        font-semibold
                                        text-slate-900
                                        sm:text-base
                                    "
                                >
                                    Admin Panel
                                </p>

                                <p
                                    className="
                                        hidden
                                        text-xs
                                        text-slate-400
                                        sm:block
                                    "
                                >
                                    KOKO Memory Management
                                </p>

                            </div>

                        </div>


                        {/* RIGHT */}

                        <div className="flex items-center gap-3">

                            <div
                                className="
                                    hidden
                                    items-center
                                    gap-3
                                    sm:flex
                                "
                            >

                                <div className="text-right">

                                    <p
                                        className="
                                            text-sm
                                            font-semibold
                                            text-slate-800
                                        "
                                    >
                                        Administrator
                                    </p>

                                    <p
                                        className="
                                            text-xs
                                            text-slate-400
                                        "
                                    >
                                        KOKO Memory
                                    </p>

                                </div>


                                <div
                                    className="
                                        flex
                                        h-11
                                        w-11
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-gradient-to-br
                                        from-pink-400
                                        to-rose-500
                                        text-sm
                                        font-bold
                                        text-white
                                        shadow-md
                                        shadow-pink-200
                                    "
                                >
                                    A
                                </div>

                            </div>

                        </div>

                    </header>


                    {/* ==================================================
                        PAGE CONTENT
                    ================================================== */}

                    <main
                        className="
                            flex-1
                            p-4
                            sm:p-6
                            lg:p-8
                        "
                    >
                        {children}
                    </main>

                </div>

            </div>

        </div>
    );
}
