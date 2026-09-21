"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n";

export default function FAQSection() {
    const [open, setOpen] = useState(0);
    const { t } = useI18n();
    const faqs = [
        ["faq.q1", "faq.a1"], ["faq.q2", "faq.a2"], ["faq.q3", "faq.a3"],
        ["faq.q4", "faq.a4"], ["faq.q5", "faq.a5"],
    ] as const;

    return (
        <section className="bg-white py-16 sm:py-20 lg:py-28">

            <div className="mx-auto max-w-5xl px-4 sm:px-6">

                <div className="text-center">

                    <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        FAQ
                    </span>

                    <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                        {t("faq.badge")}
                    </h2>

                    <p className="mt-6 text-base sm:text-lg text-gray-500">
                        {t("faq.description")}
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
                                    {t(item[0])}
                                </h3>

                                <ChevronDown
                                    className={`transition ${open === index ? "rotate-180" : ""
                                        }`}
                                />

                            </button>

                            {open === index && (

                                <div className="border-t px-4 sm:px-6 lg:px-8 py-5 sm:py-6">

                                    <p className="leading-7 sm:leading-8 text-gray-600">
                                        {t(item[1])}
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
