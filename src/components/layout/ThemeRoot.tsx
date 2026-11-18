"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";

/**
 * Light by default (the brand look); a visitor's own choice is remembered on their device.
 * Admin screens always stay light: they are dense work tools that were never designed for dark.
 */
export default function ThemeRoot({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange forcedTheme={pathname.startsWith("/admin") ? "light" : undefined}>
        {children}
    </ThemeProvider>;
}
