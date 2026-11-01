import {
    MessageCircle,
    CalendarCheck,
    Camera,
    Download,
} from "lucide-react";

const steps = [
    {
        icon: MessageCircle,
        title: "ติดต่อสอบถาม",
        desc: "ติดต่อผ่าน LINE, Facebook หรือโทรศัพท์ เพื่อแจ้งวัน เวลา และรายละเอียดงาน",
    },
    {
        icon: CalendarCheck,
        title: "จองคิว",
        desc: "เลือกแพ็กเกจที่เหมาะสม พร้อมชำระเงินมัดจำเพื่อยืนยันการจอง",
    },
    {
        icon: Camera,
        title: "วันงาน",
        desc: "ทีมงานเดินทางไปติดตั้งอุปกรณ์ พร้อมให้บริการตลอดงาน",
    },
    {
        icon: Download,
        title: "รับรูปภาพ",
        desc: "ดาวน์โหลดรูปผ่าน Live Gallery และ QR Code ได้ทันที",
    },
];

export default function ProcessSection() {
    return (
        <section className="bg-white py-16 sm:py-20 lg:py-28">

            <div className="mx-auto max-w-7xl px-4 sm:px-6">

                <div className="text-center">

                    <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        HOW WE WORK
                    </span>

                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                        ขั้นตอนการให้บริการ
                    </h2>

                    <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-gray-500">
                        เพียง 4 ขั้นตอนง่าย ๆ ก็สามารถมี Photobooth
                        ระดับมืออาชีพในงานของคุณได้
                    </p>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 grid gap-6 sm:p-8 lg:p-10 md:grid-cols-2 lg:grid-cols-4">

                    {steps.map((step, index) => {

                        const Icon = step.icon;

                        return (

                            <div
                                key={index}
                                className="relative rounded-[30px] bg-slate-50 p-6 sm:p-8 lg:p-10 text-center shadow-lg transition hover:-translate-y-2 hover:shadow-2xl"
                            >

                                <div className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 font-bold text-white">
                                    {index + 1}
                                </div>

                                <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-pink-100">

                                    <Icon
                                        size={38}
                                        className="text-pink-500"
                                    />

                                </div>

                                <h3 className="mt-8 text-xl sm:text-2xl font-bold text-slate-900">
                                    {step.title}
                                </h3>

                                <p className="mt-5 leading-7 sm:leading-8 text-gray-500">
                                    {step.desc}
                                </p>

                            </div>

                        );

                    })}

                </div>

            </div>

        </section>
    );
}