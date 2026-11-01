"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import "./share.css";

type SharePhoto = { id: string; url: string; downloadUrl: string; loadedAt: number };
type ApiPhoto = Omit<SharePhoto, "loadedAt"> & { createdAt: string };
type View = { eventName: string | null; expiresAt: string; photos: SharePhoto[] };

const POLL_MS = 15_000;
// Signed photo links last 10 minutes; replace them well before that so an open page never shows broken images.
const URL_REFRESH_MS = 8 * 60_000;

/** Public guest page: no login, works on any phone or computer. The link itself is the credential. */
export default function ShareGallery({ token }: { token: string }) {
  const { locale } = useI18n(); const th = locale !== "en";
  const t = (thai: string, english: string) => (th ? thai : english);
  const [view, setView] = useState<View | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const touchStart = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/studio/share/view", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (response.status === 404) { setState("unavailable"); return; }
      if (!response.ok) throw new Error();
      const body: { eventName: string | null; expiresAt: string; photos: ApiPhoto[] } = await response.json();
      const now = Date.now();
      setView(previous => {
        const known = new Map((previous?.photos ?? []).map(photo => [photo.id, photo]));
        // Keep photos that are already on screen (no flicker) unless their signed link is getting old.
        const photos = body.photos.map(photo => { const old = known.get(photo.id); return old && now - old.loadedAt < URL_REFRESH_MS ? old : { id: photo.id, url: photo.url, downloadUrl: photo.downloadUrl, loadedAt: now }; });
        return { eventName: body.eventName, expiresAt: body.expiresAt, photos };
      });
      setState("ready");
    } catch { setState(current => (current === "ready" ? current : "error")); }
  }, [token]);

  useEffect(() => {
    void load();
    // New photos appear on their own while guests are still being photographed or uploads are finishing.
    const timer = setInterval(() => { if (document.visibilityState === "visible" && stateRef.current !== "unavailable") void load(); }, POLL_MS);
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

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the address bar still has the link */ }
  }
  const expires = view ? new Date(view.expiresAt).toLocaleDateString(th ? "th-TH" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const current = openIndex === null ? null : photos[openIndex];

  return <main className="koko-share">
    <header className="koko-share-head">
      <p className="koko-share-eyebrow"><span aria-hidden="true">✱</span> KOKO MEMORY</p>
      <h1>{view?.eventName ?? t("ภาพของคุณ", "Your photos")}</h1>
      {state === "ready" && <p className="koko-share-sub">{photos.length > 0 ? t(`${photos.length} รูป · แตะรูปเพื่อดูภาพใหญ่และบันทึก`, `${photos.length} photo${photos.length === 1 ? "" : "s"} · tap a photo to view and save`) : ""}</p>}
    </header>

    {state === "loading" && <p className="koko-share-note" role="status">{t("กำลังโหลดรูปของคุณ…", "Loading your photos…")}</p>}
    {state === "unavailable" && <section className="koko-share-note" role="alert"><h2>{t("เปิดลิงก์นี้ไม่ได้", "This link cannot be opened")}</h2><p>{t("ลิงก์อาจหมดอายุหรือถูกยกเลิกโดยเจ้าของงาน กรุณาติดต่อผู้จัดงานหรือทีม KOKO Memory เพื่อขอลิงก์ใหม่", "The link may have expired or been cancelled by the host. Please ask the host or the KOKO Memory team for a new one.")}</p></section>}
    {state === "error" && <section className="koko-share-note" role="alert"><p>{t("เชื่อมต่อไม่ได้ในตอนนี้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง", "Could not connect. Check your internet and try again.")}</p><button type="button" className="koko-share-btn" onClick={() => { setState("loading"); void load(); }}>{t("ลองอีกครั้ง", "Try again")}</button></section>}
    {state === "ready" && photos.length === 0 && <section className="koko-share-note" role="status"><h2>{t("รูปกำลังเตรียมให้คุณ", "Your photos are on the way")}</h2><p>{t("รูปจะขึ้นที่นี่เองภายในไม่กี่วินาที ไม่ต้องรีเฟรชหน้า", "They will appear here in a few seconds — no need to refresh.")}</p></section>}

    {photos.length > 0 && <ul className="koko-share-grid">{photos.map((photo, index) => <li key={photo.id}>
      <button type="button" aria-label={t(`เปิดรูปที่ ${index + 1}`, `Open photo ${index + 1}`)} onClick={event => { opener.current = event.currentTarget; setOpenIndex(index); }}>
        {/* Signed short-lived storage links cannot use next/image optimisation. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={t(`รูปที่ ${index + 1}`, `Photo ${index + 1}`)} loading={index < 6 ? "eager" : "lazy"} decoding="async" />
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
        <a className="koko-share-btn" href={current.downloadUrl} download>{t("บันทึกรูปนี้", "Save this photo")}</a>
        {photos.length > 1 && <button type="button" onClick={() => step(1)} aria-label={t("รูปถัดไป", "Next photo")}>›</button>}
      </div>
      <p className="koko-share-lightbox-tip">{t("ถ้าบันทึกไม่ได้ ให้แตะค้างที่รูปแล้วเลือก “เพิ่มลงในรูปภาพ”", "If saving does not work, press and hold the photo and choose “Add to Photos”.")}</p>
    </div>}
  </main>;
}
