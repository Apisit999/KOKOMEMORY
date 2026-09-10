"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Search,
    CalendarDays,
    Menu,
    X,
} from "lucide-react";

const menus = [
    { title: "หน้าแรก", href: "/" },
    { title: "ผลงาน", href: "/gallery/portfolio" },
    { title: "บริการ", href: "/services" },
    { title: "แพ็กเกจ", href: "/packages" },
    { title: "3D Print", href: "/3d-printing" },
    { title: "เกี่ยวกับเรา", href: "/about" },
    { title: "ติดต่อ", href: "/contact" },
];

export default function Navbar() {
    const [scroll, setScroll] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScroll(window.scrollY > 40);
        };

        handleScroll();

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    return (
        <>
            {/* =================================================
                NAVBAR
            ================================================= */}

            <header
                className={`
                    fixed left-0 right-0 top-0 z-[9999]
                    w-full
                    transition-all duration-500
                    ${scroll
                        ? "bg-white/95 shadow-lg backdrop-blur-xl"
                        : "bg-black/20 backdrop-blur-md"
                    }
                `}
            >

                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:h-24 sm:px-6 lg:px-8">

                    {/* =========================
                        LOGO
                    ========================= */}

                    <Link
                        href="/"
                        className="group flex items-center gap-3"
                    >

                        <Image
                            src="/logo/logo.jpg"
                            alt="KOKO Memory"
                            width={56}
                            height={56}
                            priority
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-white/20 transition duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
                        />

                        <div>

                            <h1
                                className={`
                                    text-xl font-bold tracking-tight
                                    transition-colors duration-300
                                    sm:text-2xl
                                    ${scroll
                                        ? "text-slate-900"
                                        : "text-white"
                                    }
                                `}
                            >
                                KOKO Memory
                            </h1>

                            <p
                                className={`
                                    hidden text-[10px] uppercase tracking-[0.18em] sm:block
                                    ${scroll
                                        ? "text-slate-400"
                                        : "text-white/60"
                                    }
                                `}
                            >
                                Photobooth & Event
                            </p>

                        </div>

                    </Link>


                    {/* =========================
                        RIGHT SIDE
                    ========================= */}

                    <div className="flex items-center gap-2 sm:gap-3">

                        {/* ค้นหารูป */}

                        <Link
                            href="/search"
                            className={`
                                hidden items-center gap-2 rounded-full
                                px-5 py-3 text-sm font-medium
                                transition duration-300
                                sm:flex
                                ${scroll
                                    ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                                    : "bg-white/10 text-white hover:bg-white/20"
                                }
                            `}
                        >
                            <Search size={18} />
                            ค้นหารูป
                        </Link>


                        {/* จองคิว */}

                        <Link
                            href="/booking"
                            className="hidden items-center gap-2 rounded-full bg-pink-500 px-6 py-3 font-semibold text-white shadow-lg shadow-pink-500/20 transition duration-300 hover:-translate-y-0.5 hover:bg-pink-400 sm:flex"
                        >
                            <CalendarDays size={18} />
                            จองคิว
                        </Link>


                        {/* =========================
                            MENU 3 ขีด
                        ========================= */}

                        <button
                            type="button"
                            aria-label="เปิดเมนู"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen(true)}
                            className={`
                                flex h-11 w-11 items-center justify-center
                                rounded-full transition duration-300
                                ${scroll
                                    ? "text-slate-900 hover:bg-slate-100"
                                    : "bg-white/10 text-white hover:bg-white/20"
                                }
                            `}
                        >
                            <Menu size={28} />
                        </button>

                    </div>

                </div>

            </header>


            {/* =================================================
                OVERLAY
            ================================================= */}

            <div
                onClick={() => setMenuOpen(false)}
                className={`
                    fixed inset-0 z-[10000]
                    transition-all duration-300
                    ${menuOpen
                        ? "visible bg-black/60 opacity-100"
                        : "invisible opacity-0"
                    }
                `}
            >

                {/* =================================================
                    SIDEBAR
                ================================================= */}

                <aside
                    onClick={(e) => e.stopPropagation()}
                    className={`
                        absolute right-0 top-0
                        flex h-full
                        w-[min(380px,90vw)]
                        flex-col
                        bg-white
                        shadow-2xl
                        transition-transform duration-300
                        ${menuOpen
                            ? "translate-x-0"
                            : "translate-x-full"
                        }
                    `}
                >

                    {/* =========================
                        SIDEBAR HEADER
                    ========================= */}

                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                        <Link
                            href="/"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3"
                        >

                            <Image
                                src="/logo/logo.jpg"
                                alt="KOKO Memory"
                                width={46}
                                height={46}
                                className="rounded-full object-cover"
                            />

                            <div>

                                <h2 className="text-xl font-bold text-slate-900">
                                    KOKO Memory
                                </h2>

                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                    Photobooth & Event
                                </p>

                            </div>

                        </Link>


                        {/* ปิด */}

                        <button
                            type="button"
                            aria-label="ปิดเมนู"
                            onClick={() => setMenuOpen(false)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                        >
                            <X size={25} />
                        </button>

                    </div>


                    {/* =========================
                        MENU CONTENT
                    ========================= */}

                    <nav className="flex-1 overflow-y-auto px-5 py-6">

                        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                            MENU
                        </p>


                        {menus.map((item) => (

                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="block rounded-2xl px-4 py-4 text-lg font-medium text-slate-700 transition duration-200 hover:bg-pink-50 hover:text-pink-500"
                            >
                                {item.title}
                            </Link>

                        ))}


                        <div className="my-6 h-px bg-slate-100" />


                        {/* ค้นหารูป */}

                        <Link
                            href="/search"
                            onClick={() => setMenuOpen(false)}
                            className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-pink-50 py-4 font-semibold text-pink-600 transition hover:bg-pink-100"
                        >
                            <Search size={19} />
                            ค้นหารูป
                        </Link>


                        {/* จองคิว */}

                        <Link
                            href="/booking"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-pink-500 py-4 font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:bg-pink-400"
                        >
                            <CalendarDays size={19} />
                            จองคิว
                        </Link>


                        <div className="my-8 h-px bg-slate-100" />


                        {/* =========================
                            SOCIAL
                        ========================= */}

                        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                            SOCIAL MEDIA
                        </p>


                        <a
                            href="https://www.facebook.com/share/1EsxWaJ8th/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl px-3 py-3 text-sm text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                            Facebook
                        </a>


                        <a
                            href="https://www.instagram.com/photobooth.koko"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl px-3 py-3 text-sm text-slate-500 transition hover:bg-pink-50 hover:text-pink-500"
                        >
                            Instagram
                        </a>


                        <a
                            href="https://line.me/R/ti/p/@024ppzhh"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl px-3 py-3 text-sm text-slate-500 transition hover:bg-green-50 hover:text-green-600"
                        >
                            LINE Official
                        </a>


                        {/* =========================
                            PHONE
                        ========================= */}

                        <a
                            href="tel:0800819933"
                            className="mt-8 block rounded-2xl bg-slate-50 p-5 transition hover:bg-pink-50"
                        >

                            <p className="text-xs text-slate-400">
                                โทรติดต่อ
                            </p>

                            <p className="mt-1 text-xl font-bold text-pink-500">
                                080-081-9933
                            </p>

                        </a>

                    </nav>

                </aside>

            </div>
        </>
    );
}