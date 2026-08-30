"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
    {
        question: "ต้องจองล่วงหน้ากี่วัน ?",
        answer:
            "แนะนำให้จองล่วงหน้าอย่างน้อย 7-30 วัน เพื่อให้เลือกวันและเวลาที่ต้องการได้",
    },
    {
        question: "ให้บริการนอกสถานที่หรือไม่ ?",
        answer:
            "ให้บริการทั้งในกรุงเทพฯ ปริมณฑล และต่างจังหวัด โดยอาจมีค่าเดินทางเพิ่มเติม",
    },
    {
        question: "สามารถออกแบบ Photo Strip ได้หรือไม่ ?",
        answer:
            "ได้ ฟรี! ทีมงานสามารถออกแบบ Template ให้เข้ากับธีมงานของคุณ",
    },
    {
        question: "แขกสามารถดาวน์โหลดรูปได้อย่างไร ?",
        answer:
            "หลังถ่ายรูปสามารถสแกน QR Code เพื่อดูและดาวน์โหลดรูปจาก Live Gallery ได้ทันที",
    },
    {
        question: "สามารถปริ้นรูปได้ไม่จำกัดหรือไม่ ?",
        answer:
            "ขึ้นอยู่กับแพ็กเกจที่เลือก โดยแพ็กเกจ Premium และ VIP รองรับ Unlimited Print",
    },
];

export default function FAQSection() {
    const [open, setOpen] = useState(0);

    return (
        <section className="bg-white py-16 sm:py-20 lg:py-28">

            <div className="mx-auto max-w-5xl px-4 sm:px-6">

                <div className="text-center">

                    <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        FAQ
                    </span>

                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                        คำถามที่พบบ่อย
                    </h2>

                    <p className="mt-6 text-base sm:text-lg text-gray-500">
                        หากมีคำถามเพิ่มเติมสามารถติดต่อทีมงานได้ตลอดเวลา
                    </p>

                </div>

                <div className="mt-10 sm:mt-12 lg:mt-16 space-y-4 sm:space-y-5">

                    {faqs.map((item, index) => (

                        <div
                            key={index}
                            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md"
                        >

                            <button
                                onClick={() =>
                                    setOpen(open === index ? -1 : index)
                                }
                                className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-5 sm:py-6 text-left"
                            >

                                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900">
                                    {item.question}
                                </h3>

                                <ChevronDown
                                    className={`transition ${open === index ? "rotate-180" : ""
                                        }`}
                                />

                            </button>

                            {open === index && (

                                <div className="border-t px-4 sm:px-6 lg:px-8 py-5 sm:py-6">

                                    <p className="leading-7 sm:leading-8 text-gray-600">
                                        {item.answer}
                                    </p>

                                </div>

                            )}

                        </div>

                    ))}

                </div>

            </div>

        </section>
    );
}