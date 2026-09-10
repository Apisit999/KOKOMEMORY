import Image from "next/image";
import Link from "next/link";
import Navbar from "../layout/Navbar";

export default function HeroSection() {
    return (
        <section className="relative min-h-[680px] h-[100svh] overflow-hidden sm:min-h-[760px]">

            {/* =====================================================
                BACKGROUND
            ===================================================== */}

            <Image
                src="/hero/wedding.jpg"
                alt="KOKO Memory Photobooth"
                fill
                priority
                className="object-cover"
            />


            {/* =====================================================
                OVERLAY
            ===================================================== */}

            <div className="absolute inset-0 z-10 bg-black/50" />

            <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />


            {/* =====================================================
                NAVBAR
            ===================================================== */}

            <Navbar />


            {/* =====================================================
                HERO CONTENT
            ===================================================== */}

            <div className="relative z-20 flex min-h-[680px] h-full items-center justify-center px-5 pt-24 sm:min-h-[760px] sm:px-6">

                <div className="w-full max-w-5xl text-center text-white">

                    {/* Eyebrow */}

                    <div className="mb-6 flex justify-center">

                        <span className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90 backdrop-blur-xl sm:text-xs">
                            Photobooth & 3D printing Service
                        </span>

                    </div>


                    {/* Main Heading */}

                    <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">

                        KOKO
                        <span className="text-pink-400">
                            {" "}MEMORY
                        </span>

                    </h1>


                    {/* Tagline */}

                    <p className="mt-5 text-xl font-light tracking-wide text-white/90 sm:text-2xl md:text-3xl">
                        Every Moment Becomes a Memory
                    </p>


                    {/* Description */}

                    <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        บริการ Photobooth สำหรับงานแต่ง งานอีเวนต์
                        งานเลี้ยง และงานองค์กร พร้อมระบบ Live Gallery
                        ให้คุณเก็บทุกช่วงเวลาสำคัญไว้ได้อย่างสมบูรณ์แบบ
                    </p>


                    {/* CTA */}

                    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">

                        <Link
                            href="/gallery/portfolio"
                            className="w-full rounded-full bg-pink-500 px-9 py-3.5 text-sm font-semibold text-white shadow-xl shadow-pink-500/20 transition-all duration-300 hover:-translate-y-1 hover:bg-pink-400 sm:w-auto sm:px-10 sm:py-4 sm:text-base"
                        >
                            ดูผลงาน
                        </Link>


                        <Link
                            href="/contact"
                            className="w-full rounded-full border border-white/30 bg-white/10 px-9 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:text-slate-900 sm:w-auto sm:px-10 sm:py-4 sm:text-base"
                        >
                            ติดต่อเรา
                        </Link>

                    </div>


                    {/* =================================================
                        STATS
                    ================================================= */}

                    <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 border-y border-white/15 bg-black/10 backdrop-blur-sm sm:mt-16">

                        <div className="px-3 py-5 sm:px-6 sm:py-6">

                            <p className="text-2xl font-bold text-pink-300 sm:text-3xl">
                                500+
                            </p>

                            <p className="mt-1 text-[11px] uppercase tracking-wider text-white/55 sm:text-xs">
                                Events
                            </p>

                        </div>


                        <div className="border-x border-white/15 px-3 py-5 sm:px-6 sm:py-6">

                            <p className="text-2xl font-bold text-pink-300 sm:text-3xl">
                                100K+
                            </p>

                            <p className="mt-1 text-[11px] uppercase tracking-wider text-white/55 sm:text-xs">
                                Photos
                            </p>

                        </div>


                        <div className="px-3 py-5 sm:px-6 sm:py-6">

                            <p className="text-2xl font-bold text-pink-300 sm:text-3xl">
                                5+
                            </p>

                            <p className="mt-1 text-[11px] uppercase tracking-wider text-white/55 sm:text-xs">
                                Years
                            </p>

                        </div>

                    </div>


                    {/* Small Trust Text */}

                    <p className="mt-7 text-xs tracking-wide text-white/45">
                        Professional Photobooth • Live Gallery • Event Service
                    </p>

                </div>

            </div>


            {/* =====================================================
                SCROLL INDICATOR
            ===================================================== */}

            <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 sm:bottom-8">

                <div className="flex flex-col items-center gap-2">

                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">
                        Scroll
                    </span>

                    <div className="flex h-10 w-6 justify-center rounded-full border border-white/30 p-1">

                        <div className="h-2.5 w-1 rounded-full bg-white/80 animate-bounce" />

                    </div>

                </div>

            </div>

        </section>
    );
}