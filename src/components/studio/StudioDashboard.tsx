"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { License, Plan } from "@/lib/studio/types";
import { useI18n } from "@/i18n";
type Data = { licenses: License[]; plans?: Plan[]; audit?: { id: string; action: string; actor: string; licenseId: string; createdAt: string }[] };
export default function StudioDashboard({ admin = false }: { admin?: boolean }) {
  const { locale } = useI18n(); const th = locale !== "en";
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
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
  return <main className="min-h-[70vh] bg-[#F8F8FB] px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-[28px] bg-[#111114] p-7 text-white sm:p-10"><p className="text-xs font-black tracking-[.2em] text-[#DFFF72]">KOKO STUDIO / {admin ? "ADMIN" : "ACCOUNT"}</p><h1 className="mt-3 text-3xl font-black">{admin ? "KOKO Studio" : th ? "KOKO Studio ของคุณ" : "Your KOKO Studio"}</h1><p className="mt-3 text-white/75">{th ? "เปิดให้เริ่มต้นด้วย Free · แพ็กเกจเสียเงิน: เร็ว ๆ นี้" : "Start with Free · Paid plans: coming soon"}</p></section>
    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">{th ? "Desktop 0.1.27 ยังไม่มีหน้าจอเชื่อมบัญชีเว็บ บัญชีนี้จะแสดงสิทธิ์หลังยืนยันการเชื่อมกับ Desktop รุ่นที่รองรับเท่านั้น Free รวมถ่ายภาพ เทมเพลต และพิมพ์ในเครื่อง ไม่รวม Cloud album ของ Desktop" : "Desktop 0.1.27 does not yet have an account-linking screen. Licenses appear here after linking with a supported Desktop release. Free includes capture, templates and local printing; Desktop cloud albums are excluded."}</p>
    {message && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-700">{message}</p>}
    {!data && !message && <p role="status">{th ? "กำลังโหลด…" : "Loading…"}</p>}
    {data && data.licenses.length === 0 && <section className="rounded-3xl border bg-white p-7"><h2 className="text-xl font-bold">{th ? "ยังไม่มีสิทธิ์ที่เชื่อมกับบัญชีนี้" : "No linked licenses yet"}</h2><p className="mt-2 text-sm text-slate-600">{th ? "เมื่อ Desktop รองรับการเชื่อมบัญชี ให้นำรหัสที่แสดงในโปรแกรมมายืนยันที่นี่" : "When Desktop supports account linking, confirm the code shown in the application here."}</p></section>}
    {data?.licenses.map(license => <section key={license.id} className="rounded-3xl border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{license.planId === "free" ? "Free · 0 THB" : license.planId}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{license.status}</span></div><p className="mt-3 break-all text-xs text-slate-500">{license.id}{admin && ` · ${license.ownerUid ?? "Unlinked"}`}</p><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">{th ? "เริ่มใช้งาน" : "Started"}</dt><dd>{new Date(license.startsAt).toLocaleString(locale)}</dd></div><div><dt className="text-slate-500">{th ? "หมดอายุ" : "Expires"}</dt><dd>{license.expiresAt ? new Date(license.expiresAt).toLocaleString(locale) : th ? "ไม่มีวันหมดอายุ" : "Lifetime"}</dd></div></dl><h3 className="mt-5 font-semibold">{th ? "อุปกรณ์" : "Devices"}</h3><ul className="mt-2 space-y-3">{Object.entries(license.devices).map(([id, device]) => <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{device.name}</b><p className="text-xs text-slate-500">{device.status} · {new Date(device.lastSeenAt).toLocaleString(locale)}</p></div>{device.status === "active" && <button disabled={busy} onClick={() => manage(license.id, "deactivate", id)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{th ? "ยกเลิกอุปกรณ์" : "Deactivate"}</button>}</li>)}</ul>{admin && license.status === "active" && <button disabled={busy} onClick={() => manage(license.id, "revoke")} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50">{th ? "เพิกถอนสิทธิ์" : "Revoke license"}</button>}</section>)}
    {admin && data?.plans && <section className="rounded-3xl bg-white p-6"><h2 className="text-xl font-bold">Plans</h2>{data.plans.map(plan => <p key={plan.id} className="mt-3">{plan.name} · v{plan.version} · {plan.features.join(", ")} · {plan.deviceLimit} devices</p>)}<p className="mt-3 text-sm text-slate-500">{th ? "ระบบซื้อยังปิดอยู่ · แสดงข้อมูลสูงสุด 50 รายการต่อหมวด" : "Purchases are disabled · Up to 50 records per section"}</p></section>}
    {admin && data?.audit && <section className="rounded-3xl bg-white p-6"><h2 className="text-xl font-bold">Audit log</h2><ul className="mt-4 space-y-3">{data.audit.map(event => <li key={event.id} className="break-all border-b pb-3 text-sm"><b>{event.action}</b><p className="text-xs text-slate-500">{event.createdAt} · {event.actor} · {event.licenseId}</p></li>)}</ul></section>}
    <div className="flex flex-wrap gap-3"><Link href="/koko-studio" className="rounded-full bg-[#D93687] px-5 py-3 font-bold text-white">{th ? "ข้อมูลโปรแกรมและติดตั้ง" : "Product & installation"}</Link>{!admin && <Link href="/account/koko-studio/link" className="rounded-full border border-slate-300 px-5 py-3 font-bold">{th ? "ยืนยันรหัสเชื่อมอุปกรณ์" : "Confirm device code"}</Link>}</div>
  </div></main>;
}
