"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

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
    return ready ? children : null;
}
