"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useI18n } from "@/i18n";

/** "2026-11-18" <-> local Date at midnight. Plain strings, so forms and the database keep the format they already use. */
const toDate = (value: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : undefined; };
const toValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** "18 พฤศจิกายน 2569" in Thai (Buddhist year), "18 November 2026" in English. */
export function formatThaiDate(value: string | Date, locale: "th" | "en", options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
    const date = typeof value === "string" ? toDate(value) ?? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", options).format(date);
}

type Props = {
    value: string;
    onChange: (value: string) => void;
    id?: string;
    min?: string;
    max?: string;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
    className?: string;
    "aria-label"?: string;
};

/**
 * Date field that reads the way Thai people write dates, with a calendar in the site's language.
 * Replaces <input type="date">, whose format follows the browser and cannot show the Buddhist year.
 */
export default function ThaiDateInput({ value, onChange, id, min, max, disabled, required, placeholder, className = "", ...rest }: Props) {
    const { locale } = useI18n();
    const th = locale === "th";
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const popupId = useId();
    const selected = toDate(value);
    const minDate = min ? toDate(min) : undefined;
    const maxDate = max ? toDate(max) : undefined;

    useEffect(() => {
        if (!open) return;
        const onClick = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
    }, [open]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayAllowed = (!minDate || today >= minDate) && (!maxDate || today <= maxDate);
    const pick = (date: Date | undefined) => { if (date) { onChange(toValue(date)); setOpen(false); } };

    return <div ref={root} className="relative">
        <button type="button" id={id} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={popupId} aria-label={rest["aria-label"]} onClick={() => setOpen(v => !v)}
            className={`flex min-h-11 w-full items-center gap-3 rounded-[2px] border border-[#d6d6d2] bg-white px-3.5 text-left text-[16px] text-[#151515] transition hover:border-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
            <CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[#7a6cc0]" />
            <span className={`flex-1 ${selected ? "" : "text-[#8a8a86]"}`}>{selected ? formatThaiDate(selected, locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : placeholder ?? (th ? "เลือกวันที่" : "Choose a date")}</span>
        </button>
        {/* Keeps native "required" validation working for the form around it. */}
        {required && <input tabIndex={-1} aria-hidden="true" required value={value} onChange={() => undefined} className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0" />}
        {open && <div id={popupId} role="dialog" aria-label={th ? "เลือกวันที่" : "Choose a date"} className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-[#e8e8e6] bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
            <Calendar mode="single" selected={selected} defaultMonth={selected ?? minDate ?? today} onSelect={pick}
                disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
                className="[--cell-size:2.5rem]" />
            <div className="flex items-center justify-between gap-2 border-t border-[#efefed] px-1 pt-2">
                <button type="button" disabled={!todayAllowed} onClick={() => pick(today)} className="min-h-10 rounded-full px-3 text-[14px] font-semibold text-[#7a6cc0] hover:bg-[#f2f1fa] disabled:opacity-40">{th ? "วันนี้" : "Today"}</button>
                {value && !required && <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[14px] text-[#4a4a4a] hover:bg-[#f5f5f3]"><X size={14} />{th ? "ล้าง" : "Clear"}</button>}
            </div>
        </div>}
    </div>;
}
