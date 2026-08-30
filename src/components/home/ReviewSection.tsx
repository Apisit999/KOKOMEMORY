import { Star } from "lucide-react";
import Image from "next/image";

const reviews = [
    {
        name: "คุณออย",
        event: "Wedding",
        image: "/review/user1.jpg",
        review:
            "ทีมงานบริการดีมาก ตรงเวลา รูปสวย แขกทุกคนประทับใจ แนะนำเลยค่ะ",
    },
    {
        name: "คุณบาส",
        event: "Corporate Event",
        image: "/review/user2.jpg",
        review:
            "ระบบ Live Gallery ใช้งานง่าย ดาวน์โหลดรูปได้ทันที งานออกมาดูมืออาชีพมาก",
    },
    {
        name: "คุณฝ้าย",
        event: "Birthday",
        image: "/review/user3.jpg",
        review:
            "ชอบพร็อพและคุณภาพรูปมาก ทีมงานดูแลดี ถ้ามีงานอีกจะใช้บริการแน่นอน",
    },
];

export default function ReviewSection() {
    return (
        <section className="bg-[#FFF9FC] py-16 sm:py-20 lg:py-28">

            <div className="mx-auto max-w-7xl px-4 sm:px-6">

                <div className="text-center">

                    <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        TESTIMONIALS
                    </span>

                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                        รีวิวจากลูกค้า
                    </h2>

                    <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-gray-500">
                        ความประทับใจจากลูกค้าที่ใช้บริการ KOKO Memory
                    </p>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 grid gap-8 lg:grid-cols-3">

                    {reviews.map((item, index) => (

                        <div
                            key={index}
                            className="rounded-[28px] sm:rounded-[35px] bg-white p-6 sm:p-8 lg:p-10 shadow-xl transition hover:-translate-y-2 hover:shadow-2xl"
                        >

                            <div className="flex gap-1">

                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={20}
                                        className="fill-yellow-400 text-yellow-400"
                                    />
                                ))}

                            </div>

                            <p className="mt-8 leading-7 sm:leading-8 text-gray-600">

                                "{item.review}"

                            </p>

                            <div className="mt-10 flex items-center gap-4">

                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={70}
                                    height={70}
                                    className="rounded-full object-cover"
                                />

                                <div>

                                    <h3 className="font-bold text-slate-900">
                                        {item.name}
                                    </h3>

                                    <p className="text-gray-500">
                                        {item.event}
                                    </p>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        </section>
    );
}