"use client";

/**
 * ============================================================
 * KOKO Memory
 * Premium Portfolio Gallery Grid
 * ============================================================
 *
 * Data
 * ------------------------------------------------------------
 * /api/gallery/portfolio
 *
 * Storage
 * ------------------------------------------------------------
 * Cloudflare R2
 *
 * Important
 * ------------------------------------------------------------
 * ไม่แตะ R2 โดยตรง
 * ไม่แตะ Firebase โดยตรง
 * ไม่เกี่ยวข้องกับ Live Gallery
 * ============================================================
 */

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ChevronLeft,
    ChevronRight,
    X,
    Images,
    CalendarDays,
    Maximize2,
} from "lucide-react";

import GalleryCard from "./GalleryCard";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";

import {
    normalizeCategorySlug,
    type PortfolioCategory,
} from "@/types/portfolioCategory";


/* ============================================================
   TYPES
============================================================ */

interface PortfolioImage {

    id?: string;

    url: string;

    key?: string;

    name?: string;

    alt?: string;

    order?: number;

}


interface Portfolio {

    id: string;

    title: string;

    description: string;

    category: string;

    categoryLabel: string;

    eventDate: string;

    coverImage: string;

    featured: boolean;

    images: PortfolioImage[];

}


/* ============================================================
   COMPONENT
============================================================ */

export default function GalleryGrid() {

    const { t } = useI18n();

    const [
        portfolios,
        setPortfolios,
    ] = useState<Portfolio[]>([]);


    const [
        category,
        setCategory,
    ] = useState("all");

    const [
        categoryOptions,
        setCategoryOptions,
    ] = useState<PortfolioCategory[]>([]);

    const [categoryApiLoaded, setCategoryApiLoaded] =
        useState(false);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    const [
        selectedPortfolio,
        setSelectedPortfolio,
    ] = useState<Portfolio | null>(null);


    const [
        currentImageIndex,
        setCurrentImageIndex,
    ] = useState(0);


    /* ========================================================
       LOAD
    ======================================================== */

    useEffect(() => {

        let cancelled = false;


        async function loadPortfolio() {

            try {

                setLoading(true);
                setError("");


                const response = await fetch(
                    "/api/gallery/portfolio",
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );


                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";


                let data:
                    | Record<string, unknown>
                    | null = null;


                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    data = await response.json();

                } else {

                    const text =
                        await response.text();

                    throw new Error(
                        text.slice(0, 200) ||
                        "API ไม่ได้ตอบกลับเป็น JSON"
                    );

                }


                if (!response.ok) {

                    throw new Error(
                        typeof data?.error ===
                            "string"
                            ? data.error
                            : "โหลด Portfolio ไม่สำเร็จ"
                    );

                }


                if (data?.success !== true) {

                    throw new Error(
                        typeof data?.error ===
                            "string"
                            ? data.error
                            : "ไม่สามารถโหลด Portfolio ได้"
                    );

                }


                const rawPortfolios =
                    Array.isArray(data.portfolios)
                        ? data.portfolios
                        : [];


                const normalized =
                    rawPortfolios
                        .filter(
                            (
                                item
                            ): item is Record<
                                string,
                                unknown
                            > =>
                                Boolean(
                                    item &&
                                    typeof item ===
                                        "object"
                                )
                        )
                        .map((item) => {

                            const rawImages =
                                Array.isArray(
                                    item.images
                                )
                                    ? item.images
                                    : [];


                            const images =
                                rawImages
                                    .filter(
                                        (
                                            image
                                        ): image is Record<
                                            string,
                                            unknown
                                        > =>
                                            Boolean(
                                                image &&
                                                typeof image ===
                                                    "object"
                                            )
                                    )
                                    .map(
                                        (
                                            image,
                                            index
                                        ) => ({

                                            id:
                                                typeof image.id ===
                                                "string"
                                                    ? image.id
                                                    : `${String(
                                                          item.id
                                                      )}-${index}`,

                                            url:
                                                typeof image.url ===
                                                "string"
                                                    ? image.url
                                                    : "",

                                            key:
                                                typeof image.key ===
                                                "string"
                                                    ? image.key
                                                    : undefined,

                                            name:
                                                typeof image.name ===
                                                "string"
                                                    ? image.name
                                                    : undefined,

                                            alt:
                                                typeof image.alt ===
                                                "string"
                                                    ? image.alt
                                                    : undefined,

                                            order:
                                                typeof image.order ===
                                                "number"
                                                    ? image.order
                                                    : index,

                                        })
                                    )
                                    .filter(
                                        (image) =>
                                            Boolean(
                                                image.url
                                            )
                                    )
                                    .sort(
                                        (
                                            a,
                                            b
                                        ) =>
                                            (a.order ?? 0) -
                                            (b.order ?? 0)
                                    );


                            const category =
                                typeof item.category ===
                                "string"
                                    ? item.category
                                    : "";


                            return {

                                id:
                                    typeof item.id ===
                                    "string"
                                        ? item.id
                                        : "",

                                title:
                                    typeof item.title ===
                                    "string"
                                        ? item.title
                                        : "",

                                description:
                                    typeof item.description ===
                                    "string"
                                        ? item.description
                                        : "",

                                category,

                                categoryLabel:
                                    typeof item.categoryLabel ===
                                    "string"
                                        ? item.categoryLabel
                                        : category,

                                eventDate:
                                    typeof item.eventDate ===
                                    "string"
                                        ? item.eventDate
                                        : "",

                                coverImage:
                                    typeof item.coverImage ===
                                    "string"
                                        ? item.coverImage
                                        : images[0]?.url || "",

                                featured:
                                    item.featured === true,

                                images,

                            };

                        })
                        .filter(
                            (item) =>
                                Boolean(item.id) &&
                                item.images.length > 0
                        );


                if (!cancelled) {

                    setPortfolios(normalized);

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
       CATEGORY DATA + URL STATE
    ======================================================== */

    useEffect(() => {
        let cancelled = false;

        async function loadCategories() {
            try {
                const response = await fetch(
                    "/api/gallery/categories",
                    {
                        method: "GET",
                        cache: "force-cache",
                    }
                );
                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    throw new Error("Category API ไม่ได้ตอบกลับเป็น JSON");
                }

                const data = (await response.json()) as {
                    success?: boolean;
                    categories?: unknown;
                };

                if (
                    !cancelled &&
                    data.success === true &&
                    Array.isArray(data.categories)
                ) {
                    setCategoryOptions(
                        data.categories.filter(
                            (
                                item
                            ): item is PortfolioCategory =>
                                Boolean(
                                    item &&
                                        typeof item === "object" &&
                                        typeof (item as PortfolioCategory)
                                            .slug === "string"
                                )
                        )
                    );
                        setCategoryApiLoaded(true);
                }
            } catch {
                // The portfolio list remains usable through its legacy category values.
                    if (!cancelled) setCategoryApiLoaded(true);
            }
        }

        void loadCategories();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const syncCategoryFromUrl = () => {
            const value = new URLSearchParams(window.location.search).get(
                "category"
            );
            setCategory(value || "all");
        };

        syncCategoryFromUrl();
        window.addEventListener("popstate", syncCategoryFromUrl);

        return () => {
            window.removeEventListener("popstate", syncCategoryFromUrl);
        };
    }, []);


    /* ========================================================
       CATEGORIES
    ======================================================== */

    const categories = useMemo(() => {

        const values = new Map<string, string>();

        categoryOptions.forEach((item) => {
            const slug = normalizeCategorySlug(item.slug);
            if (slug) values.set(slug, item.name);
        });

        if (!categoryApiLoaded || categoryOptions.length === 0) {
            portfolios.forEach((portfolio) => {
                const slug = normalizeCategorySlug(portfolio.category);
                if (slug && !values.has(slug)) {
                    values.set(slug, portfolio.category.trim());
                }
            });
        }

        const unique = Array.from(values.keys()).sort((a, b) =>
            (values.get(a) || a).localeCompare(values.get(b) || b, "th")
        );


        return [
            "all",
            ...unique,
        ];

    }, [categoryApiLoaded, categoryOptions, portfolios]);

    const categoryLabels = useMemo(() => {
        const labels = new Map<string, string>();

        categoryOptions.forEach((item) => {
            labels.set(normalizeCategorySlug(item.slug), item.name);
        });

        if (!categoryApiLoaded || categoryOptions.length === 0) {
            portfolios.forEach((portfolio) => {
                const slug = normalizeCategorySlug(portfolio.category);
                if (slug && !labels.has(slug)) {
                    labels.set(slug, portfolio.category.trim());
                }
            });
        }

        return labels;
    }, [categoryApiLoaded, categoryOptions, portfolios]);

    const selectCategory = (value: string) => {
        const params = new URLSearchParams(window.location.search);

        if (value === "all") {
            params.delete("category");
        } else {
            params.set("category", value);
        }

        const query = params.toString();
        const nextUrl = query
            ? `${window.location.pathname}?${query}`
            : window.location.pathname;

        window.history.pushState({}, "", nextUrl);
        setCategory(value);
        window.dispatchEvent(new PopStateEvent("popstate"));
    };


    /* ========================================================
       FILTERED
    ======================================================== */

    const filteredPortfolios =
        useMemo(() => {

            if (category === "all") {

                return portfolios;

            }


            return portfolios.filter(
                (portfolio) =>
                    normalizeCategorySlug(
                        portfolio.category
                    ) === category
            );

        }, [
            portfolios,
            category,
        ]);


    /* ========================================================
       CLOSE
    ======================================================== */

    const closePortfolio = () => {

        setSelectedPortfolio(null);

        setCurrentImageIndex(0);

        document.body.style.overflow =
            "";

    };


    /* ========================================================
       BODY CLEANUP
    ======================================================== */

    useEffect(() => {

        return () => {

            document.body.style.overflow =
                "";

        };

    }, []);


    /* ========================================================
       NEXT
    ======================================================== */

    const nextImage = () => {

        if (!selectedPortfolio) return;


        setCurrentImageIndex(
            (current) =>
                (
                    current + 1
                ) %
                selectedPortfolio.images.length
        );

    };


    /* ========================================================
       PREVIOUS
    ======================================================== */

    const previousImage = () => {

        if (!selectedPortfolio) return;


        setCurrentImageIndex(
            (current) =>
                (
                    current -
                    1 +
                    selectedPortfolio.images.length
                ) %
                selectedPortfolio.images.length
        );

    };


    /* ========================================================
       KEYBOARD
    ======================================================== */

    useEffect(() => {

        if (!selectedPortfolio) return;


        const handleKeyDown =
            (event: KeyboardEvent) => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closePortfolio();

                }

                if (
                    event.key ===
                    "ArrowRight"
                ) {

                    nextImage();

                }

                if (
                    event.key ===
                    "ArrowLeft"
                ) {

                    previousImage();

                }

            };


        window.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );

        };

    }, [
        selectedPortfolio,
    ]);


    /* ========================================================
       LOADING
    ======================================================== */

    if (loading) {

        return (

            <div>

                <div
                    className="
                        mb-10
                        flex
                        justify-center
                    "
                >

                    <div
                        className="
                            h-11
                            w-64
                            animate-pulse
                            rounded-full
                            bg-slate-100
                        "
                    />

                </div>


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
                                    rounded-[1.75rem]
                                    bg-slate-100
                                "
                            />

                        )
                    )}

                </div>

            </div>

        );

    }


    /* ========================================================
       ERROR
    ======================================================== */

    if (error) {

        return (

            <div
                aria-label={t("gallery.error")}
                className="
                    rounded-[2rem]
                    border
                    border-red-100
                    bg-red-50
                    px-6
                    py-20
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
                        font-black
                        text-red-500
                        shadow-sm
                    "
                >
                    !
                </div>


                <h3
                    className="
                        mt-5
                        text-lg
                        font-bold
                        text-slate-800
                    "
                >
                    {t("portfolio.errorTitle")}
                </h3>


                <p
                    className="
                        mx-auto
                        mt-2
                        max-w-lg
                        text-sm
                        leading-7
                        text-slate-500
                    "
                >
                    {t("portfolio.errorDescription")}
                </p>

            </div>

        );

    }


    return (

        <div>

            {/* ==================================================
                FILTER
            ================================================== */}

            {categories.length > 1 && (

                <div
                    className="
                        mb-12
                        flex
                        flex-col
                        items-center
                        gap-5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            text-[10px]
                            font-black
                            tracking-[0.25em]
                            text-slate-400
                        "
                    >

                        <span
                            className="
                                h-px
                                w-7
                                bg-slate-200
                            "
                        />

                        {t("portfolio.explore")}

                        <span
                            className="
                                h-px
                                w-7
                                bg-slate-200
                            "
                        />

                    </div>


                    <div
                        className="
                            flex
                            max-w-full
                            flex-wrap
                            justify-center
                            gap-2
                            rounded-full
                            border
                            border-slate-100
                            bg-slate-50/80
                            p-1.5
                            shadow-sm
                        "
                    >

                        {categories.map(
                            (item) => {

                                const active =
                                    category ===
                                    item;


                                const label =
                                    item ===
                                    "all"
                                        ? "ทั้งหมด"
                                                                                : categoryLabels.get(item) ||
                                                                                    item;


                                const categoryKey = {
                                    all: "portfolio.all",
                                    corporate: "portfolio.corporate",
                                    event: "portfolio.event",
                                    party: "portfolio.party",
                                    weddings: "portfolio.weddings",
                                }[item as "all" | "corporate" | "event" | "party" | "weddings"];

                                return (

                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => selectCategory(item)}
                                        aria-pressed={active}
                                        className={`
                                            rounded-full
                                            px-5
                                            py-2.5
                                            text-xs
                                            font-bold
                                            transition-all
                                            duration-300

                                            ${
                                                active
                                                    ? "bg-slate-900 text-white shadow-md"
                                                    : "text-slate-500 hover:bg-white hover:text-pink-500"
                                            }
                                        `}
                                    >

                                        {categoryKey ? t(categoryKey as MessageKey) : label}

                                    </button>

                                );

                            }
                        )}

                    </div>

                </div>

            )}


            {/* ==================================================
                RESULT META
            ================================================== */}

            {filteredPortfolios.length > 0 && (

                <div
                    className="
                        mb-6
                        flex
                        items-center
                        justify-between
                        gap-4
                        border-b
                        border-slate-100
                        pb-4
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            text-xs
                            font-medium
                            text-slate-400
                        "
                    >

                        <Images size={14} />

                        {filteredPortfolios.length}
                        {" "}
                        {t("portfolio.portfolio")}

                    </div>


                    <div
                        className="
                            hidden
                            text-[10px]
                            font-bold
                            tracking-[0.15em]
                            text-slate-300
                            sm:block
                        "
                    >
                        KOKO MEMORY
                    </div>

                </div>

            )}


            {/* ==================================================
                EMPTY
            ================================================== */}

            {filteredPortfolios.length ===
            0 ? (

                <div
                    className="
                        rounded-[2rem]
                        border
                        border-slate-200
                        bg-slate-50
                        px-6
                        py-24
                        text-center
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


                    <h3
                        className="
                            mt-5
                            text-xl
                            font-bold
                            text-slate-800
                        "
                    >
                        {category === "all"
                            ? t("portfolio.emptyAll")
                            : `${t("portfolio.emptyCategory")} ${
                                  categoryLabels.get(category) ||
                                  category
                              }`}
                    </h3>


                    <p
                        className="
                            mt-2
                            text-sm
                            text-slate-400
                        "
                    >
                        {category === "all" ? (
                            t("portfolio.emptyDescription")
                        ) : (
                            <button
                                type="button"
                                onClick={() => selectCategory("all")}
                                className="font-semibold text-pink-500 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                            >
                                {t("portfolio.viewAll")}
                            </button>
                        )}
                    </p>

                </div>

            ) : (

                /* ==================================================
                   GRID
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

                    {filteredPortfolios.map(
                        (
                            portfolio,
                            index
                        ) => (

                            <GalleryCard
                                key={
                                    portfolio.id
                                }
                                id={
                                    portfolio.id
                                }
                                src={
                                    portfolio.coverImage ||
                                    portfolio.images[0]
                                        ?.url ||
                                    ""
                                }
                                category={
                                    portfolio.categoryLabel
                                }
                                title={
                                    portfolio.title
                                }
                                imageCount={
                                    portfolio.images.length
                                }
                                featured={
                                    portfolio.featured
                                }
                                index={
                                    index
                                }
                            />

                        )
                    )}

                </div>

            )}


            {/* ==================================================
                LIGHTBOX
            ================================================== */}

            {selectedPortfolio && (

                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        bg-slate-950/95
                        p-3
                        backdrop-blur-xl
                        sm:p-5
                    "
                    onClick={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {

                            closePortfolio();

                        }

                    }}
                >

                    <div
                        className="
                            relative
                            flex
                            max-h-[96vh]
                            w-full
                            max-w-7xl
                            flex-col
                            overflow-hidden
                            rounded-[1.75rem]
                            bg-white
                            shadow-[0_40px_140px_rgba(0,0,0,0.45)]
                            motion-safe:animate-[galleryModalIn_400ms_ease-out_both]
                        "
                    >

                        {/* ==================================================
                            HEADER
                        ================================================== */}

                        <header
                            className="
                                flex
                                shrink-0
                                items-center
                                justify-between
                                gap-4
                                border-b
                                border-slate-100
                                bg-white
                                px-4
                                py-4
                                sm:px-6
                            "
                        >

                            <div
                                className="
                                    min-w-0
                                "
                            >

                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                    "
                                >

                                    {selectedPortfolio.category && (

                                        <span
                                            className="
                                                rounded-full
                                                bg-pink-50
                                                px-2.5
                                                py-1
                                                text-[9px]
                                                font-black
                                                tracking-[0.12em]
                                                text-pink-500
                                            "
                                        >
                                            {
                                                selectedPortfolio.categoryLabel
                                            }
                                        </span>

                                    )}


                                    {selectedPortfolio.featured && (

                                        <span
                                            className="
                                                hidden
                                                rounded-full
                                                bg-slate-100
                                                px-2.5
                                                py-1
                                                text-[9px]
                                                font-bold
                                                text-slate-500
                                                sm:inline-flex
                                            "
                                        >
                                            {t("portfolio.featured")}
                                        </span>

                                    )}

                                </div>


                                <h2
                                    className="
                                        mt-1.5
                                        truncate
                                        text-base
                                        font-black
                                        text-slate-900
                                        sm:text-xl
                                    "
                                >
                                    {
                                        selectedPortfolio.title
                                    }
                                </h2>

                            </div>


                            <button
                                type="button"
                                onClick={
                                    closePortfolio
                                }
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-slate-100
                                    text-slate-600
                                    transition-all
                                    hover:rotate-90
                                    hover:bg-slate-900
                                    hover:text-white
                                "
                                aria-label={t("portfolio.close")}
                            >

                                <X size={18} />

                            </button>

                        </header>


                        {/* ==================================================
                            IMAGE AREA
                        ================================================== */}

                        <div
                            className="
                                relative
                                flex
                                min-h-0
                                flex-1
                                items-center
                                justify-center
                                overflow-hidden
                                bg-[#080d1c]
                                px-3
                                py-4
                                sm:px-8
                                sm:py-7
                            "
                        >

                            {/* ambient glow */}

                            <div
                                aria-hidden="true"
                                className="
                                    pointer-events-none
                                    absolute
                                    left-1/2
                                    top-1/2
                                    h-[70%]
                                    w-[60%]
                                    -translate-x-1/2
                                    -translate-y-1/2
                                    rounded-full
                                    bg-pink-500/10
                                    blur-[100px]
                                "
                            />


                            <img
                                key={
                                    selectedPortfolio
                                        .images[
                                            currentImageIndex
                                        ]?.url
                                }
                                src={
                                    selectedPortfolio
                                        .images[
                                            currentImageIndex
                                        ]?.url
                                }
                                alt={
                                    selectedPortfolio
                                        .images[
                                            currentImageIndex
                                        ]?.alt ||
                                    selectedPortfolio.title
                                }
                                className="
                                    relative
                                    z-10
                                    max-h-[62vh]
                                    max-w-full
                                    rounded-xl
                                    object-contain
                                    shadow-2xl
                                    motion-safe:animate-[galleryImageIn_350ms_ease-out_both]
                                    sm:max-h-[64vh]
                                "
                            />


                            {/* Previous */}

                            {selectedPortfolio.images.length >
                                1 && (

                                <button
                                    type="button"
                                    onClick={
                                        previousImage
                                    }
                                    className="
                                        absolute
                                        left-3
                                        top-1/2
                                        z-20
                                        flex
                                        h-11
                                        w-11
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-white/10
                                        bg-white/10
                                        text-white
                                        shadow-xl
                                        backdrop-blur-md
                                        transition-all
                                        hover:scale-110
                                        hover:bg-white
                                        hover:text-slate-900
                                        sm:left-6
                                    "
                                    aria-label={t("portfolio.previous")}
                                >

                                    <ChevronLeft size={22} />

                                </button>

                            )}


                            {/* Next */}

                            {selectedPortfolio.images.length >
                                1 && (

                                <button
                                    type="button"
                                    onClick={
                                        nextImage
                                    }
                                    className="
                                        absolute
                                        right-3
                                        top-1/2
                                        z-20
                                        flex
                                        h-11
                                        w-11
                                        -translate-y-1/2
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-white/10
                                        bg-white/10
                                        text-white
                                        shadow-xl
                                        backdrop-blur-md
                                        transition-all
                                        hover:scale-110
                                        hover:bg-white
                                        hover:text-slate-900
                                        sm:right-6
                                    "
                                    aria-label={t("portfolio.next")}
                                >

                                    <ChevronRight size={22} />

                                </button>

                            )}


                            {/* Counter */}

                            <div
                                className="
                                    absolute
                                    bottom-4
                                    left-1/2
                                    z-20
                                    -translate-x-1/2
                                    rounded-full
                                    border
                                    border-white/10
                                    bg-black/35
                                    px-4
                                    py-2
                                    text-[10px]
                                    font-bold
                                    text-white/75
                                    backdrop-blur-md
                                "
                            >

                                {currentImageIndex + 1}
                                {" / "}
                                {
                                    selectedPortfolio
                                        .images
                                        .length
                                }

                            </div>

                        </div>


                        {/* ==================================================
                            FOOTER / THUMBNAILS
                        ================================================== */}

                        <footer
                            className="
                                shrink-0
                                border-t
                                border-slate-100
                                bg-white
                                px-4
                                py-4
                                sm:px-6
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-4
                                "
                            >

                                <div
                                    className="
                                        flex
                                        min-w-0
                                        items-center
                                        gap-2
                                    "
                                >

                                    <CalendarDays
                                        size={14}
                                        className="shrink-0 text-slate-400"
                                    />


                                    <span
                                        className="
                                            truncate
                                            text-xs
                                            text-slate-400
                                        "
                                    >
                                        {
                                            selectedPortfolio.eventDate ||
                                            "KOKO Memory"
                                        }
                                    </span>

                                </div>


                                <span
                                    className="
                                        hidden
                                        text-xs
                                        leading-6
                                        text-slate-400
                                        sm:block
                                    "
                                >
                                    {
                                        selectedPortfolio.description ||
                                        "ผลงานจาก KOKO Memory"
                                    }
                                </span>

                            </div>


                            {/* thumbnails */}

                            {selectedPortfolio.images.length >
                                1 && (

                                <div
                                    className="
                                        mt-4
                                        flex
                                        gap-2
                                        overflow-x-auto
                                        pb-1
                                    "
                                >

                                    {selectedPortfolio.images.map(
                                        (
                                            image,
                                            index
                                        ) => (

                                            <button
                                                key={
                                                    image.id ||
                                                    image.url ||
                                                    index
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setCurrentImageIndex(
                                                        index
                                                    )
                                                }
                                                className={`
                                                    relative
                                                    h-14
                                                    w-14
                                                    shrink-0
                                                    overflow-hidden
                                                    rounded-xl
                                                    border-2
                                                    transition-all
                                                    duration-300

                                                    ${
                                                        currentImageIndex ===
                                                        index
                                                            ? "scale-105 border-pink-500 shadow-lg"
                                                            : "border-transparent opacity-55 hover:opacity-100"
                                                    }
                                                `}
                                                aria-label={`${t("portfolio.viewImage")} ${index + 1}`}
                                            >

                                                <img
                                                    src={
                                                        image.url
                                                    }
                                                    alt=""
                                                    className="
                                                        h-full
                                                        w-full
                                                        object-cover
                                                    "
                                                />

                                            </button>

                                        )
                                    )}

                                </div>

                            )}

                        </footer>

                    </div>


                    {/* ==================================================
                        DESKTOP HINT
                    ================================================== */}

                    <div
                        className="
                            absolute
                            bottom-3
                            left-1/2
                            hidden
                            -translate-x-1/2
                            items-center
                            gap-2
                            text-[9px]
                            font-medium
                            tracking-wide
                            text-white/25
                            sm:flex
                        "
                    >

                        <Maximize2 size={11} />

                        ESC ปิด
                        <span>•</span>
                        ← → เปลี่ยนรูป

                    </div>

                </div>

            )}


            <style>{`

                @keyframes galleryModalIn {

                    from {
                        opacity: 0;
                        transform:
                            translate3d(0, 18px, 0)
                            scale(0.985);
                    }

                    to {
                        opacity: 1;
                        transform:
                            translate3d(0, 0, 0)
                            scale(1);
                    }

                }


                @keyframes galleryImageIn {

                    from {
                        opacity: 0;
                        transform:
                            scale(0.985);
                    }

                    to {
                        opacity: 1;
                        transform:
                            scale(1);
                    }

                }


                @media (prefers-reduced-motion: reduce) {

                    *,
                    *::before,
                    *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }

                }

            `}</style>

        </div>

    );

}
