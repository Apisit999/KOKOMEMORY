import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/* ============================================================
   TYPES
============================================================ */

type PortfolioImage = {
    id?: string;
    url: string;
    key?: string;
    name?: string;
    alt?: string;
    order?: number;
};

type PortfolioDocument = {
    title?: string;
    description?: string;
    category?: string;
    eventDate?: string;
    coverImage?: string;
    images?: unknown[];
    featured?: boolean;
    status?: string;
    createdAt?: unknown;
};

function timestampValue(value: unknown): number {
    if (value && typeof value === "object") {
        const seconds = (value as { seconds?: unknown }).seconds;

        if (typeof seconds === "number") {
            return seconds;
        }
    }

    return 0;
}

/* ============================================================
   GET PORTFOLIO
============================================================ */

export async function GET(request: Request) {
    try {
        console.log("=================================");
        console.log("PORTFOLIO GALLERY API");
        console.log("=================================");

        /* -------------------------------------------------------
           FIRESTORE
           portfolio collection
        ------------------------------------------------------- */

        const snapshot = await adminDb
            .collection("portfolio")
            .get();

        const requestUrl = new URL(request.url);
        const featuredOnly =
            requestUrl.searchParams.get("featured") === "true";
        const requestedLimit = Number.parseInt(
            requestUrl.searchParams.get("limit") || "",
            10
        );
        const limit =
            Number.isFinite(requestedLimit) && requestedLimit > 0
                ? Math.min(requestedLimit, 12)
                : null;

        console.log(
            "Portfolio found:",
            snapshot.size
        );

        /* -------------------------------------------------------
           MAP PORTFOLIO
        ------------------------------------------------------- */

        const portfolios = snapshot.docs
            .map((doc) => {
                const data =
                    doc.data() as PortfolioDocument;

                /*
                 * Public Portfolio
                 * แสดงเฉพาะ active
                 */

                if (
                    featuredOnly
                        ? data.status !== "active" || data.featured !== true
                        : data.status && data.status !== "active"
                ) {
                    return null;
                }

                const rawImages =
                    Array.isArray(data.images)
                        ? data.images
                        : [];

                const images: PortfolioImage[] =
                    rawImages
                        .map((image, index): PortfolioImage | null => {
                            // Keep legacy URL-string records public without
                            // migrating or changing the Firestore document.
                            if (typeof image === "string") {
                                return {
                                    id: `${doc.id}-${index}`,
                                    url: image,
                                    order: index,
                                } satisfies PortfolioImage;
                            }

                            if (!image || typeof image !== "object") {
                                return null;
                            }

                            const value = image as Record<string, unknown>;

                            return {
                                id:
                                    typeof value.id === "string"
                                        ? value.id
                                        : `${doc.id}-${index}`,
                                url:
                                    typeof value.url === "string"
                                        ? value.url
                                        : "",
                                key:
                                    typeof value.key === "string"
                                        ? value.key
                                        : undefined,
                                name:
                                    typeof value.name === "string"
                                        ? value.name
                                        : undefined,
                                alt:
                                    typeof value.alt === "string"
                                        ? value.alt
                                        : undefined,
                                order:
                                    typeof value.order === "number"
                                        ? value.order
                                        : index,
                            } satisfies PortfolioImage;
                        })
                        .filter(
                            (image): image is PortfolioImage =>
                                image !== null
                        )
                        .filter((image) => Boolean(image.url))
                        .sort(
                            (a, b) =>
                                (a.order ?? 0) - (b.order ?? 0)
                        );

                /*
                 * ถ้าไม่มีรูป ไม่ต้องส่ง Portfolio นี้
                 */

                if (
                    images.length === 0
                ) {
                    return null;
                }

                const category =
                    typeof data.category ===
                    "string"
                        ? data.category
                        : "";

                return {
                    id: doc.id,

                    title:
                        typeof data.title ===
                        "string"
                            ? data.title
                            : "",

                    description:
                        typeof data.description ===
                        "string"
                            ? data.description
                            : "",

                    category,

                    categoryLabel:
                        category,

                    eventDate:
                        typeof data.eventDate ===
                        "string"
                            ? data.eventDate
                            : "",

                    coverImage:
                        typeof data.coverImage ===
                        "string"
                            ? data.coverImage
                            : images[0]?.url ||
                              "",

                    featured:
                        data.featured === true,

                    createdAt: data.createdAt,

                    images,
                };
            })
            .filter(
                (
                    portfolio
                ): portfolio is NonNullable<
                    typeof portfolio
                > =>
                    portfolio !== null
            );

        /* -------------------------------------------------------
           SORT
           Featured ก่อน
           แล้วค่อย eventDate ใหม่ → เก่า
        ------------------------------------------------------- */

        portfolios.sort(
            (
                a,
                b
            ) => {
                if (
                    a.featured !==
                    b.featured
                ) {
                    return a.featured
                        ? -1
                        : 1;
                }

                if (featuredOnly) {
                    const createdAtDifference =
                        timestampValue(b.createdAt) -
                        timestampValue(a.createdAt);

                    if (createdAtDifference !== 0) {
                        return createdAtDifference;
                    }

                    return a.id.localeCompare(b.id);
                }

                return b.eventDate.localeCompare(a.eventDate);
            }
        );

        const selectedPortfolios = limit
            ? portfolios.slice(0, limit)
            : portfolios;

        /* -------------------------------------------------------
           CONVERT TO GALLERY IMAGES
           
           GalleryGrid ปัจจุบันของเรา
           ต้องการ images[]
           ในรูปแบบ:
           
           key
           url
           category
           categoryLabel
        ------------------------------------------------------- */

        const images = selectedPortfolios.flatMap(
            (
                portfolio
            ) =>
                portfolio.images.map(
                    (
                        image,
                        index
                    ) => ({
                        key:
                            image.key ||
                            image.id ||
                            `${portfolio.id}-${index}`,

                        url:
                            image.url,

                        category:
                            portfolio.category,

                        categoryLabel:
                            portfolio.categoryLabel,

                        portfolioId:
                            portfolio.id,

                        portfolioTitle:
                            portfolio.title,

                        portfolioDescription:
                            portfolio.description,

                        featured:
                            portfolio.featured,

                        coverImage:
                            portfolio.coverImage,
                    })
                )
        );

        console.log(
            "Active portfolios:",
            selectedPortfolios.length
        );

        console.log(
            "Portfolio images:",
            images.length
        );

        /* -------------------------------------------------------
           RESPONSE
        ------------------------------------------------------- */

        return NextResponse.json(
            {
                success: true,

                count:
                    images.length,

                portfolioCount:
                    portfolios.length,

                    portfolios: selectedPortfolios,

                images,
            },
            {
                status: 200,

                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        console.error(
            "================================="
        );

        console.error(
            "PORTFOLIO GALLERY API ERROR:"
        );

        console.error(error);

        console.error(
            "================================="
        );

        return NextResponse.json(
            {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "โหลด Portfolio ไม่สำเร็จ",
            },
            {
                status: 500,
            }
        );
    }
}
