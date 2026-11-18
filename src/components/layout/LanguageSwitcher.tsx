"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n";

// Flags are drawn as SVG: emoji flags show as plain letters on Windows.
function FlagTH() {
    return <svg viewBox="0 0 30 20" aria-hidden="true" className="h-[14px] w-[21px] shrink-0 rounded-[2px] ring-1 ring-black/10">
        <rect width="30" height="20" fill="#A51931" /><rect y="3.33" width="30" height="13.33" fill="#F4F5F8" /><rect y="6.67" width="30" height="6.67" fill="#2D2A4A" />
    </svg>;
}
function FlagGB() {
    return <svg viewBox="0 0 60 30" aria-hidden="true" className="h-[14px] w-[21px] shrink-0 rounded-[2px] ring-1 ring-black/10" preserveAspectRatio="none">
        <clipPath id="flag-gb-clip"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#flag-gb-clip)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>;
}

const languages = [
    { code: "th", label: "ไทย", short: "TH", Flag: FlagTH },
    { code: "en", label: "English", short: "EN", Flag: FlagGB },
] as const;

// Flag + language name; opens a short menu with a tick on the current language.
export default function LanguageSwitcher({ appearance = "light" }: { appearance?: "light" | "dark" }) {
    const { locale, setLocale } = useI18n();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const isDark = appearance === "dark";
    const current = languages.find(language => language.code === locale) ?? languages[0];

    useEffect(() => {
        if (!open) return;
        const onClick = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
        document.addEventListener("click", onClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
    }, [open]);

    return (
        <div ref={root} className="relative shrink-0">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={locale === "th" ? `ภาษา: ${current.label}` : `Language: ${current.label}`}
                onClick={() => setOpen(value => !value)}
                className={`inline-flex h-11 items-center gap-1.5 rounded-full px-1.5 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] sm:px-3 ${isDark ? "text-white hover:bg-white/10" : "text-[#151515] hover:bg-[#f2f2f0]"}`}
            >
                <current.Flag />
                <span className="hidden sm:inline">{current.label}</span>
                <span className="sm:hidden">{current.short}</span>
                <ChevronDown size={14} aria-hidden="true" className={`hidden transition-transform sm:block ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div role="menu" className="absolute right-0 top-full z-[10001] mt-2 min-w-44 overflow-hidden rounded-xl border border-[#e8e8e6] bg-white p-1.5 text-[#151515] shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
                {languages.map(language => {
                    const selected = language.code === locale;
                    return <button
                        key={language.code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        lang={language.code}
                        onClick={() => { setLocale(language.code); setOpen(false); }}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] transition-colors hover:bg-[#f5f5f3] ${selected ? "font-semibold" : ""}`}
                    >
                        <language.Flag />
                        <span className="flex-1">{language.label}</span>
                        {selected && <Check size={16} aria-hidden="true" className="text-[#7a6cc0]" />}
                    </button>;
                })}
            </div>}
        </div>
    );
}
