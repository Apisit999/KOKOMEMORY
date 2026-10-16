"use client";

import {
    Phone,
    Mail,
    MessageCircle,
    ArrowUpRight,
    CalendarDays,
} from "lucide-react";

import {
    FaInstagram,
    FaFacebookF,
} from "react-icons/fa";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { socialLinks } from "@/config/social-links";

const mainContacts = [
    {
        icon: Phone,
        title: "โทรศัพท์",
        value: "080-081-9933",
        description: "สอบถามรายละเอียดและจองคิว",
        link: "tel:0800819933",
        color: "bg-pink-100 text-pink-500",
        action: "โทรหาเรา",
    },
    {
        icon: Mail,
        title: "อีเมล",
        value: "kokomemory@gmail.com",
        description: "สำหรับติดต่อเรื่องงานและบริการ",
        link: "mailto:kokomemory@gmail.com",
        color: "bg-blue-100 text-blue-500",
        action: "ส่งอีเมล",
    },
    {
        icon: MessageCircle,
        title: "LINE Official",
        value: "@024ppzhh",
        description: "พูดคุยกับทีมงานโดยตรง",
        link: socialLinks.line,
        color: "bg-green-100 text-green-500",
        action: "แชทกับเรา",
    },
];

const socialContacts = [
    {
        icon: FaInstagram,
        title: "Instagram",
        value: "@kokomemory",
        description: "ติดตามผลงานและภาพบรรยากาศจากงานต่าง ๆ",
        link: socialLinks.instagram,
        color: "bg-pink-100 text-pink-500",
    },
    {
        icon: FaFacebookF,
        title: "Facebook",
        value: "KOKO Memory",
        description: "ข่าวสาร โปรโมชั่น และผลงานของเรา",
        link: socialLinks.facebook,
        color: "bg-blue-100 text-blue-600",
    },
];

export default function ContactInfo() {
    const { translate } = useI18n();
    return (
        <section className="bg-white py-24">

            <div className="mx-auto max-w-7xl px-6">

                {/* =========================
                    HEADER
                ========================= */}

                <div className="mx-auto mb-16 max-w-3xl text-center">

                    <span className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
                        CONTACT INFORMATION
                    </span>

                    <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                        ติดต่อเราได้ทุกช่องทาง
                    </h2>

                    <p className="mt-6 text-lg leading-8 text-slate-500">
                        ทีมงาน KOKO Memory พร้อมให้คำแนะนำ
                        และดูแลคุณตั้งแต่การสอบถามรายละเอียด
                        ไปจนถึงการให้บริการในวันงาน
                    </p>

                </div>


                {/* =========================
                    MAIN CONTACT
                ========================= */}

                <div className="grid gap-6 md:grid-cols-3">

                    {mainContacts.map((item) => {

                        const Icon = item.icon;

                        return (
                            <a
                                key={item.title}
                                href={item.link}
                                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:border-pink-200 hover:shadow-xl"
                            >

                                {/* Decorative */}
                                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-50 opacity-0 transition duration-300 group-hover:opacity-100" />

                                {/* Icon */}

                                <div
                                    className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${item.color}`}
                                >
                                    <Icon size={30} />
                                </div>

                                {/* Content */}

                                <div className="relative mt-7">

                                    <h3 className="text-2xl font-bold text-slate-900">
                                        {translate(item.title)}
                                    </h3>

                                    <p className="mt-3 text-lg font-semibold text-slate-800">
                                        {item.value}
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {translate(item.description)}
                                    </p>

                                </div>

                                {/* Action */}

                                <div className="relative mt-7 flex items-center justify-between border-t border-slate-100 pt-5">

                                    <span className="text-sm font-semibold text-pink-500">
                                        {translate(item.action)}
                                    </span>

                                    <ArrowUpRight
                                        size={20}
                                        className="text-slate-400 transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-pink-500"
                                    />

                                </div>

                            </a>
                        );
                    })}

                </div>


                {/* =========================
                    SOCIAL MEDIA
                ========================= */}

                <div className="mt-20">

                    <div className="mb-8 text-center">

                        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                            SOCIAL MEDIA
                        </span>

                        <h3 className="mt-3 text-3xl font-bold text-slate-900">
                            ติดตามผลงานของเรา
                        </h3>

                    </div>


                    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">

                        {socialContacts.map((item) => {

                            const Icon = item.icon;

                            return (
                                <a
                                    key={item.title}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-pink-200 hover:shadow-lg"
                                >

                                    {/* Icon */}

                                    <div
                                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${item.color}`}
                                    >
                                        <Icon size={28} />
                                    </div>


                                    {/* Text */}

                                    <div className="min-w-0 flex-1">

                                        <h4 className="text-xl font-bold text-slate-900">
                                            {item.title}
                                        </h4>

                                        <p className="mt-1 font-medium text-pink-500">
                                            {item.value}
                                        </p>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {translate(item.description)}
                                        </p>

                                    </div>


                                    {/* Arrow */}

                                    <ArrowUpRight
                                        size={22}
                                        className="shrink-0 text-slate-400 transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-pink-500"
                                    />

                                </a>
                            );

                        })}

                    </div>

                </div>


                {/* =========================
                    CTA
                ========================= */}

                <div className="mt-20 overflow-hidden rounded-[2rem] bg-slate-900 px-8 py-14 text-center shadow-xl md:px-16">

                    <div className="mx-auto max-w-3xl">

                        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-400">
                            LET&apos;S WORK TOGETHER
                        </span>

                        <h3 className="mt-4 text-3xl font-black text-white md:text-4xl">
                            มีงานหรือโปรเจกต์ที่กำลังมองหาอยู่?
                        </h3>

                        <p className="mt-5 text-lg leading-8 text-white/60">
                            ไม่ว่าจะเป็น Photobooth, 360 Video Booth,
                            งานอีเวนต์ หรือบริการรับผลิต 3D Printing
                            สามารถติดต่อทีมงานเพื่อพูดคุยรายละเอียดได้เลย
                        </p>


                        <div className="mt-8 flex flex-wrap justify-center gap-4">

                            <Link
                                href="/booking"
                                className="flex items-center gap-2 rounded-full bg-pink-500 px-7 py-4 font-semibold text-white transition duration-300 hover:-translate-y-1 hover:bg-pink-400"
                            >
                                <CalendarDays size={19} />
                                จองคิว
                            </Link>

                            <a
                                href="tel:0800819933"
                                className="rounded-full border border-white/20 px-7 py-4 font-semibold text-white transition duration-300 hover:bg-white hover:text-slate-900"
                            >
                                โทรหาเรา
                            </a>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}
