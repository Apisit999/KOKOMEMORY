"use client";

/**
 * ============================================================
 * KOKO Memory
 * Portfolio Gallery Card
 * ============================================================
 *
 * หน้าที่
 * ------------------------------------------------------------
 * แสดงรูป Portfolio แต่ละรูป
 *
 * รูปโหลดโดยตรงจาก Cloudflare R2
 * ============================================================
 */

interface GalleryCardProps {

    src: string;

    category?: string;

    index?: number;

}


export default function GalleryCard({

    src,

    category,

    index = 0,

}: GalleryCardProps) {

    return (

        <article
            className="
                group
                relative
                overflow-hidden
                rounded-[2rem]
                bg-slate-100
                shadow-sm
                transition-all
                duration-500
                hover:-translate-y-1
                hover:shadow-xl
            "
        >

            {/* ==================================================
                IMAGE
            ================================================== */}

            <div
                className="
                    relative
                    aspect-[4/5]
                    overflow-hidden
                "
            >

                <img
                    src={src}
                    alt={
                        category
                            ? `${category} - ผลงาน KOKO Memory`
                            : `ผลงาน KOKO Memory ${index + 1}`
                    }
                    loading={
                        index < 4
                            ? "eager"
                            : "lazy"
                    }
                    decoding="async"
                    className="
                        h-full
                        w-full
                        object-cover
                        transition-transform
                        duration-700
                        group-hover:scale-105
                    "
                />


                {/* ==================================================
                    OVERLAY
                ================================================== */}

                <div
                    className="
                        pointer-events-none
                        absolute
                        inset-0
                        bg-gradient-to-t
                        from-black/50
                        via-transparent
                        to-transparent
                        opacity-70
                    "
                />


                {/* ==================================================
                    CATEGORY
                ================================================== */}

                {category && (

                    <div
                        className="
                            absolute
                            bottom-4
                            left-4
                            rounded-full
                            bg-white/90
                            px-4
                            py-2
                            text-xs
                            font-semibold
                            text-slate-700
                            shadow-sm
                            backdrop-blur-md
                        "
                    >

                        {category}

                    </div>

                )}

            </div>

        </article>

    );

}