"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Home, LayoutDashboard, CalendarDays, UserRound, ShieldCheck, Menu, X, LogOut } from "lucide-react";

const links = [
  { href: "/account", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/account/bookings", label: "การจองของฉัน", icon: CalendarDays },
  { href: "/account/profile", label: "โปรไฟล์", icon: UserRound },
  { href: "/account/security", label: "ความปลอดภัย", icon: ShieldCheck },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = ["/account/login", "/account/register", "/account/forgot-password"].includes(pathname);
  const [open, setOpen] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (current) => { if (!current && !publicPage) router.replace(`/account/login?redirect=${encodeURIComponent(pathname)}`); }), [pathname, publicPage, router]);
  if (publicPage) return <>{children}</>;
  return <div data-account-shell className="min-h-screen bg-[#f8f7f9] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 border-r border-slate-200/80 bg-white/95 px-5 py-6 shadow-sm backdrop-blur-xl lg:flex lg:flex-col">
      <Link href="/" className="group mb-10 flex items-center gap-3 px-3"><Image src="/logo/logo.jpg" alt="KOKO Memory" width={48} height={48} priority className="h-11 w-11 rounded-full object-cover shadow-md transition duration-200 group-hover:scale-[1.02]" /><div><p className="text-lg font-black tracking-tight">KOKO Memory</p><p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Customer Portal</p></div></Link>
      <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${active ? "bg-pink-50 text-[#e83d91]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={19} />{label}</Link>; })}</nav>
      <div className="mt-auto space-y-1 border-t border-slate-100 pt-5"><Link href="/" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-500 transition hover:bg-pink-50 hover:text-[#e83d91]"><Home size={19} />กลับเว็บไซต์</Link><button type="button" onClick={() => void signOut(auth)} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"><LogOut size={19} />ออกจากระบบ</button></div>
    </aside>
    <div className="lg:pl-72">
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl lg:hidden"><Link href="/" aria-label="KOKO Memory หน้าแรก"><Image src="/logo/logo.jpg" alt="KOKO Memory" width={38} height={38} className="h-9 w-9 rounded-full object-cover" /></Link><button type="button" aria-label="เปิดเมนูบัญชี" onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600"><Menu size={20} /></button></div>
      <main>{children}</main>
    </div>
    {open && <div className="fixed inset-0 z-[60] bg-slate-900/35 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-[min(320px,88vw)] bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-8 flex items-center justify-between"><p className="text-lg font-black">บัญชีของฉัน</p><button type="button" onClick={() => setOpen(false)} aria-label="ปิดเมนู"><X size={22} /></button></div><nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-600 hover:bg-pink-50 hover:text-[#e83d91]"><Icon size={19} />{label}</Link>)}</nav><div className="mt-6 border-t border-slate-100 pt-4"><Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-600"><Home size={19} />กลับเว็บไซต์</Link><button type="button" onClick={() => void signOut(auth)} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold text-slate-600"><LogOut size={19} />ออกจากระบบ</button></div></aside></div>}
  </div>;
}
