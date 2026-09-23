"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getThreeDPayment, rejectThreeDPayment, verifyThreeDPayment } from "@/services/threeDPayments";
import { Admin3DNav } from "@/components/3d/Admin3DNav";
import { ResourceBreadcrumb } from "@/components/3d/ResourceBreadcrumb";
import { StatusBadge } from "@/components/3d/StatusBadge";

const money = (value: number) => `฿${value.toLocaleString("th-TH")}`;

export default function ThreeDPaymentDetail({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState("");
    const [data, setData] = useState<Awaited<ReturnType<typeof getThreeDPayment>> | null>(null);
    const [proofUrl, setProofUrl] = useState("");
    const [reason, setReason] = useState("");
    const [rejecting, setRejecting] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        void params.then(({ id: value }) => {
            if (!active) return;
            setId(value);
            getThreeDPayment(value).then((result) => { if (active) setData(result); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูลได้"); });
        });
        return () => { active = false; };
    }, [params]);

    useEffect(() => {
        let url = "";
        if (!id || !data?.payment.proof) return;
        void (async () => {
            const user = auth.currentUser;
            if (!user) return;
            const response = await fetch(`/api/admin/3d-printing/payments/${encodeURIComponent(id)}/proof`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
            if (!response.ok) return;
            url = URL.createObjectURL(await response.blob());
            setProofUrl(url);
        })();
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [id, data?.payment.proof]);

    async function verify() {
        setBusy(true); setError("");
        try { await verifyThreeDPayment(id); setData(await getThreeDPayment(id)); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "ยืนยันการชำระเงินไม่สำเร็จ"); }
        finally { setBusy(false); }
    }

    async function reject() {
        if (!reason.trim()) { setError("กรุณาระบุเหตุผลที่ปฏิเสธ"); return; }
        setBusy(true); setError("");
        try { await rejectThreeDPayment(id, reason); setData(await getThreeDPayment(id)); setRejecting(false); setReason(""); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "ปฏิเสธการชำระเงินไม่สำเร็จ"); }
        finally { setBusy(false); }
    }

    if (!data) return <main className="min-h-screen bg-[#f7f7fa] p-8 text-slate-600">{error || "กำลังโหลดข้อมูล..."}</main>;
    const { payment, order } = data;

    return <main className="min-h-screen bg-[#f7f7fa] px-4 py-7 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl space-y-6"><Admin3DNav /><ResourceBreadcrumb items={[{ label: "3D Printing", href: "/admin/3d-printing" }, { label: "Payments", href: "/admin/3d-printing/payments" }, { label: `Payment #${payment.id}` }]} /><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/3d-printing/payments" className="text-sm font-bold text-slate-500 hover:text-pink-600">← กลับ Payments</Link><Link href={`/admin/3d-printing/orders/${encodeURIComponent(payment.orderId)}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-pink-200 hover:text-pink-600">ดู Order →</Link></div><header className="rounded-[28px] bg-[#0B0B0F] p-7 text-white shadow-xl sm:p-9"><p className="text-xs font-black uppercase tracking-[.24em] text-pink-400">KOKO 3D PAYMENT</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">รายละเอียดการชำระเงิน</h1><p className="mt-2 break-all text-sm text-slate-400">#{payment.id}</p></div><StatusBadge status={payment.status} /></div></header>{error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง</p>}<section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2"><Info label="Order" value={order.orderNumber || payment.orderNumber || payment.orderId}/><Info label="ยอดชำระ" value={money(payment.amount)}/><Info label="Customer" value={payment.userId || "—"}/><Info label="สถานะ Order" value={order.orderStatus || "—"}/></section><section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">หลักฐานการชำระเงิน</h2>{payment.proof ? <div className="mt-4 space-y-4"><p className="text-sm text-slate-500">{payment.proof.fileName} · {(payment.proof.size / 1024 / 1024).toFixed(2)} MB</p>{proofUrl && payment.proof.contentType.startsWith("image/") && <img src={proofUrl} alt="Payment proof" className="max-h-[520px] rounded-xl border border-slate-200 object-contain"/>}{proofUrl && <a href={proofUrl} download={payment.proof.fileName} className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">ดาวน์โหลด</a>}</div> : <p className="mt-3 text-sm text-slate-500">ไม่มีหลักฐาน</p>}</section>{payment.status === "submitted" && <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void verify()} className="rounded-xl bg-[#FF4FA3] px-5 py-3 font-bold text-white disabled:opacity-50">ยืนยันการชำระเงิน</button><button disabled={busy} onClick={() => setRejecting(true)} className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-600 disabled:opacity-50">ปฏิเสธ</button></div>}{payment.status === "rejected" && payment.rejectReason && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">เหตุผล: {payment.rejectReason}</p>}{rejecting && <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="font-black">เหตุผลที่ปฏิเสธ</h2><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={500} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-pink-400" placeholder="เช่น ยอดเงินไม่ตรง หรือหลักฐานไม่ชัดเจน"/><div className="mt-4 flex gap-3"><button onClick={() => setRejecting(false)} className="rounded-xl border border-slate-200 px-4 py-2 font-bold">ยกเลิก</button><button disabled={busy} onClick={() => void reject()} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">ยืนยันการปฏิเสธ</button></div></section>}</div></main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-all text-sm font-semibold text-slate-700">{value}</p></div>; }
