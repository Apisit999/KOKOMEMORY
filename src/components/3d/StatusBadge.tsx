import type { ReactNode } from "react";
import { useI18n } from "@/i18n";
import { getStatusMessage } from "@/i18n/messages";

export const threeDStatusLabels: Record<string, string> = {
    inquiry: "รอประเมิน", quoted: "ส่งราคาแล้ว", accepted: "ลูกค้ายอมรับแล้ว", converted: "สร้าง Order แล้ว", rejected: "ปฏิเสธ", expired: "หมดอายุ",
    pending_payment: "รอชำระเงิน", unpaid: "รอชำระเงิน", submitted: "รอตรวจสอบ", pending_verification: "รอตรวจสอบ", verified: "ยืนยันแล้ว", rejected_payment: "ไม่ผ่าน",
    paid: "ชำระเงินแล้ว", queued: "รอเข้าคิวผลิต", production: "กำลังผลิต", printing: "กำลังผลิต", quality_check: "ตรวจคุณภาพ", ready: "พร้อมส่ง", shipping: "กำลังจัดส่ง", completed: "เสร็จสิ้น", archived: "เก็บถาวร",
};

const tone: Record<string, string> = {
    inquiry: "bg-amber-50 text-amber-700", quoted: "bg-blue-50 text-blue-700", accepted: "bg-emerald-50 text-emerald-700", converted: "bg-emerald-50 text-emerald-700", rejected: "bg-red-50 text-red-700", expired: "bg-slate-100 text-slate-600",
    pending_payment: "bg-amber-50 text-amber-700", unpaid: "bg-amber-50 text-amber-700", submitted: "bg-blue-50 text-blue-700", pending_verification: "bg-blue-50 text-blue-700", verified: "bg-emerald-50 text-emerald-700", paid: "bg-emerald-50 text-emerald-700", queued: "bg-violet-50 text-violet-700", production: "bg-violet-50 text-violet-700", printing: "bg-violet-50 text-violet-700", quality_check: "bg-blue-50 text-blue-700", ready: "bg-cyan-50 text-cyan-700", shipping: "bg-cyan-50 text-cyan-700", completed: "bg-emerald-50 text-emerald-700", archived: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status, children }: { status?: string; children?: ReactNode }) {
    const { locale } = useI18n();
    const key = String(status || "");
    return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${tone[key] || "bg-slate-100 text-slate-600"}`}>{children || getStatusMessage(locale, key)}</span>;
}

export function statusLabel(status?: string) { return threeDStatusLabels[String(status || "")] || String(status || "ไม่ระบุสถานะ"); }
