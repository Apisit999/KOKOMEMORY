import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { socialLinks } from "@/config/social-links";
import "@/components/studio/studio.css";

export const metadata: Metadata = {
    title: "ติดต่อเรา | KOKO Memory",
    description: "พูดคุยกับ KOKO Memory เรื่อง Photobooth ซอฟต์แวร์ และงาน 3D Print",
};

const channels = [
    { label: "โทรศัพท์", value: "080-081-9933", href: "tel:0800819933", Icon: Phone, note: "สอบถามรายละเอียดและคิวงาน" },
    { label: "อีเมล", value: "kokomemory@gmail.com", href: "mailto:kokomemory@gmail.com", Icon: Mail, note: "ส่งรายละเอียดโปรเจกต์หรือไฟล์งาน" },
    { label: "LINE Official", value: "@024ppzhh", href: socialLinks.line, Icon: MessageCircle, note: "คุยกับทีม KOKO โดยตรง" },
];

export default function ContactPage() {
    return <div className="koko-studio contact-page">
        <Navbar />
        <main>
            <section className="contact-hero studio-wrap">
                <div>
                    <p className="studio-eyebrow">LET’S TALK · KOKO MEMORY</p>
                    <h1>มีไอเดียหรือคำถาม?<br /><span>คุยกับเราได้เลย</span></h1>
                    <p className="studio-intro">เล่าเรื่องงาน วันจัดอีเวนต์ แบบชิ้นงาน หรือโจทย์การใช้งานให้เราฟัง ทีมจะช่วยแนะนำช่องทางเริ่มต้นที่เหมาะกับคุณ</p>
                    <div className="contact-hero-actions">
                        <a className="studio-button" href={socialLinks.line} target="_blank" rel="noopener noreferrer">ทัก LINE Official <ArrowUpRight size={18} /></a>
                        <a className="studio-text-link" href="tel:0800819933">โทร 080-081-9933 <Phone size={16} /></a>
                    </div>
                </div>
                <div className="contact-hero-art" role="img" aria-label="บรรยากาศ Photobooth ในงานของ KOKO Memory"><span>GOOD TIMES<br />START HERE</span></div>
            </section>
            <section className="contact-channels studio-wrap" aria-labelledby="contact-options">
                <div className="about-section-heading"><div><p className="studio-eyebrow">01 / CONTACT OPTIONS</p><h2 id="contact-options">เลือกช่องทางที่สะดวก</h2></div><p>สอบถามบริการหรือแจ้งรายละเอียดงานได้โดยตรง รายการและข้อมูลติดต่อแสดงตามช่องทางที่ KOKO ใช้งานอยู่</p></div>
                <div className="contact-channel-grid">{channels.map(({ label, value, href, Icon, note }) => <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="contact-channel"><span className="contact-channel-icon"><Icon size={23} /></span><span className="contact-channel-label">{label}</span><strong>{value}</strong><span className="contact-channel-note">{note}</span><span className="contact-channel-action">ติดต่อช่องทางนี้ <ArrowUpRight size={16} /></span></a>)}</div>
            </section>
            <section className="contact-next studio-wrap">
                <div><p className="studio-eyebrow">02 / START WITH A SERVICE</p><h2>ยังเลือกบริการไม่ถูก?</h2><p>ดูรายละเอียดบริการและผลงานก่อน แล้วส่งคำถามที่ตรงกับโปรเจกต์ของคุณมาได้เลย</p></div>
                <div className="contact-next-links"><Link href="/services">สำรวจบริการ <ArrowUpRight size={17} /></Link><Link href="/gallery/portfolio">ดูผลงาน <ArrowUpRight size={17} /></Link><Link href="/enquiry">เล่าโปรเจกต์ของคุณ <ArrowUpRight size={17} /></Link></div>
            </section>
        </main>
        <Footer />
    </div>;
}
