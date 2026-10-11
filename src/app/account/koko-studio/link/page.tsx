"use client";
import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
export default function DeviceLinkPage() {
  const [code, setCode] = useState(""); const [device, setDevice] = useState<{ deviceName: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [approved, setApproved] = useState(false);
  async function submit(action: "inspect" | "approve") {
    if (!auth.currentUser) { setMessage("กรุณาเข้าสู่ระบบก่อน"); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/studio/account/link", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }, body: JSON.stringify({ action, userCode: code.trim() }) });
      const result = await response.json();
      if (!response.ok) { setDevice(null); throw new Error(["code_expired", "code_used", "invalid_code"].includes(result.code) ? "รหัสไม่ถูกต้อง หมดอายุ หรือใช้แล้ว กรุณาขอรหัสใหม่จาก Desktop" : "ระบบเชื่อมอุปกรณ์ยังไม่พร้อม กรุณาติดต่อทีมงาน"); }
      if (action === "inspect") setDevice(result);
      else { setApproved(true); setDevice(null); setMessage("ยืนยันแล้ว กลับไปที่ Desktop เพื่อรับสิทธิ์ให้เสร็จภายในเวลาที่กำหนด"); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อได้"); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl px-4 py-10"><h1 className="text-3xl font-black">เชื่อมอุปกรณ์ KOKO Studio</h1><p className="mt-4 text-sm leading-7 text-slate-600">ใส่รหัสจากโปรแกรมบนอุปกรณ์ของคุณ ตรวจชื่ออุปกรณ์ แล้วจึงยืนยัน ปัจจุบัน Desktop 0.1.27 ยังไม่มีหน้าจอสำหรับขั้นตอนนี้</p><form className="mt-7 space-y-4" onSubmit={event => { event.preventDefault(); void submit("inspect"); }}><label htmlFor="device-code" className="block font-semibold">รหัสเชื่อมอุปกรณ์</label><input id="device-code" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setDevice(null); setApproved(false); }} required minLength={10} maxLength={11} autoComplete="off" spellCheck={false} placeholder="ABCDE-12345" className="w-full rounded-xl border p-4 font-mono uppercase tracking-widest"/><button disabled={busy || approved} className="rounded-full bg-[#D93687] px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? "กำลังตรวจ…" : "ตรวจรหัส"}</button></form>{device && <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">{device.deviceName}</h2><p className="mt-2 text-sm">รหัสหมดอายุ: {new Date(device.expiresAt).toLocaleString("th")}</p><p className="mt-3 text-sm">ยืนยันเฉพาะอุปกรณ์ที่คุณกำลังใช้งานอยู่เท่านั้น</p><button disabled={busy} onClick={() => void submit("approve")} className="mt-4 rounded-full bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-50">ยืนยันเชื่อมกับบัญชีของฉัน</button></section>}{message && <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm">{message}</p>}<Link href="/account/koko-studio" className="mt-7 inline-block text-sm underline">กลับไป KOKO Studio ของคุณ</Link></main>;
}
