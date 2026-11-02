"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/i18n";
// Same source as the database plans, so the page can never show a different price from what the system will charge.
import { CLOUD_PLANS } from "@/lib/studio/migration";
import "./studio.css";

const baht = (minor: number) => (minor / 100).toLocaleString("th-TH");
const gb = (bytes: number) => Math.round(bytes / 1024 ** 3);

export default function PricingContent() {
  const { locale } = useI18n();
  const t = (th: string, en: string) => (locale === "en" ? en : th);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const plans = CLOUD_PLANS.filter(plan => plan.billingPeriod === period);
  const yearly = period === "year";
  const colors = ["studio-cream", "studio-lime", "studio-pink"];
  return <div className="koko-studio"><Navbar /><main className="studio-product studio-wrap">
    <Link className="studio-text-link" href="/software/photobooth">← {t("โปรแกรม Photobooth", "Photobooth software")}</Link>
    <p className="studio-eyebrow" style={{ marginTop: 35 }}>KOKO STUDIO / CLOUD</p>
    <h1 style={{ whiteSpace: "pre-line" }}>{t("โปรแกรมใช้ฟรี\nเก็บรูปออนไลน์เมื่อพร้อม", "Free software.\nCloud when you are ready.")}</h1>
    <p>{t("ถ่ายภาพ ใช้เทมเพลต และพิมพ์ในเครื่องได้ฟรีไม่มีวันหมดอายุ เลือกแผนคลาวด์เมื่ออยากให้แขกสแกน QR แล้วดาวน์โหลดรูปของตัวเองบนมือถือ", "Capture, templates and local printing are free forever. Choose a cloud plan when you want guests to scan a QR code and download their own photos.")}</p>
    <div className="pricing-toggle" role="group" aria-label={t("รอบบิล", "Billing period")}>
      <button type="button" aria-pressed={!yearly} onClick={() => setPeriod("month")}>{t("รายเดือน", "Monthly")}</button>
      <button type="button" aria-pressed={yearly} onClick={() => setPeriod("year")}>{t("รายปี · จ่าย 10 เดือน", "Yearly · pay 10 months")}</button>
    </div>
    <div className="pricing-grid">
      <article className="studio-card studio-dark pricing-card">
        <p className="studio-eyebrow">FREE</p><h3>Free</h3>
        <p className="pricing-price">฿0 <span>{t("ตลอดไป", "forever")}</span></p>
        <ul><li><Check size={16} />{t("ถ่ายภาพและเทมเพลต", "Capture and templates")}</li><li><Check size={16} />{t("พิมพ์ในเครื่อง", "Local printing")}</li><li><Check size={16} />{t("1 เครื่อง", "1 device")}</li></ul>
        <Link className="studio-button" href="/koko-studio">{t("ดูสถานะดาวน์โหลด", "Download status")}<ArrowUpRight size={18} /></Link>
      </article>
      {plans.map((plan, i) => <article key={plan.id} className={`studio-card ${colors[i % colors.length]} pricing-card`}>
        <p className="studio-eyebrow">{plan.id.split("-")[0].toUpperCase()}</p><h3>{plan.name.split(" ")[0]}</h3>
        <p className="pricing-price">฿{baht(plan.amountMinor)} <span>{yearly ? t("/ ปี", "/ year") : t("/ เดือน", "/ month")}</span></p>
        <ul>
          <li><Check size={16} />{t(`เก็บรูปออนไลน์ ${gb(plan.photoStorageQuotaBytes ?? 0)} GB`, `${gb(plan.photoStorageQuotaBytes ?? 0)} GB cloud storage`)}</li>
          <li><Check size={16} />{t(`เก็บรูปไว้ ${plan.photoRetentionDays} วัน`, `Photos kept ${plan.photoRetentionDays} days`)}</li>
          <li><Check size={16} />{t("QR ให้แขกดาวน์โหลดรูปของตัวเอง", "Guest QR for personal downloads")}</li>
          <li><Check size={16} />{t("ลิงก์แชร์ทั้งงาน + PIN", "Whole-event link with PIN")}</li>
          <li><Check size={16} />{t(`${plan.deviceLimit} เครื่อง`, `${plan.deviceLimit} device${plan.deviceLimit > 1 ? "s" : ""}`)}</li>
        </ul>
        <Link className="studio-button" href="/enquiry?service=photobooth-software">{t("สอบถามเพื่อสมัคร", "Ask to subscribe")}<ArrowUpRight size={18} /></Link>
      </article>)}
    </div>
    <div className="studio-product-note">{t("ขณะนี้ยังไม่เปิดรับชำระเงินออนไลน์ ทีมงานจะสมัครให้หลังสอบถาม ราคาเป็นบาทต่อเครื่อง รายปีเท่ากับจ่าย 10 เดือน", "Online payment is not open yet; our team will set up your plan after your enquiry. Prices are in THB; the yearly plan equals 10 months.")}</div>
  </main><Footer /></div>;
}
