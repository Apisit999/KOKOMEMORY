"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Eye, FileBox, Loader2, Send, Trash2 } from "lucide-react";
import { adminApiFetch } from "@/lib/admin-api-client";
import { Admin3DNav } from "@/components/3d/Admin3DNav";
import { ResourceBreadcrumb } from "@/components/3d/ResourceBreadcrumb";
import { StatusBadge } from "@/components/3d/StatusBadge";
import ModelViewer from "./ModelViewer";

type FileItem = { id: string; fileName: string; contentType: string; size: number; kind: string; uploadedAt?: unknown; availability?: string };
type Quote = { id: string; quoteNumber: string; userId: string; status: string; material: string; color: string; quantity: number; deadline?: string; customerNote?: string; adminNote?: string; validUntil?: string; subtotal?: number; shippingFee?: number; discount?: number; total?: number; createdAt?: unknown; updatedAt?: unknown; customer?: { displayName?: string | null; email?: string | null; phoneNumber?: string | null }; files: FileItem[] };

function date(value: unknown) { if (!value) return "—"; if (typeof value === "string") return new Date(value).toLocaleString("th-TH"); if (typeof value === "object" && value && "toDate" in value) return (value as { toDate: () => Date }).toDate().toLocaleString("th-TH"); return "—"; }
function money(value?: number) { return `฿${Number(value || 0).toLocaleString("th-TH")}`; }

export default function AdminQuoteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState("");

    const load = async () => {
        try { const data = await adminApiFetch<{ quote: Quote }>(`/api/admin/3d-printing/quotes/${id}`); setQuote(data.quote); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูลได้"); }
    };
    useEffect(() => { void load(); }, [id]);

    const modelFiles = useMemo(() => quote?.files.filter((file) => file.kind === "model" && /\.(stl|3mf)$/i.test(file.fileName)) || [], [quote]);
    const activeModel = modelFiles.find((file) => file.id === selectedId) || modelFiles[0] || null;
    const referenceOnly = modelFiles.length === 0 && Boolean(quote?.files.some((file) => file.kind === "reference" && /\.(jpe?g|png|webp)$/i.test(file.fileName)));

    const download = async (file: FileItem) => {
        const { auth } = await import("@/lib/firebase"); const user = auth.currentUser; if (!user) return;
        const response = await fetch(`/api/admin/3d-printing/quotes/${id}/files/${file.id}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        if (!response.ok) { setError("ไม่พบไฟล์ใน private storage"); return; }
        const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.fileName; anchor.click(); URL.revokeObjectURL(url);
    };
    const sendQuote = async () => {
        if (!quote) return; const total = window.prompt("ยอดรวมใบเสนอราคา", String(quote.total || "")); if (total === null || !Number.isFinite(Number(total))) return;
        setBusy(true); try { await adminApiFetch(`/api/admin/3d-printing/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ status: "quoted", subtotal: Number(total), shippingFee: 0, discount: 0, total: Number(total) }) }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "ส่งใบเสนอราคาไม่สำเร็จ"); } finally { setBusy(false); }
    };
    const remove = async () => {
        if (deleteText !== "DELETE") return; setBusy(true);
        try { await adminApiFetch(`/api/admin/3d-printing/quotes/${id}`, { method: "DELETE" }); router.push("/admin/3d-printing/quotes"); } catch (cause) { setError(cause instanceof Error ? cause.message : "ลบ Quote ไม่สำเร็จ"); setDeleteOpen(false); } finally { setBusy(false); }
    };

    if (error && !quote) return <main className="p-8"><div className="mx-auto max-w-4xl rounded-2xl bg-red-50 p-6 text-red-700">{error}</div></main>;
    if (!quote) return <main className="p-8 text-slate-500">กำลังโหลดรายละเอียด...</main>;
    const canDelete = ["inquiry", "rejected", "expired"].includes(quote.status);

    return <main className="min-h-screen bg-[#f7f7fa] px-4 py-7 sm:px-8"><div className="mx-auto max-w-6xl"><Admin3DNav /><ResourceBreadcrumb items={[{ label: "3D Printing", href: "/admin/3d-printing" }, { label: "Quotes", href: "/admin/3d-printing/quotes" }, { label: quote.quoteNumber }]} />
        <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/admin/3d-printing/quotes" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-pink-500"><ArrowLeft size={17}/>กลับรายการ Quote</Link><div className="flex flex-wrap gap-2">{quote.status === "inquiry" && <button disabled={busy} onClick={() => void sendQuote()} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Send size={16}/>ส่งใบเสนอราคา</button>}{canDelete && <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600"><Trash2 size={16}/>ลบ Quote</button>}</div></div>
        <header className="mt-5 rounded-[28px] bg-[#0B0B0F] p-7 text-white shadow-xl sm:p-9"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.24em] text-pink-400">KOKO 3D QUOTE</p><h1 className="mt-2 text-3xl font-black">{quote.quoteNumber}</h1><p className="mt-2 text-sm text-slate-400">สร้าง {date(quote.createdAt)} · อัปเดต {date(quote.updatedAt)}</p></div><span className="rounded-full bg-pink-500/15 px-4 py-2 text-sm font-bold text-pink-200">{quote.status}</span></div></header>
        <div className="mt-3 flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">สถานะ</span><StatusBadge status={quote.status} /></div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.12fr_.88fr]"><div className="space-y-5">
            <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">ข้อมูลลูกค้า</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="User ID" value={quote.userId}/><Info label="ชื่อที่มีในระบบ" value={quote.customer?.displayName || "—"}/><Info label="อีเมล" value={quote.customer?.email || "—"}/><Info label="โทรศัพท์" value={quote.customer?.phoneNumber || "—"}/></div></section>
            <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">รายละเอียดการผลิต</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><Info label="วัสดุ" value={quote.material}/><Info label="สี" value={quote.color}/><Info label="จำนวน" value={`${quote.quantity} ชิ้น`}/></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="กำหนดส่งที่ต้องการ" value={quote.deadline || "—"}/><Info label="ใช้ได้ถึง" value={quote.validUntil || "—"}/></div>{quote.customerNote && <Note label="Customer note" value={quote.customerNote}/>}</section>
            <section className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-black">ไฟล์แนบ ({quote.files.length})</h2><span className="text-xs text-slate-400">Private storage</span></div><div className="mt-5 space-y-3">{quote.files.length ? quote.files.map((file) => <div key={file.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-4"><FileBox className="text-pink-500" size={22}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{file.fileName}</p><p className="text-xs text-slate-400">{file.kind} · {(file.size / 1024 / 1024).toFixed(2)} MB · {file.availability === "stored" ? "พร้อมใช้งาน" : "metadata ไม่ครบ"}</p></div>{file.kind === "model" && /\.(stl|3mf)$/i.test(file.fileName) && <button onClick={() => setSelectedId(file.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600"><Eye size={14}/>ดู 3D</button>}<button onClick={() => void download(file)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold text-slate-600"><Download size={14}/>ดาวน์โหลด</button></div>) : <p className="text-sm text-slate-500">ยังไม่มีไฟล์</p>}</div></section>
            <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">3D Viewer</h2>{modelFiles.length > 1 && <label className="flex items-center gap-2 text-sm font-bold text-slate-600">โมเดล:<select value={activeModel?.id || ""} onChange={(event) => setSelectedId(event.target.value)} className="max-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{modelFiles.map((file) => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>}</div>{referenceOnly && <p className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">มีไฟล์อ้างอิง แต่ยังไม่มีโมเดล 3D</p>}<ModelViewer quoteId={id} file={activeModel}/></section>
        </div><aside className="space-y-5"><section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">สรุปราคา</h2><div className="mt-5 space-y-3 text-sm"><Price label="Subtotal" value={quote.subtotal}/><Price label="Shipping fee" value={quote.shippingFee}/><Price label="Discount" value={quote.discount}/><div className="flex justify-between border-t pt-4 text-xl font-black"><span>Total</span><span className="text-pink-500">{money(quote.total)}</span></div></div></section><section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">Admin note</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{quote.adminNote || "ยังไม่มีบันทึก"}</p></section></aside></div>
    </div>{deleteOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black">ลบคำขอใบเสนอราคา?</h2><div className="mt-4 space-y-2 text-sm text-slate-600"><p>Quote: <b>{quote.quoteNumber}</b></p><p>ลูกค้า: {quote.customer?.displayName || quote.userId}</p><p>ไฟล์: {quote.files.length} ไฟล์ · สถานะ: {quote.status}</p><p className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">การลบจะลบไฟล์ที่ลูกค้าส่งจาก private storage ด้วย</p></div><input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="พิมพ์ DELETE" className="mt-5 w-full rounded-xl border px-4 py-3 font-mono"/><div className="mt-5 flex justify-end gap-3"><button onClick={() => { setDeleteOpen(false); setDeleteText(""); }} className="rounded-xl border px-4 py-3 text-sm font-bold">ยกเลิก</button><button disabled={deleteText !== "DELETE" || busy} onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{busy && <Loader2 className="animate-spin" size={16}/>}ลบคำขอ</button></div></div></div>}</main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-700">{value}</p></div>; }
function Note({ label, value }: { label: string; value: string }) { return <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{value}</p></div>; }
function Price({ label, value }: { label: string; value?: number }) { return <div className="flex justify-between text-slate-600"><span>{label}</span><span>{money(value)}</span></div>; }
