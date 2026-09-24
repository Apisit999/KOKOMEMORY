/**
 * ============================================================
 * KOKO Memory
 * Packages Page
 * ============================================================
 *
 * URL
 * ------------------------------------------------------------
 * /packages
 *
 * โครงสร้าง
 * ------------------------------------------------------------
 * Navbar
 *      ↓
 * Public package overview
 *      ↓
 * Footer
 *
 * แสดงแพ็กเกจจากข้อมูลเดียวกับระบบจอง
 * ขั้นตอนจองจริงอยู่ที่ /booking/package
 * ============================================================
 */

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { packages } from "@/data/booking-packages";


export default function PackagesPage() {
    return (
        <>
            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar />


            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="min-h-screen bg-[#F7F7FA] px-4 pb-20 pt-32 sm:px-6 sm:pt-36">
                <div className="mx-auto max-w-7xl">
                    <header className="mx-auto max-w-3xl text-center">
                        <p className="text-xs font-bold uppercase tracking-[.25em] text-pink-500">KOKO MEMORY PACKAGES</p>
                        <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-5xl">เลือกแพ็กเกจสำหรับงานของคุณ</h1>
                        <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">ดูราคา ระยะเวลา และสิ่งที่ได้รับก่อนเริ่มจอง</p>
                    </header>

                    {[
                        { category: "photobooth", title: "Photobooth" },
                        { category: "360", title: "360 Photobooth" },
                    ].map((group) => (
                        <section key={group.category} className="mt-14 sm:mt-16">
                            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{group.title}</h2>
                            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {packages.filter((item) => item.category === group.category).map((item) => (
                                    <article key={item.id} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
                                            {item.popular && <span className="shrink-0 rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600">ยอดนิยม</span>}
                                        </div>
                                        <p className="mt-5 text-3xl font-black text-pink-600">฿{item.price.toLocaleString("th-TH")}</p>
                                        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><Clock3 size={15} />{item.hours} ชั่วโมง</span>
                                            {item.paperSize && <span className="rounded-full bg-slate-100 px-3 py-1.5">รูปพิมพ์ {item.paperSize}</span>}
                                        </div>
                                        <ul className="mt-6 flex-1 space-y-3 border-t border-slate-100 pt-6">
                                            {item.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-pink-500" />{feature}</li>)}
                                        </ul>
                                        <Link href={`/booking/package?package=${encodeURIComponent(item.id)}`} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-pink-500">เลือกแพ็กเกจนี้ <ArrowRight size={17} /></Link>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <Footer />
        </>
    );
}
