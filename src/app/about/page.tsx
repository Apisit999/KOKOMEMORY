import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Box, Camera, Code2, Monitor } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "@/components/studio/studio.css";

export const metadata: Metadata = {
    title: "เกี่ยวกับเรา | KOKO Memory",
    description: "รู้จัก KOKO Memory สตูดิโอสร้างสรรค์ที่เชื่อมงาน Photobooth ซอฟต์แวร์ และ 3D Print เข้าด้วยกัน",
};

const services = [
    { title: "ซอฟต์แวร์ธุรกิจ", english: "BUSINESS SOFTWARE", detail: "เครื่องมือดิจิทัลที่ออกแบบจากโจทย์การทำงาน", href: "/software", Icon: Code2, tone: "cream" },
    { title: "โปรแกรม Photobooth", english: "PHOTOBOOTH SOFTWARE", detail: "ซอฟต์แวร์สำหรับผู้ให้บริการที่มีอุปกรณ์ของตัวเอง", href: "/software/photobooth", Icon: Monitor, tone: "lime" },
    { title: "3D Print", english: "3D PRINTING", detail: "เปลี่ยนแบบและแนวคิดให้เป็นชิ้นงานจริง", href: "/3d-printing", Icon: Box, tone: "lavender" },
    { title: "เช่า Photobooth", english: "PHOTOBOOTH RENTAL", detail: "เติมสีสันให้วันสำคัญด้วยภาพและประสบการณ์หน้างาน", href: "/photobooth", Icon: Camera, tone: "pink" },
];

const values = [
    { number: "01", title: "เริ่มจากโจทย์จริง", detail: "ทำความเข้าใจว่าคุณต้องการสร้างอะไรและนำไปใช้อย่างไร ก่อนเลือกแนวทางที่เหมาะสม" },
    { number: "02", title: "ใส่ใจทั้งภาพและการใช้งาน", detail: "คิดถึงรายละเอียดของงานควบคู่กับประสบการณ์ของคนที่ใช้งานหรือร่วมกิจกรรม" },
    { number: "03", title: "คุยกันให้ชัดเจน", detail: "ช่วยกันกำหนดสิ่งที่ต้องการ ขอบเขตงาน และขั้นตอนถัดไปตั้งแต่เริ่มต้น" },
];

export default function AboutPage() {
    return <div className="koko-studio about-page">
        <Navbar />
        <main>
            <section className="about-hero studio-wrap">
                <div className="about-hero-copy">
                    <p className="studio-eyebrow">KOKO MEMORY · CREATIVE TECHNOLOGY</p>
                    <h1>เราสร้างเทคโนโลยี<br /><span>ให้ไอเดียมีชีวิต</span><i aria-hidden="true">✳</i></h1>
                    <p className="studio-intro">KOKO Memory เชื่อมงานซอฟต์แวร์ โปรแกรม Photobooth งานพิมพ์ 3 มิติ และบริการ Photobooth สำหรับอีเวนต์ เพื่อช่วยเปลี่ยนความคิดให้เป็นสิ่งที่ผู้คนได้ใช้และสัมผัส</p>
                    <div className="about-actions"><Link className="studio-button" href="/gallery/portfolio">ดูผลงานของเรา <ArrowUpRight size={18} /></Link><a className="studio-text-link" href="#our-story">รู้จัก KOKO Memory <ArrowDown size={16} /></a></div>
                </div>
                <div className="about-hero-art" aria-label="ภาพบรรยากาศและผลงาน KOKO Memory">
                    <div className="about-art-orbit" aria-hidden="true" />
                    <figure className="about-art-main"><div><Image src="/about/about2.png" alt="บรรยากาศ Photobooth ของ KOKO Memory" fill priority sizes="(max-width: 760px) 82vw, 42vw" /></div><figcaption>GOOD TIMES. REAL MEMORIES.</figcaption></figure>
                    <figure className="about-art-small"><Image src="/about/about.jpg" alt="อีกมุมหนึ่งของงาน KOKO Memory" fill sizes="(max-width: 760px) 42vw, 22vw" /></figure>
                    <div className="about-art-sticker" aria-hidden="true">IDEA<br />→ REALITY</div>
                </div>
            </section>

            <div className="about-ribbon" aria-hidden="true">MEMORIES ✳ SOFTWARE ✳ OBJECTS ✳ EXPERIENCES ✳</div>

            <section className="about-story studio-wrap" id="our-story">
                <div className="about-story-image"><Image src="/about/about.jpg" alt="ภาพจากงานและเบื้องหลังของ KOKO Memory" width={1000} height={1100} sizes="(max-width: 760px) 100vw, 48vw" /></div>
                <div className="about-story-copy"><p className="studio-eyebrow">01 / OUR STORY</p><h2>จากความทรงจำ<br /><em>สู่สิ่งที่สร้างขึ้นได้</em></h2>
                    <p>KOKO Memory ให้บริการ Photobooth ที่ช่วยให้ผู้คนเก็บช่วงเวลาสำคัญไว้ได้ง่ายขึ้น ทั้งภาพถ่าย ระบบ และบรรยากาศในวันงาน</p>
                    <p>วันนี้เรายังเชื่อมงานซอฟต์แวร์และ 3D Print เข้ากับบริการด้านอีเวนต์ เพื่อให้คุณเลือกแนวทางที่เหมาะกับไอเดีย ตั้งแต่เครื่องมือที่ใช้ทำงาน ไปจนถึงประสบการณ์และชิ้นงานที่จับต้องได้</p>
                    <Link className="studio-text-link" href="/services">สำรวจบริการทั้งหมด <ArrowUpRight size={17} /></Link>
                </div>
            </section>

            <section className="about-services studio-wrap" id="our-services">
                <div className="about-section-heading"><div><p className="studio-eyebrow">02 / WHAT WE DO</p><h2>สี่ความเชี่ยวชาญ<br />สำหรับไอเดียหลายรูปแบบ</h2></div><p>เลือกดูบริการที่ตรงกับสิ่งที่คุณอยากทำ แล้วไปต่อยังรายละเอียดหรือช่องทางสอบถามได้เลย</p></div>
                <div className="about-service-grid">{services.map(({ title, english, detail, href, Icon, tone }) => <Link href={href} key={href} className={`about-service-card studio-${tone}`}><div className="about-service-top"><Icon size={26} strokeWidth={1.6} /><span>{english}</span><ArrowUpRight size={19} /></div><h3>{title}</h3><p>{detail}</p><span className="about-service-link">ดูรายละเอียด <ArrowUpRight size={16} /></span></Link>)}</div>
            </section>

            <section className="about-values">
                <div className="studio-wrap"><div className="about-section-heading"><div><p className="studio-eyebrow">03 / HOW WE WORK</p><h2>แนวทางที่ใช้ร่วมกัน<br />ในทุกงานของเรา</h2></div><p>ไม่ว่าจะเป็นงานอีเวนต์ ซอฟต์แวร์ หรือชิ้นงานที่พิมพ์ขึ้นมา เราเริ่มจากการฟังและทำความเข้าใจความต้องการ</p></div>
                    <div className="about-value-grid">{values.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
                </div>
            </section>

            <section className="about-process studio-wrap">
                <div><p className="studio-eyebrow">04 / FROM IDEA TO REALITY</p><h2>เริ่มจากการพูดคุย<br /><em>แล้วค่อยสร้างไปด้วยกัน</em></h2><p>เล่าไอเดีย วันงาน แบบชิ้นงาน หรือโจทย์การใช้งานให้เราฟัง ทีมจะช่วยชี้ช่องทางเริ่มต้นและรายละเอียดที่ควรเตรียม</p><Link className="studio-button" href="/enquiry">พูดคุยเกี่ยวกับโปรเจกต์ <ArrowUpRight size={18} /></Link></div>
                <div className="about-process-steps">{[["01", "เล่าไอเดีย", "บอกเป้าหมายและสิ่งที่อยากทำ"], ["02", "เลือกแนวทาง", "คุยบริการ รายละเอียด และขอบเขตงาน"], ["03", "เดินหน้าด้วยกัน", "ยืนยันข้อมูลสำคัญก่อนเริ่มงาน"]].map(([n, title, detail]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{detail}</p></div><ArrowUpRight size={19} /></article>)}</div>
            </section>

            <section className="about-video studio-wrap" aria-label="วิดีโอเบื้องหลัง KOKO Memory">
                <div className="about-video-frame"><video controls playsInline preload="none" poster="/hero/wedding.jpg" aria-label="วิดีโอผลงาน KOKO Memory"><source src="/videos/koko-memory-portfolio-background.mp4" type="video/mp4" />เบราว์เซอร์นี้ไม่รองรับการเล่นวิดีโอ</video></div>
                <div><p className="studio-eyebrow">05 / IN THE MOMENT</p><h2>บรรยากาศจริง<br /><em>จากผลงานของเรา</em></h2><p>ดูภาพและวิดีโอเพิ่มเติมจากงานที่ผ่านมา แล้วนำแรงบันดาลใจไปต่อยอดกับโปรเจกต์ของคุณ</p><Link className="studio-text-link" href="/gallery/portfolio">เปิดแกลเลอรีผลงาน <ArrowUpRight size={17} /></Link></div>
            </section>

            <section className="about-end studio-wrap"><p className="studio-eyebrow">LET’S MAKE SOMETHING MEMORABLE</p><h2>มีไอเดียที่อยากทำให้เกิดขึ้นจริง?</h2><p>เล่าโจทย์ให้เราฟัง แล้วเริ่มหาทางที่เหมาะกับโปรเจกต์ของคุณด้วยกัน</p><Link className="studio-button" href="/enquiry">เริ่มพูดคุยกับ KOKO <ArrowUpRight size={18} /></Link></section>
        </main>
        <Footer />
    </div>;
}
