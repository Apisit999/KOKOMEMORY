import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./studio.css";
import "./legal.css";

export type LegalSection = { title: string; body: string[] };

export default function LegalPage({ eyebrow, title, updated, sections }: { eyebrow: string; title: string; updated: string; sections: LegalSection[] }) {
  return (
    <div className="koko-studio">
      <Navbar />
      <main className="legal studio-wrap">
        <p className="studio-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-meta">ปรับปรุงล่าสุด {updated} · <Link href="/terms">ข้อกำหนดการใช้บริการ</Link> · <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link></p>
        <nav aria-label="สารบัญ" className="legal-toc"><ol>{sections.map((s, i) => <li key={s.title}><a href={`#s${i + 1}`}>{s.title}</a></li>)}</ol></nav>
        {sections.map((s, i) => (
          <section key={s.title} id={`s${i + 1}`}>
            <h2>{i + 1}. {s.title}</h2>
            {s.body.map(p => <p key={p}>{p}</p>)}
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
