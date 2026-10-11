import InstallationGuide from "@/components/studio/InstallationGuide";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDownToLine, ArrowRight, Camera, CircleCheck, CloudOff, Monitor, Printer, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { kokoStudioRelease } from "@/data/koko-studio-release";
import { kokoStudioPlans, kokoStudioFeatureLabels } from "@/data/koko-studio-policy";
import { KokoStudioDownloadStatus } from "./release-status";
import "@/components/studio/studio.css";

export const metadata: Metadata = { title: "KOKO Studio | KOKO Memory", description: "โปรแกรม Photobooth KOKO Studio รุ่น Free สำหรับถ่ายภาพ ใช้เทมเพลต และพิมพ์ในเครื่อง" };

const productFeatures = [{ Icon: Camera, feature: "capture" }, { Icon: Monitor, feature: "templates" }, { Icon: Printer, feature: "printing" }] as const;
export default function KokoStudioPage() {
  return <div className="koko-studio"><Navbar /><main className="studio-wrap studio-product !max-w-6xl">
    <Link className="studio-text-link" href="/software/photobooth">← โปรแกรม Photobooth</Link>
    <p className="studio-eyebrow" style={{marginTop:32}}>KOKO / DESKTOP PHOTOBOOTH</p>
    <div className="grid gap-10 py-8 md:grid-cols-[1.1fr_.9fr] md:items-center">
      <div><p className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-100 px-4 py-2 text-sm font-bold text-slate-900"><Sparkles size={16}/> Free สำหรับเริ่มต้น</p>
      <h1>KOKO Studio</h1><p className="!max-w-2xl">โปรแกรม Photobooth สำหรับ Windows ใช้ถ่ายภาพ เลือกเทมเพลต และพิมพ์จากเครื่องของคุณได้ในแพ็กเกจ Free</p>
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/account/koko-studio" className="studio-button">เริ่มใช้งาน Free <ArrowRight size={18}/></Link><a href="#download" className="studio-text-link">ดูสถานะดาวน์โหลด <ArrowDownToLine size={18}/></a></div></div>
      <div className="studio-free-plan rounded-[2rem] border border-black/10 bg-[#DFFF72] p-7 md:p-9"><p className="studio-eyebrow">FREE PLAN / {kokoStudioPlans.free.amountMinor} บาท</p><h2 className="mt-3 text-3xl font-black">เริ่มถ่ายและพิมพ์</h2><ul className="mt-6 space-y-3">{kokoStudioPlans.free.features.map(feature=><li key={feature} className="flex items-center gap-3"><CircleCheck size={18}/>{kokoStudioFeatureLabels[feature].th}</li>)}</ul><div className="studio-free-plan-note mt-7 border-t border-black/15 pt-5"><p className="studio-free-plan-note-title flex items-center gap-2 font-bold"><CloudOff size={18}/> ไม่มี Cloud album ของ Desktop</p><p className="studio-free-plan-note-copy mt-2 text-sm">ภาพและอัลบั้มบน Cloud ของ Desktop ไม่รวมใน Free ส่วน gallery และ booking บนเว็บไซต์ยังเป็นบริการเดิม</p></div></div>
    </div>
    <section className="grid gap-4 py-6 md:grid-cols-3">{productFeatures.map(({Icon,feature})=><article key={feature} className="studio-card studio-cream"><Icon size={24}/><h3>{kokoStudioFeatureLabels[feature].en}</h3><p>รวมในแพ็กเกจ Free สำหรับใช้งานบนเครื่องของคุณ</p></article>)}</section>
    <section id="download" className="my-10 rounded-[2rem] bg-[#111114] p-7 text-white md:p-10"><p className="studio-eyebrow">RELEASE / WINDOWS</p><h2 className="mt-3 text-3xl font-black">ดาวน์โหลดและติดตั้ง</h2><KokoStudioDownloadStatus release={kokoStudioRelease}/></section>
    <InstallationGuide />
    <p className="pb-12 text-sm text-slate-600">macOS: ยังไม่เปิดให้ดาวน์โหลด · แพ็กเกจเสียเงิน: เร็ว ๆ นี้ และยังไม่เปิดรับชำระเงิน</p>
  </main><Footer/></div>;
}
