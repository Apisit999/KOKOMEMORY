"use client";

/**
 * ============================================================
 * KOKO Memory - Admin Layout
 * ============================================================
 *
 * หน้าที่
 * ------------------------------------------------------------
 * Layout กลางของระบบ Admin
 *
 * ทำหน้าที่
 * ------------------------------------------------------------
 * 1. ตรวจสอบ Login
 * 2. ป้องกันหน้าภายใน /admin
 * 3. แสดง AdminSidebar
 * 4. จัดการ Mobile Sidebar
 *
 * โครงสร้าง
 * ------------------------------------------------------------
 *
 * /admin
 *    ↓
 * AdminLayout
 *    ↓
 * ตรวจสอบ Firebase Auth
 *    ↓
 * ┌─────────────────────┐
 * │ Sidebar │ Content   │
 * └─────────────────────┘
 *
 * ทุกหน้าภายใต้ /admin จะใช้ Layout นี้อัตโนมัติ
 * ============================================================
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const [loading, setLoading] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    /*
     * ========================================================
     * AUTHENTICATION
     * ========================================================
     *
     * ตรวจสอบว่า Admin Login อยู่หรือไม่
     *
     * ถ้าไม่ได้ Login
     * → ส่งกลับ /admin/login
     *
     * หมายเหตุ:
     * หน้า Login ไม่ควรถูกตรวจซ้ำ
     * ========================================================
     */

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                /*
                 * ถ้าไม่ได้ Login
                 */

                if (!user) {
                    router.replace("/admin/login");
                    return;
                }

                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [router]);

    /*
     * ========================================================
     * CLOSE MOBILE SIDEBAR
     * ========================================================
     */

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    /*
     * ========================================================
     * LOADING SCREEN
     * ========================================================
     */

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">

                <div className="text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />

                    <p className="mt-4 text-sm text-slate-500">
                        กำลังตรวจสอบสิทธิ์...
                    </p>

                </div>

            </div>
        );
    }

    /*
     * ========================================================
     * ADMIN APPLICATION
     * ========================================================
     */

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <AdminSidebar
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />


            {/* ==================================================
                MAIN CONTENT
            ================================================== */}

            <main className="min-h-screen lg:ml-72">

                {children}

            </main>

        </div>
    );
}