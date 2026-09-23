"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, FileText, Package, ShoppingBag } from "lucide-react";

const items = [{ href: "/admin/3d-printing", label: "Dashboard", icon: BarChart3 }, { href: "/admin/3d-printing/orders", label: "Orders", icon: Package }, { href: "/admin/3d-printing/quotes", label: "Quotes", icon: FileText }, { href: "/admin/3d-printing/payments", label: "Payments", icon: CreditCard }, { href: "/admin/3d-printing/products", label: "Products", icon: ShoppingBag }];
export function Admin3DNav() { const pathname = usePathname(); return <nav aria-label="3D Printing navigation" className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{items.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href !== "/admin/3d-printing" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? "bg-[#FFE4F1] text-[#D93687]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={16}/>{label}</Link>; })}</nav>; }
