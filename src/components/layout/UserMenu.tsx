"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, type User } from "firebase/auth";
import { ChevronDown, Power, UserRound } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";

/** Signed-in account button: avatar + name; opens "My account" and a red "Log out". */
export default function UserMenu({ user, onSignedOut }: { user: User; onSignedOut?: () => void }) {
    const { locale } = useI18n();
    const th = locale === "th";
    const [open, setOpen] = useState(false);
    const [photoFailed, setPhotoFailed] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const name = user.displayName || user.email?.split("@")[0] || "KOKO";

    useEffect(() => {
        if (!open) return;
        const onClick = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
        document.addEventListener("click", onClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
    }, [open]);

    const logout = async () => { setOpen(false); await signOut(auth); onSignedOut?.(); };

    return <div ref={root} className="relative shrink-0">
        <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={th ? `บัญชี: ${name}` : `Account: ${name}`} onClick={() => setOpen(value => !value)}
            className="inline-flex h-11 items-center gap-2 rounded-full pl-1 pr-2.5 text-[14px] font-medium text-[#151515] transition hover:bg-[#f2f2f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]">
            {user.photoURL && !photoFailed
                // eslint-disable-next-line @next/next/no-img-element -- Google profile photos come from many hosts
                ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} className="h-8 w-8 rounded-full object-cover" />
                : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d98aae,#a79bd8,#7fb2ee)] text-[14px] font-semibold text-white">{name.trim().charAt(0).toUpperCase()}</span>}
            <span className="hidden max-w-[140px] truncate md:inline">{name}</span>
            <ChevronDown size={15} aria-hidden="true" className={`text-[#6b6b6b] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && <div role="menu" className="absolute right-0 top-full z-[10001] mt-2 w-52 overflow-hidden rounded-xl border border-[#e8e8e6] bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.10)]">
            <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-[#151515] transition hover:bg-[#f5f5f3]"><UserRound size={17} strokeWidth={1.75} />{th ? "บัญชีของฉัน" : "My account"}</Link>
            <div className="my-1 h-px bg-[#efefed]" />
            <button role="menuitem" type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] text-red-600 transition hover:bg-red-50"><Power size={17} strokeWidth={1.75} />{th ? "ออกจากระบบ" : "Log out"}</button>
        </div>}
    </div>;
}
