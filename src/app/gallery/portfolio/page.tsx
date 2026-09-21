/**
 * ============================================================
 * KOKO Memory
 * Corporate Premium Portfolio
 * ============================================================
 *
 * Design Direction
 * ------------------------------------------------------------
 * Premium
 * Cinematic
 * Corporate
 * Wedding
 * Editorial
 * 3D Atmosphere
 *
 * Important
 * ------------------------------------------------------------
 * ไม่เปลี่ยน Font
 * ไม่แตะ Portfolio API
 * ไม่แตะ R2
 * ไม่แตะ Firestore
 * ไม่แตะ Live Gallery
 * ใช้ GalleryGrid เดิม
 *
 * Hero Video
 * ------------------------------------------------------------
 * /public/videos/koko-memory-portfolio-background.mp4
 *
 * สามารถเปลี่ยนเป็น Cloud Video CDN ได้ในอนาคต
 * โดยไม่ต้องเปลี่ยนโครงสร้างหน้า
 * ============================================================
 */

import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import GalleryGrid from "@/components/gallery/GalleryGrid";
import PortfolioText from "@/components/gallery/PortfolioText";
import type { MessageKey } from "@/i18n";

export const metadata: Metadata = {
    title: "ผลงาน | KOKO Memory",
    description:
        "ชมผลงาน Photobooth และ Event Experience จาก KOKO Memory",
    alternates: {
        canonical: "/gallery/portfolio",
    },
    openGraph: {
        title: "ผลงาน | KOKO Memory",
        description:
            "ชมผลงาน Photobooth และ Event Experience จาก KOKO Memory",
        url: "/gallery/portfolio",
        type: "website",
    },
};


/* ============================================================
   PARTICLES
   ============================================================ */

const particles = [
    { left: "5%", top: "18%", size: 2, delay: "-2s", duration: "18s" },
    { left: "11%", top: "62%", size: 3, delay: "-9s", duration: "22s" },
    { left: "18%", top: "30%", size: 2, delay: "-14s", duration: "25s" },
    { left: "27%", top: "72%", size: 2, delay: "-5s", duration: "20s" },
    { left: "35%", top: "20%", size: 3, delay: "-17s", duration: "24s" },
    { left: "43%", top: "64%", size: 2, delay: "-7s", duration: "21s" },
    { left: "51%", top: "28%", size: 2, delay: "-11s", duration: "27s" },
    { left: "59%", top: "76%", size: 3, delay: "-3s", duration: "23s" },
    { left: "67%", top: "18%", size: 2, delay: "-19s", duration: "26s" },
    { left: "74%", top: "52%", size: 2, delay: "-8s", duration: "20s" },
    { left: "82%", top: "28%", size: 3, delay: "-13s", duration: "24s" },
    { left: "91%", top: "66%", size: 2, delay: "-4s", duration: "28s" },
    { left: "96%", top: "37%", size: 2, delay: "-16s", duration: "22s" },
];


const stars = [
    {
        left: "14%",
        top: "23%",
        size: 15,
        delay: "-3s",
        duration: "7s",
    },
    {
        left: "57%",
        top: "19%",
        size: 11,
        delay: "-5s",
        duration: "9s",
    },
    {
        left: "78%",
        top: "30%",
        size: 16,
        delay: "-8s",
        duration: "8s",
    },
    {
        left: "70%",
        top: "70%",
        size: 12,
        delay: "-2s",
        duration: "10s",
    },
];


/* ============================================================
   PAGE
   ============================================================ */

export default function GalleryPage() {
    const t = (key: MessageKey) => <PortfolioText k={key} />;

    return (

        <>

            <Navbar />


            <main className="min-h-screen overflow-hidden bg-white">


                {/* ==================================================
                    HERO
                ================================================== */}

                <section
                    className="
                        relative
                        isolate
                        overflow-hidden
                        bg-[#0d1b3a]
                        text-white
                    "
                >

                    {/* ==================================================
                        VIDEO
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            absolute
                            inset-0
                            -z-30
                            overflow-hidden
                        "
                    >

                        <video
                            className="
                                h-full
                                w-full
                                object-cover
                                object-center
                            "
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        >

                            <source
                                src="/videos/koko-memory-portfolio-background.mp4"
                                type="video/mp4"
                            />

                        </video>

                    </div>


                    {/* ==================================================
                        VIDEO COLOR GRADE
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            -z-20
                            bg-[#0d1b3a]/65
                        "
                    />


                    {/* Left readable gradient */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            -z-20
                            bg-gradient-to-r
                            from-[#08152f]/95
                            via-[#102450]/65
                            to-transparent
                        "
                    />


                    {/* Top / bottom grade */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            -z-20
                            bg-gradient-to-b
                            from-[#07132e]/40
                            via-transparent
                            to-[#07152f]/80
                        "
                    />


                    {/* ==================================================
                        ATMOSPHERIC LIGHT
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            -left-48
                            -top-48
                            -z-10
                            h-[520px]
                            w-[520px]
                            rounded-full
                            bg-pink-500/14
                            blur-[130px]
                            motion-safe:animate-[kokoGlow_12s_ease-in-out_infinite]
                        "
                    />


                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            right-[-220px]
                            top-[18%]
                            -z-10
                            h-[620px]
                            w-[620px]
                            rounded-full
                            bg-blue-400/10
                            blur-[150px]
                            motion-safe:animate-[kokoGlow_15s_ease-in-out_infinite_reverse]
                        "
                    />


                    {/* ==================================================
                        STAR / PARTICLE FIELD
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            -z-10
                            overflow-hidden
                        "
                    >

                        {particles.map((particle, index) => (

                            <span
                                key={`particle-${index}`}
                                className="
                                    absolute
                                    rounded-full
                                    bg-white
                                    opacity-30
                                    shadow-[0_0_10px_rgba(255,255,255,0.65)]
                                    motion-safe:animate-[kokoParticle_linear_infinite]
                                "
                                style={{
                                    left: particle.left,
                                    top: particle.top,
                                    width: `${particle.size}px`,
                                    height: `${particle.size}px`,
                                    animationDelay: particle.delay,
                                    animationDuration: particle.duration,
                                }}
                            />

                        ))}


                        {stars.map((star, index) => (

                            <span
                                key={`star-${index}`}
                                className="
                                    absolute
                                    text-white/55
                                    motion-safe:animate-[kokoStar_ease-in-out_infinite]
                                "
                                style={{
                                    left: star.left,
                                    top: star.top,
                                    fontSize: `${star.size}px`,
                                    animationDelay: star.delay,
                                    animationDuration: star.duration,
                                }}
                            >
                                ✦
                            </span>

                        ))}

                    </div>


                    {/* ==================================================
                        SUBTLE GRID
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            -z-10
                            opacity-[0.035]
                            [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
                            [background-size:80px_80px]
                            [mask-image:linear-gradient(to_bottom,black,transparent_90%)]
                        "
                    />


                    {/* ==================================================
                        HERO CONTAINER
                    ================================================== */}

                    <div
                        className="
                            relative
                            z-10
                            mx-auto
                            flex
                            min-h-[680px]
                            max-w-7xl
                            items-center
                            px-5
                            pb-20
                            pt-28
                            sm:min-h-[720px]
                            sm:px-6
                            sm:pt-32
                            lg:min-h-[750px]
                            lg:px-8
                        "
                    >

                        <div
                            className="
                                grid
                                w-full
                                items-center
                                gap-14
                                lg:grid-cols-[1.05fr_0.95fr]
                                lg:gap-10
                                xl:gap-20
                            "
                        >

                            {/* ==================================================
                                LEFT CONTENT
                            ================================================== */}

                            <div
                                className="
                                    max-w-3xl
                                    motion-safe:animate-[kokoHeroIn_900ms_ease-out_both]
                                "
                            >

                                {/* LABEL */}

                                <div
                                    className="
                                        inline-flex
                                        items-center
                                        gap-3
                                        rounded-full
                                        border
                                        border-white/15
                                        bg-white/[0.07]
                                        px-4
                                        py-2.5
                                        backdrop-blur-xl
                                    "
                                >

                                    <span
                                        className="
                                            relative
                                            flex
                                            h-2
                                            w-2
                                        "
                                    >

                                        <span
                                            className="
                                                absolute
                                                inset-0
                                                rounded-full
                                                bg-pink-400
                                                blur-[3px]
                                            "
                                        />

                                        <span
                                            className="
                                                relative
                                                h-2
                                                w-2
                                                rounded-full
                                                bg-pink-400
                                            "
                                        />

                                    </span>


                                    <span
                                        className="
                                            text-[10px]
                                            font-bold
                                            tracking-[0.32em]
                                            text-white/75
                                            sm:text-xs
                                        "
                                    >
                                        {t("portfolio.heroBadge")}
                                    </span>

                                </div>


                                {/* HEADING */}

                                <h1
                                    className="
                                        mt-7
                                        max-w-3xl
                                        text-5xl
                                        font-black
                                        leading-[1.02]
                                        tracking-[-0.045em]
                                        text-white
                                        sm:text-6xl
                                        md:text-7xl
                                        lg:text-[5.25rem]
                                        xl:text-[6rem]
                                    "
                                >

                                    {t("portfolio.heroLine1")}

                                    <br />

                                    <span
                                        className="
                                            bg-gradient-to-r
                                            from-white
                                            via-pink-200
                                            to-pink-400
                                            bg-clip-text
                                            text-transparent
                                            motion-safe:animate-[kokoGradient_8s_ease-in-out_infinite]
                                        "
                                    >
                                        {t("portfolio.heroLine2")}
                                    </span>

                                </h1>


                                {/* DESCRIPTION */}

                                <p
                                    className="
                                        mt-7
                                        max-w-2xl
                                        text-sm
                                        leading-8
                                        text-white/65
                                        sm:text-base
                                        lg:text-[17px]
                                    "
                                >

                                    {t("portfolio.heroDescription")}

                                </p>


                                {/* BUTTONS */}

                                <div
                                    className="
                                        mt-9
                                        flex
                                        flex-col
                                        gap-3
                                        sm:flex-row
                                    "
                                >

                                    <Link
                                        href="/gallery/portfolio"
                                        className="
                                            group
                                            inline-flex
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-pink-500
                                            px-7
                                            py-3.5
                                            text-sm
                                            font-bold
                                            text-white
                                            shadow-[0_16px_45px_rgba(236,72,153,0.28)]
                                            transition-all
                                            duration-300
                                            hover:-translate-y-1
                                            hover:bg-pink-400
                                            hover:shadow-[0_22px_55px_rgba(236,72,153,0.38)]
                                        "
                                    >

                                    {t("portfolio.viewWork")}

                                        <span
                                            className="
                                                ml-3
                                                transition-transform
                                                duration-300
                                                group-hover:translate-x-1
                                            "
                                        >
                                            →
                                        </span>

                                    </Link>


                                    <Link
                                        href="/about"
                                        className="
                                            inline-flex
                                            items-center
                                            justify-center
                                            rounded-full
                                            border
                                            border-white/15
                                            bg-white/[0.055]
                                            px-7
                                            py-3.5
                                            text-sm
                                            font-semibold
                                            text-white
                                            backdrop-blur-xl
                                            transition-all
                                            duration-300
                                            hover:-translate-y-1
                                            hover:border-white/25
                                            hover:bg-white/10
                                        "
                                    >

                                        {t("portfolio.aboutUs")}

                                    </Link>

                                </div>


                                {/* BRAND DETAILS */}

                                <div
                                    className="
                                        mt-9
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-x-5
                                        gap-y-2
                                        text-[10px]
                                        font-medium
                                        tracking-[0.08em]
                                        text-white/35
                                    "
                                >

                                    <span>
                                        {t("portfolio.realMoments")}
                                    </span>

                                    <span className="h-1 w-1 rounded-full bg-pink-400/70" />

                                    <span>
                                        {t("portfolio.madeWithCare")}
                                    </span>

                                    <span className="h-1 w-1 rounded-full bg-pink-400/70" />

                                    <span>
                                        KOKO MEMORY
                                    </span>

                                </div>

                            </div>


                            {/* ==================================================
                                RIGHT VISUAL
                            ================================================== */}

                            <div
                                aria-hidden="true"
                                className="
                                    relative
                                    hidden
                                    h-[430px]
                                    lg:block
                                "
                            >

                                {/* Main glass panel */}

                                <div
                                    className="
                                        absolute
                                        right-2
                                        top-8
                                        h-[285px]
                                        w-[390px]
                                        rounded-[2.75rem]
                                        border
                                        border-white/[0.13]
                                        bg-white/[0.045]
                                        shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_40px_120px_rgba(0,0,0,0.22)]
                                        backdrop-blur-[8px]
                                        motion-safe:animate-[kokoFloat_10s_ease-in-out_infinite]
                                        [transform:perspective(1400px)_rotateY(-12deg)_rotateX(5deg)_rotateZ(1deg)]
                                    "
                                >

                                    {/* Inner frame */}

                                    <div
                                        className="
                                            absolute
                                            inset-5
                                            rounded-[2.2rem]
                                            border
                                            border-white/[0.07]
                                        "
                                    />


                                    {/* Top reflection */}

                                    <div
                                        className="
                                            absolute
                                            left-10
                                            right-10
                                            top-8
                                            h-px
                                            bg-gradient-to-r
                                            from-transparent
                                            via-white/20
                                            to-transparent
                                        "
                                    />


                                    {/* Brand mark */}

                                    <div
                                        className="
                                            absolute
                                            left-10
                                            top-12
                                            text-[9px]
                                            font-bold
                                            tracking-[0.35em]
                                            text-white/25
                                        "
                                    >
                                        KOKO MEMORY
                                    </div>


                                    {/* Pink accent */}

                                    <div
                                        className="
                                            absolute
                                            bottom-10
                                            left-10
                                            h-1.5
                                            w-20
                                            rounded-full
                                            bg-gradient-to-r
                                            from-pink-400
                                            to-pink-300/20
                                            shadow-[0_0_20px_rgba(244,114,182,0.25)]
                                        "
                                    />


                                    {/* Small circle */}

                                    <div
                                        className="
                                            absolute
                                            bottom-9
                                            right-10
                                            h-12
                                            w-12
                                            rounded-full
                                            border
                                            border-white/10
                                            bg-white/[0.05]
                                        "
                                    />

                                </div>


                                {/* Secondary glass */}

                                <div
                                    className="
                                        absolute
                                        bottom-5
                                        right-20
                                        h-24
                                        w-36
                                        rounded-[1.75rem]
                                        border
                                        border-white/[0.10]
                                        bg-white/[0.035]
                                        shadow-[0_25px_70px_rgba(0,0,0,0.20)]
                                        backdrop-blur-md
                                        motion-safe:animate-[kokoFloatSlow_13s_ease-in-out_infinite]
                                        [transform:perspective(900px)_rotateY(12deg)_rotateX(-8deg)]
                                    "
                                >

                                    <div
                                        className="
                                            absolute
                                            bottom-5
                                            left-5
                                            h-1
                                            w-10
                                            rounded-full
                                            bg-pink-400/40
                                        "
                                    />

                                </div>


                                {/* Orb */}

                                <div
                                    className="
                                        absolute
                                        bottom-7
                                        left-4
                                        h-28
                                        w-28
                                        rounded-full
                                        border
                                        border-white/10
                                        bg-white/[0.035]
                                        shadow-[inset_0_0_45px_rgba(255,255,255,0.08),0_0_80px_rgba(244,114,182,0.10)]
                                        backdrop-blur-md
                                        motion-safe:animate-[kokoFloatSlow_15s_ease-in-out_infinite_reverse]
                                    "
                                />


                                {/* Floating sparkle */}

                                <span
                                    className="
                                        absolute
                                        left-[21%]
                                        top-[12%]
                                        text-xl
                                        text-white/45
                                        motion-safe:animate-[kokoStar_8s_ease-in-out_infinite]
                                    "
                                >
                                    ✦
                                </span>


                                <span
                                    className="
                                        absolute
                                        right-[8%]
                                        bottom-[33%]
                                        text-sm
                                        text-pink-200/50
                                        motion-safe:animate-[kokoStar_6s_ease-in-out_infinite_reverse]
                                    "
                                >
                                    ✧
                                </span>

                            </div>

                        </div>

                    </div>


                    {/* ==================================================
                        BOTTOM BORDER
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            absolute
                            bottom-0
                            left-0
                            right-0
                            z-20
                            h-px
                            bg-gradient-to-r
                            from-transparent
                            via-white/15
                            to-transparent
                        "
                    />


                    {/* ==================================================
                        SCROLL INDICATOR
                    ================================================== */}

                    <div
                        className="
                            absolute
                            bottom-7
                            left-1/2
                            z-30
                            hidden
                            -translate-x-1/2
                            flex-col
                            items-center
                            gap-2
                            sm:flex
                        "
                    >

                        <span
                            className="
                                text-[8px]
                                font-bold
                                uppercase
                                tracking-[0.45em]
                                text-white/30
                            "
                        >
                            Scroll
                        </span>


                        <div
                            className="
                                relative
                                h-8
                                w-px
                                overflow-hidden
                                bg-white/10
                            "
                        >

                            <span
                                className="
                                    absolute
                                    left-0
                                    top-0
                                    h-4
                                    w-px
                                    bg-pink-400
                                    motion-safe:animate-[kokoScroll_2.2s_ease-in-out_infinite]
                                "
                            />

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    INTRODUCTION
                ================================================== */}

                <section
                    className="
                        bg-white
                        px-5
                        pb-12
                        pt-20
                        sm:px-6
                        sm:pb-16
                        sm:pt-24
                        lg:px-8
                        lg:pt-28
                    "
                >

                    <div className="mx-auto max-w-7xl">

                        <div
                            className="
                                grid
                                gap-8
                                lg:grid-cols-[1fr_440px]
                                lg:items-end
                                lg:gap-20
                            "
                        >

                            <div>

                                <div
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2.5
                                        rounded-full
                                        border
                                        border-pink-100
                                        bg-pink-50
                                        px-4
                                        py-2
                                    "
                                >

                                    <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />

                                    <span
                                        className="
                                            text-[10px]
                                            font-bold
                                            tracking-[0.28em]
                                            text-pink-500
                                        "
                                    >
                                        {t("portfolio.momentsBadge")}
                                    </span>

                                </div>


                                <h2
                                    className="
                                        mt-5
                                        max-w-2xl
                                        text-3xl
                                        font-black
                                        leading-[1.12]
                                        tracking-tight
                                        text-slate-900
                                        sm:text-4xl
                                        lg:text-5xl
                                    "
                                >

                                {t("portfolio.introLine1")}

                                    <br />

                                    <span className="text-pink-500">
                                        {t("portfolio.introLine2")}
                                    </span>

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

                                {t("portfolio.introDescription")}

                            </p>

                        </div>


                        <div
                            className="
                                mt-12
                                h-px
                                w-full
                                bg-gradient-to-r
                                from-pink-200
                                via-slate-100
                                to-transparent
                            "
                        />

                    </div>

                </section>


                {/* ==================================================
                    PORTFOLIO
                ================================================== */}

                <section
                    id="portfolio"
                    className="
                        relative
                        overflow-hidden
                        bg-white
                        px-5
                        pb-28
                        pt-2
                        sm:px-6
                        sm:pb-36
                        lg:px-8
                    "
                >

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            left-1/2
                            top-[25%]
                            h-[620px]
                            w-[620px]
                            -translate-x-1/2
                            rounded-full
                            bg-pink-50/70
                            blur-[140px]
                        "
                    />


                    <div
                        className="
                            relative
                            z-10
                            mx-auto
                            max-w-7xl
                        "
                    >

                        <GalleryGrid />

                    </div>

                </section>


                {/* ==================================================
                    BRAND STORY
                ================================================== */}

                <section
                    className="
                        relative
                        isolate
                        overflow-hidden
                        bg-[#0d1b3a]
                        px-5
                        py-24
                        text-white
                        sm:px-6
                        sm:py-28
                        lg:px-8
                        lg:py-32
                    "
                >

                    {/* Background glow */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            -right-64
                            -top-64
                            h-[700px]
                            w-[700px]
                            rounded-full
                            bg-pink-500/10
                            blur-[150px]
                            motion-safe:animate-[kokoGlow_13s_ease-in-out_infinite]
                        "
                    />


                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            -bottom-64
                            -left-64
                            h-[650px]
                            w-[650px]
                            rounded-full
                            bg-blue-400/10
                            blur-[150px]
                        "
                    />


                    <div
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            opacity-[0.025]
                            [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)]
                            [background-size:90px_90px]
                        "
                    />


                    <div
                        className="
                            relative
                            mx-auto
                            grid
                            max-w-7xl
                            items-center
                            gap-12
                            lg:grid-cols-[1fr_0.85fr]
                            lg:gap-24
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    tracking-[0.32em]
                                    text-pink-300
                                "
                            >
                                {t("portfolio.storyBadge")}
                            </p>


                            <h2
                                className="
                                    mt-6
                                    max-w-2xl
                                    text-4xl
                                    font-black
                                    leading-[1.08]
                                    tracking-tight
                                    sm:text-5xl
                                    lg:text-6xl
                                "
                            >

                                {t("portfolio.storyLine1")}

                                <br />

                                <span className="text-pink-400">
                                    {t("portfolio.storyLine2")}
                                </span>

                            </h2>

                        </div>


                        <div
                            className="
                                rounded-[2rem]
                                border
                                border-white/10
                                bg-white/[0.045]
                                p-7
                                shadow-[0_30px_90px_rgba(0,0,0,0.18)]
                                backdrop-blur-xl
                                sm:p-9
                            "
                        >

                            <p
                                className="
                                    text-sm
                                    leading-8
                                    text-white/65
                                    sm:text-base
                                "
                            >

                                {t("portfolio.storyDescription")}

                            </p>


                            <div
                                className="
                                    mt-7
                                    flex
                                    items-center
                                    gap-3
                                "
                            >

                                <span
                                    className="
                                        h-px
                                        w-12
                                        bg-pink-400
                                    "
                                />

                                <span
                                    className="
                                        text-[10px]
                                        font-bold
                                        tracking-[0.25em]
                                        text-white/30
                                    "
                                >
                                    KOKO MEMORY
                                </span>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ==================================================
                    CTA
                ================================================== */}

                <section
                    className="
                        bg-white
                        px-5
                        py-20
                        sm:px-6
                        sm:py-28
                        lg:px-8
                    "
                >

                    <div
                        className="
                            relative
                            mx-auto
                            max-w-6xl
                            overflow-hidden
                            rounded-[2.75rem]
                            bg-gradient-to-br
                            from-pink-400
                            via-pink-500
                            to-pink-600
                            px-6
                            py-16
                            text-center
                            shadow-[0_35px_100px_rgba(236,72,153,0.20)]
                            sm:px-10
                            sm:py-20
                        "
                    >

                        {/* Large decorative ring */}

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
                                bg-white/[0.07]
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


                        <span
                            aria-hidden="true"
                            className="
                                absolute
                                left-[17%]
                                top-[22%]
                                text-white/45
                                motion-safe:animate-[kokoStar_5s_ease-in-out_infinite]
                            "
                        >
                            ✦
                        </span>


                        <span
                            aria-hidden="true"
                            className="
                                absolute
                                bottom-[23%]
                                right-[18%]
                                text-lg
                                text-white/40
                                motion-safe:animate-[kokoStar_7s_ease-in-out_infinite_reverse]
                            "
                        >
                            ✧
                        </span>


                        <div className="relative z-10">

                            <p
                                className="
                                    text-[10px]
                                    font-black
                                    tracking-[0.32em]
                                    text-pink-100
                                "
                            >
                                {t("portfolio.specialDay")}
                            </p>


                            <h2
                                className="
                                    mt-5
                                    text-3xl
                                    font-black
                                    leading-[1.12]
                                    text-white
                                    sm:text-4xl
                                    lg:text-5xl
                                "
                            >

                                {t("portfolio.ctaLine1")}

                                <br />

                                {t("portfolio.ctaLine2")}

                            </h2>


                            <p
                                className="
                                    mx-auto
                                    mt-6
                                    max-w-xl
                                    text-sm
                                    leading-7
                                    text-pink-50
                                    sm:text-base
                                "
                            >

                                {t("portfolio.ctaDescription")}

                            </p>


                            <Link
                                href="/booking"
                                className="
                                    group
                                    mt-9
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
                                    sm:px-11
                                    sm:text-base
                                "
                            >

                                {t("portfolio.bookNow")}

                                <span
                                    className="
                                        ml-3
                                        transition-transform
                                        duration-300
                                        group-hover:translate-x-1
                                    "
                                >
                                    →
                                </span>

                            </Link>

                        </div>

                    </div>

                </section>

            </main>


            <Footer />


            {/* ========================================================
                PAGE ANIMATIONS
                --------------------------------------------------------
                ใช้ style ปกติ
                ไม่ใช้ styled-jsx
                ======================================================== */}

            <style>{`

                /* =====================================================
                   PARTICLE
                   ===================================================== */

                @keyframes kokoParticle {

                    0% {
                        opacity: 0;
                        transform:
                            translate3d(0, 50px, 0)
                            scale(0.6);
                    }

                    15% {
                        opacity: 0.45;
                    }

                    50% {
                        opacity: 0.22;
                        transform:
                            translate3d(12px, -16vh, 0)
                            scale(1);
                    }

                    80% {
                        opacity: 0.35;
                    }

                    100% {
                        opacity: 0;
                        transform:
                            translate3d(-10px, -62vh, 0)
                            scale(0.7);
                    }

                }


                /* =====================================================
                   STAR
                   ===================================================== */

                @keyframes kokoStar {

                    0%,
                    100% {
                        opacity: 0.18;
                        transform:
                            translate3d(0, 0, 0)
                            rotate(0deg)
                            scale(0.75);
                    }

                    50% {
                        opacity: 0.8;
                        transform:
                            translate3d(8px, -12px, 0)
                            rotate(45deg)
                            scale(1.08);
                    }

                }


                /* =====================================================
                   FLOAT
                   ===================================================== */

                @keyframes kokoFloat {

                    0%,
                    100% {
                        transform:
                            translate3d(0, 0, 0)
                            rotateZ(1deg);
                    }

                    50% {
                        transform:
                            translate3d(0, -16px, 0)
                            rotateZ(0deg);
                    }

                }


                /* =====================================================
                   SLOW FLOAT
                   ===================================================== */

                @keyframes kokoFloatSlow {

                    0%,
                    100% {
                        transform:
                            translate3d(0, 0, 0);
                    }

                    50% {
                        transform:
                            translate3d(9px, -22px, 0);
                    }

                }


                /* =====================================================
                   GLOW
                   ===================================================== */

                @keyframes kokoGlow {

                    0%,
                    100% {
                        opacity: 0.4;
                        transform: scale(1);
                    }

                    50% {
                        opacity: 0.78;
                        transform: scale(1.1);
                    }

                }


                /* =====================================================
                   HERO ENTRANCE
                   ===================================================== */

                @keyframes kokoHeroIn {

                    from {
                        opacity: 0;
                        transform:
                            translate3d(0, 24px, 0);
                    }

                    to {
                        opacity: 1;
                        transform:
                            translate3d(0, 0, 0);
                    }

                }


                /* =====================================================
                   GRADIENT
                   ===================================================== */

                @keyframes kokoGradient {

                    0%,
                    100% {
                        background-position: 0% 50%;
                    }

                    50% {
                        background-position: 100% 50%;
                    }

                }


                /* =====================================================
                   SCROLL
                   ===================================================== */

                @keyframes kokoScroll {

                    0% {
                        opacity: 0;
                        transform: translateY(-10px);
                    }

                    35% {
                        opacity: 1;
                    }

                    100% {
                        opacity: 0;
                        transform: translateY(22px);
                    }

                }


                /* =====================================================
                   REDUCED MOTION
                   ===================================================== */

                @media (prefers-reduced-motion: reduce) {

                    *,
                    *::before,
                    *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        scroll-behavior: auto !important;
                    }

                }


                /* =====================================================
                   MOBILE
                   ===================================================== */

                @media (max-width: 640px) {

                    video {
                        object-position: center center;
                    }

                }

            `}</style>

        </>

    );

}
