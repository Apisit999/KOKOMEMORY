"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LEGAL_VERSION, type License, type Plan } from "@/lib/studio/types";
import { useI18n } from "@/i18n";
import ReleaseManager from "./ReleaseManager";
import "./studio-account.css";
import CloudPhotos from "./CloudPhotos";
type Data = { licenses: License[]; plans?: Plan[]; audit?: { id: string; action: string; actor: string; licenseId: string; createdAt: string }[] };
export default function StudioDashboard({ admin = false }: { admin?: boolean }) {
  const { locale } = useI18n(); const th = locale !== "en";
  const [data, setData] = useState<Data | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({}); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const endpoint = `/api/studio/${admin ? "admin" : "account"}/licenses`;
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) { setData(null); return; }
      try {
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
        if (!response.ok) throw new Error();
        const result: Data = await response.json();
        if (!cancelled) { setData(result); setMessage(""); }
      } catch { if (!cancelled) setMessage(th ? "ระบบจัดการสิทธิ์ยังไม่พร้อมให้ใช้งาน กรุณาติดต่อทีมงาน" : "License management is unavailable. Please contact our team."); }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [endpoint, th]);
  async function manage(licenseId: string, action: "revoke" | "deactivate", deviceId?: string) {
    if (!auth.currentUser || !window.confirm(th ? (action === "revoke" ? "ยืนยันเพิกถอนสิทธิ์นี้?" : "ยืนยันยกเลิกการใช้งานอุปกรณ์นี้?") : `Confirm ${action}?`)) return;
    setBusy(true);
    try {
      const headers = { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, "Content-Type": "application/json" };
      const response = await fetch(`${endpoint}/manage`, { method: "POST", headers, body: JSON.stringify({ licenseId, action, ...(deviceId ? { deviceId } : {}) }) });
      if (!response.ok) throw new Error();
      const updated = await fetch(endpoint, { headers, cache: "no-store" });
      if (!updated.ok) throw new Error();
      setData(await updated.json()); setMessage(th ? "อัปเดตแล้ว" : "Updated");
    } catch { setMessage(th ? "อัปเดตไม่สำเร็จ กรุณาลองใหม่" : "Could not update. Please retry."); }
    finally { setBusy(false); }
  }
  async function plan(licenseId: string, path: "account/pilot/start" | "admin/licenses/grant", body: Record<string, unknown> = {}) {
    if (!auth.currentUser) return; setBusy(true);
    try {
      const headers = { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, "Content-Type": "application/json" };
      const response = await fetch(`/api/studio/${path}`, { method: "POST", headers, body: JSON.stringify({ licenseId, ...body }) });
      if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e?.code ?? ""); }
      const updated = await fetch(endpoint, { headers, cache: "no-store" }); setData(await updated.json());
      setMessage(th ? "อัปเดตแผนแล้ว" : "Plan updated");
    } catch (e) { setMessage((e as Error).message === "pilot_full" ? (th ? "โควตาผู้ทดลองใช้เต็มแล้ว" : "The free pilot is full.") : (e as Error).message === "terms_required" ? (th ? "กรุณายอมรับข้อกำหนดก่อน" : "Please accept the terms first.") : th ? "ทำรายการไม่สำเร็จ" : "Could not complete the request."); }
    finally { setBusy(false); }
  }
  return <main className="studio-account min-h-[70vh] bg-[#F4F0E7] px-5 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-3xl bg-[#141516] p-7 text-[#F4F0E7] sm:p-10"><p className="text-xs font-black tracking-[.2em] text-[#D5EE85]"><span aria-hidden="true">✱ </span>KOKO STUDIO / {admin ? "ADMIN" : "ACCOUNT"}</p><h1 className="mt-3 text-3xl font-black">{admin ? "KOKO Studio" : th ? "KOKO Studio ของคุณ" : "Your KOKO Studio"}</h1><p className="mt-3 text-white/75">{th ? "ช่วงทดลอง: ใช้ได้ทุกฟีเจอร์ฟรี" : "Pilot: everything free for now"}</p></section>
    <p className="rounded-2xl border border-[#141516]/15 bg-[#EEE7D9] p-5 text-sm text-[#24251f]">{th ? "สิทธิ์จะแสดงที่นี่หลังคุณยืนยันรหัสเชื่อมอุปกรณ์จากโปรแกรม KOKO Studio Free รวมถ่ายภาพ เทมเพลต และพิมพ์ในเครื่อง ช่วงนี้เปิดให้ทดลองใช้ที่เก็บรูปออนไลน์ฟรี 60 วัน แพ็กเกจเสียเงินจะเปิดภายหลัง" : "Licenses appear here after you confirm the device code from KOKO Studio. Free includes capture, templates and local printing; online photo storage is free to try for 60 days: Paid plans open later."}</p>
    {message && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-700">{message}</p>}
    {!data && !message && <p role="status">{th ? "กำลังโหลด…" : "Loading…"}</p>}
    {data && data.licenses.length === 0 && <section className="rounded-3xl border bg-white p-7"><h2 className="text-xl font-bold">{th ? "ยังไม่มีสิทธิ์ที่เชื่อมกับบัญชีนี้" : "No linked licenses yet"}</h2><p className="mt-2 text-sm text-slate-600">{th ? "เมื่อ Desktop รองรับการเชื่อมบัญชี ให้นำรหัสที่แสดงในโปรแกรมมายืนยันที่นี่" : "When Desktop supports account linking, confirm the code shown in the application here."}</p></section>}
    {data?.licenses.map(license => <section key={license.id} className="rounded-3xl border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{license.planId === "free" ? "Free · 0 THB" : license.planId === "pilot" ? (th ? "ทดลองใช้ฟรี (ทุกฟีเจอร์)" : "Free trial (everything)") : (data?.plans?.find(p => p.id === license.planId)?.name ?? license.planId)}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{license.status}</span></div><p className="mt-3 break-all text-xs text-slate-500">{license.id}{admin && ` · ${license.ownerUid ?? "Unlinked"}`}</p><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">{th ? "เริ่มใช้งาน" : "Started"}</dt><dd>{new Date(license.startsAt).toLocaleString(locale)}</dd></div><div><dt className="text-slate-500">{th ? "หมดอายุ" : "Expires"}</dt><dd>{license.expiresAt ? new Date(license.expiresAt).toLocaleString(locale) : license.planExpiresAt ? (th ? "ดูวันสิ้นสุดแผนด้านล่าง" : "See plan end date below") : th ? "ไม่มีวันหมดอายุ" : "Lifetime"}</dd></div></dl>{license.planExpiresAt && <p className="mt-3 text-sm">{th ? "แผนนี้ใช้ได้ถึง " : "Plan active until "}{new Date(license.planExpiresAt).toLocaleDateString(locale)}{th ? " หลังจากนั้นกลับเป็น Free และรูปบนคลาวด์ยังโหลดได้อีก 14 วัน" : ", then it returns to Free. Cloud photos stay downloadable for 14 more days."}</p>}
    {!admin && license.planId === "free" && !license.pilotUsed && <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={!!accepted[license.id]} onChange={e => setAccepted(a => ({ ...a, [license.id]: e.target.checked }))} className="mt-1 h-5 w-5" /><span>{th ? "ฉันได้อ่านและยอมรับ" : "I have read and accept the "}<Link className="underline" href="/terms" target="_blank">{th ? "ข้อกำหนดการใช้บริการ" : "Terms of Service"}</Link>{th ? " และ " : " and "}<Link className="underline" href="/privacy" target="_blank">{th ? "นโยบายความเป็นส่วนตัว" : "Privacy Notice"}</Link>{th ? " รวมถึงรับทราบว่าเป็นบริการช่วงทดลอง ไม่รับประกันการเก็บรูป และฉันต้องสำรองรูปเอง และรับผิดชอบแจ้งแขกในงานเรื่องการถ่ายและเก็บรูป" : ". This is a pilot with no guarantee of photo retention, I will back up my photos, and I am responsible for informing event guests."}</span></label>}
    {!admin && license.planId === "free" && !license.pilotUsed && <button disabled={busy || !accepted[license.id]} onClick={() => plan(license.id, "account/pilot/start", { acceptTerms: LEGAL_VERSION })} className="mt-4 rounded-full bg-[#D5EE85] px-5 py-3 text-sm font-black text-[#141516] disabled:opacity-40">{th ? "ทดลองใช้ฟรีแบบเต็มที่ 60 วัน (คลาวด์ 50 GB, 5 เครื่อง)" : "Start the full free 60-day trial (50 GB cloud, 5 devices)"}</button>}
    {admin && <div className="mt-4 flex flex-wrap gap-2 text-sm">{([["pilot", "ทดลองฟรี 60 วัน", "Pilot 60 days", 60], ["starter-month", "Starter 30 วัน", "Starter 30 days", 30], ["pro-month", "Pro 30 วัน", "Pro 30 days", 30], ["studio-month", "Studio 30 วัน", "Studio 30 days", 30], ["free", "รีเซ็ตเป็น Free", "Reset to Free", 0]] as const).map(([id, thLabel, enLabel, days]) => <button key={id} disabled={busy} onClick={() => { if (window.confirm(th ? `ยืนยัน: ${thLabel}?` : `Confirm: ${enLabel}?`)) plan(license.id, "admin/licenses/grant", { planId: id, days }); }} className="rounded-lg border px-3 py-2">{th ? thLabel : enLabel}</button>)}</div>}
    <h3 className="mt-5 font-semibold">{th ? "อุปกรณ์" : "Devices"}</h3><ul className="mt-2 space-y-3">{Object.entries(license.devices).map(([id, device]) => <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{device.name}</b><p className="text-xs text-slate-500">{device.status} · {new Date(device.lastSeenAt).toLocaleString(locale)}</p></div>{device.status === "active" && <button disabled={busy} onClick={() => manage(license.id, "deactivate", id)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{th ? "ยกเลิกอุปกรณ์" : "Deactivate"}</button>}</li>)}</ul>{admin && license.status === "active" && <button disabled={busy} onClick={() => manage(license.id, "revoke")} className="mt-8 rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50">{th ? "เพิกถอนสิทธิ์" : "Revoke license"}</button>}</section>)}
    {data && <CloudPhotos admin={admin} />}
    {admin && data && <ReleaseManager />}
    {admin && data?.plans && <section className="rounded-3xl bg-white p-6"><h2 className="text-xl font-bold">Plans</h2>{data.plans.map(plan => <p key={plan.id} className="mt-3">{plan.name} · v{plan.version} · {plan.features.join(", ")} · {plan.deviceLimit} devices</p>)}<p className="mt-3 text-sm text-slate-500">{th ? "ระบบซื้อยังปิดอยู่ · แสดงข้อมูลสูงสุด 50 รายการต่อหมวด" : "Purchases are disabled · Up to 50 records per section"}</p></section>}
    {admin && data?.audit && <section className="rounded-3xl bg-white p-6"><h2 className="text-xl font-bold">Audit log</h2><ul className="mt-4 space-y-3">{data.audit.map(event => <li key={event.id} className="break-all border-b pb-3 text-sm"><b>{event.action}</b><p className="text-xs text-slate-500">{event.createdAt} · {event.actor} · {event.licenseId}</p></li>)}</ul></section>}
    <div className="flex flex-wrap gap-3"><Link href="/koko-studio" className="rounded-full bg-[#F2ADCA] px-5 py-3 font-bold text-[#141516] hover:bg-[#D5EE85]">{th ? "ข้อมูลโปรแกรมและติดตั้ง" : "Product & installation"}</Link>{!admin && <Link href="/account/koko-studio/link" className="rounded-full border border-[#141516]/30 px-5 py-3 font-bold hover:bg-[#141516] hover:text-[#F4F0E7]">{th ? "ยืนยันรหัสเชื่อมอุปกรณ์" : "Confirm device code"}</Link>}</div>
  </div></main>;
}
