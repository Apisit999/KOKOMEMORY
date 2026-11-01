"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

function isAdminClaims(claims: Record<string, unknown>) {
    return (
        claims.admin === true ||
        claims.isAdmin === true ||
        claims.role === "admin"
    );
}

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace("/admin/login");
                return;
            }

            try {
                const tokenResult = await user.getIdTokenResult(true);

                if (!isAdminClaims(tokenResult.claims)) {
                    await auth.signOut();
                    router.replace("/admin/login");
                    return;
                }

                router.replace("/admin/dashboard");
            } catch (error) {
                console.error("ADMIN AUTH ERROR:", error);

                await auth.signOut().catch(() => undefined);

                router.replace("/admin/login");
            }
        });

        return () => unsubscribe();
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="text-4xl mb-4">
                    🔥
                </div>

                <p className="text-slate-600">
                    กำลังตรวจสอบสิทธิ์...
                </p>
            </div>
        </main>
    );
}