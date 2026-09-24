"use client";

import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useI18n } from "@/i18n";

const languages = [
    { code: "th", label: "ไทย", shortLabel: "TH" },
    { code: "en", label: "English", shortLabel: "EN" },
] as const;

export default function LanguageSwitcher({ appearance = "light" }: { appearance?: "light" | "dark" }) {
    const { locale, setLocale } = useI18n();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerId = useId();
    const menuId = useId();
    const isDark = appearance === "dark";
    const currentLanguage = languages.find((language) => language.code === locale) ?? languages[0];

    useEffect(() => {
        if (!open) return;

        menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();

        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const closeOnKeyboard = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
            } else if (event.key === "Tab") {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", closeOnOutsidePointer);
        document.addEventListener("keydown", closeOnKeyboard);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsidePointer);
            document.removeEventListener("keydown", closeOnKeyboard);
        };
    }, [open]);

    const chooseLanguage = (language: typeof languages[number]) => {
        setLocale(language.code);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
        const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
        let nextIndex: number | undefined;

        if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
        else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = items.length - 1;

        if (nextIndex !== undefined) {
            event.preventDefault();
            items[nextIndex]?.focus();
        }
    };

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                ref={triggerRef}
                id={triggerId}
                type="button"
                aria-label={locale === "th" ? `เปลี่ยนภาษา ภาษาปัจจุบัน ${currentLanguage.label}` : `Change language. Current language: ${currentLanguage.label}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((value) => !value)}
                className={`inline-flex min-h-11 min-w-[88px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3] focus-visible:ring-offset-2 ${isDark ? "border-white/15 bg-[#1C1C22] text-white hover:border-[#FF4FA3] hover:bg-[#28232A] focus-visible:ring-offset-[#0B0B0F]" : "border-[#E9E9EF] bg-white text-slate-700 hover:border-[#FF4FA3] hover:bg-[#FFF8FB] focus-visible:ring-offset-white"}`}
            >
                <Globe2 aria-hidden="true" size={17} className={isDark ? "text-[#FF7FBC]" : "text-[#D93687]"} />
                <span>{currentLanguage.shortLabel}</span>
                <ChevronDown aria-hidden="true" size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-labelledby={triggerId}
                    onKeyDown={handleMenuKeyDown}
                    className={`absolute right-0 top-full z-[10001] mt-2 w-[168px] overflow-hidden rounded-2xl border p-1.5 shadow-xl ${isDark ? "border-white/10 bg-[#15151A] text-white shadow-black/40" : "border-[#E9E9EF] bg-white text-slate-800 shadow-slate-900/10"}`}
                >
                    {languages.map((language) => {
                        const selected = locale === language.code;
                        return (
                            <button
                                key={language.code}
                                type="button"
                                role="menuitemradio"
                                aria-checked={selected}
                                onClick={() => chooseLanguage(language)}
                                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF4FA3] ${selected ? "bg-[#FF4FA3]/10 text-[#D93687]" : isDark ? "text-white/80 hover:bg-white/[.06]" : "text-slate-700 hover:bg-[#FFF0F7]"}`}
                            >
                                <span>{language.label}</span>
                                {selected && <Check aria-hidden="true" size={16} className="text-[#D93687]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
