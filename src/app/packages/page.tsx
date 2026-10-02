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
import type { Metadata } from "next";
import "@/components/studio/studio.css";

export const metadata: Metadata = {
    title: "แพ็กเกจ Photobooth และ 360 | KOKO Memory",
    description: "เปรียบเทียบราคา ชั่วโมงให้บริการ และสิ่งที่รวมในแพ็กเกจ Photobooth และ 360 ของ KOKO Memory",
};

export default function PackagesPage() {
    return (
        <div className="koko-studio">
            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar />


            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="studio-packages min-h-screen px-4 pb-20 pt-32 sm:px-6 sm:pt-36">
                <div className="mx-auto max-w-7xl">
                    <header className="mx-auto max-w-3xl text-center">
                        <p className="studio-eyebrow justify-center">KOKO MEMORY / PACKAGES</p>
                        <h1 className="mt-4 text-3xl font-black sm:text-5xl">เลือกแพ็กเกจสำหรับงานของคุณ</h1>
                        <p className="mt-5 text-sm leading-7 sm:text-base">ดูราคา ระยะเวลา และสิ่งที่ได้รับก่อนเริ่มจอง</p>
                        <Link href="/photobooth" className="studio-text-link mt-4">← ดูบริการ Photobooth</Link>
                        <p className="mt-3 text-xs leading-6 text-white/55">หลังเลือกแพ็กเกจ ระบบจะให้เข้าสู่ระบบก่อนเริ่มจอง และจะพากลับมายังแพ็กเกจที่เลือก</p>
                    </header>

                    {[
                        { category: "photobooth", title: "Photobooth" },
                        { category: "360", title: "360 Photobooth" },
                    ].map((group) => (
                        <section key={group.category} className="mt-14 sm:mt-16">
                            <h2 className="text-2xl font-black sm:text-3xl">{group.title}</h2>
                            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {packages.filter((item) => item.category === group.category).map((item) => (
                                    <article key={item.id} className="studio-package-card flex h-full flex-col rounded-2xl border p-6 shadow-sm sm:p-7">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-xl font-black">{item.title}</h3>
                                            {item.popular && <span className="studio-package-popular shrink-0 rounded-full px-3 py-1 text-xs font-bold">ยอดนิยม</span>}
                                        </div>
                                        <p className="studio-package-price mt-5 text-3xl font-black">฿{item.price.toLocaleString("th-TH")}</p>
                                        <div className="studio-package-meta mt-4 flex flex-wrap gap-2 text-sm">
                                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"><Clock3 size={15} />{item.hours} ชั่วโมง</span>
                                            {item.paperSize && <span className="rounded-full px-3 py-1.5">รูปพิมพ์ {item.paperSize}</span>}
                                        </div>
                                        <ul className="studio-package-features mt-6 flex-1 space-y-3 border-t pt-6">
                                            {item.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm"><Check size={16} className="studio-package-check mt-0.5 shrink-0" />{feature}</li>)}
                                        </ul>
                                        <Link href={`/booking/package?package=${encodeURIComponent(item.id)}`} className="studio-package-cta mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition">เลือกแพ็กเกจนี้ <ArrowRight size={17} /></Link>
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
        </div>
    );
}
