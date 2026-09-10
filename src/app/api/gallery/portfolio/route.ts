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
};

/* ============================================================
   GET PORTFOLIO
============================================================ */

export async function GET() {
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
                    data.status &&
                    data.status !== "active"
                ) {
                    return null;
                }

                const rawImages =
                    Array.isArray(data.images)
                        ? data.images
                        : [];

                const images: PortfolioImage[] =
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
                                        : `${doc.id}-${index}`,

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
                            (
                                image
                            ) =>
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

                return (
                    b.eventDate.localeCompare(
                        a.eventDate
                    )
                );
            }
        );

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

        const images = portfolios.flatMap(
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
            portfolios.length
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

                portfolios,

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