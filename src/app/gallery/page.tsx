/**
 * ============================================================
 * KOKO Memory
 * Portfolio Gallery Page
 * ============================================================
 *
 * หน้าที่
 * ------------------------------------------------------------
 * หน้าแสดงผลงานของ KOKO Memory
 *
 * รูปภาพ
 * ------------------------------------------------------------
 * รูปถูกเก็บไว้บน Cloudflare R2
 *
 * หน้านี้ไม่จัดการ R2 โดยตรง
 *
 * GalleryGrid
 * เป็นผู้โหลดและแสดง Portfolio
 * ============================================================
 */

import Link from "next/link";

import GalleryGrid from "@/components/gallery/GalleryGrid";


export default function GalleryPage() {

    return (

        <main
            className="
                min-h-screen
                bg-white
            "
        >

            {/* ==================================================
                HERO
            ================================================== */}

            <section
                className="
                    relative
                    isolate
                    overflow-hidden
                    px-5
                    pb-16
                    pt-32
                    sm:px-6
                    sm:pb-20
                    sm:pt-36
                    lg:pb-24
                    lg:pt-40
                "
            >

                {/* Pink decoration */}

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        left-1/2
                        top-0
                        -z-10
                        h-72
                        w-72
                        -translate-x-1/2
                        rounded-full
                        bg-pink-100/70
                        blur-3xl
                        sm:h-96
                        sm:w-96
                    "
                />


                {/* Blue decoration */}

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        right-0
                        top-24
                        -z-10
                        h-64
                        w-64
                        rounded-full
                        bg-blue-100/40
                        blur-3xl
                    "
                />


                <div
                    className="
                        mx-auto
                        max-w-4xl
                        text-center
                    "
                >

                    {/* Label */}

                    <span
                        className="
                            inline-flex
                            rounded-full
                            border
                            border-pink-100
                            bg-pink-50
                            px-5
                            py-2
                            text-xs
                            font-semibold
                            uppercase
                            tracking-[0.25em]
                            text-pink-500
                            sm:text-sm
                        "
                    >
                        Our Portfolio
                    </span>


                    {/* Heading */}

                    <h1
                        className="
                            mt-6
                            text-4xl
                            font-bold
                            tracking-tight
                            text-slate-900
                            sm:text-5xl
                            lg:text-6xl
                        "
                    >
                        ผลงานของเรา
                    </h1>


                    {/* Description */}

                    <p
                        className="
                            mx-auto
                            mt-6
                            max-w-2xl
                            text-base
                            leading-8
                            text-slate-500
                            sm:text-lg
                        "
                    >
                        รวมภาพบรรยากาศและผลงานจากงานจริง
                        ที่ KOKO Memory ได้ร่วมสร้างความทรงจำ
                        ให้กับลูกค้าของเรา
                    </p>

                </div>

            </section>


            {/* ==================================================
                PORTFOLIO GALLERY
            ================================================== */}

            <section
                className="
                    mx-auto
                    max-w-7xl
                    px-5
                    pb-24
                    sm:px-6
                    lg:pb-32
                "
            >

                {/* ==================================================
                    GalleryGrid
                    --------------------------------------------------
                    โหลด Portfolio จาก Cloudflare R2
                    --------------------------------------------------
                    ไม่เกี่ยวข้องกับ Live Gallery
                ================================================== */}

                <GalleryGrid />

            </section>


            {/* ==================================================
                CTA
            ================================================== */}

            <section
                className="
                    relative
                    overflow-hidden
                    border-t
                    border-slate-100
                    bg-slate-50
                    px-5
                    py-20
                    text-center
                    sm:px-6
                    sm:py-24
                "
            >

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        left-1/2
                        top-0
                        h-72
                        w-72
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-full
                        bg-pink-100/70
                        blur-3xl
                    "
                />


                <div
                    className="
                        relative
                        mx-auto
                        max-w-2xl
                    "
                >

                    <p
                        className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-[0.25em]
                            text-pink-500
                            sm:text-sm
                        "
                    >
                        Your Special Day
                    </p>


                    <h2
                        className="
                            mt-4
                            text-3xl
                            font-bold
                            tracking-tight
                            text-slate-900
                            sm:text-4xl
                            lg:text-5xl
                        "
                    >
                        พร้อมสร้างความทรงจำ
                        ไปด้วยกันหรือยัง?
                    </h2>


                    <p
                        className="
                            mx-auto
                            mt-5
                            max-w-xl
                            text-base
                            leading-8
                            text-slate-500
                            sm:text-lg
                        "
                    >
                        ให้ KOKO Memory
                        เป็นส่วนหนึ่งของวันสำคัญของคุณ
                        เราพร้อมดูแลตั้งแต่การเลือกแพ็กเกจ
                        ไปจนถึงวันจัดงาน
                    </p>


                    <Link
                        href="/booking"
                        className="
                            mt-8
                            inline-flex
                            items-center
                            justify-center
                            rounded-full
                            bg-pink-500
                            px-8
                            py-4
                            text-sm
                            font-semibold
                            text-white
                            shadow-lg
                            shadow-pink-200
                            transition-all
                            duration-300
                            hover:-translate-y-1
                            hover:bg-pink-600
                            hover:shadow-xl
                            focus:outline-none
                            focus:ring-2
                            focus:ring-pink-500
                            focus:ring-offset-2
                            sm:px-10
                            sm:text-base
                        "
                    >
                        เริ่มจองคิว
                    </Link>

                </div>

            </section>

        </main>

    );

}