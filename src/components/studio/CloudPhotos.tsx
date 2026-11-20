"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";
import type { CloudEvent } from "@/lib/studio/cloud";
import { savePhotos } from "./save-photo";

type Overview = { events: CloudEvent[]; usage: { bytes: number; photos: number }; quotaBytes: number };
type PhotoView = { id: string; status: "ready" | "hidden"; size: number; createdAt: string; url: string; thumbUrl?: string };
type EventView = { event: CloudEvent; photos: PhotoView[]; urlExpiresInSeconds: number };

const LIVE_MS = 8000;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"]; let value = bytes / 1024; let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

/** Customer: their own events and photos (live updates, bulk delete, guest page text, sharing). Admin: every customer's events, plus hide/unhide. */
export default function CloudPhotos({ admin = false, onChanged }: { admin?: boolean; onChanged?: () => void }) {
  const { locale } = useI18n(); const th = locale !== "en";
  const base = admin ? "admin" : "account";
  const [signedIn, setSignedIn] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [open, setOpen] = useState<EventView | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [shareLink, setShareLink] = useState<{ eventId: string; url: string; expiresAt: string } | null>(null);
  const [live, setLive] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [guestTitle, setGuestTitle] = useState(""); const [guestMessage, setGuestMessage] = useState("");
  const [tab, setTab] = useState<"photos" | "share" | "customize">("photos");
  const openId = useRef<string | null>(null);
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
  const openEvent = useCallback(async (eventId: string, keepTab = false) => {
    const view: EventView = await call(`${base}/cloud/photos?eventId=${eventId}`);
    if (openId.current !== eventId) {
      setSelected(new Set()); setShareLink(null); setPinInput("");
      setGuestTitle(view.event.guestTitle ?? ""); setGuestMessage(view.event.guestMessage ?? "");
      if (!keepTab) setTab("photos");
    }
    openId.current = eventId;
    // Keep tiles that are already on screen so a live refresh does not flicker.
    setOpen(previous => {
      if (!previous || previous.event.id !== eventId) return view;
      const known = new Map(previous.photos.map(photo => [photo.id, photo]));
      return { ...view, photos: view.photos.map(photo => known.get(photo.id) ?? photo) };
    });
    setSelected(current => new Set([...current].filter(id => view.photos.some(photo => photo.id === id))));
  }, [base, call]);

  useEffect(() => onAuthStateChanged(auth, user => setSignedIn(Boolean(user))), []);
  useEffect(() => {
    if (!signedIn) return;
    loadEvents().catch(() => setMessage(t("โหลดรูปไม่สำเร็จ หรือบัญชีนี้ยังไม่ได้ใช้ที่เก็บรูปออนไลน์", "Could not load photos, or this account has no cloud storage yet.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, loadEvents]);
  // Live: new photos from the booth appear on their own while the event is open and the tab is visible.
  useEffect(() => {
    if (!open || !live) return;
    const id = open.event.id;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || busy) return;
      void openEvent(id, true).catch(() => undefined);
      void loadEvents().catch(() => undefined);
    }, LIVE_MS);
    return () => window.clearInterval(timer);
  }, [open, live, busy, openEvent, loadEvents]);

  async function afterChange(note: string) {
    if (open) await openEvent(open.event.id, true);
    await loadEvents(); onChanged?.(); setMessage(note);
  }
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
  async function saveGuestPage(eventId: string) {
    setBusy(`custom-${eventId}`); setMessage("");
    try { await call("account/cloud/events/update", { method: "POST", body: JSON.stringify({ eventId, guestTitle, guestMessage }) }); await afterChange(t("บันทึกหน้ารูปของแขกแล้ว แขกจะเห็นตอนเปิดลิงก์ครั้งถัดไป", "Guest page saved. Guests see it the next time they open the link.")); }
    catch (error) { setMessage((error as Error).message === "text_too_long" ? t("ข้อความยาวเกินไป", "Text is too long") : t("บันทึกไม่สำเร็จ กรุณาลองใหม่", "Could not save. Please retry.")); }
    finally { setBusy(""); }
  }
  async function manage(photo: PhotoView, action: "delete" | "hide" | "unhide") {
    if (action === "delete" && !window.confirm(t("ลบรูปนี้ถาวร? ลบแล้วกู้คืนไม่ได้", "Delete this photo permanently? This cannot be undone."))) return;
    setBusy(photo.id); setMessage("");
    try {
      await call(`${base}/cloud/photos/manage`, { method: "POST", body: JSON.stringify({ photoId: photo.id, action }) });
      await afterChange(action === "delete" ? t("ลบรูปแล้ว", "Photo deleted") : action === "hide" ? t("ซ่อนรูปจากลูกค้าแล้ว", "Photo hidden from the customer") : t("แสดงรูปอีกครั้งแล้ว", "Photo visible again"));
    } catch (error) {
      setMessage((error as Error).message === "storage_unavailable" ? t("ลบออกจากบัญชีแล้ว แต่ลบไฟล์ไม่สำเร็จ กดลบอีกครั้งเพื่อลองใหม่", "Removed from the account, but the file could not be deleted. Delete again to retry.") : t("ทำรายการไม่สำเร็จ กรุณาลองใหม่", "Could not complete the action. Please retry."));
    } finally { setBusy(""); }
  }
  async function deleteMany(eventId: string, ids: string[] | "all") {
    const count = ids === "all" ? open?.photos.length ?? 0 : ids.length;
    if (count === 0) return;
    const question = ids === "all" ? t(`ลบรูปทั้งหมด ${count} รูปของงานนี้ถาวร? ลบแล้วกู้คืนไม่ได้ และแขกจะเปิดรูปเหล่านี้ไม่ได้อีก`, `Delete all ${count} photos of this event permanently? This cannot be undone and guests lose access.`) : t(`ลบ ${count} รูปที่เลือกถาวร? ลบแล้วกู้คืนไม่ได้`, `Delete the ${count} selected photos permanently? This cannot be undone.`);
    if (!window.confirm(question)) return;
    setBusy(`bulk-${eventId}`); setMessage("");
    try {
      const result: { deleted: number; failed: string[] } = await call("account/cloud/photos/delete-many", { method: "POST", body: JSON.stringify(ids === "all" ? { eventId } : { photoIds: ids }) });
      setSelected(new Set());
      await afterChange(result.failed.length ? t(`ลบแล้ว ${result.deleted} รูป ลบไม่สำเร็จ ${result.failed.length} รูป กดลบอีกครั้งเพื่อลองใหม่`, `${result.deleted} deleted, ${result.failed.length} failed. Delete again to retry.`) : t(`ลบแล้ว ${result.deleted} รูป`, `${result.deleted} photo(s) deleted`));
    } catch { setMessage(t("ลบไม่สำเร็จ กรุณาลองใหม่", "Could not delete. Please retry.")); }
    finally { setBusy(""); }
  }
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  if (!signedIn) return null;
  const percent = overview && overview.quotaBytes > 0 ? Math.min(100, Math.round((overview.usage.bytes / overview.quotaBytes) * 100)) : 0;
  const allSelected = open ? open.photos.length > 0 && open.photos.every(photo => selected.has(photo.id)) : false;
  return <section className="kd-card" aria-labelledby="cloud-photos-title">
    <div className="kd-card-top"><h2 id="cloud-photos-title">{admin ? t("รูปของลูกค้าทั้งหมด", "All customer photos") : t("รูปของแต่ละงาน", "Photos by event")}</h2>{!admin && overview && <span className="kd-muted">{t("พื้นที่ที่ใช้", "Storage used")} {formatBytes(overview.usage.bytes)}{overview.quotaBytes > 0 && ` / ${formatBytes(overview.quotaBytes)}`}</span>}</div>
    {percent >= 90 && <p role="alert" className="kd-warn">{t("พื้นที่ใกล้เต็ม รูปใหม่อาจอัปโหลดไม่ได้ ลบรูปที่ไม่ใช้ หรืออัปเกรดแพ็กเกจ", "Storage is almost full; new photos may fail to upload. Delete photos you do not need or upgrade your plan.")}</p>}
    {message && <p role="status" className="kd-note">{message}</p>}
    {events.length === 0 && !message && <p className="kd-muted">{t("ยังไม่มีรูปที่อัปโหลดจากโปรแกรม KOKO Studio เมื่อถ่ายรูปและเชื่อมบัญชีแล้ว รูปจะขึ้นที่นี่อัตโนมัติ", "No photos have been uploaded from KOKO Studio yet. Once you shoot and link your account they appear here automatically.")}</p>}
    <ul className="kd-events">{events.map(event => <li key={event.id}>
      <button type="button" onClick={() => openEvent(event.id).catch(() => setMessage(t("เปิดงานไม่สำเร็จ", "Could not open the event")))} aria-pressed={open?.event.id === event.id} className={open?.event.id === event.id ? "is-open" : ""}>
        <strong>{event.guestTitle || event.name}</strong>
        <span>{event.date ?? event.createdAt.slice(0, 10)} · {event.photoCount} {t("รูป", "photos")} · {formatBytes(event.bytes)}</span>
        {admin && <span className="kd-muted">{event.ownerUid}</span>}
      </button></li>)}</ul>

    {open && <div className="kd-event">
      <div className="kd-card-top"><h3>{open.event.guestTitle || open.event.name}</h3>
        <label className="kd-live"><input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)} /> {t("อัปเดตรูปอัตโนมัติ", "Live updates")}{live && <i aria-hidden="true" />}</label></div>
      {!admin && <div className="kd-tabs" role="tablist">
        {([["photos", t(`รูป (${open.photos.length})`, `Photos (${open.photos.length})`)], ["share", t("แชร์ลิงก์", "Share")], ["customize", t("ปรับแต่งหน้าของแขก", "Guest page")]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-on" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </div>}

      {(admin || tab === "photos") && <>
        {!admin && open.photos.length > 0 && <div className="kd-toolbar">
          <label><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(open.photos.map(photo => photo.id)))} /> {t("เลือกทั้งหมด", "Select all")}</label>
          <span className="kd-muted">{selected.size > 0 ? t(`เลือกแล้ว ${selected.size} รูป`, `${selected.size} selected`) : t("แตะช่องที่มุมรูปเพื่อเลือก", "Tick a photo to select it")}</span>
          <button type="button" className="kd-btn is-danger" disabled={selected.size === 0 || busy !== ""} onClick={() => deleteMany(open.event.id, [...selected])}>{t("ลบที่เลือก", "Delete selected")}</button>
          <button type="button" className="kd-btn is-ghost" disabled={busy !== ""} onClick={() => deleteMany(open.event.id, "all")}>{t("ลบทั้งงาน", "Delete all")}</button>
        </div>}
        {open.photos.length === 0 && <p className="kd-muted">{t("งานนี้ยังไม่มีรูปที่พร้อมแสดง", "This event has no photos to show yet.")}</p>}
        <ul className="kd-photos">{open.photos.map(photo => <li key={photo.id} className={selected.has(photo.id) ? "is-selected" : ""}>
          {!admin && <label className="kd-pick"><input type="checkbox" checked={selected.has(photo.id)} onChange={() => toggle(photo.id)} aria-label={t("เลือกรูปนี้", "Select this photo")} /></label>}
          <a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={t("เปิดรูปเต็ม", "Open full photo")}>
            {/* Signed short-lived storage URLs cannot go through next/image optimisation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.thumbUrl ?? photo.url} alt={t("รูปจากงาน", "Event photo")} loading="lazy" className={photo.status === "hidden" ? "is-hidden" : ""} />
          </a>
          <div className="kd-photo-bar"><span>{new Date(photo.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} · {formatBytes(photo.size)}{photo.status === "hidden" && ` · ${t("ซ่อนอยู่", "hidden")}`}</span>
            <span>
              {!admin && <button type="button" disabled={busy === photo.id} onClick={() => { void savePhotos([{ url: photo.url, downloadUrl: photo.url, name: `KOKO-${photo.id.slice(0, 6)}.jpg` }]); }}>{t("บันทึก", "Save")}</button>}
              {admin && <button type="button" disabled={busy === photo.id} onClick={() => manage(photo, photo.status === "hidden" ? "unhide" : "hide")}>{photo.status === "hidden" ? t("แสดง", "Show") : t("ซ่อน", "Hide")}</button>}
              <button type="button" disabled={busy === photo.id} onClick={() => manage(photo, "delete")} className="is-danger">{t("ลบ", "Delete")}</button>
            </span></div>
        </li>)}</ul>
        <p className="kd-muted">{t("ลิงก์รูปเปิดได้ชั่วคราวประมาณ 10 นาที ระบบรีเฟรชให้เองเมื่อเปิดอัปเดตอัตโนมัติ", "Photo links last about 10 minutes; live updates refresh them for you.")}</p>
      </>}

      {!admin && tab === "share" && <div className="kd-panel">
        <p><b>{t("แชร์ทั้งงาน", "Share the whole event")}</b></p>
        <p className="kd-muted">{t("ลิงก์นี้เห็นรูปทุกคนในงาน ใช้กับเจ้าภาพหรือผู้จัดงาน ส่วนแขกแต่ละคนจะได้ลิงก์ของรอบตัวเองจาก QR ที่ตู้ ซึ่งเห็นเฉพาะรูปของตัวเอง", "This link shows every photo of the event, for the host or organiser. Each guest gets their own session link from the booth QR and sees only their own photos.")}</p>
        <div className="kd-actions">
          <button type="button" className="kd-btn" disabled={busy === `share-${open.event.id}`} onClick={() => share(open.event.id, "create")}>{t("สร้าง / คัดลอกลิงก์", "Create / copy link")}</button>
          <button type="button" className="kd-btn is-ghost" disabled={busy === `share-${open.event.id}`} onClick={() => share(open.event.id, "revoke")}>{t("ยกเลิกลิงก์", "Cancel link")}</button>
        </div>
        {shareLink?.eventId === open.event.id && <div><input readOnly aria-label={t("ลิงก์แชร์", "Share link")} value={shareLink.url} onFocus={event => event.currentTarget.select()} className="kd-input" /><p className="kd-muted">{t("ใช้ได้ถึง", "Valid until")} {new Date(shareLink.expiresAt).toLocaleDateString(th ? "th-TH" : "en-GB")}</p></div>}
        <p><b>{t("รหัส PIN", "PIN")}</b></p>
        <p className="kd-muted">{t("ตั้ง PIN แล้วคนที่เปิดลิงก์ทั้งงานต้องใส่รหัสก่อนดูรูป", "With a PIN, people opening the event link must enter it first.")}</p>
        <div className="kd-actions"><input value={pinInput} onChange={event => setPinInput(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} inputMode="numeric" aria-label={t("PIN 4-8 หลัก", "PIN, 4-8 digits")} placeholder="PIN" className="kd-input is-short" />
          <button type="button" className="kd-btn is-ghost" disabled={busy === `share-${open.event.id}`} onClick={() => setPin(open.event.id, false)}>{t("ตั้ง PIN", "Set PIN")}</button>
          <button type="button" className="kd-btn is-ghost" disabled={busy === `share-${open.event.id}`} onClick={() => setPin(open.event.id, true)}>{t("เอา PIN ออก", "Remove PIN")}</button></div>
      </div>}

      {!admin && tab === "customize" && <div className="kd-panel">
        <label className="kd-field">{t("ชื่องานที่แขกเห็น", "Title guests see")}<input value={guestTitle} maxLength={80} onChange={event => setGuestTitle(event.target.value)} placeholder={open.event.name} className="kd-input" /><small>{t(`เว้นว่างเพื่อใช้ชื่อจากโปรแกรม (${open.event.name}) · ${guestTitle.length}/80`, `Leave empty to use the program's name (${open.event.name}) · ${guestTitle.length}/80`)}</small></label>
        <label className="kd-field">{t("ข้อความถึงแขก", "Message to guests")}<textarea value={guestMessage} maxLength={280} rows={3} onChange={event => setGuestMessage(event.target.value)} placeholder={t("เช่น ขอบคุณที่มาร่วมงานแต่งของเรา ❤", "e.g. Thank you for celebrating with us ❤")} className="kd-input" /><small>{guestMessage.length}/280</small></label>
        <div className="kd-preview" aria-label={t("ตัวอย่างหน้าของแขก", "Guest page preview")}><p className="kd-eyebrow">✱ KOKO MEMORY</p><p className="kd-preview-title">{guestTitle || open.event.name}</p>{guestMessage && <p className="kd-preview-msg">{guestMessage}</p>}</div>
        <div className="kd-actions"><button type="button" className="kd-btn" disabled={busy === `custom-${open.event.id}`} onClick={() => saveGuestPage(open.event.id)}>{t("บันทึก", "Save")}</button></div>
      </div>}
    </div>}
  </section>;
}
