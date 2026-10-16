"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Box, Camera, Code2, Monitor } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/i18n";
import "./studio.css";

const choices = [
  { id:"rental", title:["เช่า Photobooth", "Photobooth rental"], summary:["อยากมีบูธและทีมงานในวันงาน", "Need a booth and an attendant at your event"], detail:["เลือกวัน เวลา และแพ็กเกจที่เหมาะกับงาน", "Choose a date, duration and package"], href:"/photobooth", action:["ดูแพ็กเกจเช่าบูธ", "Explore rental packages"], Icon:Camera, color:"pink", prep:["วันและสถานที่จัดงาน", "รูปแบบภาพพิมพ์ที่ชอบ"] },
  { id:"photobooth-software", title:["โปรแกรม Photobooth", "Photobooth software"], summary:["มีอุปกรณ์บูธแล้วและกำลังหาโปรแกรม", "Already have a booth and need software"], detail:["สอบถามการรองรับอุปกรณ์และขอข้อมูลก่อนซื้อ", "Check equipment compatibility and ask before purchase"], href:"/software/photobooth", action:["ดูรายละเอียดโปรแกรม", "Explore the software"], Icon:Monitor, color:"lime", prep:["รุ่นกล้องและเครื่องพิมพ์", "ระบบปฏิบัติการและสิ่งที่ต้องการ"] },
  { id:"printing", title:["3D Print", "3D printing"], summary:["มีแบบหรืออยากสร้างชิ้นงาน 3 มิติ", "Have a model or an idea for a 3D object"], detail:["เลือกสินค้าเดิมหรือส่งไฟล์เพื่อให้ประเมินงาน", "Browse products or submit a file for a quote"], href:"/3d-printing", action:["ดูงานพิมพ์ 3D", "Explore 3D printing"], Icon:Box, color:"lavender", prep:["ไฟล์ 3D หรือภาพอ้างอิง", "ขนาด วัสดุ และจำนวน"] },
  { id:"software", title:["ซอฟต์แวร์ธุรกิจ", "Business software"], summary:["อยากได้เครื่องมือช่วยงานในธุรกิจ", "Looking for a tool for your business"], detail:["เล่าโจทย์การใช้งานเพื่อสอบถามผลิตภัณฑ์และขอบเขต", "Describe the workflow to discuss products and scope"], href:"/software", action:["ดูโซลูชันซอฟต์แวร์", "Explore software solutions"], Icon:Code2, color:"cream", prep:["ขั้นตอนที่อยากปรับปรุง", "จำนวนผู้ใช้และระบบปัจจุบัน"] },
];

export default function ServicesLanding() {
  const {locale}=useI18n(); const en=locale==="en"; const t=(a:string,b:string)=>en?b:a; const [selected,setSelected]=useState("rental"); const choice=choices.find(x=>x.id===selected)!;
  return <div className="koko-studio"><Navbar/><main className="studio-services-page">
    <header className="services-intro studio-wrap"><p className="studio-eyebrow">KOKO MEMORY / OUR SERVICES</p><h1>{t("เริ่มจากสิ่งที่คุณอยากทำ", "Start with what you want to make.")}</h1><p>{t("เลือกบริการที่ตรงกับไอเดีย แล้วดูขั้นตอนและรายละเอียดที่ต้องเตรียม", "Choose the service that fits your idea, then see what to expect and prepare.")}</p></header>
    <section className="studio-wrap services-choice"><p className="studio-eyebrow">01 / CHOOSE YOUR DIRECTION</p><div className="services-choice-grid">{choices.map(({id,title,summary,Icon,color})=><button key={id} onClick={()=>setSelected(id)} aria-pressed={selected===id} className={`services-choice-card studio-${color}`}><Icon size={25}/><span>{title[en?1:0]}</span><small>{summary[en?1:0]}</small></button>)}</div>
      <article className={`services-next studio-${choice.color}`}><div><p className="studio-eyebrow">02 / YOUR NEXT STEP</p><h2>{choice.title[en?1:0]}</h2><p>{choice.detail[en?1:0]}</p><Link href={choice.href}>{choice.action[en?1:0]}<ArrowRight size={17}/></Link></div><div><h3>{t("เตรียมข้อมูลเหล่านี้", "A few details to prepare")}</h3><ul>{choice.prep.map(item=><li key={item}>{item}</li>)}</ul><Link className="services-enquiry" href={`/enquiry?service=${choice.id}`}>{t("ยังไม่แน่ใจ? สอบถามทีมงาน", "Not sure? Ask our team")}<ArrowRight size={16}/></Link></div></article>
    </section>
    <section className="services-flow studio-wrap"><p className="studio-eyebrow">03 / CLEAR FROM THE START</p><h2>{t("รู้สิ่งที่จะเกิดขึ้น ก่อนเริ่มงาน", "Know what happens before you begin.")}</h2><div className="studio-steps">{[[t("เลือกบริการ", "Choose a service"),t("เลือกหมวดบริการตามเป้าหมายของคุณ", "Choose the service that fits your goal")],[t("ส่งรายละเอียด", "Share the details"),t("ส่งข้อมูลที่ทีมต้องใช้ประเมินงาน", "Provide the details we need to assess your request")],[t("ยืนยันขอบเขต", "Confirm the scope"),t("ตรวจราคา สิ่งที่จะได้รับ และกำหนดการ", "Review pricing, deliverables and timing")]].map(([title,detail],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{detail}</p></article>)}</div></section>
    <section className="studio-end studio-wrap"><p className="studio-eyebrow">LET’S MAKE SOMETHING MEMORABLE</p><h2>{t("มีโจทย์เฉพาะของคุณ?", "Have a specific project in mind?")}</h2><Link className="studio-button" href="/enquiry">{t("เล่าให้ทีมงานฟัง", "Tell us about it")}<ArrowRight size={18}/></Link></section>
  </main><Footer/></div>;
}
