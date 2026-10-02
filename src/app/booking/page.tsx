import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3, CreditCard, Sparkles } from "lucide-react";

const highlights = [
    { icon: CalendarDays, title: "เช็กวันว่างก่อน", detail: "เลือกวันจัดงานจากปฏิทินจอง" },
    { icon: Sparkles, title: "เลือกแบบที่ใช่", detail: "ดูรายละเอียดและราคาแต่ละแพ็กเกจ" },
    { icon: CreditCard, title: "ยืนยันได้ในเว็บ", detail: "กรอกรายละเอียด ส่งคำขอ และชำระมัดจำ" },
];

export default function BookingPage() {
    return <main className="booking-landing min-h-screen bg-[#f4f2ec]">
        <section className="booking-landing-hero mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:px-10 lg:py-20">
            <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#dce5bd] bg-[#edf2dc] px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#65763b]"><span className="h-2 w-2 rounded-full bg-[#91aa53]"/> KOKO MEMORY · ONLINE BOOKING</p>
                <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.13] tracking-tight text-[#20211d] sm:text-6xl">เก็บช่วงเวลาพิเศษ<br/><span className="text-[#65763b]">เริ่มต้นที่นี่</span></h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-[#686960] sm:text-lg">เลือกแพ็กเกจ Photobooth เช็กวันว่าง และส่งรายละเอียดงานให้ทีม KOKO ดูแลทุกขั้นตอน</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                    <Link href="/booking/package" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#d5ee85] px-7 font-bold text-[#20231a] shadow-[0_12px_30px_rgba(101,118,59,.18)] transition hover:-translate-y-0.5 hover:bg-[#c9e36d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65763b] focus-visible:ring-offset-2">เลือกแพ็กเกจ<ArrowRight size={18}/></Link>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#686960]"><Clock3 size={16}/> ใช้เวลาไม่กี่นาที</span>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#77796e]">
                    <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#65763b]"/> ตรวจสอบวันว่าง</span>
                    <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#65763b]"/> ราคาและรายละเอียดชัดเจน</span>
                    <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-[#65763b]"/> ติดตามรายการจองได้</span>
                </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl">
                <div className="absolute -right-3 -top-4 h-28 w-28 rounded-full bg-[#e5edc8] sm:-right-5 sm:-top-6 sm:h-36 sm:w-36"/>
                <div className="absolute -bottom-5 -left-5 h-28 w-28 rounded-full bg-[#f3d5e1] sm:-bottom-7 sm:-left-7 sm:h-36 sm:w-36"/>
                <figure className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border-[7px] border-[#fffdf8] bg-[#ddd8ca] shadow-[0_24px_70px_rgba(35,36,29,.16)] sm:rounded-[2rem] sm:border-[10px]">
                    <Image src="/hero/wedding.jpg" alt="บรรยากาศงานแต่งงานกับ Photobooth ของ KOKO Memory" fill priority sizes="(max-width: 1024px) 90vw, 44vw" className="object-cover"/>
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-5 pb-5 pt-16 text-sm font-semibold tracking-wide text-white sm:px-7 sm:pb-7">MAKE ROOM FOR A LITTLE MORE JOY</figcaption>
                </figure>
                <div className="absolute -bottom-7 right-3 flex items-center gap-3 rounded-2xl border border-[#e9e4d8] bg-[#fffdf8] p-4 shadow-lg sm:right-7 sm:p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8efcf] text-[#65763b]"><Sparkles size={21}/></span><span><strong className="block text-sm text-[#20211d]">วันพิเศษของคุณ</strong><small className="mt-1 block text-xs text-[#77796e]">เราช่วยดูแลให้ราบรื่น</small></span></div>
            </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-10">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#7f8f53]">A SIMPLE WAY TO CELEBRATE</p><h2 className="mt-2 text-2xl font-black text-[#20211d] sm:text-3xl">จองง่าย ไปทีละขั้น</h2></div><p className="max-w-md text-sm leading-6 text-[#77796e]">ตั้งแต่เลือกแพ็กเกจจนถึงส่งข้อมูลให้ทีม ทุกขั้นตอนแสดงอยู่ในระบบ</p></div>
            <div className="grid gap-4 md:grid-cols-3">{highlights.map(({icon: Icon,title,detail},i)=><article key={title} className="rounded-2xl border border-[#e8e4d9] bg-[#fffdf8] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2dc] text-[#65763b]"><Icon size={20}/></span><span className="text-xs font-bold tracking-[.16em] text-[#95958b]">0{i+1}</span></div><h3 className="mt-5 font-bold text-[#20211d]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#77796e]">{detail}</p></article>)}</div>
        </section>
    </main>;
}
