"use client";

import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
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
        <footer className="bg-[#151515] text-white">

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">

                <div className="grid gap-10 sm:gap-12 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr]">

                    {/* Company */}

                    <div>

                        <div>

                            <h2 className="sr-only">KOKO Memory</h2>

                            <BrandLogo tone="white" size="lg" />

                            <span className="hairline-accent mt-6" />

                        </div>

                        <p className="mt-6 max-w-md text-sm leading-7 text-white/70 sm:mt-8 sm:text-base sm:leading-8">

                            {translate("บริการเช่า Photobooth โปรแกรม Photobooth ซอฟต์แวร์ธุรกิจ และงานออกแบบ/พิมพ์ 3D พร้อมดูแลทุกขั้นตอน")}

                        </p>

                        <div className="mt-8 space-y-4 text-sm sm:text-base">

                            <div className="flex items-center gap-3">

                                <Phone
                                    size={20}
                                    className="text-white/50"
                                />

                                <a href="tel:+66800819933" className="inline-flex min-h-11 items-center text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]">080-081-9933</a>

                            </div>

                            <div className="flex items-center gap-3">

                                <MessageCircle
                                    size={20}
                                    className="text-white/50"
                                />

                                <a href={socialLinks.line} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]">@024ppzhh</a>

                            </div>

                            <div className="flex items-center gap-3">

                                <Mail
                                    size={20}
                                    className="text-white/50"
                                />

                                <a href="mailto:kokomemory@gmail.com" className="inline-flex min-h-11 items-center break-all text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a79bd8]">kokomemory@gmail.com</a>

                            </div>

                        </div>

                    </div>

                    {/* Menu */}

                    <div>

                        <h3 className="mb-8 font-sans text-[13px] font-medium tracking-[0.08em] text-white/50">
                            {t("footer.menu")}
                        </h3>

                        <ul className="space-y-4">

                            <li>

                                <Link
                                    href="/"
                                    className="flex min-h-10 items-center gap-2 text-white/70 transition hover:text-white"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.home")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/about"
                                    className="flex min-h-10 items-center gap-2 text-white/70 hover:text-white"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.about")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/gallery/portfolio"
                                    className="flex min-h-10 items-center gap-2 text-white/70 hover:text-white"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.portfolio")}

                                </Link>

                            </li>

                            <li>

                                <Link
                                    href="/packages"
                                    className="flex min-h-10 items-center gap-2 text-white/70 hover:text-white"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.packages")}

                                </Link>

                            </li>

                            <li><Link href="/photobooth" className="flex min-h-10 items-center gap-2 text-white/70 hover:text-white"><ChevronRight size={16} />Photobooth</Link></li>

                            <li><Link href="/software" className="flex min-h-10 items-center gap-2 text-white/70 hover:text-white"> <ChevronRight size={16} />Software</Link></li>

                            <li>

                                <Link
                                    href="/contact"
                                    className="flex min-h-10 items-center gap-2 text-white/70 hover:text-white"
                                >

                                    <ChevronRight size={16} />

                                    {t("common.contact")}

                                </Link>

                            </li>

                        </ul>

                    </div>

                    {/* Services */}

                    <div>

                        <h3 className="mb-8 font-sans text-[13px] font-medium tracking-[0.08em] text-white/50">
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

                        <h3 className="mb-8 font-sans text-[13px] font-medium tracking-[0.08em] text-white/50">
                            {t("footer.follow")}
                        </h3>

                        <div className="space-y-5">

                            <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-[2px] border border-white/15 p-4 transition hover:border-white"
                            >

                                <FaFacebookF size={20} />

                                Facebook

                            </a>

                            <a
                                href={socialLinks.line}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-[2px] border border-white/15 p-4 transition hover:border-white"
                            >

                                <MessageCircle />

                                LINE

                            </a>

                            <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-[2px] border border-white/15 p-4 transition hover:border-white"
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

                        <p className="text-center text-sm sm:text-base text-white/60"><Link href="/terms" className="inline-block py-2 underline hover:text-white">ข้อกำหนดการใช้บริการ</Link> · <Link href="/privacy" className="inline-block py-2 underline hover:text-white">นโยบายความเป็นส่วนตัว</Link></p>

                        <p className="text-center text-sm sm:text-base text-white/40">

                            Bangkok · Thailand

                        </p>

                    </div>

                </div>

            </div>

        </footer>
    );
}
