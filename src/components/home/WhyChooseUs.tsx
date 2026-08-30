import {
    Camera,
    QrCode,
    Download,
    Sparkles,
    Users,
    ShieldCheck,
} from "lucide-react";

const features = [
    {
        icon: Camera,
        title: "DSLR Full Frame",
        desc: "ถ่ายภาพคมชัด สีสวย ด้วยกล้อง DSLR ระดับมืออาชีพ",
    },
    {
        icon: Sparkles,
        title: "Unlimited Print",
        desc: "ปริ้นรูปไม่จำกัดตลอดระยะเวลาการให้บริการ",
    },
    {
        icon: QrCode,
        title: "QR Download",
        desc: "สแกน QR Code เพื่อดาวน์โหลดรูปได้ทันที",
    },
    {
        icon: Download,
        title: "Live Gallery",
        desc: "อัปโหลดรูปขึ้นเว็บไซต์แบบเรียลไทม์",
    },
    {
        icon: Users,
        title: "Professional Team",
        desc: "ทีมงานดูแลตลอดงาน พร้อมช่วยแขกทุกคน",
    },
    {
        icon: ShieldCheck,
        title: "Premium Quality",
        desc: "อุปกรณ์คุณภาพสูง พร้อมไฟ Studio และพร็อพครบชุด",
    },
];

export default function WhyChooseUs() {
    return (
        <section className="bg-[#0F172A] py-16 sm:py-20 lg:py-28 text-white">

            <div className="mx-auto max-w-7xl px-4 sm:px-6">

                <div className="text-center">

                    <span className="rounded-full bg-pink-500/20 px-5 py-2 text-sm font-semibold tracking-[0.3em] text-pink-300 uppercase">
                        WHY CHOOSE US
                    </span>

                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold">
                        ทำไมต้องเลือก KOKO Memory
                    </h2>

                    <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-gray-300">
                        เราให้บริการ Photobooth แบบครบวงจร
                        พร้อมระบบ Live Gallery และทีมงานมืออาชีพ
                        ที่จะช่วยให้ทุกช่วงเวลาของคุณกลายเป็นความทรงจำที่ดีที่สุด
                    </p>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

                    {features.map((item, index) => {

                        const Icon = item.icon;

                        return (

                            <div
                                key={index}
                                className="
                  rounded-[30px]
                  border
                  border-white/10
                  bg-white/5
                  p-6 sm:p-8 lg:p-10
                  backdrop-blur-xl
                  transition
                  duration-500
                  hover:-translate-y-2
                  hover:border-pink-500
                  hover:bg-white/10
                "
                            >

                                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-pink-500">

                                    <Icon size={36} />

                                </div>

                                <h3 className="mt-8 text-xl sm:text-2xl font-bold">

                                    {item.title}

                                </h3>

                                <p className="mt-5 leading-7 sm:leading-8 text-gray-300">

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