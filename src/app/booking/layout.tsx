"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    useEffect(() => {
        let authEvent = 0;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const currentEvent = ++authEvent;
            setReady(false);
            const redirect = encodeURIComponent(window.location.pathname + window.location.search);
            if (!user) {
                router.replace(`/account/login?redirect=${redirect}`);
                return;
            }

            if (!user.emailVerified) {
                try {
                    await user.reload();
                } catch {
                    router.replace(`/account/security?redirect=${redirect}`);
                    return;
                }

                if (currentEvent !== authEvent) return;
                if (!user.emailVerified) {
                    router.replace(`/account/security?redirect=${redirect}`);
                    return;
                }
            }

            if (currentEvent === authEvent) setReady(true);
        });

        return unsubscribe;
    }, [router]);
    if (!ready) return null;

    return (
        <div>
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl justify-end px-4 py-2 sm:px-6">
                    <LanguageSwitcher appearance="light" />
                </div>
            </div>
            {children}
        </div>
    );
}
