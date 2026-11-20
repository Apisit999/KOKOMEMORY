"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LEGAL_VERSION, type License, type Plan } from "@/lib/studio/types";
import { useI18n } from "@/i18n";
import CloudPhotos, { formatBytes } from "./CloudPhotos";
import "./studio-account.css";

type Account = { licenses: License[]; plans?: Plan[] };
type Overview = { usage: { bytes: number; photos: number }; quotaBytes: number; events: { id: string }[] };
type Release = { version: string; publishedAt?: string; fileSize?: number; notes?: string | null } | null;

const DAY = 86_400_000;

/** Customer home for KOKO Studio: plan, storage, devices, the program download, and their event photos. */
export default function CustomerStudioDashboard() {
  const { locale } = useI18n(); const th = locale !== "en";
  const t = (thai: string, english: string) => (th ? thai : english);
  const [account, setAccount] = useState<Account | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [release, setRelease] = useState<Release>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [now] = useState(() => Date.now());

  const call = useCallback(async (path: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("unauthorized");
    const response = await fetch(`/api/studio/${path}`, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.code ?? "error");
    return body;
  }, []);
  const reload = useCallback(async () => {
    const [nextAccount, nextOverview] = await Promise.all([call("account/licenses"), call("account/cloud/events").catch(() => null)]);
    setAccount(nextAccount); setOverview(nextOverview);
  }, [call]);

  useEffect(() => onAuthStateChanged(auth, user => {
    if (!user) { setAccount(null); return; }
    reload().catch(() => setMessage(t("โหลดข้อมูลบัญชีไม่สำเร็จ กรุณารีเฟรชหน้า", "Could not load your account. Please refresh.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [reload]);
  useEffect(() => { fetch("/api/studio/releases/latest").then(r => (r.ok ? r.json() : null)).then(body => setRelease(body?.release ?? null)).catch(() => undefined); }, []);

  async function deactivate(licenseId: string, deviceId: string) {
    if (!window.confirm(t("ยกเลิกการใช้งานอุปกรณ์นี้? เครื่องนั้นจะต้องเชื่อมบัญชีใหม่", "Deactivate this device? It will need to be linked again."))) return;
    setBusy(true);
    try { await call("account/licenses/manage", { method: "POST", body: JSON.stringify({ licenseId, action: "deactivate", deviceId }) }); await reload(); setMessage(t("ยกเลิกอุปกรณ์แล้ว", "Device deactivated")); }
    catch { setMessage(t("ทำรายการไม่สำเร็จ กรุณาลองใหม่", "Could not complete the action. Please retry.")); }
    finally { setBusy(false); }
  }
  async function startPilot(licenseId: string) {
    setBusy(true);
    try { await call("account/pilot/start", { method: "POST", body: JSON.stringify({ licenseId, acceptTerms: LEGAL_VERSION }) }); await reload(); setMessage(t("เริ่มทดลองใช้แล้ว", "Trial started")); }
    catch (error) { setMessage((error as Error).message === "pilot_full" ? t("โควตาผู้ทดลองใช้เต็มแล้ว", "The free trial is full.") : t("ทำรายการไม่สำเร็จ", "Could not complete the request.")); }
    finally { setBusy(false); }
  }

  const licenses = account?.licenses ?? [];
  const planOf = (license: License) => account?.plans?.find(plan => plan.id === license.planId);
  // The license that matters most: an active paid/trial plan first, then any active one.
  const main = licenses.filter(l => l.status === "active").sort((a, b) => (b.planId === "free" ? -1 : 0) - (a.planId === "free" ? -1 : 0))[0] ?? licenses[0];
  const plan = main ? planOf(main) : undefined;
  const devices = licenses.flatMap(license => Object.entries(license.devices).map(([id, device]) => ({ id, device, license })));
  const activeDevices = devices.filter(d => d.device.status === "active").length;
  const deviceLimit = main ? (plan?.deviceLimit ?? main.maxDevices) : 0;
  const until = main?.planExpiresAt ?? main?.expiresAt ?? null;
  const daysLeft = until ? Math.max(0, Math.ceil((Date.parse(until) - now) / DAY)) : null;
  const cloud = plan?.features.includes("cloud_sync") ?? false;
  const percent = overview && overview.quotaBytes > 0 ? Math.min(100, Math.round((overview.usage.bytes / overview.quotaBytes) * 100)) : 0;
  const planName = !main ? t("ยังไม่มีแพ็กเกจ", "No plan yet") : main.planId === "free" ? "Free" : main.planId === "pilot" ? t("ทดลองใช้ฟรี", "Free trial") : (plan?.name ?? main.planId);
  const price = plan && plan.amountMinor > 0 ? `${(plan.amountMinor / 100).toLocaleString(locale)} ${plan.currency === "THB" ? t("บาท", "THB") : plan.currency} / ${plan.billingPeriod === "year" ? t("ปี", "year") : plan.billingPeriod === "month" ? t("เดือน", "month") : t("ครั้งเดียว", "once")}` : t("ฟรี", "Free");
  const date = (value: string) => new Date(value).toLocaleDateString(th ? "th-TH" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const features: [boolean, string][] = [
    [true, t("ถ่ายภาพ เทมเพลต และพิมพ์ในเครื่อง", "Capture, templates and local printing")],
    [cloud, t("อัลบั้มออนไลน์ + QR ให้แขกโหลดรูป", "Online album + QR for guests")],
    [cloud && (plan?.photoStorageQuotaBytes ?? 0) > 0, t(`พื้นที่เก็บรูป ${formatBytes(plan?.photoStorageQuotaBytes ?? 0)}`, `${formatBytes(plan?.photoStorageQuotaBytes ?? 0)} photo storage`)],
    [cloud && (plan?.photoRetentionDays ?? 0) > 0, t(`เก็บรูปไว้ ${plan?.photoRetentionDays ?? 0} วัน`, `Photos kept ${plan?.photoRetentionDays ?? 0} days`)],
    [deviceLimit > 0, t(`ใช้ได้ ${deviceLimit} เครื่อง`, `${deviceLimit} device${deviceLimit === 1 ? "" : "s"}`)],
  ];

  if (!account && !message) return <main className="studio-account kd-shell"><p role="status" className="kd-wrap">{t("กำลังโหลด…", "Loading…")}</p></main>;

  return <main className="studio-account kd-shell"><div className="kd-wrap">
    <header className="kd-head">
      <p className="kd-eyebrow">KOKO STUDIO</p>
      <h1>{t("KOKO Studio ของฉัน", "My KOKO Studio")}</h1>
      <p>{t("ดูแพ็กเกจ พื้นที่เก็บรูป อุปกรณ์ และจัดการรูปของแต่ละงานได้ที่นี่", "Your plan, storage, devices and every event's photos in one place.")}</p>
    </header>

    {message && <p role="status" className="kd-note">{message}</p>}

    <section className="kd-stats" aria-label={t("สรุป", "Summary")}>
      <div><span>{t("แพ็กเกจ", "Plan")}</span><b>{planName}</b><small>{daysLeft !== null ? t(`เหลือ ${daysLeft} วัน`, `${daysLeft} days left`) : t("ไม่มีวันหมดอายุ", "No end date")}</small></div>
      <div><span>{t("พื้นที่ที่ใช้", "Storage used")}</span><b>{overview ? formatBytes(overview.usage.bytes) : "–"}</b><small>{overview && overview.quotaBytes > 0 ? t(`จาก ${formatBytes(overview.quotaBytes)} (${percent}%)`, `of ${formatBytes(overview.quotaBytes)} (${percent}%)`) : t("ไม่มีที่เก็บออนไลน์", "No cloud storage")}</small></div>
      <div><span>{t("รูปบนคลาวด์", "Cloud photos")}</span><b>{overview ? overview.usage.photos.toLocaleString(locale) : "–"}</b><small>{overview ? t(`${overview.events.length} งาน`, `${overview.events.length} events`) : ""}</small></div>
      <div><span>{t("อุปกรณ์", "Devices")}</span><b>{activeDevices}{deviceLimit > 0 ? ` / ${deviceLimit}` : ""}</b><small>{t("เครื่องที่ใช้งานอยู่", "active")}</small></div>
    </section>

    <div className="kd-grid">
      <section className="kd-card" aria-labelledby="kd-plan">
        <div className="kd-card-top"><h2 id="kd-plan">{t("แพ็กเกจของฉัน", "My plan")}</h2>{main && <span className={`kd-chip ${main.status === "active" ? "is-ok" : "is-off"}`}>{main.status === "active" ? t("ใช้งานอยู่", "Active") : main.status === "expired" ? t("หมดอายุ", "Expired") : t("ถูกยกเลิก", "Revoked")}</span>}</div>
        <p className="kd-plan-name">{planName}</p>
        <p className="kd-plan-price">{price}</p>
        {until && <><p className="kd-muted">{t("ใช้ได้ถึง", "Valid until")} {date(until)}{daysLeft !== null && daysLeft <= 7 && <b className="kd-warn"> · {t(`อีก ${daysLeft} วันหมดอายุ`, `${daysLeft} days left`)}</b>}</p>
          {main?.planExpiresAt && <p className="kd-muted">{t("หลังหมดอายุจะกลับเป็น Free และรูปบนคลาวด์ยังโหลดได้อีก 14 วัน", "After it ends you go back to Free; cloud photos stay downloadable for 14 more days.")}</p>}</>}
        <ul className="kd-features">{features.map(([on, label]) => <li key={label} className={on ? "is-on" : "is-off"}><span aria-hidden="true">{on ? "✓" : "–"}</span>{label}</li>)}</ul>
        {cloud && overview && overview.quotaBytes > 0 && <div className="kd-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("พื้นที่ที่ใช้", "Storage used")}><div style={{ width: `${percent}%` }} className={percent >= 90 ? "is-full" : ""} /></div>}
        {main && main.planId === "free" && !main.pilotUsed && <div className="kd-pilot">
          <label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> <span>{t("ฉันยอมรับ", "I accept the ")}<Link href="/terms" target="_blank">{t("ข้อกำหนดการใช้บริการ", "Terms of Service")}</Link>{t(" และ ", " and ")}<Link href="/privacy" target="_blank">{t("นโยบายความเป็นส่วนตัว", "Privacy Notice")}</Link></span></label>
          <button type="button" disabled={busy || !accepted} onClick={() => startPilot(main.id)} className="kd-btn">{t("ทดลองใช้ฟรีแบบเต็มที่ 60 วัน", "Start the free 60-day trial")}</button>
        </div>}
        <div className="kd-actions"><Link href="/account/koko-studio/billing" className="kd-btn">{main?.planId === "free" || !main ? t("เลือกแพ็กเกจ", "Choose a plan") : t("ต่ออายุ / เปลี่ยนแพ็กเกจ", "Renew / change plan")}</Link><Link href="/account/koko-studio/billing" className="kd-btn is-ghost">{t("ประวัติการชำระเงิน", "Payment history")}</Link></div>
      </section>

      <section className="kd-card" aria-labelledby="kd-download">
        <h2 id="kd-download">{t("ดาวน์โหลดโปรแกรม", "Download the program")}</h2>
        <p className="kd-plan-name">KOKO Studio {release ? `v${release.version}` : ""}</p>
        <p className="kd-muted">{release ? <>{release.publishedAt ? t(`ออกเมื่อ ${date(release.publishedAt)}`, `Released ${date(release.publishedAt)}`) : ""}{release.fileSize ? ` · ${formatBytes(release.fileSize)}` : ""}</> : t("Windows 10 / 11 (64-bit)", "Windows 10 / 11 (64-bit)")}</p>
        <p className="kd-muted">{t("ใช้กับกล้อง Canon / Nikon / Sony ผ่าน USB หรือโฟลเดอร์, มือถือ, เว็บแคม และพิมพ์ใบเสร็จ QR", "Works with Canon / Nikon / Sony over USB or folder, phones, webcams, and QR receipts.")}</p>
        {/* The download route redirects to the installer file, not a page, so a plain link (no prefetch) is right. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <div className="kd-actions">{release ? <a href="/api/studio/download?channel=stable" className="kd-btn">{t("ดาวน์โหลดสำหรับ Windows", "Download for Windows")}</a> : <span className="kd-muted">{t("ยังไม่มีไฟล์ติดตั้งให้ดาวน์โหลด", "No installer is published yet.")}</span>}<Link href="/koko-studio" className="kd-btn is-ghost">{t("วิธีติดตั้ง", "How to install")}</Link></div>
      </section>
    </div>

    <section className="kd-card" aria-labelledby="kd-devices">
      <div className="kd-card-top"><h2 id="kd-devices">{t("อุปกรณ์ที่เชื่อมกับบัญชี", "Linked devices")}</h2><Link href="/account/koko-studio/link" className="kd-btn is-ghost">{t("+ เชื่อมเครื่องใหม่", "+ Link a device")}</Link></div>
      {devices.length === 0 ? <p className="kd-muted">{t("ยังไม่มีเครื่องที่เชื่อม เปิดโปรแกรม KOKO Studio แล้วกด \"เชื่อมบัญชี\" จากนั้นนำรหัสมายืนยันที่ปุ่มด้านบน", "No devices yet. Open KOKO Studio, choose \"Link account\", then confirm the code with the button above.")}</p>
        : <ul className="kd-devices">{devices.map(({ id, device, license }) => <li key={id}><div><b>{device.name}</b><small>{device.status === "active" ? t("ใช้งานอยู่", "Active") : t("ยกเลิกแล้ว", "Deactivated")} · {t("เห็นล่าสุด", "Last seen")} {new Date(device.lastSeenAt).toLocaleString(locale)}{device.appVersion ? ` · v${device.appVersion}` : ""}</small></div>{device.status === "active" && <button type="button" disabled={busy} onClick={() => deactivate(license.id, id)} className="kd-btn is-ghost">{t("ยกเลิกเครื่องนี้", "Deactivate")}</button>}</li>)}</ul>}
    </section>

    <CloudPhotos onChanged={() => { void reload().catch(() => undefined); }} />
  </div></main>;
}
