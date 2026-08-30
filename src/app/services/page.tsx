/**
 * ============================================================
 * KOKO Memory
 * Services Page
 * ============================================================
 *
 * หน้าที่
 * ------------------------------------------------------------
 * หน้ารวมบริการของ KOKO Memory
 *
 * โครงสร้าง
 * ------------------------------------------------------------
 * Navbar
 * Hero
 * Services Content
 * Why KOKO Memory
 * CTA
 * Footer
 *
 * หมายเหตุ
 * ------------------------------------------------------------
 * หน้านี้เป็น Server Component
 * ส่วน Interactive ต่าง ๆ อยู่ใน ServicesContent
 * ============================================================
 */

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ServicesContent from "@/components/services/ServicesContent";


export default function ServicesPage() {

    return (
        <main className="min-h-screen overflow-hidden bg-white">

            {/* ==================================================
                NAVBAR
            ================================================== */}

            <Navbar />


            {/* ==================================================
                HERO
            ================================================== */}

            <section
                className="
                    relative
                    isolate
                    overflow-hidden
                    px-5
                    pb-20
                    pt-32
                    sm:px-6
                    sm:pb-24
                    sm:pt-36
                    lg:pb-28
                    lg:pt-40
                "
            >

                {/* Pink Glow */}

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
                        bg-pink-200/50
                        blur-3xl
                        sm:h-96
                        sm:w-96
                    "
                />


                {/* Blue Glow */}

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        right-[-80px]
                        top-32
                        -z-10
                        h-64
                        w-64
                        rounded-full
                        bg-sky-200/40
                        blur-3xl
                        sm:right-[-40px]
                    "
                />


                {/* Purple Glow */}

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        bottom-0
                        left-[-100px]
                        -z-10
                        h-56
                        w-56
                        rounded-full
                        bg-violet-200/30
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
                            items-center
                            rounded-full
                            border
                            border-pink-100
                            bg-white/80
                            px-5
                            py-2
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.25em]
                            text-pink-500
                            shadow-sm
                            backdrop-blur
                            sm:text-sm
                        "
                    >
                        Our Services
                    </span>


                    {/* Heading */}

                    <h1
                        className="
                            mt-6
                            text-4xl
                            font-extrabold
                            tracking-tight
                            text-slate-900
                            sm:text-5xl
                            lg:text-6xl
                        "
                    >
                        บริการของเรา
                    </h1>


                    {/* Highlight */}

                    <p
                        className="
                            mx-auto
                            mt-5
                            max-w-2xl
                            text-lg
                            font-semibold
                            leading-8
                            text-pink-500
                            sm:text-xl
                        "
                    >
                        เติมสีสันให้ทุกงาน
                        ด้วยความทรงจำที่น่าประทับใจ
                    </p>


                    {/* Description */}

                    <p
                        className="
                            mx-auto
                            mt-4
                            max-w-2xl
                            text-sm
                            leading-7
                            text-slate-500
                            sm:text-base
                            sm:leading-8
                        "
                    >
                        KOKO Memory พร้อมดูแลบริการ Photobooth
                        สำหรับงานแต่งงาน งานเลี้ยง งานอีเวนต์
                        และโอกาสพิเศษของคุณ
                    </p>

                </div>

            </section>


            {/* ==================================================
                SERVICES
            ================================================== */}

            <ServicesContent />


            {/* ==================================================
                WHY KOKO MEMORY
            ================================================== */}

            <section
                className="
                    relative
                    overflow-hidden
                    bg-slate-50
                    px-5
                    py-20
                    sm:px-6
                    sm:py-24
                    lg:py-28
                "
            >

                {/* Background */}

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        left-1/2
                        top-0
                        h-64
                        w-64
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-full
                        bg-pink-100
                        blur-3xl
                    "
                />


                <div
                    className="
                        relative
                        mx-auto
                        max-w-6xl
                    "
                >

                    {/* Heading */}

                    <div className="mx-auto max-w-2xl text-center">

                        <span
                            className="
                                text-xs
                                font-bold
                                uppercase
                                tracking-[0.25em]
                                text-pink-500
                                sm:text-sm
                            "
                        >
                            Why KOKO Memory
                        </span>


                        <h2
                            className="
                                mt-4
                                text-3xl
                                font-extrabold
                                tracking-tight
                                text-slate-900
                                sm:text-4xl
                                lg:text-5xl
                            "
                        >
                            ทำไมต้อง KOKO Memory?
                        </h2>


                        <p
                            className="
                                mt-4
                                text-sm
                                leading-7
                                text-slate-500
                                sm:text-base
                                sm:leading-8
                            "
                        >
                            เราไม่ได้ส่งมอบเพียงภาพถ่าย
                            แต่ต้องการให้ทุกคนได้กลับไปพร้อมความทรงจำดี ๆ
                        </p>

                    </div>


                    {/* Features */}

                    <div
                        className="
                            mt-12
                            grid
                            gap-5
                            sm:grid-cols-2
                            lg:grid-cols-4
                        "
                    >

                        {/* Feature 1 */}

                        <div
                            className="
                                rounded-3xl
                                border
                                border-white
                                bg-white
                                p-6
                                text-center
                                shadow-sm
                                transition
                                duration-300
                                hover:-translate-y-1
                                hover:shadow-xl
                            "
                        >

                            <div
                                className="
                                    mx-auto
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-pink-50
                                    text-2xl
                                "
                            >
                                📸
                            </div>

                            <h3
                                className="
                                    mt-5
                                    font-bold
                                    text-slate-900
                                "
                            >
                                ภาพคุณภาพดี
                            </h3>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                เก็บทุกโมเมนต์ให้สวยและน่าจดจำ
                            </p>

                        </div>


                        {/* Feature 2 */}

                        <div
                            className="
                                rounded-3xl
                                border
                                border-white
                                bg-white
                                p-6
                                text-center
                                shadow-sm
                                transition
                                duration-300
                                hover:-translate-y-1
                                hover:shadow-xl
                            "
                        >

                            <div
                                className="
                                    mx-auto
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-sky-50
                                    text-2xl
                                "
                            >
                                ⚡
                            </div>

                            <h3
                                className="
                                    mt-5
                                    font-bold
                                    text-slate-900
                                "
                            >
                                ใช้งานง่าย
                            </h3>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                แขกทุกวัยสามารถสนุกกับ Photobooth ได้
                            </p>

                        </div>


                        {/* Feature 3 */}

                        <div
                            className="
                                rounded-3xl
                                border
                                border-white
                                bg-white
                                p-6
                                text-center
                                shadow-sm
                                transition
                                duration-300
                                hover:-translate-y-1
                                hover:shadow-xl
                            "
                        >

                            <div
                                className="
                                    mx-auto
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-violet-50
                                    text-2xl
                                "
                            >
                                ✨
                            </div>

                            <h3
                                className="
                                    mt-5
                                    font-bold
                                    text-slate-900
                                "
                            >
                                ดีไซน์สวย
                            </h3>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                ออกแบบประสบการณ์ให้เข้ากับบรรยากาศงาน
                            </p>

                        </div>


                        {/* Feature 4 */}

                        <div
                            className="
                                rounded-3xl
                                border
                                border-white
                                bg-white
                                p-6
                                text-center
                                shadow-sm
                                transition
                                duration-300
                                hover:-translate-y-1
                                hover:shadow-xl
                            "
                        >

                            <div
                                className="
                                    mx-auto
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-amber-50
                                    text-2xl
                                "
                            >
                                💗
                            </div>

                            <h3
                                className="
                                    mt-5
                                    font-bold
                                    text-slate-900
                                "
                            >
                                ดูแลโดยทีมงาน
                            </h3>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                พร้อมดูแลและช่วยเหลือภายในงาน
                            </p>

                        </div>

                    </div>

                </div>

            </section>


            {/* ==================================================
                CTA
            ================================================== */}

            <section
                className="
                    relative
                    overflow-hidden
                    px-5
                    py-20
                    sm:px-6
                    sm:py-24
                    lg:py-28
                "
            >

                {/* Gradient Background */}

                <div
                    className="
                        absolute
                        inset-0
                        -z-10
                        bg-gradient-to-br
                        from-pink-50
                        via-white
                        to-sky-50
                    "
                />


                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        left-1/2
                        top-1/2
                        -z-10
                        h-72
                        w-72
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-full
                        bg-pink-200/30
                        blur-3xl
                    "
                />


                <div
                    className="
                        mx-auto
                        max-w-3xl
                        text-center
                    "
                >

                    <p
                        className="
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.25em]
                            text-pink-500
                            sm:text-sm
                        "
                    >
                        Make Your Moment
                    </p>


                    <h2
                        className="
                            mt-4
                            text-3xl
                            font-extrabold
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
                            text-sm
                            leading-7
                            text-slate-500
                            sm:text-base
                            sm:leading-8
                        "
                    >
                        เลือกแพ็กเกจที่เหมาะกับงานของคุณ
                        แล้วให้ KOKO Memory
                        ดูแลช่วงเวลาพิเศษของคุณ
                    </p>


                    <div
                        className="
                            mt-8
                            flex
                            flex-col
                            items-center
                            justify-center
                            gap-3
                            sm:flex-row
                        "
                    >

                        <a
                            href="/booking/package"
                            className="
                                inline-flex
                                w-full
                                items-center
                                justify-center
                                rounded-full
                                bg-pink-500
                                px-8
                                py-4
                                text-sm
                                font-bold
                                text-white
                                shadow-lg
                                shadow-pink-200
                                transition
                                duration-300
                                hover:-translate-y-1
                                hover:bg-pink-600
                                hover:shadow-xl
                                focus:outline-none
                                focus:ring-2
                                focus:ring-pink-500
                                focus:ring-offset-2
                                sm:w-auto
                                sm:px-10
                                sm:text-base
                            "
                        >
                            ดูแพ็กเกจ
                        </a>


                        <a
                            href="/contact"
                            className="
                                inline-flex
                                w-full
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-slate-200
                                bg-white
                                px-8
                                py-4
                                text-sm
                                font-bold
                                text-slate-700
                                shadow-sm
                                transition
                                duration-300
                                hover:-translate-y-1
                                hover:border-pink-200
                                hover:text-pink-500
                                sm:w-auto
                            "
                        >
                            ติดต่อเรา
                        </a>

                    </div>

                </div>

            </section>


            {/* ==================================================
                FOOTER
            ================================================== */}

            <Footer />

        </main>
    );
}