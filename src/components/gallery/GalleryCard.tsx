"use client";

/**
 * ============================================================
 * KOKO Memory
 * Premium Portfolio Gallery Card
 * ============================================================
 */

import {
    Image as ImageIcon,
    Images,
    Star,
    ArrowUpRight,
} from "lucide-react";

import Link from "next/link";


interface GalleryCardProps {

    id: string;

    src: string;

    category?: string;

    title?: string;

    imageCount?: number;

    featured?: boolean;

    index?: number;

    loading?: "eager" | "lazy";

}


export default function GalleryCard({

    id,

    src,

    category,

    title,

    imageCount = 0,

    featured = false,

    index = 0,

    loading = index < 4 ? "eager" : "lazy",

}: GalleryCardProps) {

    return (

        <article
            className={`
                group
                relative
                overflow-hidden
                rounded-[1.75rem]
                bg-slate-100
                shadow-[0_10px_35px_rgba(15,23,42,0.06)]
                transition-all
                duration-700
                ease-out
                hover:-translate-y-2
                hover:shadow-[0_28px_70px_rgba(15,23,42,0.16)]
                motion-safe:animate-[galleryCardIn_700ms_ease-out_both]
                ${
                    featured
                        ? "lg:col-span-2"
                        : ""
                }
            `}
            style={{
                animationDelay: `${Math.min(index * 70, 700)}ms`,
            }}
        >

            <Link
                href={`/gallery/portfolio/${encodeURIComponent(id)}`}
                className="
                    block
                    w-full
                    cursor-pointer
                    text-left
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-pink-400
                    focus-visible:ring-offset-4
                "
                aria-label={
                    title
                        ? `เปิด Portfolio ${title}`
                        : `เปิด Portfolio ${index + 1}`
                }
            >

                <div
                    className={`
                        relative
                        overflow-hidden
                        ${
                            featured
                                ? "aspect-[16/10]"
                                : "aspect-[4/5]"
                        }
                    `}
                >

                    {/* ==================================================
                        IMAGE
                    ================================================== */}

                    {src ? (

                        <img
                            src={src}
                            alt={
                                title
                                    ? `${title} - KOKO Memory`
                                    : category
                                        ? `${category} - ผลงาน KOKO Memory`
                                        : `ผลงาน KOKO Memory ${index + 1}`
                            }
                            loading={loading}
                            decoding="async"
                            className="
                                h-full
                                w-full
                                object-cover
                                transition-transform
                                duration-[1200ms]
                                ease-out
                                group-hover:scale-[1.055]
                            "
                        />

                    ) : (

                        <div
                            className="
                                flex
                                h-full
                                w-full
                                items-center
                                justify-center
                                bg-slate-100
                                text-slate-300
                            "
                        >
                            <ImageIcon size={46} />
                        </div>

                    )}


                    {/* ==================================================
                        IMAGE COLOR
                    ================================================== */}

                    <div
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            bg-gradient-to-b
                            from-black/10
                            via-transparent
                            to-black/75
                        "
                    />


                    {/* ==================================================
                        HOVER LIGHT
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            -left-[80%]
                            top-0
                            h-full
                            w-1/2
                            rotate-[18deg]
                            bg-gradient-to-r
                            from-transparent
                            via-white/20
                            to-transparent
                            opacity-0
                            blur-xl
                            transition-all
                            duration-1000
                            group-hover:left-[130%]
                            group-hover:opacity-100
                        "
                    />


                    {/* ==================================================
                        TOP CONTENT
                    ================================================== */}

                    <div
                        className="
                            absolute
                            left-4
                            right-4
                            top-4
                            flex
                            items-start
                            justify-between
                            gap-3
                        "
                    >

                        <div className="flex flex-wrap gap-2">

                            {featured && (

                                <span
                                    className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-full
                                        border
                                        border-white/20
                                        bg-white/90
                                        px-3
                                        py-1.5
                                        text-[9px]
                                        font-black
                                        tracking-[0.08em]
                                        text-slate-800
                                        shadow-lg
                                        backdrop-blur-md
                                    "
                                >

                                    <Star
                                        size={10}
                                        fill="currentColor"
                                        className="text-pink-500"
                                    />

                                    FEATURED

                                </span>

                            )}

                        </div>


                        {imageCount > 0 && (

                            <span
                                className="
                                    inline-flex
                                    shrink-0
                                    items-center
                                    gap-1.5
                                    rounded-full
                                    border
                                    border-white/15
                                    bg-black/35
                                    px-3
                                    py-1.5
                                    text-[10px]
                                    font-bold
                                    text-white
                                    shadow-lg
                                    backdrop-blur-md
                                "
                            >

                                <Images size={11} />

                                {imageCount}

                            </span>

                        )}

                    </div>


                    {/* ==================================================
                        BOTTOM CONTENT
                    ================================================== */}

                    <div
                        className="
                            absolute
                            inset-x-0
                            bottom-0
                            p-5
                            sm:p-6
                        "
                    >

                        {category && (

                            <p
                                className="
                                    text-[9px]
                                    font-black
                                    uppercase
                                    tracking-[0.22em]
                                    text-pink-200
                                "
                            >
                                {category}
                            </p>

                        )}


                        {title && (

                            <h2
                                className="
                                    mt-1.5
                                    line-clamp-2
                                    max-w-[90%]
                                    text-xl
                                    font-black
                                    leading-tight
                                    tracking-tight
                                    text-white
                                    drop-shadow-sm
                                    sm:text-2xl
                                "
                            >
                                {title}
                            </h2>

                        )}


                        <div
                            className="
                                mt-4
                                flex
                                items-center
                                justify-between
                            "
                        >

                            <span
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-full
                                    border
                                    border-white/15
                                    bg-white/10
                                    px-3.5
                                    py-2
                                    text-[10px]
                                    font-bold
                                    text-white
                                    backdrop-blur-md
                                    transition-all
                                    duration-300
                                    group-hover:bg-white/20
                                "
                            >

                                ดูอัลบั้ม

                                <ArrowUpRight
                                    size={12}
                                    className="
                                        transition-transform
                                        duration-300
                                        group-hover:-translate-y-0.5
                                        group-hover:translate-x-0.5
                                    "
                                />

                            </span>

                        </div>

                    </div>


                    {/* ==================================================
                        BORDER GLOW
                    ================================================== */}

                    <div
                        aria-hidden="true"
                        className="
                            pointer-events-none
                            absolute
                            inset-0
                            rounded-[1.75rem]
                            border
                            border-white/0
                            transition-colors
                            duration-500
                            group-hover:border-white/20
                        "
                    />

                </div>

            </Link>


            <style>{`

                @keyframes galleryCardIn {

                    from {
                        opacity: 0;
                        transform:
                            translate3d(0, 24px, 0)
                            scale(0.985);
                    }

                    to {
                        opacity: 1;
                        transform:
                            translate3d(0, 0, 0)
                            scale(1);
                    }

                }

                @media (prefers-reduced-motion: reduce) {

                    * {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }

                }

            `}</style>

        </article>

    );

}