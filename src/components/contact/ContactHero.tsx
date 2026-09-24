"use client";

import Image from "next/image";
import { useI18n } from "@/i18n";
import { socialLinks } from "@/config/social-links";

export default function ContactHero() {
    const { translate } = useI18n();
    return (
        <section className="relative flex min-h-[55vh] items-center overflow-hidden pt-24">

            {/* Background Image */}
            <Image
                src="/about/about2.png"
                alt="บูธถ่ายภาพ KOKO Memory ภายในงาน"
                fill
                priority
                sizes="100vw"
                className="object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/70" />

            {/* Content */}
            <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">

                <div className="max-w-3xl">

                    <span className="inline-block rounded-full bg-white/10 px-5 py-2 text-sm font-semibold tracking-wider text-white backdrop-blur-md">
                        {translate("CONTACT US")}
                    </span>

                    <h1 className="mt-6 text-5xl font-black leading-tight text-white md:text-7xl">
                        ติดต่อ
                        <span className="text-pink-500">
                            {" "}KOKO Memory
                        </span>
                    </h1>

                    <p className="mt-8 max-w-2xl text-lg leading-9 text-white/80 md:text-xl">
                        หากคุณกำลังมองหาบริการ Photobooth สำหรับงานแต่งงาน
                        งานเลี้ยง งานอีเวนต์ หรือกิจกรรมพิเศษ
                        ทีมงานของเราพร้อมให้คำแนะนำและดูแลทุกขั้นตอน
                        เพื่อให้ทุกช่วงเวลาของคุณกลายเป็นความทรงจำที่ดีที่สุด
                    </p>

                    <div className="mt-10 flex flex-wrap gap-4">

                        <a
                            href={socialLinks.line}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-pink-500 px-8 py-4 font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-pink-400 hover:shadow-pink-500/30"
                        >
                            ส่งข้อความหาเรา
                        </a>

                        <a
                            href="tel:0800819933"
                            className="rounded-full border border-white/40 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white hover:text-black"
                        >
                            โทรหาเรา
                        </a>

                    </div>

                </div>

            </div>

        </section>
    );
}
