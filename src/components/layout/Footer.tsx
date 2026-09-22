"use client";

import Image from "next/image";
import Link from "next/link";
import {
    Phone,
    MapPin,
    Mail,
    MessageCircle,
    ChevronRight,
} from "lucide-react";

import {
    FaFacebookF,
    FaInstagram,
} from "react-icons/fa";
import { useI18n } from "@/i18n";
import { socialLinks } from "@/config/social-links";
export default function Footer() {
    const { t, translate } = useI18n();

    return (
        <footer className="bg-[#223B73] text-white">

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">

                <div className="grid gap-10 sm:gap-12 lg:grid-cols-4">

                    {/* Company */}

                    <div>

                        <div className="flex items-center gap-4">

                            <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full">

                                <Image
                                    src="/logo/logo.jpg"
                                    alt="KOKO Memory"
                                    fill
                                    priority
                                    className="object-cover"
                                />

                            </div>

                            <div>

                                <h2 className="text-2xl sm:text-3xl font-bold">
                                    KOKO Memory
                                </h2>

                                <p className="text-pink-300">
                                    {t("footer.weddingPhotobooth")}
                                </p>

                            </div>

                        </div>

                        <p className="mt-6 sm:mt-8 leading-7 sm:leading-8 text-white/70">

                            {translate("บริการ Photobooth งานแต่ง งานอีเวนต์ งานเลี้ยง งานเปิดตัวสินค้า พร้อมระบบ Live Gallery ดาวน์โหลดรูปผ่าน QR Code")}

                        </p>

                        <div className="mt-8 space-y-4">

                            <div className="flex items-center gap-3">

                                <Phone
                                    size={20}
                                    className="text-pink-400"
                                />

                                080-081-9933

                            </div>

                            <div className="flex items-center gap-3">

                                <MessageCircle
                                    size={20}
                                    className="text-green-400"
                                />

                                @024ppzhh

                            </div>

                            <div className="flex items-center gap-3">

                                <Mail
                                    size={20}
                                    className="text-blue-300"
                                />

                                info@kokomemory.com

                            </div>

                        </div>

                    </div>

                    {/* Menu */}

                    <div>

                        <h3 className="mb-8 text-2xl font-bold">
                            {t("footer.menu")}
                        </h3>

                        <ul className="space-y-4">

                            <li>

                                <Link
                                    href="/"
                                    className="flex items-center gap-2 text-white/70 transition hover:text-pink-300"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.home")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/about"
                                    className="flex items-center gap-2 text-white/70 hover:text-pink-300"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.about")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/gallery/portfolio"
                                    className="flex items-center gap-2 text-white/70 hover:text-pink-300"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.portfolio")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/packages"
                                    className="flex items-center gap-2 text-white/70 hover:text-pink-300"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.packages")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/contact"
                                    className="flex items-center gap-2 text-white/70 hover:text-pink-300"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.contact")}

                                </Link>

                            </li>

                        </ul>

                    </div>

                    {/* Services */}

                    <div>

                        <h3 className="mb-8 text-2xl font-bold">
                            {t("footer.services")}
                        </h3>

                        <ul className="space-y-4 text-white/70">

                            <li>Wedding Photobooth</li>

                            <li>360 Booth</li>

                            <li>Live Gallery</li>

                            <li>Backdrop</li>

                            <li>Template Design</li>

                            <li>QR Download</li>

                        </ul>

                    </div>

                    {/* Social */}

                    <div>

                        <h3 className="mb-8 text-2xl font-bold">
                            {t("footer.follow")}
                        </h3>

                        <div className="space-y-5">

                            <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-pink-500"
                            >

                                <FaFacebookF size={20} />

                                Facebook

                            </a>

                            <a
                                href={socialLinks.line}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-green-500"
                            >

                                <MessageCircle />

                                LINE

                            </a>

                            <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-pink-600"
                            >

                                <FaInstagram size={20} />

                                Instagram

                            </a>

                            <div className="mt-8 flex items-start gap-3 text-white/70">

                                <MapPin
                                    size={22}
                                    className="mt-1"
                                />

                                <p>

                                    Bangkok, Thailand

                                    <br />

                                    {t("footer.nationwide")}

                                </p>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="mt-12 sm:mt-16 lg:mt-20 border-t border-white/10 pt-8">

                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

                        <p className="text-center text-sm sm:text-base text-white/50">

                            © 2026 KOKO Memory.
                            All Rights Reserved.

                        </p>

                        <p className="text-center text-sm sm:text-base text-white/40">

                            Designed with ❤️ by KOKO Memory

                        </p>

                    </div>

                </div>

            </div>

        </footer>
    );
}
