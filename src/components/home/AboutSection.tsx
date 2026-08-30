import Image from "next/image";
import Link from "next/link";
import {
    Camera,
    Zap,
    Users,
    ImageIcon,
} from "lucide-react";

const features = [
    {
        icon: Camera,
        title: "ภาพคุณภาพสูง",
        description: "ใช้กล้อง DSLR Full Frame พร้อมระบบไฟ Studio",
    },
    {
        icon: Zap,
        title: "Live Gallery",
        description: "ส่งภาพเข้าสู่ระบบและดาวน์โหลดผ่าน QR Code",
    },
    {
        icon: Users,
        title: "ทีมงานดูแล",
        description: "มีทีมงานดูแลอุปกรณ์และให้บริการตลอดงาน",
    },
    {
        icon: ImageIcon,
        title: "เก็บทุกความทรงจำ",
        description: "รองรับงานแต่ง งานเลี้ยง Event และงานองค์กร",
    },
];

export default function AboutSection() {
    return (
        <section className="bg-white py-16 sm:py-20 lg:py-28">

            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">

                {/* =========================
                    IMAGE
                ========================= */}

                <div className="relative">

                    <div className="overflow-hidden rounded-[28px] shadow-2xl sm:rounded-[40px]">

                        <Image
                            src="/about/about.jpg"
                            alt="KOKO Memory Photobooth"
                            width={700}
                            height={850}
                            className="h-full w-full object-cover transition duration-700 hover:scale-105"
                        />

                    </div>

                    {/* Experience Badge */}

                    <div className="absolute -bottom-5 right-4 rounded-3xl bg-pink-500 p-5 text-white shadow-xl sm:-bottom-8 sm:-right-6 sm:p-7 lg:-bottom-10 lg:-right-10 lg:p-8">

                        <h3 className="text-4xl font-bold sm:text-5xl">
                            5+
                        </h3>

                        <p className="mt-2 text-base sm:text-lg">
                            Years Experience
                        </p>

                    </div>

                </div>


                {/* =========================
                    CONTENT
                ========================= */}

                <div>

                    <span className="inline-block rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        ABOUT US
                    </span>

                    <h2 className="mt-7 text-4xl font-bold text-slate-900 sm:text-5xl">
                        เราสร้างมากกว่า
                        <span className="text-pink-500">
                            {" "}ภาพถ่าย
                        </span>
                    </h2>

                    <p className="mt-7 text-base leading-8 text-gray-600 sm:text-lg sm:leading-9">
                        KOKO Memory คือผู้ให้บริการ Photobooth
                        สำหรับงานแต่งงาน งานเลี้ยง งานเปิดตัวสินค้า
                        งานองค์กร และงาน Event ทุกประเภท
                    </p>

                    <p className="mt-5 text-base leading-8 text-gray-600 sm:text-lg sm:leading-9">
                        เราให้ความสำคัญกับคุณภาพของภาพ ประสบการณ์ของผู้ใช้งาน
                        และการดูแลตลอดระยะเวลาของงาน
                        เพื่อให้ทุกคนได้รับความทรงจำที่ดีที่สุดกลับไป
                    </p>


                    {/* Features */}

                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">

                        {features.map((item) => {

                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.title}
                                    className="group rounded-2xl border border-slate-100 bg-slate-50 p-5 transition duration-300 hover:-translate-y-1 hover:border-pink-100 hover:bg-pink-50"
                                >

                                    <div className="flex items-start gap-4">

                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-500 transition group-hover:bg-pink-500 group-hover:text-white">
                                            <Icon size={22} />
                                        </div>

                                        <div>

                                            <h3 className="font-bold text-slate-900">
                                                {item.title}
                                            </h3>

                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                {item.description}
                                            </p>

                                        </div>

                                    </div>

                                </div>
                            );

                        })}

                    </div>


                    {/* Button */}

                    <Link
                        href="/about"
                        className="mt-10 inline-flex w-full items-center justify-center rounded-full bg-pink-500 px-8 py-4 font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-pink-400 hover:shadow-pink-500/30 sm:w-auto"
                    >
                        ดูรายละเอียดเพิ่มเติม
                    </Link>


                </div>

            </div>

        </section>
    );
}