import Image from "next/image";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const highlights = [
    {
        number: "01",
        title: "คุณภาพของภาพ",
        description:
            "เราให้ความสำคัญกับคุณภาพของภาพและบรรยากาศของงาน เพื่อให้ทุกภาพสามารถเก็บความรู้สึกของช่วงเวลานั้นไว้ได้อย่างดีที่สุด",
    },
    {
        number: "02",
        title: "ประสบการณ์ของผู้ใช้งาน",
        description:
            "ออกแบบระบบให้ใช้งานง่าย ตั้งแต่การถ่ายภาพ การรับภาพ ไปจนถึงการเข้าถึง Gallery ผ่าน QR Code",
    },
    {
        number: "03",
        title: "ดูแลตลอดงาน",
        description:
            "ทีมงานพร้อมดูแลอุปกรณ์และระบบตลอดระยะเวลาการให้บริการ เพื่อให้งานดำเนินไปอย่างราบรื่น",
    },
];

const services = [
    "Wedding Photobooth",
    "360 Booth",
    "Live Gallery",
    "Backdrop",
    "Template Design",
    "QR Download",
];

export default function AboutPage() {
    return (
        <>
            <Navbar />

            <main className="min-h-screen bg-white">

                {/* =====================================================
                    HERO
                ====================================================== */}

                <section className="relative overflow-hidden bg-[#223B73] px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-32">

                    {/* Decorative light */}

                    <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />

                    <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-pink-400/10 blur-3xl" />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">

                        {/* TEXT */}

                        <div>

                            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">

                                <span className="h-2 w-2 rounded-full bg-pink-400" />

                                <span className="text-xs font-semibold tracking-[0.25em] text-pink-100 sm:text-sm">
                                    KOKO MEMORY
                                </span>

                            </div>

                            <h1 className="mt-7 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                                เราสร้างมากกว่า
                                <br />
                                <span className="text-pink-400">
                                    ภาพถ่าย
                                </span>
                            </h1>

                            <p className="mt-6 max-w-xl text-base leading-8 text-white/70 sm:text-lg sm:leading-9">
                                เราตั้งใจสร้างประสบการณ์ Photobooth
                                ที่ช่วยเก็บช่วงเวลาพิเศษ
                                และเปลี่ยนภาพถ่ายให้กลายเป็นความทรงจำ
                                ที่สามารถกลับมาเปิดดูได้อีกครั้ง
                            </p>

                        </div>


                        {/* IMAGE */}

                        <div className="relative mx-auto w-full max-w-lg lg:ml-auto">

                            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-2 shadow-2xl backdrop-blur-sm sm:rounded-[2.5rem]">

                                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">

                                    <Image
                                        src="/about/about2.png"
                                        alt="KOKO Memory Photobooth"
                                        fill
                                        priority
                                        sizes="(max-width: 1024px) 100vw, 50vw"
                                        className="object-cover transition duration-700 hover:scale-105"
                                    />

                                </div>

                            </div>


                            {/* Experience Badge */}

                            <div className="absolute -bottom-5 left-4 rounded-2xl bg-pink-500 px-5 py-4 text-white shadow-xl sm:-bottom-7 sm:left-8 sm:px-7 sm:py-5">

                                <p className="text-3xl font-bold sm:text-4xl">
                                    5+
                                </p>

                                <p className="mt-1 text-xs font-medium text-pink-100 sm:text-sm">
                                    ปีแห่งประสบการณ์
                                </p>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    OUR STORY
                ====================================================== */}

                <section className="px-4 py-20 sm:px-6 sm:py-28 lg:py-32">

                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">

                        {/* IMAGE */}

                        <div className="relative">

                            <div className="overflow-hidden rounded-[2rem] shadow-xl sm:rounded-[2.5rem]">

                                <Image
                                    src="/about/about.jpg"
                                    alt="KOKO Memory"
                                    width={900}
                                    height={1000}
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="h-auto w-full object-cover transition duration-700 hover:scale-105"
                                />

                            </div>

                        </div>


                        {/* CONTENT */}

                        <div>

                            <p className="text-sm font-semibold tracking-[0.3em] text-pink-500">
                                เรื่องราวของเรา
                            </p>

                            <h2 className="mt-5 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">

                                เพราะบางช่วงเวลา

                                <br />

                                <span className="text-pink-500">
                                    มีค่าเกินกว่าจะลืม
                                </span>

                            </h2>

                            <div className="mt-7 space-y-5 text-base leading-8 text-slate-500">

                                <p>
                                    KOKO Memory
                                    ให้บริการ Photobooth สำหรับงานแต่งงาน
                                    งานเลี้ยง งานเปิดตัวสินค้า งานองค์กร
                                    และงาน Event ในรูปแบบต่าง ๆ
                                </p>

                                <p>
                                    เราเชื่อว่าภาพถ่ายไม่ได้เป็นเพียงภาพหนึ่งภาพ
                                    แต่เป็นตัวแทนของความรู้สึก ผู้คน
                                    และเรื่องราวที่เกิดขึ้นในช่วงเวลานั้น
                                </p>

                                <p>
                                    ด้วยเหตุนี้เราจึงให้ความสำคัญทั้งในเรื่อง
                                    คุณภาพของภาพ ประสบการณ์ของผู้ใช้งาน
                                    ระบบ Gallery และการดูแลตลอดระยะเวลาของงาน
                                </p>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    HIGHLIGHTS
                ====================================================== */}

                <section className="bg-slate-50 px-4 py-20 sm:px-6 sm:py-28 lg:py-32">

                    <div className="mx-auto max-w-7xl">

                        <div className="max-w-2xl">

                            <p className="text-sm font-semibold tracking-[0.3em] text-pink-500">
                                สิ่งที่เราให้ความสำคัญ
                            </p>

                            <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                                ตั้งแต่ภาพแรก
                                <br />
                                จนถึงความทรงจำหลังจบงาน
                            </h2>

                            <p className="mt-5 text-sm leading-7 text-slate-500 sm:text-base">
                                เราใส่ใจทั้งคุณภาพ ประสบการณ์
                                และการบริการ เพื่อให้ทุกงานเป็นช่วงเวลาที่น่าจดจำ
                            </p>

                        </div>


                        <div className="mt-12 grid gap-5 md:grid-cols-3">

                            {highlights.map((item) => (
                                <div
                                    key={item.number}
                                    className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-pink-200 hover:shadow-xl hover:shadow-pink-100/30 sm:p-8"
                                >

                                    <div className="flex items-center justify-between">

                                        <span className="text-4xl font-bold text-pink-200">
                                            {item.number}
                                        </span>

                                        <span className="h-px w-12 bg-slate-200 transition-all duration-300 group-hover:w-20 group-hover:bg-pink-200" />

                                    </div>

                                    <h3 className="mt-7 text-xl font-bold text-slate-900">
                                        {item.title}
                                    </h3>

                                    <p className="mt-4 text-sm leading-7 text-slate-500">
                                        {item.description}
                                    </p>

                                </div>
                            ))}

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    SERVICES
                ====================================================== */}

                <section className="px-4 py-20 sm:px-6 sm:py-28 lg:py-32">

                    <div className="mx-auto max-w-7xl">

                        <div className="text-center">

                            <p className="text-sm font-semibold tracking-[0.3em] text-pink-500">
                                บริการของเรา
                            </p>

                            <h2 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                                ออกแบบประสบการณ์ให้เหมาะกับงานของคุณ
                            </h2>

                            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                                เลือกรูปแบบบริการและระบบที่เหมาะกับบรรยากาศ
                                และรูปแบบของงานแต่ละประเภท
                            </p>

                        </div>


                        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {services.map((service) => (
                                <div
                                    key={service}
                                    className="group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-100/30"
                                >

                                    <p className="font-semibold text-slate-800 transition group-hover:text-pink-500">
                                        {service}
                                    </p>

                                </div>
                            ))}

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    EXPERIENCE
                ====================================================== */}

                <section className="relative overflow-hidden bg-[#223B73] px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-32">

                    <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-20">

                        <div>

                            <p className="text-sm font-semibold tracking-[0.3em] text-pink-300">
                                KOKO MEMORY
                            </p>

                            <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                                ความทรงจำที่ดี
                                <br />
                                เริ่มต้นจากช่วงเวลาที่ดี
                            </h2>

                        </div>

                        <div className="text-sm leading-8 text-white/70 sm:text-base">

                            <p>
                                เราตั้งใจพัฒนา Photobooth
                                และระบบที่เกี่ยวข้องให้สามารถทำงานร่วมกันได้อย่างลงตัว
                            </p>

                            <p className="mt-5">
                                ตั้งแต่การถ่ายภาพ ระบบ Live Gallery
                                ไปจนถึงการดาวน์โหลดภาพผ่าน QR Code
                                เพื่อให้ลูกค้าสามารถกลับมาเข้าถึง
                                ความทรงจำของตัวเองได้ง่าย
                            </p>

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    CTA
                ====================================================== */}

                <section className="px-4 py-20 sm:px-6 sm:py-28">

                    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-pink-500 px-6 py-14 text-center shadow-xl shadow-pink-100 sm:px-10 sm:py-16">

                        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10" />

                        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/10" />

                        <div className="relative">

                            <p className="text-sm font-semibold tracking-[0.3em] text-pink-100">
                                KOKO MEMORY
                            </p>

                            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
                                ให้เราเป็นส่วนหนึ่ง
                                <br />
                                ของความทรงจำของคุณ
                            </h2>

                            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-pink-50">
                                ไม่ว่าจะเป็นงานแต่ง งานเลี้ยง Event
                                หรืองานพิเศษรูปแบบไหน
                                เราพร้อมดูแลช่วงเวลาสำคัญของคุณ
                            </p>

                        </div>

                    </div>

                </section>

            </main>

            <Footer />
        </>
    );
}