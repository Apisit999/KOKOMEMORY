"use client";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";
import type { CloudEvent } from "@/lib/studio/cloud";
import { savePhotos } from "./save-photo";

type Overview = { events: CloudEvent[]; usage: { bytes: number; photos: number }; quotaBytes: number };
type PhotoView = { id: string; status: "ready" | "hidden"; size: number; createdAt: string; url: string };
type EventView = { event: CloudEvent; photos: PhotoView[]; urlExpiresInSeconds: number };

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"]; let value = bytes / 1024; let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

/** Customer: their own events and photos. Admin: every customer's events, plus hide/unhide. Same data path, different scope on the server. */
export default function CloudPhotos({ admin = false }: { admin?: boolean }) {
  const { locale } = useI18n(); const th = locale !== "en";
  const base = admin ? "admin" : "account";
  const [signedIn, setSignedIn] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [open, setOpen] = useState<EventView | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [shareLink, setShareLink] = useState<{ eventId: string; url: string; expiresAt: string } | null>(null);
  const t = (thai: string, english: string) => (th ? thai : english);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("unauthorized");
    const response = await fetch(`/api/studio/${path}`, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.code ?? "error");
    return body;
  }, []);

  const loadEvents = useCallback(async () => {
    if (admin) setEvents((await call("admin/cloud/events")).events);
    else { const next: Overview = await call("account/cloud/events"); setOverview(next); setEvents(next.events); }
  }, [admin, call]);
  const openEvent = useCallback(async (eventId: string) => { setOpen(await call(`${base}/cloud/photos?eventId=${eventId}`)); }, [base, call]);

  useEffect(() => onAuthStateChanged(auth, user => setSignedIn(Boolean(user))), []);
  useEffect(() => {
    if (!signedIn) return;
    loadEvents().catch(() => setMessage(t("โหลดรูปไม่สำเร็จ หรือบัญชีนี้ยังไม่ได้ใช้ที่เก็บรูปออนไลน์", "Could not load photos, or this account has no cloud storage yet.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, loadEvents]);

  async function setPin(eventId: string, clear: boolean) {
    if (!clear && !/^[0-9]{4,8}$/.test(pinInput)) { setMessage(t("PIN ต้องเป็นตัวเลข 4-8 หลัก", "PIN must be 4-8 digits")); return; }
    setBusy(`share-${eventId}`); setMessage("");
    try { await call("account/cloud/shares", { method: "POST", body: JSON.stringify({ action: clear ? "clearPin" : "setPin", eventId, ...(clear ? {} : { pin: pinInput }) }) }); setMessage(clear ? t("เอา PIN ออกแล้ว", "PIN removed") : t("ตั้ง PIN แล้ว แขกที่เปิดลิงก์ต้องใส่รหัสนี้", "PIN set. Visitors must enter it.")); setPinInput(""); }
    catch { setMessage(t("ตั้ง PIN ไม่สำเร็จ", "Could not update the PIN")); }
    finally { setBusy(""); }
  }
  async function share(eventId: string, action: "create" | "revoke") {
    if (action === "revoke" && !window.confirm(t("ยกเลิกลิงก์นี้? คนที่มีลิงก์เดิมจะเปิดรูปไม่ได้อีก", "Cancel this link? Anyone holding it will no longer see the photos."))) return;
    setBusy(`share-${eventId}`); setMessage("");
    try {
      const result = await call("account/cloud/shares", { method: "POST", body: JSON.stringify({ action, eventId }) });
      if (action === "create") { setShareLink({ eventId, url: result.url, expiresAt: result.expiresAt }); try { await navigator.clipboard.writeText(result.url); setMessage(t("สร้างลิงก์และคัดลอกแล้ว", "Link created and copied")); } catch { setMessage(t("สร้างลิงก์แล้ว คัดลอกจากช่องด้านล่าง", "Link created. Copy it from the box below.")); } }
      else { setShareLink(null); setMessage(t("ยกเลิกลิงก์แล้ว", "Link cancelled")); }
    } catch { setMessage(t("ทำรายการไม่สำเร็จ กรุณาลองใหม่", "Could not complete the action. Please retry.")); }
    finally { setBusy(""); }
  }

  async function manage(photo: PhotoView, action: "delete" | "hide" | "unhide") {
    if (action === "delete" && !window.confirm(t("ลบรูปนี้ถาวร? ลบแล้วกู้คืนไม่ได้", "Delete this photo permanently? This cannot be undone."))) return;
    setBusy(photo.id); setMessage("");
    try {
      await call(`${base}/cloud/photos/manage`, { method: "POST", body: JSON.stringify({ photoId: photo.id, action }) });
      if (open) await openEvent(open.event.id);
      await loadEvents();
      setMessage(action === "delete" ? t("ลบรูปแล้ว", "Photo deleted") : action === "hide" ? t("ซ่อนรูปจากลูกค้าแล้ว", "Photo hidden from the customer") : t("แสดงรูปอีกครั้งแล้ว", "Photo visible again"));
    } catch (error) {
      setMessage((error as Error).message === "storage_unavailable" ? t("ลบออกจากบัญชีแล้ว แต่ลบไฟล์ไม่สำเร็จ กดลบอีกครั้งเพื่อลองใหม่", "Removed from the account, but the file could not be deleted. Delete again to retry.") : t("ทำรายการไม่สำเร็จ กรุณาลองใหม่", "Could not complete the action. Please retry."));
    } finally { setBusy(""); }
  }

  if (!signedIn) return null;
  const percent = overview && overview.quotaBytes > 0 ? Math.min(100, Math.round((overview.usage.bytes / overview.quotaBytes) * 100)) : 0;
  return <section className="rounded-3xl border bg-white p-6" aria-labelledby="cloud-photos-title">
    <p className="text-xs font-black tracking-[.2em] text-[#5c6b1f]">KOKO CLOUD</p>
    <h2 id="cloud-photos-title" className="mt-1 text-xl font-bold">{admin ? t("รูปของลูกค้าทั้งหมด", "All customer photos") : t("รูปของฉัน", "My photos")}</h2>
    {overview && <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>{t("พื้นที่ที่ใช้", "Storage used")} {formatBytes(overview.usage.bytes)}{overview.quotaBytes > 0 && ` / ${formatBytes(overview.quotaBytes)}`}</span><span className="text-slate-500">{overview.usage.photos} {t("รูป", "photos")}</span></div>
      {overview.quotaBytes > 0 && <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("พื้นที่ที่ใช้", "Storage used")} className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#F4F0E7]"><div className={`h-full rounded-full ${percent >= 90 ? "bg-[#a0235f]" : "bg-[#D5EE85]"}`} style={{ width: `${percent}%` }} /></div>}
      {percent >= 90 && <p role="alert" className="mt-2 text-sm text-[#a0235f]">{t("พื้นที่ใกล้เต็ม รูปใหม่อาจอัปโหลดไม่ได้ ลบรูปที่ไม่ใช้หรือติดต่อทีมงานเพื่อเพิ่มพื้นที่", "Storage is almost full; new photos may fail to upload. Delete photos you do not need or contact us for more space.")}</p>}
    </div>}
    {message && <p role="status" className="mt-4 rounded-xl bg-[#F4F0E7] p-3 text-sm">{message}</p>}
    {events.length === 0 && !message && <p className="mt-4 text-sm text-slate-600">{t("ยังไม่มีรูปที่อัปโหลดจากโปรแกรม KOKO Studio เมื่อถ่ายรูปและเชื่อมบัญชีแล้ว รูปจะขึ้นที่นี่อัตโนมัติ", "No photos have been uploaded from KOKO Studio yet. Once you shoot and link your account they appear here automatically.")}</p>}
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">{events.map(event => <li key={event.id}>
      <button type="button" onClick={() => openEvent(event.id).catch(() => setMessage(t("เปิดอีเวนต์ไม่สำเร็จ", "Could not open the event")))} aria-pressed={open?.event.id === event.id} className={`w-full rounded-2xl border p-4 text-left transition hover:border-[#141516] ${open?.event.id === event.id ? "border-[#141516] bg-[#F4F0E7]" : ""}`}>
        <strong className="block">{event.name}</strong>
        <span className="mt-1 block text-sm text-slate-600">{event.date ?? event.createdAt.slice(0, 10)} · {event.photoCount} {t("รูป", "photos")} · {formatBytes(event.bytes)}</span>
        {admin && <span className="mt-1 block break-all text-xs text-slate-400">{event.ownerUid}</span>}
      </button></li>)}</ul>
    {open && <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{open.event.name}</h3><button type="button" onClick={() => openEvent(open.event.id).catch(() => undefined)} className="rounded-full border px-4 py-1.5 text-sm">{t("รีเฟรชรูป", "Refresh")}</button></div>
      {!admin && <div className="mt-3 rounded-2xl bg-[#F4F0E7] p-4">
        <p className="text-sm font-bold">{t("แชร์ทั้งอีเวนต์", "Share the whole event")}</p>
        <p className="mt-1 text-xs text-slate-600">{t("ลิงก์นี้เห็นรูปทุกคนในงาน ใช้กับเจ้าภาพหรือผู้จัดงาน ส่วนแขกแต่ละคนจะได้ลิงก์ของรอบตัวเองจากโปรแกรมที่ตู้ ซึ่งเห็นเฉพาะรูปของตัวเอง", "This link shows every photo of the event — for the host or organiser. Each guest gets a separate link for their own session from the booth and sees only their own photos.")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy === `share-${open.event.id}`} onClick={() => share(open.event.id, "create")} className="rounded-full bg-[#141516] px-4 py-2 text-sm font-bold text-[#F4F0E7] disabled:opacity-50">{t("สร้าง / คัดลอกลิงก์", "Create / copy link")}</button>
          <button type="button" disabled={busy === `share-${open.event.id}`} onClick={() => share(open.event.id, "revoke")} className="rounded-full border border-[#141516]/30 px-4 py-2 text-sm disabled:opacity-50">{t("ยกเลิกลิงก์", "Cancel link")}</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><input value={pinInput} onChange={event => setPinInput(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} inputMode="numeric" aria-label={t("PIN 4-8 หลัก", "PIN, 4-8 digits")} placeholder="PIN" className="min-h-11 w-28 rounded-xl border border-[#141516]/30 px-3 text-sm" />
          <button type="button" disabled={busy === `share-${open.event.id}`} onClick={() => setPin(open.event.id, false)} className="min-h-11 rounded-full border border-[#141516]/30 px-4 text-sm disabled:opacity-50">{t("ตั้ง PIN", "Set PIN")}</button>
          <button type="button" disabled={busy === `share-${open.event.id}`} onClick={() => setPin(open.event.id, true)} className="min-h-11 rounded-full border border-[#141516]/30 px-4 text-sm disabled:opacity-50">{t("เอา PIN ออก", "Remove PIN")}</button></div>
        {shareLink?.eventId === open.event.id && <div className="mt-3"><input readOnly aria-label={t("ลิงก์แชร์", "Share link")} value={shareLink.url} onFocus={event => event.currentTarget.select()} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /><p className="mt-1 text-xs text-slate-500">{t("ใช้ได้ถึง", "Valid until")} {new Date(shareLink.expiresAt).toLocaleDateString(th ? "th-TH" : "en-GB")}</p></div>}
      </div>}
      <p className="mt-1 text-xs text-slate-500">{t("ลิงก์รูปเปิดได้ชั่วคราวประมาณ 10 นาที กดรีเฟรชถ้ารูปไม่ขึ้น", "Photo links work for about 10 minutes; press Refresh if a photo does not load.")}</p>
      {open.photos.length === 0 && <p className="mt-3 text-sm text-slate-600">{t("อีเวนต์นี้ยังไม่มีรูปที่พร้อมแสดง", "This event has no photos to show yet.")}</p>}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{open.photos.map(photo => <li key={photo.id} className="overflow-hidden rounded-2xl border-4 border-white bg-[#F4F0E7] shadow-[0_6px_18px_#14151620]">
        <a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={t("เปิดรูปเต็ม", "Open full photo")}>
          {/* Signed short-lived storage URLs cannot go through next/image optimisation. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={t("รูปจากอีเวนต์", "Event photo")} loading="lazy" className={`aspect-[3/4] w-full object-cover ${photo.status === "hidden" ? "opacity-40" : ""}`} />
        </a>
        <div className="flex flex-wrap items-center justify-between gap-1 p-2 text-xs"><span>{formatBytes(photo.size)}{photo.status === "hidden" && ` · ${t("ซ่อนอยู่", "hidden")}`}</span>
          <span className="flex flex-wrap gap-1">
            {!admin && <button type="button" disabled={busy === photo.id} onClick={() => { void savePhotos([{ url: photo.url, downloadUrl: photo.url, name: `KOKO-${photo.id.slice(0, 6)}.jpg` }]); }} className="inline-flex min-h-11 items-center px-2 font-bold underline disabled:opacity-50">{t("บันทึก", "Save")}</button>}
            {admin && <button type="button" disabled={busy === photo.id} onClick={() => manage(photo, photo.status === "hidden" ? "unhide" : "hide")} className="inline-flex min-h-11 items-center px-2 underline disabled:opacity-50">{photo.status === "hidden" ? t("แสดง", "Show") : t("ซ่อน", "Hide")}</button>}
            <button type="button" disabled={busy === photo.id} onClick={() => manage(photo, "delete")} className="inline-flex min-h-11 items-center px-2 text-[#a0235f] underline disabled:opacity-50">{t("ลบ", "Delete")}</button>
          </span></div>
      </li>)}</ul>
    </div>}
  </section>;
}
