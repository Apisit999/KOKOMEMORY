"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, RefreshCw, Search } from "lucide-react";
import { adminApiFetch } from "@/lib/admin-api-client";

type Enquiry = { id: string; name: string; contact: string; service: string; details: string; status: "new" | "contacted" | "quoted" | "closed"; createdAt?: { _seconds?: number; seconds?: number; toDate?: () => Date } | string };
const statuses: Enquiry["status"][] = ["new", "contacted", "quoted", "closed"];
const labels: Record<Enquiry["status"], string> = { new: "ใหม่", contacted: "ติดต่อแล้ว", quoted: "เสนอราคาแล้ว", closed: "ปิดงาน" };
const services: Record<string, string> = { rental: "เช่า Photobooth", "photobooth-software": "โปรแกรม Photobooth", software: "ซอฟต์แวร์ธุรกิจ", "3d-print": "งาน 3D Print", other: "อื่น ๆ" };

export default function AdminEnquiriesPage() {
    const [items, setItems] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState("");

    async function load() {
        setLoading(true); setMessage("");
        try { const result = await adminApiFetch<{ enquiries: Enquiry[] }>("/api/admin/enquiries"); setItems(result.enquiries || []); }
        catch { setMessage("โหลดคำขอไม่สำเร็จ กรุณาลองใหม่"); }
        finally { setLoading(false); }
    }
    useEffect(() => { void load(); }, []);
    async function update(id: string, status: Enquiry["status"]) {
        setBusy(id); setMessage("");
        try { await adminApiFetch("/api/admin/enquiries", { method: "PATCH", body: JSON.stringify({ id, status }) }); setItems((old) => old.map((item) => item.id === id ? { ...item, status } : item)); }
        catch { setMessage("เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่"); }
        finally { setBusy(""); }
    }
    const visible = useMemo(() => items.filter((item) => (filter === "all" || item.status === filter) && [item.name, item.contact, item.details, services[item.service] || item.service].some((value) => value.toLowerCase().includes(search.toLowerCase()))), [items, filter, search]);
    const date = (value: Enquiry["createdAt"]) => {
        const seconds = value && typeof value === "object" ? (value.seconds ?? value._seconds) : undefined;
        const d = value && typeof value === "object" && value.toDate ? value.toDate() : seconds ? new Date(seconds * 1000) : typeof value === "string" ? new Date(value) : null;
        return d && !Number.isNaN(d.getTime()) ? d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "เวลารับคำขอ";
    };

    return <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">KOKO MEMORY · CUSTOMER CARE</p><h1 className="mt-2 text-3xl font-black text-slate-900">คำขอสอบถาม</h1><p className="mt-2 text-sm text-slate-500">คำขอจากแบบฟอร์มบนเว็บไซต์</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16}/>รีเฟรช</button></div>
        <section className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input aria-label="ค้นหาคำขอ" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ ช่องทางติดต่อ หรือรายละเอียด" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-pink-300"/></label><select aria-label="กรองตามสถานะ" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">ทุกสถานะ ({items.length})</option>{statuses.map((status) => <option key={status} value={status}>{labels[status]} ({items.filter((item) => item.status === status).length})</option>)}</select></section>
        {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
        {loading ? <p className="py-12 text-center text-sm text-slate-500">กำลังโหลดคำขอ…</p> : !visible.length ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{items.length ? "ไม่พบคำขอที่ตรงกับการค้นหา" : "ยังไม่มีคำขอสอบถาม"}</div> : <div className="mt-6 space-y-4">{visible.map((item) => { const isEmail = item.contact.includes("@"); return <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-bold text-slate-900">{item.name}</h2><span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">{labels[item.status] || item.status}</span></div><p className="mt-1 text-xs text-slate-400">{services[item.service] || item.service} · {date(item.createdAt)} · {item.id.slice(0, 8).toUpperCase()}</p></div><a href={`${isEmail ? "mailto" : "tel"}:${item.contact}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">{isEmail ? <Mail size={15}/> : <Phone size={15}/>} {isEmail ? "ตอบทางอีเมล" : "โทรหาลูกค้า"}</a></div><p className="mt-4 text-sm text-slate-600">ติดต่อ: <span className="font-semibold text-slate-800">{item.contact}</span></p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.details}</p><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><span className="mr-1 text-xs font-semibold text-slate-500">สถานะ:</span>{statuses.map((status) => <button key={status} disabled={busy === item.id || item.status === status} onClick={() => void update(item.id, status)} className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${item.status === status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-pink-50 hover:text-pink-700"}`}>{labels[status]}</button>)}</div></article>; })}</div>}
    </div>;
}
