"use client";

import { useI18n } from "@/i18n";

const languages = [
    { code: "th", label: "ไทย", shortLabel: "TH" },
    { code: "en", label: "English", shortLabel: "EN" },
] as const;

// Pure White Luxe language toggle: "TH | EN", active language underlined with the brand gradient.
export default function LanguageSwitcher({ appearance = "light" }: { appearance?: "light" | "dark" }) {
    const { locale, setLocale } = useI18n();
    const isDark = appearance === "dark";

    return (
        <div role="group" aria-label={locale === "th" ? "เลือกภาษา" : "Choose language"} className={`inline-flex shrink-0 items-center text-[12px] tracking-[0.2em] ${isDark ? "text-white/50" : "text-[#9a9a96]"}`}>
            {languages.map((language, index) => {
                const selected = locale === language.code;
                return (
                    <span key={language.code} className="inline-flex items-center">
                        {index > 0 && <span aria-hidden="true" className={`mx-0.5 h-3 w-px ${isDark ? "bg-white/25" : "bg-[#dcdcd9]"}`} />}
                        <button
                            type="button"
                            lang={language.code}
                            aria-pressed={selected}
                            aria-label={language.label}
                            onClick={() => setLocale(language.code)}
                            className={`relative inline-flex min-h-11 min-w-10 items-center justify-center px-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] after:absolute after:inset-x-2 after:bottom-2 after:h-px after:bg-[linear-gradient(90deg,#d98aae,#a79bd8,#7fb2ee)] after:transition-transform after:duration-500 ${selected ? `${isDark ? "text-white" : "text-[#151515]"} after:scale-x-100` : `${isDark ? "hover:text-white" : "hover:text-[#151515]"} after:scale-x-0`}`}
                        >
                            {language.shortLabel}
                        </button>
                    </span>
                );
            })}
        </div>
    );
}
