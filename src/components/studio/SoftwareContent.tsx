"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/i18n";
import "./studio.css";

export default function SoftwareContent({ photobooth = false }: { photobooth?: boolean }) {
  const { locale } = useI18n();
  const t = (th: string, en: string) => locale === "en" ? en : th;
  const topics = photobooth ? [
    ["อุปกรณ์ที่คุณมี", "Your equipment", "เตรียมรุ่นกล้อง เครื่องพิมพ์ ระบบปฏิบัติการ และรูปแบบบูธ เพื่อให้ทีมประเมินความเข้ากันได้ก่อนตัดสินใจ", "Share your camera, printer, operating system and booth setup so our team can assess compatibility."],
    ["รูปแบบการใช้งาน", "Your workflow", "แจ้งว่าต้องการถ่ายภาพ พิมพ์ภาพ ออกแบบกรอบ หรือเชื่อมแกลเลอรีแบบใด เพื่อสอบถามความสามารถที่รองรับจริง", "Describe capture, printing, frame design and gallery needs to confirm supported features."],
    ["สิทธิ์ใช้งานและการดูแล", "Licensing & support", "สอบถามจำนวนเครื่อง ระยะเวลาใช้งาน การอัปเดต และขอบเขตบริการช่วยเหลือก่อนซื้อ", "Confirm device limits, licence duration, updates and support terms before purchase."],
    ["ขอรายละเอียดและการสาธิต", "Details & demo enquiry", "พูดคุยกับทีมเรื่องรุ่นโปรแกรม ราคา และความพร้อมในการสาธิต โดยระบุอุปกรณ์และงานที่ต้องการใช้", "Ask about software versions, pricing and demo availability with your equipment and use case."],
  ] : [
    ["โปรแกรม Photobooth", "Photobooth software", "สำหรับผู้ประกอบการบูธที่ต้องการสอบถามโปรแกรมและการใช้งานร่วมกับอุปกรณ์ของตนเอง", "For booth operators seeking software and equipment compatibility information."],
    ["ซอฟต์แวร์สำหรับธุรกิจ", "Business software", "แจ้งปัญหาที่ต้องการแก้ ขั้นตอนงาน จำนวนผู้ใช้งาน และระบบเดิม เพื่อสอบถามผลิตภัณฑ์และขอบเขตบริการ", "Share the problem, workflow, number of users and existing systems to discuss products and service scope."],
  ];
  return <div className="koko-studio"><Navbar /><main className="studio-product studio-wrap">
    <Link className="studio-text-link" href="/services">← {t("บริการทั้งหมด", "All services")}</Link>
    <p className="studio-eyebrow" style={{ marginTop: 35 }}>KOKO / {photobooth ? "PHOTOBOOTH SOFTWARE" : "SOFTWARE SOLUTIONS"}</p>
    <h1 style={{ whiteSpace: "pre-line" }}>{photobooth ? t("โปรแกรมสำหรับ\nบูธของคุณ", "Software for your booth.") : t("เครื่องมือสำหรับ\nไอเดียของคุณ", "Tools for your ideas.")}</h1>
    <p>{photobooth ? t("มีบูธและอุปกรณ์อยู่แล้ว? เริ่มจากรายละเอียดเครื่องและสิ่งที่อยากให้โปรแกรมทำ ทีมจะช่วยให้ข้อมูลก่อนตัดสินใจซื้อ", "Already have a booth? Start with your equipment and desired workflow. Our team will help you assess the software before purchase.") : t("พื้นที่สำหรับสอบถามซอฟต์แวร์และโปรแกรม Photobooth เลือกหัวข้อที่สนใจ แล้วคุยรายละเอียดกับทีม KOKO", "Explore software and photobooth enquiries. Choose a topic and discuss the details with KOKO.")}</p>
    <div className="studio-grid">{topics.map(([th,en,detail,english], i) => <article key={en} className={`studio-card ${i % 2 ? "studio-cream" : "studio-lime"}`}><p className="studio-eyebrow">0{i+1} / SOFTWARE</p><h3>{t(th,en)}</h3><p>{t(detail,english)}</p><small>{t("สอบถามรายละเอียดกับทีม", "Discuss with our team")}</small><Link href={!photobooth && i === 0 ? "/software/photobooth" : "/contact"}>{!photobooth && i === 0 ? t("ดูโปรแกรม Photobooth", "Explore photobooth software") : t("สอบถามรายละเอียด", "Enquire now")}<ArrowUpRight size={18} /></Link></article>)}</div>
    <div className="studio-product-note">{t("ขณะนี้รับสอบถามผ่านทีมงาน รายการสินค้า ราคา คุณสมบัติที่รองรับ และเงื่อนไขไลเซนส์ต้องยืนยันก่อนสั่งซื้อ ระบบชำระเงิน ดาวน์โหลด และเปิดใช้งานไลเซนส์อัตโนมัติยังไม่เปิดให้บริการ", "Enquiries are handled by our team. Products, pricing, supported features and licence terms must be confirmed before purchase. Automated payments, downloads and licence activation are not available yet.")}</div>
    <div className="studio-actions"><Link className="studio-button" href={`/enquiry?service=${photobooth ? "photobooth-software" : "software"}`}>{t("คุยกับทีมเรื่องซอฟต์แวร์", "Talk to our software team")}<ArrowUpRight size={18} /></Link>{photobooth && <Link className="studio-text-link" href="/photobooth">{t("ต้องการเช่าบูธพร้อมบริการ?", "Looking for booth rental?")}<ArrowUpRight size={18} /></Link>}</div>
  </main><Footer /></div>;
}
