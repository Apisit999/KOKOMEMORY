"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { androidChromeIntent, canUseShareSheet, inAppBrowserName, savePhotos, type SaveResult } from "./save-photo";
import "./share.css";

type SharePhoto = { id: string; url: string; thumbUrl: string; downloadUrl: string; loadedAt: number };
type ApiPhoto = Omit<SharePhoto, "loadedAt" | "thumbUrl"> & { thumbUrl?: string; createdAt: string };
type View = { eventName: string | null; guestMessage: string | null; expiresAt: string; expectedCount: number | null; photos: SharePhoto[] };

const POLL_MS = 15_000;
// Signed photo links last 10 minutes; replace them well before that so an open page never shows broken images.
const URL_REFRESH_MS = 8 * 60_000;

/** Public guest page: no login, works on any phone or computer. The link itself is the credential. */
/** Opened by a QR token, or by an event page where the guest types the short code printed under the QR. */
export default function ShareGallery({ token, eventId }: { token?: string; eventId?: string }) {
  const { locale } = useI18n(); const th = locale !== "en";
  const t = (thai: string, english: string) => (th ? thai : english);
  const [view, setView] = useState<View | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error" | "pin" | "locked" | "code">("loading");
  const [pin, setPin] = useState(""); const [pinWrong, setPinWrong] = useState(false);
  const pinRef = useRef("");
  const [code, setCode] = useState(""); const [codeWrong, setCodeWrong] = useState(false);
  const codeRef = useRef("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<SaveResult | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [chromeIntent, setChromeIntent] = useState<string | null>(null);
  const [noShare, setNoShare] = useState(false);
  useEffect(() => { setAppName(inAppBrowserName(navigator.userAgent)); setChromeIntent(androidChromeIntent(navigator.userAgent, window.location.href)); setNoShare(!canUseShareSheet()); }, []);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const touchStart = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    try {
      if (!token && !codeRef.current) { setState("code"); return; }
      const source = token ? { path: "view", body: { token } } : { path: "code", body: { eventId, code: codeRef.current } };
      const response = await fetch(`/api/studio/share/${source.path}`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...source.body, ...(pinRef.current ? { pin: pinRef.current } : {}) }) });
      // A wrong short code asks again; a code that worked and later stops (revoked, expired) shows the normal message.
      if (response.status === 404) { if (!token && stateRef.current !== "ready") { codeRef.current = ""; setCodeWrong(true); setState("code"); return; } setState("unavailable"); return; }
      if (response.status === 401 || response.status === 429) {
        const code = (await response.json().catch(() => ({}))).code;
        if (response.status === 429 || code === "pin_locked") { pinRef.current = ""; setState("locked"); return; }
        if (code === "pin_invalid") setPinWrong(true);
        pinRef.current = ""; setState("pin"); return;
      }
      if (!response.ok) throw new Error();
      const body: { eventName: string | null; guestMessage?: string | null; expiresAt: string; expectedCount?: number | null; photos: ApiPhoto[] } = await response.json();
      const now = Date.now();
      setView(previous => {
        const known = new Map((previous?.photos ?? []).map(photo => [photo.id, photo]));
        // Keep photos that are already on screen (no flicker) unless their signed link is getting old.
        const photos = body.photos.map(photo => { const old = known.get(photo.id); return old && now - old.loadedAt < URL_REFRESH_MS ? old : { id: photo.id, url: photo.url, thumbUrl: photo.thumbUrl ?? photo.url, downloadUrl: photo.downloadUrl, loadedAt: now }; });
        return { eventName: body.eventName, guestMessage: body.guestMessage ?? null, expiresAt: body.expiresAt, expectedCount: body.expectedCount ?? null, photos };
      });
      setState("ready");
    } catch { setState(current => (current === "ready" ? current : "error")); }
  }, [token, eventId]);

  useEffect(() => {
    void load();
    // New photos appear on their own while guests are still being photographed or uploads are finishing.
    const timer = setInterval(() => { if (document.visibilityState === "visible" && stateRef.current === "ready") void load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const photos = view?.photos ?? [];
  const close = useCallback(() => { setOpenIndex(null); opener.current?.focus(); }, []);
  const step = useCallback((delta: number) => setOpenIndex(index => (index === null || photos.length === 0 ? index : (index + delta + photos.length) % photos.length)), [photos.length]);
  useEffect(() => {
    if (openIndex === null) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); else if (event.key === "ArrowRight") step(1); else if (event.key === "ArrowLeft") step(-1); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [openIndex, close, step]);

  async function loadOwnFile(photoId: string) {
    // The same-site file route needs the QR token; with a short code the signed links are used instead.
    if (!token) throw new Error("no token");
    const response = await fetch("/api/studio/share/photo", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, photoId, ...(pinRef.current ? { pin: pinRef.current } : {}) }) });
    if (!response.ok) throw new Error("photo unavailable");
    return response.blob();
  }
  async function save(list: SharePhoto[]) {
    if (saving || list.length === 0) return;
    setSaving(true); setSaveNote(null);
    const result = await savePhotos(list.map(photo => ({ url: photo.url, downloadUrl: photo.downloadUrl, load: () => loadOwnFile(photo.id), name: `KOKO-${String(photos.indexOf(photo) + 1).padStart(2, "0")}.jpg` })));
    setSaving(false); setSaveNote(result);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the address bar still has the link */ }
  }
  const expires = view ? new Date(view.expiresAt).toLocaleDateString(th ? "th-TH" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const current = openIndex === null ? null : photos[openIndex];

  return <main className="koko-share">
    <header className="koko-share-head">
      <p className="koko-share-eyebrow"><span aria-hidden="true">✱</span> KOKO MEMORY</p>
      <h1>{view?.eventName ?? t("ภาพของคุณ", "Your photos")}</h1>
      {view?.guestMessage && <p className="koko-share-message">{view.guestMessage}</p>}
      {state === "ready" && <p className="koko-share-sub">{photos.length > 0 ? t(`${photos.length} รูป · แตะรูปเพื่อดูภาพใหญ่และบันทึก`, `${photos.length} photo${photos.length === 1 ? "" : "s"} · tap a photo to view and save`) : ""}</p>}
    </header>

    {state === "loading" && <p className="koko-share-note" role="status">{t("กำลังโหลดรูปของคุณ…", "Loading your photos…")}</p>}
    {state === "code" && <section className="koko-share-note" role="group" aria-labelledby="code-title"><h2 id="code-title">{t("ใส่รหัส 8 ตัวใต้ QR บนใบเสร็จ", "Enter the 8-character code under the QR on your receipt")}</h2>
      <form onSubmit={event => { event.preventDefault(); if (code.length !== 8) return; codeRef.current = code; setCodeWrong(false); setState("loading"); void load(); }} style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, "").slice(0, 8))} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label={t("รหัส", "Code")} placeholder="ABCD2345" aria-invalid={codeWrong} className="koko-share-pin" />
        <button type="submit" className="koko-share-btn">{t("ดูรูป", "View photos")}</button>
      </form>
      {codeWrong && <p role="alert" style={{ marginTop: 10, color: "#d98aae" }}>{t("ไม่พบรหัสนี้ ตรวจตัวอักษรบนใบเสร็จแล้วลองอีกครั้ง", "Code not found. Check the receipt and try again.")}</p>}</section>}
    {state === "pin" && <section className="koko-share-note" role="group" aria-labelledby="pin-title"><h2 id="pin-title">{t("ใส่รหัส PIN เพื่อดูรูป", "Enter the PIN to see the photos")}</h2><p>{t("เจ้าของงานตั้งรหัสไว้ ขอรหัสได้จากผู้จัดงาน", "The host protected this gallery. Ask them for the PIN.")}</p>
      <form onSubmit={event => { event.preventDefault(); if (pin.length < 4) return; pinRef.current = pin; setPinWrong(false); setState("loading"); void load(); }} style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input value={pin} onChange={event => setPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" aria-label="PIN" placeholder="PIN" aria-invalid={pinWrong} className="koko-share-pin" />
        <button type="submit" className="koko-share-btn">{t("ดูรูป", "View photos")}</button>
      </form>
      {pinWrong && <p role="alert" style={{ marginTop: 10, color: "#d98aae" }}>{t("รหัสไม่ถูกต้อง ลองอีกครั้ง", "Wrong PIN. Try again.")}</p>}</section>}
    {state === "locked" && <section className="koko-share-note" role="alert"><h2>{t("ลองผิดหลายครั้งเกินไป", "Too many wrong attempts")}</h2><p>{t("กรุณารอประมาณ 15 นาทีแล้วลองใหม่ หรือสอบถามผู้จัดงาน", "Please wait about 15 minutes and try again, or ask the host.")}</p></section>}
    {state === "unavailable" && <section className="koko-share-note" role="alert"><h2>{t("เปิดลิงก์นี้ไม่ได้", "This link cannot be opened")}</h2><p>{t("ลิงก์อาจหมดอายุหรือถูกยกเลิกโดยเจ้าของงาน กรุณาติดต่อผู้จัดงานหรือทีม KOKO Memory เพื่อขอลิงก์ใหม่", "The link may have expired or been cancelled by the host. Please ask the host or the KOKO Memory team for a new one.")}</p></section>}
    {state === "error" && <section className="koko-share-note" role="alert"><p>{t("เชื่อมต่อไม่ได้ในตอนนี้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง", "Could not connect. Check your internet and try again.")}</p><button type="button" className="koko-share-btn" onClick={() => { setState("loading"); void load(); }}>{t("ลองอีกครั้ง", "Try again")}</button></section>}
    {state === "ready" && photos.length === 0 && <section className="koko-share-note" role="status"><h2>{t("รูปกำลังเตรียมให้คุณ", "Your photos are on the way")}</h2><p>{t("รูปจะขึ้นที่นี่เองภายในไม่กี่วินาที ไม่ต้องรีเฟรชหน้า", "They will appear here in a few seconds — no need to refresh.")}</p></section>}

    {state === "ready" && view?.expectedCount != null && photos.length > 0 && photos.length < view.expectedCount && <p className="koko-share-sub" role="status">{t(`กำลังอัปโหลด ${photos.length}/${view.expectedCount} รูป · รูปที่เหลือจะขึ้นเองไม่ต้องรีเฟรช`, `Uploading ${photos.length}/${view.expectedCount} · the rest will appear on their own`)}</p>}
    {appName && state === "ready" && <p className="koko-share-warn" role="note">{t(`คุณเปิดลิงก์ใน ${appName} ซึ่งอาจบันทึกรูปไม่ได้ แตะ ⋯ หรือ “เปิดในเบราว์เซอร์” (Safari / Chrome) เพื่อบันทึกรูป`, `You opened this in ${appName}, which may block saving. Tap ⋯ or “Open in browser” (Safari / Chrome) to save your photos.`)}</p>}
    {appName && chromeIntent && state === "ready" && <div className="koko-share-actions"><a className="koko-share-btn" href={chromeIntent}>{t("เปิดใน Chrome เพื่อบันทึกรูป", "Open in Chrome to save")}</a></div>}
    {photos.length > 1 && <div className="koko-share-actions"><button type="button" className="koko-share-btn" disabled={saving} onClick={() => void save(photos)}>{saving ? t("กำลังเตรียมรูป…", "Preparing…") : t(`บันทึกทั้งหมด (${photos.length} รูป)`, `Save all (${photos.length})`)}</button></div>}
    {saveNote === "manual" && <p className="koko-share-warn" role="status">{t("เครื่องนี้บันทึกพร้อมกันหลายรูปไม่ได้ กรุณาแตะรูปที่ต้องการ แล้วแตะค้างที่รูป เลือก “เพิ่มลงในรูปภาพ” / “บันทึกรูปภาพ” (หรือกดปุ่ม “บันทึกรูปนี้” ทีละรูป)", "This phone cannot save many photos at once. Tap a photo, then press and hold it and choose “Add to Photos” / “Save image” (or use “Save this photo” one at a time).")}</p>}
    {saveNote === "downloaded" && openIndex === null && <p className="koko-share-sub" role="status">{t("ส่งคำสั่งดาวน์โหลดแล้ว ถ้าไม่พบไฟล์ในเครื่อง ให้แตะค้างที่รูปแล้วเลือกบันทึกรูปภาพ", "Download started. If you cannot find the file, press and hold a photo and choose Save image.")}</p>}
    {photos.length > 0 && <ul className="koko-share-grid">{photos.map((photo, index) => <li key={photo.id}>
      <button type="button" aria-label={t(`เปิดรูปที่ ${index + 1}`, `Open photo ${index + 1}`)} onClick={event => { opener.current = event.currentTarget; setOpenIndex(index); }}>
        {/* Signed short-lived storage links cannot use next/image optimisation. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.thumbUrl} alt={t(`รูปที่ ${index + 1}`, `Photo ${index + 1}`)} loading={index < 6 ? "eager" : "lazy"} decoding="async" />
      </button></li>)}</ul>}

    {state === "ready" && <footer className="koko-share-foot">
      <button type="button" className="koko-share-btn secondary" onClick={copyLink}>{copied ? t("คัดลอกแล้ว ✓", "Copied ✓") : t("คัดลอกลิงก์นี้", "Copy this link")}</button>
      <p>{t(`ลิงก์นี้ใช้ได้ถึง ${expires} · อย่าส่งต่อถ้าไม่อยากให้คนอื่นเห็นรูป`, `This link works until ${expires}. Do not share it if you want to keep the photos private.`)}</p>
    </footer>}

    {current && <div className="koko-share-lightbox" role="dialog" aria-modal="true" aria-label={t("ดูรูป", "Photo viewer")}
      onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; const end = event.changedTouches[0]?.clientX; if (start !== null && end !== undefined && Math.abs(end - start) > 60) step(end < start ? 1 : -1); }}>
      <div className="koko-share-lightbox-top"><span>{(openIndex ?? 0) + 1} / {photos.length}</span><button ref={closeButton} type="button" onClick={close} aria-label={t("ปิด", "Close")}>✕</button></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.url} alt={t(`รูปที่ ${(openIndex ?? 0) + 1}`, `Photo ${(openIndex ?? 0) + 1}`)} />
      <div className="koko-share-lightbox-bar">
        {photos.length > 1 && <button type="button" onClick={() => step(-1)} aria-label={t("รูปก่อนหน้า", "Previous photo")}>‹</button>}
        <button type="button" className="koko-share-btn" disabled={saving} onClick={() => void save([current])}>{saving ? t("กำลังเตรียมรูป…", "Preparing…") : t("บันทึกรูปนี้", "Save this photo")}</button>
        {photos.length > 1 && <button type="button" onClick={() => step(1)} aria-label={t("รูปถัดไป", "Next photo")}>›</button>}
      </div>
      {saveNote === "downloaded" && <p className="koko-share-lightbox-tip" role="status">{t("ส่งคำสั่งดาวน์โหลดแล้ว ถ้าไม่พบไฟล์ ให้แตะค้างที่รูปแล้วเลือกบันทึกรูปภาพ", "Download started. If it does not appear, press and hold the photo and choose Save image.")}</p>}
      <p className={`koko-share-lightbox-tip${noShare ? " strong" : ""}`}>{t("ถ้าบันทึกไม่ได้ ให้แตะค้างที่รูปแล้วเลือก “เพิ่มลงในรูปภาพ”", "If saving does not work, press and hold the photo and choose “Add to Photos”.")}</p>
    </div>}
  </main>;
}
