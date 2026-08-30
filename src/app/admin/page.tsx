"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.replace("/admin/dashboard");
            } else {
                router.replace("/admin/login");
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="text-4xl mb-4">🔥</div>

                <p className="text-slate-600">
                    กำลังตรวจสอบสิทธิ์...
                </p>
            </div>
        </main>
    );
}