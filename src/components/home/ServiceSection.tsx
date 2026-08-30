import {
    Camera,
    Heart,
    Building2,
    Cake,
    GraduationCap,
    Sparkles,
    Printer,
} from "lucide-react";

const services = [
    {
        icon: Camera,
        title: "Wedding Photobooth",
        desc: "บริการ Photobooth สำหรับงานแต่ง พร้อมอุปกรณ์ครบชุด",
    },
    {
        icon: GraduationCap,
        title: "Graduation",
        desc: "เก็บภาพความทรงจำวันสำคัญกับเพื่อนและครอบครัว",
    },
    {
        icon: Cake,
        title: "Birthday Party",
        desc: "สนุกกับ Photo Strip และพร็อพสุดน่ารักในงานวันเกิด",
    },
    {
        icon: Heart,
        title: "Live Gallery",
        desc: "ดูและดาวน์โหลดรูปได้ทันทีผ่าน เว็บไซด์ Live Gallery ของเรา",
    },
    {
        icon: Sparkles,
        title: "360 Video Booth",
        desc: "บริการถ่ายวิดีโอ 360° พร้อมแชร์ลง Social Media",
    },
    {
        icon: Printer,
        title: "3D Printing",
        desc: "รับผลิตชิ้นงาน 3D ตามแบบ พร้อมบริการขึ้นรูปชิ้นงานตามความต้องการ",
    },
];

export default function ServiceSection() {
    return (
        <section className="bg-[#f8fafc] py-16 sm:py-20 lg:py-28">

            <div className="mx-auto max-w-7xl px-4 sm:px-6">

                <div className="text-center">

                    <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        OUR SERVICES
                    </span>

                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                        บริการของเรา
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-gray-500">
                        ให้บริการ Photobooth ครบวงจร
                        พร้อมระบบ Live Gallery และอุปกรณ์ระดับมืออาชีพ
                    </p>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

                    {services.map((item, index) => {

                        const Icon = item.icon;

                        return (

                            <div
                                key={index}
                                className="
                                group
                                rounded-3xl
                                bg-white
                                p-6 sm:p-8 lg:p-10
                                shadow-lg
                                transition-all
                                duration-500
                                hover:-translate-y-3
                                hover:shadow-2xl
                                "
                            >

                                <div
                                    className="
                                    flex
                                    h-16
                                    w-16 sm:h-20
                                    sm:w-20
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-pink-100
                                    transition
                                    group-hover:bg-pink-500
                                    "
                                >

                                    <Icon
                                        size={38}
                                        className="text-pink-500 group-hover:text-white"
                                    />

                                </div>

                                <h3 className="mt-8 text-xl sm:text-2xl font-bold text-slate-900">
                                    {item.title}
                                </h3>

                                <p className="mt-5 leading-7 sm:leading-8 text-gray-500">
                                    {item.desc}
                                </p>

                            </div>

                        );

                    })}

                </div>

            </div>

        </section>
    );
}