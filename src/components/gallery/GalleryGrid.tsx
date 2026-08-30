"use client";

/**
 * ============================================================
 * KOKO Memory
 * Portfolio Gallery Grid
 * ============================================================
 *
 * หน้าที่
 * ------------------------------------------------------------
 * โหลดรูป Portfolio จาก
 *
 * /api/gallery/portfolio
 *
 * รูปจริงเก็บอยู่บน Cloudflare R2
 *
 * ไม่เกี่ยวข้องกับ Live Gallery
 * ============================================================
 */

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import GalleryCard from "./GalleryCard";


/* ============================================================
   TYPE
   ============================================================ */

interface GalleryImage {

    key: string;

    url: string;

    category: string;

    categoryLabel: string;

}


/* ============================================================
   COMPONENT
   ============================================================ */

export default function GalleryGrid() {

    const [
        images,
        setImages,
    ] = useState<GalleryImage[]>([]);


    const [
        category,
        setCategory,
    ] = useState("all");


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    /* ========================================================
       LOAD PORTFOLIO
       ======================================================== */

    useEffect(() => {

        let cancelled = false;


        async function loadPortfolio() {

            try {

                setLoading(true);

                setError("");


                const response =
                    await fetch(
                        "/api/gallery/portfolio",
                        {
                            method: "GET",

                            cache: "no-store",
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data?.error ||
                        "โหลด Portfolio ไม่สำเร็จ"
                    );

                }


                if (
                    !data.success
                ) {

                    throw new Error(
                        data?.error ||
                        "ไม่สามารถโหลดรูปได้"
                    );

                }


                if (!cancelled) {

                    setImages(
                        Array.isArray(
                            data.images
                        )
                            ? data.images
                            : []
                    );

                }

            } catch (err) {

                console.error(
                    "Portfolio loading error:",
                    err
                );


                if (!cancelled) {

                    setError(
                        err instanceof Error
                            ? err.message
                            : "โหลดผลงานไม่สำเร็จ"
                    );

                }

            } finally {

                if (!cancelled) {

                    setLoading(false);

                }

            }

        }


        loadPortfolio();


        return () => {

            cancelled = true;

        };

    }, []);


    /* ========================================================
       CATEGORY
       ======================================================== */

    const categories =
        useMemo(() => {

            const unique =
                Array.from(

                    new Set(

                        images.map(
                            (image) =>
                                image.category
                        )

                    )

                );


            return [
                "all",
                ...unique,
            ];

        }, [images]);


    /* ========================================================
       FILTER
       ======================================================== */

    const filteredImages =
        category === "all"

            ? images

            : images.filter(
                (image) =>
                    image.category ===
                    category
            );


    /* ========================================================
       LOADING
       ======================================================== */

    if (loading) {

        return (

            <div
                className="
                    grid
                    grid-cols-1
                    gap-5
                    sm:grid-cols-2
                    lg:grid-cols-3
                    xl:grid-cols-4
                "
            >

                {Array.from({
                    length: 8,
                }).map(
                    (_, index) => (

                        <div
                            key={index}
                            className="
                                aspect-[4/5]
                                animate-pulse
                                rounded-[2rem]
                                bg-slate-100
                            "
                        />

                    )
                )}

            </div>

        );

    }


    /* ========================================================
       ERROR
       ======================================================== */

    if (error) {

        return (

            <div
                className="
                    rounded-[2rem]
                    border
                    border-red-100
                    bg-red-50
                    px-6
                    py-16
                    text-center
                "
            >

                <div
                    className="
                        mx-auto
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-full
                        bg-white
                        text-xl
                        shadow-sm
                    "
                >
                    !
                </div>


                <h3
                    className="
                        mt-5
                        text-lg
                        font-semibold
                        text-slate-800
                    "
                >
                    ไม่สามารถโหลดผลงานได้
                </h3>


                <p
                    className="
                        mx-auto
                        mt-2
                        max-w-lg
                        text-sm
                        leading-6
                        text-slate-500
                    "
                >
                    {error}
                </p>

            </div>

        );

    }


    return (

        <div>

            {/* ==================================================
                CATEGORY FILTER
            ================================================== */}

            {categories.length > 1 && (

                <div
                    className="
                        mb-10
                        flex
                        flex-wrap
                        items-center
                        justify-center
                        gap-2.5
                    "
                >

                    {categories.map(
                        (item) => {

                            const active =
                                category ===
                                item;


                            const label =
                                item === "all"

                                    ? "ทั้งหมด"

                                    : images.find(
                                        (image) =>
                                            image.category ===
                                            item
                                    )?.categoryLabel ||
                                    item;


                            return (

                                <button
                                    key={item}
                                    type="button"
                                    onClick={() =>
                                        setCategory(
                                            item
                                        )
                                    }
                                    className={`
                                        rounded-full
                                        px-5
                                        py-2.5
                                        text-sm
                                        font-medium
                                        transition-all
                                        duration-300

                                        ${active

                                            ? "bg-pink-500 text-white shadow-lg shadow-pink-200"

                                            : "bg-slate-100 text-slate-600 hover:bg-pink-50 hover:text-pink-500"
                                        }
                                    `}
                                >

                                    {label}

                                </button>

                            );

                        }
                    )}

                </div>

            )}


            {/* ==================================================
                EMPTY
            ================================================== */}

            {filteredImages.length === 0 ? (

                <div
                    className="
                        rounded-[2rem]
                        border
                        border-slate-200
                        bg-slate-50
                        px-6
                        py-20
                        text-center
                    "
                >

                    <div
                        className="
                            text-5xl
                        "
                    >
                        📷
                    </div>


                    <h3
                        className="
                            mt-5
                            text-xl
                            font-semibold
                            text-slate-800
                        "
                    >
                        ยังไม่มีผลงาน
                    </h3>


                    <p
                        className="
                            mt-2
                            text-sm
                            text-slate-400
                        "
                    >
                        ผลงานใหม่จะถูกเพิ่มเข้ามาเร็ว ๆ นี้
                    </p>

                </div>

            ) : (

                /* ==================================================
                   GALLERY
                   ================================================== */

                <div
                    className="
                        grid
                        grid-cols-1
                        gap-5
                        sm:grid-cols-2
                        md:gap-6
                        lg:grid-cols-3
                        xl:grid-cols-4
                    "
                >

                    {filteredImages.map(
                        (image, index) => (

                            <GalleryCard
                                key={
                                    image.key
                                }
                                src={
                                    image.url
                                }
                                category={
                                    image.categoryLabel
                                }
                                index={
                                    index
                                }
                            />

                        )
                    )}

                </div>

            )}

        </div>

    );

}