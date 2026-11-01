"use client";

import Image from "next/image";
import brandLogo from "../../../public/logo/logo.jpg";
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
        <footer className="border-t border-white/10 bg-[#0B0B0F] text-white">

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">

                <div className="grid gap-10 sm:gap-12 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr]">

                    {/* Company */}

                    <div>

                        <div className="flex items-center gap-4">

                            <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full">

                                <Image
                                    src={brandLogo}
                                    alt="KOKO Memory"
                                    fill
                                    priority
                                    className="object-cover"
                                    sizes="(max-width: 640px) 56px, 64px"
                                />

                            </div>

                            <div>

                                <h2 className="text-2xl sm:text-3xl font-bold">
                                    KOKO Memory
                                </h2>

                                <p className="text-[#FF8CC4]">
                                    Creative Technology Studio
                                </p>

                            </div>

                        </div>

                        <p className="mt-6 max-w-md text-sm leading-7 text-white/70 sm:mt-8 sm:text-base sm:leading-8">

                            {translate("บริการเช่า Photobooth โปรแกรม Photobooth ซอฟต์แวร์ธุรกิจ และงานออกแบบ/พิมพ์ 3D พร้อมดูแลทุกขั้นตอน")}

                        </p>

                        <div className="mt-8 space-y-4 text-sm sm:text-base">

                            <div className="flex items-center gap-3">

                                <Phone
                                    size={20}
                                    className="text-[#FF8CC4]"
                                />

                                <a href="tel:+66800819933" className="text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]">080-081-9933</a>

                            </div>

                            <div className="flex items-center gap-3">

                                <MessageCircle
                                    size={20}
                                    className="text-green-400"
                                />

                                <a href={socialLinks.line} target="_blank" rel="noopener noreferrer" className="text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]">@024ppzhh</a>

                            </div>

                            <div className="flex items-center gap-3">

                                <Mail
                                    size={20}
                                    className="text-[#FF8CC4]"
                                />

                                <a href="mailto:kokomemory@gmail.com" className="break-all text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4FA3]">kokomemory@gmail.com</a>

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

                            <li><Link href="/photobooth" className="flex items-center gap-2 text-white/70 hover:text-[#D5EE85]"><ChevronRight size={16} />Photobooth</Link></li>

                            <li><Link href="/software" className="flex items-center gap-2 text-white/70 hover:text-[#D5EE85]"> <ChevronRight size={16} />Software</Link></li>

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

                            <li>Photobooth rental</li>

                            <li>Photobooth software</li>

                            <li>3D printing</li>

                            <li>Business software</li>

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
                                className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-[#778E38]"
                            >

                                <MessageCircle />

                                LINE

                            </a>

                            <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-[#778E38]"
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
