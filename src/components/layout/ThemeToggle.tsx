"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/i18n";

/** Moon in light mode, sun in dark mode. Renders a fixed-size placeholder until the saved choice is known, so nothing jumps. */
export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const { locale } = useI18n();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const dark = mounted && resolvedTheme === "dark";
    const label = locale === "th" ? (dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด") : (dark ? "Switch to light mode" : "Switch to dark mode");

    return <button type="button" aria-label={label} title={label} onClick={() => setTheme(dark ? "light" : "dark")}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#3d3d3d] transition hover:bg-[#f2f2f0] hover:text-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]">
        {mounted ? (dark ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />) : <span className="h-[19px] w-[19px]" />}
    </button>;
}
