"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Cloud, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/i18n";
// Same source as the database plans, so the page can never show a different price from what the system will charge.
import { CLOUD_PLANS } from "@/lib/studio/migration";
import "./studio.css";

const baht = (n: number) => Math.round(n).toLocaleString("th-TH");
const GB = 1024 ** 3;
// Planning figures (docs/KOKO_STUDIO_PRICING_ANALYSIS.md): one photo about 1.5 MB, one event about 300 photos.
const PHOTO_MB = 1.5;
const EVENT_PHOTOS = 300;
const photosFor = (bytes: number) => Math.round(bytes / (PHOTO_MB * 1024 ** 2) / 100) * 100;

const WHO: Record<string, [string, string]> = {
  starter: ["เริ่มต้น มีงานไม่บ่อย", "Just starting, a few events"],
  pro: ["งานประจำทุกเดือน", "Regular monthly events"],
  studio: ["หลายบูธ งานเยอะ", "Several booths, many events"],
};

export default function PricingContent() {
  const { locale } = useI18n();
  const t = (th: string, en: string) => (locale === "en" ? en : th);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const yearly = period === "year";
  const plans = CLOUD_PLANS.filter(plan => plan.billingPeriod === period);
  const colors = ["studio-cream", "studio-lime", "studio-pink"];
  return (
    <div className="koko-studio studio-apple">
      <Navbar />
      <main className="studio-product studio-wrap pricing-page">
        <Link className="studio-text-link" href="/software/photobooth">← {t("โปรแกรม Photobooth", "Photobooth software")}</Link>
        <p className="studio-eyebrow" style={{ marginTop: 35 }}>KOKO STUDIO / CLOUD</p>
        <h1 style={{ whiteSpace: "pre-line" }}>{t("โปรแกรมใช้ฟรี\nเก็บรูปออนไลน์เมื่อพร้อม", "Free software.\nCloud when you are ready.")}</h1>
        <p className="pricing-lead">{t("ถ่ายภาพ ใช้เทมเพลต และพิมพ์ในเครื่องได้ฟรีตลอดไป เลือกแผนคลาวด์เมื่ออยากให้แขกสแกน QR แล้วโหลดรูปของตัวเองบนมือถือ", "Capture, templates and printing are free forever. Pick a cloud plan when you want guests to scan a QR code and save their own photos.")}</p>

        <ol className="pricing-steps" aria-label={t("วิธีทำงาน", "How it works")}>
          <li><QrCode size={26} /><strong>{t("1. แขกสแกน QR", "1. Guest scans QR")}</strong><span>{t("ที่หน้าจอตู้หลังถ่ายเสร็จ", "On the booth screen after the shoot")}</span></li>
          <li><Smartphone size={26} /><strong>{t("2. เปิดบนมือถือ", "2. Opens on the phone")}</strong><span>{t("เห็นเฉพาะรูปของตัวเอง ไม่ต้องสมัครสมาชิก", "Sees only their photos, no sign-up")}</span></li>
          <li><Cloud size={26} /><strong>{t("3. กดบันทึกรูป", "3. Saves the photos")}</strong><span>{t("รูปคมชัดเต็มไฟล์ ภายในเวลาที่แผนกำหนด", "Full-quality files within your plan's time")}</span></li>
        </ol>

        <aside className="pricing-pilot" role="note">
          <strong>{t("ช่วงทดลอง: ใช้ทุกฟีเจอร์ฟรี 60 วัน", "Pilot: try every feature free for 60 days")}</strong>
          <span>{t("ทดลองใช้ฟรีแบบเต็มระบบ: ที่เก็บรูปออนไลน์ 50 GB เก็บรูป 180 วัน ใช้ได้ 5 เครื่อง พร้อม QR ให้แขกโหลดรูป จำกัด 30 ผู้ใช้แรก ยังไม่เปิดชำระเงิน ราคาด้านล่างคือราคาที่วางแผนไว้หลังจบช่วงทดลอง", "Generous limits: 50 GB online storage, 180-day photo retention, 5 devices, plus QR downloads for guests. Limited to the first 30 users. Payments are not open yet; prices below are planned for after the pilot.")}</span>
          <Link className="studio-button" href="/account/koko-studio">{t("เริ่มทดลองฟรี", "Start the free trial")}<ArrowUpRight size={18} /></Link>
        </aside>

        <div className="pricing-toggle" role="group" aria-label={t("รอบบิล", "Billing period")}>
          <button type="button" aria-pressed={!yearly} onClick={() => setPeriod("month")}>{t("รายเดือน", "Monthly")}</button>
          <button type="button" aria-pressed={yearly} onClick={() => setPeriod("year")}>{t("รายปี · ได้ฟรี 2 เดือน", "Yearly · 2 months free")}</button>
        </div>

        <div className="pricing-grid">
          <article className="studio-card studio-dark pricing-card">
            <p className="pricing-who">{t("ลองใช้ ไม่มีค่าใช้จ่าย", "Try it, no cost")}</p>
            <h2>Free</h2>
            <p className="pricing-price"><b>฿0</b><span>{t("ตลอดไป", "forever")}</span></p>
            <ul>
              <li><Check size={20} /><span><strong>{t("ถ่ายภาพ + เทมเพลต", "Capture + templates")}</strong></span></li>
              <li><Check size={20} /><span><strong>{t("พิมพ์ในเครื่อง", "Local printing")}</strong></span></li>
              <li><Check size={20} /><span>{t("1 เครื่อง", "1 device")}</span></li>
              <li className="pricing-no"><span>{t("ไม่มีที่เก็บรูปออนไลน์ ไม่มี QR ให้แขก", "No cloud storage, no guest QR")}</span></li>
            </ul>
            <Link className="studio-button" href="/koko-studio">{t("ดูสถานะดาวน์โหลด", "Download status")}<ArrowUpRight size={18} /></Link>
          </article>

          {plans.map((plan, i) => {
            const key = plan.id.split("-")[0];
            const who = WHO[key] ?? ["", ""];
            const storageGb = Math.round((plan.photoStorageQuotaBytes ?? 0) / GB);
            const photos = photosFor(plan.photoStorageQuotaBytes ?? 0);
            const events = Math.round(photos / EVENT_PHOTOS);
            const monthly = plan.amountMinor / 100 / (yearly ? 12 : 1);
            return (
              <article key={plan.id} className={`studio-card ${colors[i % colors.length]} pricing-card${key === "pro" ? " pricing-popular" : ""}`}>
                {key === "pro" && <span className="pricing-badge">{t("คนเลือกมากสุด", "Most popular")}</span>}
                <p className="pricing-who">{t(who[0], who[1])}</p>
                <h2>{plan.name.split(" ")[0]}</h2>
                <p className="pricing-price"><b>฿{baht(plan.amountMinor / 100)}</b><span>{yearly ? t("/ ปี", "/ year") : t("/ เดือน", "/ month")}</span></p>
                {yearly && <p className="pricing-sub">{t(`เฉลี่ยเดือนละ ฿${baht(monthly)}`, `About ฿${baht(monthly)} per month`)}</p>}
                <ul>
                  <li><Check size={20} /><span><strong>{t(`พื้นที่ ${storageGb} GB`, `${storageGb} GB storage`)}</strong><small>{t(`ราว ${baht(photos)} รูป หรือประมาณ ${events} งาน`, `About ${baht(photos)} photos, roughly ${events} events`)}</small></span></li>
                  <li><Check size={20} /><span><strong>{t(`รูปอยู่ให้โหลด ${plan.photoRetentionDays} วัน`, `Photos stay ${plan.photoRetentionDays} days`)}</strong><small>{t("ครบกำหนดระบบลบให้อัตโนมัติ", "Then removed automatically")}</small></span></li>
                  <li><Check size={20} /><span><strong>{t("QR ให้แขกโหลดรูปของตัวเอง", "Guest QR for personal photos")}</strong><small>{t("แขกแต่ละคนเห็นเฉพาะรูปตัวเอง", "Each guest sees only theirs")}</small></span></li>
                  <li><Check size={20} /><span><strong>{t("ลิงก์รวมทั้งงาน + รหัส PIN", "Whole-event link + PIN")}</strong><small>{t("ส่งให้เจ้าภาพหรือผู้จัดงาน", "For the host or organiser")}</small></span></li>
                  <li><Check size={20} /><span><strong>{t(`ใช้ได้ ${plan.deviceLimit} เครื่อง`, `${plan.deviceLimit} device${plan.deviceLimit > 1 ? "s" : ""}`)}</strong></span></li>
                </ul>
                <Link className="studio-button" href="/enquiry?service=photobooth-software">{t("สอบถามแผนนี้", "Ask about this plan")}<ArrowUpRight size={18} /></Link>
              </article>
            );
          })}
        </div>

        <section className="pricing-faq" aria-labelledby="faq-title">
          <h2 id="faq-title">{t("คำถามที่พบบ่อย", "Common questions")}</h2>
          <details><summary>{t("แขกต้องสมัครสมาชิกไหม", "Do guests need an account?")}</summary><p>{t("ไม่ต้อง แค่สแกน QR ที่ตู้ ก็เห็นและโหลดรูปของตัวเองได้", "No. They scan the QR code at the booth and can view and save their photos.")}</p></details>
          <details><summary>{t("ถ้าพื้นที่เต็มจะเป็นอย่างไร", "What if storage is full?")}</summary><p>{t("รูปใหม่จะอัปโหลดขึ้นคลาวด์ไม่ได้จนกว่าจะลบรูปเก่าหรือเปลี่ยนเป็นแผนที่ใหญ่ขึ้น ระบบจะแจ้งเตือนในหน้าบัญชีเมื่อใช้เกิน 90%", "New photos cannot be uploaded until you delete old ones or move to a larger plan. Your account page warns you above 90%.")}</p></details>
          <details><summary>{t("รูปจะอยู่ให้โหลดนานแค่ไหน", "How long do photos stay?")}</summary><p>{t("ตามแผนที่เลือก 30, 90 หรือ 180 วัน นับจากวันถ่าย หลังครบกำหนดรูปจะถูกลบ เจ้าของงานควรบันทึกรูปที่ต้องการเก็บไว้ก่อน", "As set by your plan: 30, 90 or 180 days from the shoot. After that photos are deleted, so save the ones you want to keep.")}</p></details>
          <details><summary>{t("รูปของแขกปลอดภัยไหม", "Are guests' photos private?")}</summary><p>{t("ลิงก์แต่ละอันเดายาก ยกเลิกได้ทุกเมื่อ และตั้งรหัส PIN ป้องกันเพิ่มได้ รูปเก็บในพื้นที่ส่วนตัว ไม่เปิดสาธารณะ", "Each link is hard to guess, can be cancelled any time, and can be protected with a PIN. Photos are kept in private storage, never public.")}</p></details>
        </section>

        <div className="studio-product-note"><ShieldCheck size={18} style={{ display: "inline", marginRight: 8 }} />{t("ขณะนี้ยังไม่เปิดรับชำระเงินออนไลน์ ทีมงานจะสมัครให้หลังสอบถาม ราคาเป็นบาท ต่อเดือนหรือต่อปี รายปีเท่ากับจ่าย 10 เดือน", "Online payment is not open yet; our team sets up your plan after your enquiry. Prices are in THB; yearly equals 10 months.")}</div>
      </main>
      <Footer />
    </div>
  );
}
