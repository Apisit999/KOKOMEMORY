"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Box, Camera, Code2, Monitor, Pause, Play } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useI18n } from "@/i18n";
import Footer from "@/components/layout/Footer";
import "./studio.css";

const services = [
  { id: "rental", label: "PHOTOBOOTH RENTAL", title: ["เช่า Photobooth", "Photobooth rental"], description: ["เติมความสนุกให้งานแต่ง งานเลี้ยง และอีเวนต์ เลือกแพ็กเกจและส่งรายละเอียดงานได้ในเว็บ", "Bring a photo experience to your event. Choose a package and submit event details online."], href: "/photobooth", action: ["ดูบริการและแพ็กเกจ", "Explore rental"], icon: Camera, color: "pink", tags: "Wedding / Party / Corporate" },
  { id: "photobooth", label: "PHOTOBOOTH SOFTWARE", title: ["โปรแกรม Photobooth", "Photobooth software"], description: ["สำหรับผู้ประกอบการที่มีบูธของตัวเอง สอบถามรายละเอียดโปรแกรม การสาธิต และความเข้ากันได้กับอุปกรณ์", "For operators with their own booth. Enquire about software, demos and equipment compatibility."], href: "/software/photobooth", action: ["ดูรายละเอียดโปรแกรม", "Explore software"], icon: Monitor, color: "lime", tags: "For operators / Demo enquiry" },
  { id: "printing", label: "3D PRINT STUDIO", title: ["ออกแบบ & พิมพ์ 3D", "Design & 3D printing"], description: ["เปลี่ยนไอเดียให้เป็นชิ้นงาน เลือกสินค้าหรือส่งไฟล์เพื่อขอประเมินราคา พร้อมติดตามงานในบัญชีของคุณ", "Turn ideas into objects. Browse products or submit files for a quote and track your orders."], href: "/3d-printing", action: ["ดูงาน 3D Print", "Explore 3D printing"], icon: Box, color: "lavender", tags: "Prototype / Custom objects" },
  { id: "software", label: "SOFTWARE SOLUTIONS", title: ["ซอฟต์แวร์สำหรับธุรกิจ", "Business software"], description: ["บอกโจทย์และรูปแบบธุรกิจ เพื่อสอบถามผลิตภัณฑ์ซอฟต์แวร์และขอบเขตบริการที่เหมาะกับงานของคุณ", "Share your business needs to discuss available software products and service scope."], href: "/software", action: ["คุยเรื่องซอฟต์แวร์", "Explore solutions"], icon: Code2, color: "cream", tags: "Business tools / Consultation" },
];
export default function StudioExperience({ servicesPage = false }: { servicesPage?: boolean }) {
  const { locale } = useI18n();
  const t = (th: string, en: string) => locale === "en" ? en : th;
  const pick = (pair: string[]) => pair[locale === "en" ? 1 : 0];
  const [filter, setFilter] = useState("all");
  const [moving, setMoving] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setMoving(!media.matches); if (media.matches) video.current?.pause(); };
    change(); media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  async function toggleVideo() { if (!video.current) return; if (playing) video.current.pause(); else try { await video.current.play(); } catch { setFailed(true); } }
  return <div className={`koko-studio ${moving ? "is-moving" : ""}`}>
    <Navbar /><main>
      <section className="studio-hero studio-wrap"><div>
        <p className="studio-eyebrow">● CREATIVE TECHNOLOGY / KOKO MEMORY</p>
        <h1>{t(servicesPage ? "ทุกไอเดีย" : "ไอเดียของคุณ", servicesPage ? "Every idea." : "Your ideas.")}<br /><span>{t("มีชีวิตได้", "Made alive.")}</span><i aria-hidden="true">✳</i></h1>
        <p className="studio-intro">{t("จากโมเมนต์ที่อยากเก็บ สู่สิ่งใหม่ที่อยากสร้าง", "From moments worth keeping to things worth creating.")}<br />Photobooth · Software · 3D Print</p>
        <div className="studio-actions"><a className="studio-button" href="#studio-services">{t("ค้นหาบริการที่ใช่", "Find your service")}<ArrowUpRight size={18} /></a><Link className="studio-text-link" href="/gallery/portfolio">{t("ดูผลงานของเรา", "View our work")}<ArrowUpRight size={18} /></Link></div>
        <div className="studio-hero-foot"><span>01 / IMAGINE. CREATE. REMEMBER.</span><button onClick={() => setMoving(!moving)} aria-pressed={!moving}>{moving ? <Pause size={14} /> : <Play size={14} />}{t(moving ? "หยุดภาพเคลื่อนไหว" : "เปิดภาพเคลื่อนไหว", moving ? "Pause motion" : "Enable motion")}</button></div>
      </div><div className="studio-collage"><div className="studio-orbit" aria-hidden="true" /><figure className="studio-photo-main"><div><Image src="/hero/wedding.jpg" alt={t("บรรยากาศงานแต่งงาน", "Wedding atmosphere")} fill priority sizes="(max-width: 800px) 80vw, 40vw" /></div><figcaption>GOOD TIMES. REAL MEMORIES.</figcaption></figure><figure className="studio-photo-small"><Image src="/gallery/K1.jpg" alt={t("ภาพจากแกลเลอรี KOKO Memory", "KOKO Memory gallery photo")} fill sizes="(max-width: 800px) 40vw, 20vw" /></figure><div className="studio-object" aria-hidden="true"><Box size={60} strokeWidth={1} /><span>IDEA → OBJECT</span></div><div className="studio-sticker" aria-hidden="true">MAKE<br />IT REAL ↗</div></div></section>
      <div className="studio-ribbon" aria-hidden="true">MEMORIES ✳ SOFTWARE ✳ OBJECTS ✳ EXPERIENCES ✳</div>
      <section className="studio-services studio-wrap" id="studio-services"><div className="studio-heading"><div><p className="studio-eyebrow">02 / WHAT WE MAKE</p><h2>{t("เลือกสิ่งที่คุณอยากสร้าง", "What would you like to create?")}</h2></div><p>{t("สี่บริการ หนึ่งพื้นที่สำหรับไอเดียของคุณ", "Four services. One place for your ideas.")}</p></div>
        <div className="studio-filters" role="group" aria-label={t("กรองบริการ", "Filter services")}><button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("ทั้งหมด", "All services")}</button>{services.map(s => <button key={s.id} aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>{pick(s.title)}</button>)}</div>
        <div className="studio-grid">{services.filter(s => filter === "all" || filter === s.id).map(s => <article key={s.id} className={`studio-card studio-${s.color}`}><div className="studio-card-top"><s.icon size={28} strokeWidth={1.5} /><span>{s.label}</span><ArrowUpRight size={23} /></div><h3>{pick(s.title)}</h3><p>{pick(s.description)}</p><small>{s.tags}</small><Link href={s.href}>{pick(s.action)}<ArrowUpRight size={18} /></Link></article>)}</div>
      </section>
      <section className="studio-showcase studio-wrap"><div className="studio-video"><video ref={video} poster="/hero/wedding.jpg" playsInline loop muted preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)} aria-label={t("วิดีโอผลงาน KOKO Memory", "KOKO Memory portfolio video")}><source src="/videos/koko-memory-portfolio-background.mp4" type="video/mp4" /></video><div className="studio-video-caption"><span>KOKO IN MOTION</span><button disabled={failed} onClick={toggleVideo} aria-label={t(playing ? "หยุดวิดีโอ" : "เล่นวิดีโอ", playing ? "Pause video" : "Play video")}>{playing ? <Pause /> : <Play />}</button></div>{failed && <p className="studio-video-error">{t("เปิดวิดีโอไม่ได้ ดูภาพผลงานในแกลเลอรีได้", "Video unavailable. Explore photos in our portfolio.")}</p>}</div><div><p className="studio-eyebrow">03 / MORE THAN A PICTURE</p><h2>{t("เห็นบรรยากาศ", "Feel the moment.")}<br /><em>{t("ก่อนเริ่มเรื่องของคุณ", "Start your story.")}</em></h2><p className="studio-intro">{t("ดูภาพและวิดีโอจากพื้นที่ผลงานของเรา แล้วนำแรงบันดาลใจมาต่อยอดเป็นงานที่มีตัวตนของคุณเอง", "Explore our photos and video, and find inspiration for an experience of your own.")}</p><Link className="studio-text-link" href="/gallery/portfolio">{t("เปิดแกลเลอรีผลงาน", "Open the portfolio")}<ArrowUpRight size={18} /></Link></div></section>
      <section className="studio-process studio-wrap"><p className="studio-eyebrow">04 / FROM IDEA TO REALITY</p><h2>{t("เริ่มง่าย ไปต่อได้จริง", "An easy start. A clear next step.")}</h2><div className="studio-steps">{[
        ["เลือกบริการ", "Choose a service", "จองบูธ เลือกงานพิมพ์ หรือสอบถามโปรแกรมที่ตรงกับงาน", "Book a booth, explore printing or enquire about software."],
        ["ส่งรายละเอียด", "Share the details", "ระบุวันงาน ส่งไฟล์ชิ้นงาน หรือแจ้งอุปกรณ์และความต้องการ", "Share your event date, model file, equipment or requirements."],
        ["ยืนยันก่อนเริ่ม", "Confirm the scope", "ตกลงราคา ขอบเขตงาน และกำหนดส่งกับทีมให้ชัดเจน", "Agree on pricing, scope and delivery with our team."],
      ].map(([th,en,detail,english],i) => <article key={en}><span>0{i+1}</span><h3>{t(th,en)}</h3><p>{t(detail,english)}</p></article>)}</div></section>
      <section className="studio-faq studio-wrap"><div><p className="studio-eyebrow">A FEW GOOD QUESTIONS</p><h2>{t("ก่อนเริ่ม มีคำถามไหม?", "Before we begin…")}</h2></div><div>{[
        ["เช่าบูธกับซื้อโปรแกรมต่างกันอย่างไร?", "How do rental and software differ?", "เช่าบูธเหมาะกับผู้จัดงาน ส่วนโปรแกรมเหมาะกับผู้ที่มีอุปกรณ์เองและต้องการซอฟต์แวร์สำหรับนำไปใช้งาน", "Rental is for event hosts. Software is for operators with their own equipment."],
        ["ยังไม่มีไฟล์ 3D ขอคำปรึกษาได้ไหม?", "Can I enquire without a 3D file?", "ได้ ติดต่อทีมพร้อมภาพอ้างอิง ขนาด และการใช้งาน เพื่อประเมินความเป็นไปได้และงานออกแบบก่อนเสนอราคา", "Yes. Share references, dimensions and intended use to assess feasibility and design scope."],
        ["ซื้อโปรแกรมหรือขอทดลองได้ที่ไหน?", "How can I buy or request a demo?", "เปิดหน้าซอฟต์แวร์แล้วติดต่อทีมเพื่อสอบถามผลิตภัณฑ์ ราคา สิทธิ์การใช้งาน และการสาธิต ระบบซื้อและดาวน์โหลดอัตโนมัติยังไม่เปิดให้บริการ", "Contact our team from the software page about products, pricing, licence terms and demos. Automated checkout and downloads are not available yet."],
      ].map(([th,en,a,b]) => <details key={en}><summary>{t(th,en)}</summary><p>{t(a,b)}</p></details>)}</div></section>
      <section className="studio-end studio-wrap"><p className="studio-eyebrow">LET’S MAKE SOMETHING MEMORABLE</p><h2>{t("มีไอเดียแล้ว?", "Have an idea?")}<br />{t("มาเริ่มด้วยกัน", "Let’s make it happen.")} ↗</h2><Link className="studio-button" href="/enquiry">{t("คุยกับทีม KOKO", "Talk to KOKO")}<ArrowUpRight size={18} /></Link></section>
    </main><Footer />
  </div>;
}
