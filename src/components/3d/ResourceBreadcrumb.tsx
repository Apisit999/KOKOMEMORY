import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ResourceBreadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
    return <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400">{items.map((item, index) => <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">{index > 0 && <ChevronRight size={14}/>} {item.href ? <Link href={item.href} className="font-semibold hover:text-[#D93687]">{item.label}</Link> : <span className="font-semibold text-slate-700">{item.label}</span>}</span>)}</nav>;
}
