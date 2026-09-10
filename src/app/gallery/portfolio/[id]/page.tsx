"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
    ArrowLeft,
    CalendarDays,
    Images,
} from "lucide-react";

import PortfolioLightbox from "@/components/gallery/PortfolioLightbox";

interface PortfolioImage {
    id?: string;
    url: string;
    name?: string;
    alt?: string;
    order?: number;
}

interface Portfolio {
    id: string;
    title: string;
    description: string;
    category: string;
    eventDate: string;
    coverImage: string;
    images: PortfolioImage[];
}

export default function PortfolioDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [portfolio, setPortfolio] =
        useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        async function loadPortfolio() {
            try {
                setLoading(true);
                setError(false);

                const response = await fetch(
                    `/api/gallery/portfolio/${encodeURIComponent(id)}`,
                    { cache: "no-store" }
                );
                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    throw new Error("API ไม่ได้ตอบกลับเป็น JSON");
                }

                const data = await response.json();

                if (!response.ok || data.success !== true) {
                    throw new Error(data.error || "ไม่พบ Portfolio");
                }

                if (!cancelled) {
                    setPortfolio(data.portfolio as Portfolio);
                }
            } catch {
                if (!cancelled) {
                    setPortfolio(null);
                    setError(true);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPortfolio();

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white px-6">
                <p className="text-sm font-semibold text-slate-400">
                    กำลังโหลดผลงาน...
                </p>
            </main>
        );
    }


    /* ============================================================
       NOT FOUND
    ============================================================ */

    if (error || !portfolio) {

        return (

            <main
                className="
                    flex
                    min-h-screen
                    items-center
                    justify-center
                    bg-white
                    px-6
                "
            >

                <div
                    className="
                        w-full
                        max-w-lg
                        rounded-[2rem]
                        border
                        border-slate-100
                        bg-slate-50
                        px-6
                        py-16
                        text-center
                        shadow-sm
                    "
                >

                    <div
                        className="
                            mx-auto
                            flex
                            h-16
                            w-16
                            items-center
                            justify-center
                            rounded-2xl
                            bg-white
                            text-slate-300
                            shadow-sm
                        "
                    >

                        <Images size={28} />

                    </div>


                    <h1
                        className="
                            mt-6
                            text-2xl
                            font-black
                            tracking-tight
                            text-slate-900
                        "
                    >
                        ไม่พบผลงานนี้
                    </h1>


                    <p
                        className="
                            mt-3
                            text-sm
                            leading-7
                            text-slate-500
                        "
                    >
                        Portfolio ที่คุณกำลังค้นหา
                        อาจถูกลบหรือยังไม่มีอยู่ในระบบ
                    </p>


                    <Link
                        href="/gallery/portfolio"
                        className="
                            mt-7
                            inline-flex
                            items-center
                            justify-center
                            rounded-full
                            bg-slate-900
                            px-7
                            py-3.5
                            text-sm
                            font-bold
                            text-white
                            transition-all
                            duration-300
                            hover:-translate-y-0.5
                            hover:bg-pink-500
                        "
                    >
                        กลับไปดูผลงาน
                    </Link>

                </div>

            </main>

        );

    }


    /* ============================================================
       DATA
    ============================================================ */

    const images = [...(portfolio.images ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );


    const coverImage =
        portfolio.coverImage ||
        images[0]?.url ||
        "";


    return (

        <main
            className="
                min-h-screen
                overflow-hidden
                bg-white
            "
        >

            {/* ==================================================
                HERO
            ================================================== */}

            <section
                className="
                    relative
                    isolate
                    overflow-hidden
                    bg-[#0d1b3a]
                    px-5
                    pb-16
                    pt-28
                    text-white
                    sm:px-6
                    sm:pb-20
                    sm:pt-32
                    lg:px-8
                    lg:pb-24
                    lg:pt-36
                "
            >

                {/* Background glow */}

                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        -left-40
                        -top-40
                        -z-10
                        h-[500px]
                        w-[500px]
                        rounded-full
                        bg-pink-500/10
                        blur-[130px]
                    "
                />


                <div
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        -right-40
                        top-20
                        -z-10
                        h-[500px]
                        w-[500px]
                        rounded-full
                        bg-blue-400/10
                        blur-[130px]
                    "
                />


                <div
                    className="
                        mx-auto
                        max-w-7xl
                    "
                >

                    {/* Back */}

                    <Link
                        href="/gallery/portfolio"
                        className="
                            group
                            inline-flex
                            items-center
                            gap-2
                            rounded-full
                            border
                            border-white/10
                            bg-white/[0.05]
                            px-4
                            py-2.5
                            text-xs
                            font-semibold
                            text-white/70
                            backdrop-blur-xl
                            transition-all
                            duration-300
                            hover:-translate-x-1
                            hover:border-white/20
                            hover:bg-white/10
                            hover:text-white
                        "
                    >

                        <ArrowLeft
                            size={14}
                        />

                        กลับไปดูผลงาน

                    </Link>


                    {/* Content */}

                    <div
                        className="
                            mt-10
                            max-w-4xl
                        "
                    >

                        {portfolio.category && (

                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-[0.32em]
                                    text-pink-300
                                "
                            >
                                {portfolio.category}
                            </p>

                        )}


                        <h1
                            className="
                                mt-5
                                text-4xl
                                font-black
                                leading-[1.05]
                                tracking-[-0.035em]
                                text-white
                                sm:text-5xl
                                lg:text-7xl
                            "
                        >
                            {portfolio.title}
                        </h1>


                        <div
                            className="
                                mt-6
                                flex
                                flex-wrap
                                items-center
                                gap-x-5
                                gap-y-3
                                text-xs
                                text-white/45
                            "
                        >

                            {portfolio.eventDate && (

                                <span
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                    "
                                >

                                    <CalendarDays
                                        size={14}
                                    />

                                    {portfolio.eventDate}

                                </span>

                            )}


                            <span
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                "
                            >

                                <Images
                                    size={14}
                                />

                                {images.length} รูป

                            </span>

                        </div>


                        {portfolio.description && (

                            <p
                                className="
                                    mt-7
                                    max-w-2xl
                                    text-sm
                                    leading-8
                                    text-white/60
                                    sm:text-base
                                "
                            >
                                {portfolio.description}
                            </p>

                        )}

                    </div>

                </div>

            </section>


            {/* ==================================================
                COVER
            ================================================== */}

            <section
                className="
                    px-5
                    py-8
                    sm:px-6
                    sm:py-12
                    lg:px-8
                    lg:py-16
                "
            >

                <div
                    className="
                        mx-auto
                        max-w-7xl
                    "
                >

                    {coverImage && (

                        <div
                            className="
                                relative
                                overflow-hidden
                                rounded-[2rem]
                                bg-slate-100
                                shadow-[0_30px_90px_rgba(15,23,42,0.12)]
                                sm:rounded-[2.75rem]
                            "
                        >

                            <img
                                src={coverImage}
                                alt={
                                    portfolio.title
                                }
                                className="
                                    max-h-[78vh]
                                    w-full
                                    object-cover
                                "
                                loading="eager"
                                decoding="async"
                            />

                        </div>

                    )}

                </div>

            </section>


            {/* ==================================================
                STORY
            ================================================== */}

            {portfolio.description && (

                <section
                    className="
                        px-5
                        pb-10
                        sm:px-6
                        sm:pb-16
                        lg:px-8
                    "
                >

                    <div
                        className="
                            mx-auto
                            grid
                            max-w-7xl
                            gap-8
                            lg:grid-cols-[0.7fr_1fr]
                            lg:gap-20
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    tracking-[0.3em]
                                    text-pink-500
                                "
                            >
                                THE STORY
                            </p>


                            <h2
                                className="
                                    mt-4
                                    text-3xl
                                    font-black
                                    tracking-tight
                                    text-slate-900
                                    sm:text-4xl
                                "
                            >
                                เรื่องราวของงาน
                            </h2>

                        </div>


                        <p
                            className="
                                text-sm
                                leading-8
                                text-slate-500
                                sm:text-base
                            "
                        >
                            {portfolio.description}
                        </p>

                    </div>

                </section>

            )}


            {/* ==================================================
                GALLERY
            ================================================== */}

            {images.length > 0 && (

                <section
                    className="
                        px-5
                        pb-24
                        pt-10
                        sm:px-6
                        sm:pb-32
                        lg:px-8
                    "
                >

                    <div
                        className="
                            mx-auto
                            max-w-7xl
                        "
                    >

                        <div
                            className="
                                mb-8
                                flex
                                items-end
                                justify-between
                                gap-6
                            "
                        >

                            <div>

                                <p
                                    className="
                                        text-[10px]
                                        font-black
                                        tracking-[0.3em]
                                        text-pink-500
                                    "
                                >
                                    MOMENTS
                                </p>


                                <h2
                                    className="
                                        mt-3
                                        text-3xl
                                        font-black
                                        tracking-tight
                                        text-slate-900
                                        sm:text-4xl
                                    "
                                >
                                    ภาพบรรยากาศ
                                </h2>

                            </div>


                            <span
                                className="
                                    hidden
                                    text-xs
                                    font-medium
                                    text-slate-400
                                    sm:block
                                "
                            >
                                {images.length} รูป
                            </span>

                        </div>


                        <div
                            className="
                                columns-1
                                gap-5
                                sm:columns-2
                                lg:columns-3
                            "
                        >

                            {images.map(
                                (
                                    image,
                                    index
                                ) => (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setLightboxIndex(index)
                                        }
                                        aria-label={`เปิดรูปที่ ${index + 1}`}
                                        key={
                                            image.id ||
                                            image.url ||
                                            index
                                        }
                                        className="
                                            mb-5
                                            break-inside-avoid
                                            overflow-hidden
                                            rounded-[1.5rem]
                                            bg-slate-100
                                            shadow-sm
                                            transition-all
                                            duration-500
                                            hover:-translate-y-1
                                            hover:shadow-xl
                                        "
                                    >

                                        <img
                                            src={
                                                image.url
                                            }
                                            alt={
                                                image.alt ||
                                                image.name ||
                                                `${portfolio.title} ${index + 1}`
                                            }
                                            loading={
                                                index < 3
                                                    ? "eager"
                                                    : "lazy"
                                            }
                                            decoding="async"
                                            className="
                                                h-auto
                                                w-full
                                                object-cover
                                                transition-transform
                                                duration-700
                                                hover:scale-[1.025]
                                            "
                                        />

                                    </button>

                                )
                            )}

                        </div>

                    </div>

                </section>

            )}


            {lightboxIndex !== null && (
                <PortfolioLightbox
                    images={images}
                    title={portfolio.title}
                    activeIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onPrevious={() =>
                        setLightboxIndex(
                            (current) =>
                                current === null
                                    ? 0
                                    : (current - 1 + images.length) %
                                      images.length
                        )
                    }
                    onNext={() =>
                        setLightboxIndex(
                            (current) =>
                                current === null
                                    ? 0
                                    : (current + 1) % images.length
                        )
                    }
                    onSelect={setLightboxIndex}
                />
            )}


            {/* ==================================================
                CTA
            ================================================== */}

            <section
                className="
                    px-5
                    pb-20
                    sm:px-6
                    sm:pb-28
                    lg:px-8
                "
            >

                <div
                    className="
                        relative
                        mx-auto
                        max-w-6xl
                        overflow-hidden
                        rounded-[2.5rem]
                        bg-gradient-to-br
                        from-pink-400
                        via-pink-500
                        to-pink-600
                        px-6
                        py-16
                        text-center
                        shadow-[0_30px_90px_rgba(236,72,153,0.20)]
                        sm:px-10
                        sm:py-20
                    "
                >

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            -right-28
                            -top-28
                            h-72
                            w-72
                            rounded-full
                            border
                            border-white/10
                            bg-white/[0.06]
                        "
                    />


                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            -bottom-32
                            -left-24
                            h-80
                            w-80
                            rounded-full
                            border
                            border-white/10
                            bg-white/[0.05]
                        "
                    />


                    <div className="relative z-10">

                        <p
                            className="
                                text-[10px]
                                font-black
                                tracking-[0.32em]
                                text-pink-100
                            "
                        >
                            YOUR SPECIAL DAY
                        </p>


                        <h2
                            className="
                                mt-5
                                text-3xl
                                font-black
                                leading-tight
                                text-white
                                sm:text-4xl
                            "
                        >
                            อยากให้ KOKO Memory
                            <br />
                            เป็นส่วนหนึ่งในวันของคุณไหม?
                        </h2>


                        <p
                            className="
                                mx-auto
                                mt-5
                                max-w-xl
                                text-sm
                                leading-7
                                text-pink-50
                                sm:text-base
                            "
                        >
                            ให้เราเป็นส่วนหนึ่งในการสร้าง
                            ความทรงจำดี ๆ ของคุณ
                        </p>


                        <Link
                            href="/booking"
                            className="
                                mt-8
                                inline-flex
                                items-center
                                justify-center
                                rounded-full
                                bg-white
                                px-9
                                py-4
                                text-sm
                                font-bold
                                text-pink-500
                                shadow-xl
                                transition-all
                                duration-300
                                hover:-translate-y-1
                                hover:scale-[1.02]
                                hover:shadow-2xl
                            "
                        >
                            เริ่มจองคิว
                        </Link>

                    </div>

                </div>

            </section>

        </main>

    );

}