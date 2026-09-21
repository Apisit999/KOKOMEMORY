"use client";

import { useI18n } from "@/i18n";

export default function LanguageSwitcher() {
    const { locale, setLocale } = useI18n();
    return (
        <div className="flex items-center rounded-full border border-white/10 bg-white/[0.06] p-1" aria-label="Language">
            {(["th", "en"] as const).map((item) => (
                <button
                    key={item}
                    type="button"
                    onClick={() => setLocale(item)}
                    aria-pressed={locale === item}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${locale === item ? "bg-white/15 text-white" : "text-white/50 hover:text-white"}`}
                >{item.toUpperCase()}</button>
            ))}
        </div>
    );
}
