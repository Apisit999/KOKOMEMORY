"use client";

import { useI18n } from "@/i18n";

export default function LanguageSwitcher() {
    const { locale, setLocale, t } = useI18n();
    return (
        <div className="flex items-center rounded-full border border-[#E9E9EF] bg-white p-1" aria-label={t("account.language.label") || "Language"}>
            {(["th", "en"] as const).map((item) => (
                <button
                    key={item}
                    type="button"
                    onClick={() => setLocale(item)}
                    aria-pressed={locale === item}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${locale === item ? "bg-[#FF4FA3] text-white" : "text-slate-500 hover:text-[#D93687]"}`}
                >{item.toUpperCase()}</button>
            ))}
        </div>
    );
}
