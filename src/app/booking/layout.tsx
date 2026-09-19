"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    useEffect(() => onIdTokenChanged(auth, async (user) => {
        setReady(false);
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        if (!user) {
            router.replace(`/account/login?redirect=${redirect}`);
            return;
        }
        try {
            await user.reload();
            if (!user.emailVerified) {
                router.replace(`/account/security?redirect=${redirect}`);
                return;
            }
            setReady(true);
        } catch {
            router.replace(`/account/login?redirect=${redirect}`);
        }
    }), [router, pathname]);
    return ready ? children : null;
}
