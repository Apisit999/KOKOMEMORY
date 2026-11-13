import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, CreditCard, Sparkles } from "lucide-react";

const highlights = [
    { icon: Sparkles, title: "เลือกแพ็กเกจ", detail: "ดูรายละเอียดและราคาแต่ละแพ็กเกจ" },
    { icon: CalendarDays, title: "เลือกวันและใส่ข้อมูลงาน", detail: "เช็กวันว่างจากปฏิทิน แล้วกรอกรายละเอียดงาน" },
    { icon: CreditCard, title: "ยืนยันและชำระมัดจำ", detail: "ตรวจสอบสรุปรายการ แล้วยืนยันการจองในเว็บ" },
];

export default function BookingPage() {
    return <main className="booking-landing min-h-screen bg-white">
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-14 text-center sm:px-8 sm:pt-20">
            <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-[#4a4a4a]">ONLINE BOOKING</p>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl leading-[1.35] text-[#151515] sm:text-6xl">เก็บช่วงเวลาพิเศษ<br/><span className="text-gradient">เริ่มต้นที่นี่</span></h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#3d3d3d]">เลือกแพ็กเกจ Photobooth เช็กวันว่าง และส่งรายละเอียดงานให้ทีม KOKO ดูแลทุกขั้นตอน ใช้เวลาเพียงไม่กี่นาที</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/booking/package" className="btn-primary inline-flex min-h-14 w-full items-center justify-center gap-3 px-8 text-[15px] sm:w-auto">เลือกแพ็กเกจ<ArrowRight size={18}/></Link>
                <Link href="/packages" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[2px] border border-[#151515] px-8 text-[15px] font-medium text-[#151515] transition hover:bg-[#fafaf9] sm:w-auto">ดูราคาทั้งหมด</Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[15px] text-[#3d3d3d]">
                <span className="inline-flex items-center gap-1.5"><Check size={16} className="text-[#7a6cc0]"/> ตรวจสอบวันว่าง</span>
                <span className="inline-flex items-center gap-1.5"><Check size={16} className="text-[#7a6cc0]"/> ราคาชัดเจน</span>
                <span className="inline-flex items-center gap-1.5"><Check size={16} className="text-[#7a6cc0]"/> ติดตามรายการจองได้</span>
            </div>
            <figure className="relative mx-auto mt-14 aspect-[16/9] w-full overflow-hidden rounded-[2px] bg-[#e8e8e6] shadow-[0_30px_60px_rgba(21,21,21,.08)]">
                <Image src="/hero/wedding.jpg" alt="บรรยากาศงานกับ Photobooth ของ KOKO Memory" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover"/>
            </figure>
        </section>
        <section className="border-t border-[#e8e8e6] bg-[#fafaf9] px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-5xl">
                <div className="text-center">
                    <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-[#4a4a4a]">HOW IT WORKS</p>
                    <h2 className="mt-4 text-3xl text-[#151515] sm:text-5xl">จองง่ายใน 3 ขั้นตอน</h2>
                </div>
                <div className="mt-14 grid gap-6 md:grid-cols-3">{highlights.map(({ icon: Icon, title, detail }, i) => <article key={title} className="rounded-[2px] border border-[#e8e8e6] bg-white p-8 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[2px] bg-[#f5f4fb] text-[#7a6cc0]"><Icon size={22}/></span>
                    <p className="mt-5 text-[15px] font-semibold text-[#7a6cc0]">ขั้นที่ {i + 1}</p>
                    <h3 className="mt-1 text-xl text-[#151515]">{title}</h3>
                    <p className="mt-2 text-[15px] leading-7 text-[#3d3d3d]">{detail}</p>
                </article>)}</div>
                <div className="mt-12 text-center">
                    <Link href="/booking/package" className="btn-primary inline-flex min-h-14 items-center justify-center gap-3 px-8 text-[15px]">เริ่มจองเลย<ArrowRight size={18}/></Link>
                </div>
            </div>
        </section>
    </main>;
}
