import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

type PortfolioImage = {
    id: string;
    url: string;
    key?: string;
    name?: string;
    alt?: string;
    width?: number;
    height?: number;
    order: number;
};

type PortfolioDocument = {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    eventDate?: unknown;
    coverImage?: unknown;
    images?: unknown;
    featured?: unknown;
    status?: unknown;
};

function normalizeImages(
    portfolioId: string,
    rawImages: unknown
): PortfolioImage[] {
    if (!Array.isArray(rawImages)) {
        return [];
    }

    return rawImages
        .filter(
            (image): image is Record<string, unknown> =>
                Boolean(image && typeof image === "object")
        )
        .map((image, index) => ({
            id:
                typeof image.id === "string"
                    ? image.id
                    : `${portfolioId}-${index}`,
            url: typeof image.url === "string" ? image.url : "",
            key: typeof image.key === "string" ? image.key : undefined,
            name:
                typeof image.name === "string"
                    ? image.name
                    : undefined,
            alt:
                typeof image.alt === "string"
                    ? image.alt
                    : undefined,
            width:
                typeof image.width === "number"
                    ? image.width
                    : undefined,
            height:
                typeof image.height === "number"
                    ? image.height
                    : undefined,
            order:
                typeof image.order === "number"
                    ? image.order
                    : index,
        }))
        .filter((image) => Boolean(image.url))
        .sort((a, b) => a.order - b.order);
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json(
            { success: false, error: "ไม่พบ Portfolio" },
            { status: 404 }
        );
    }

    try {
        const snapshot = await adminDb
            .collection("portfolio")
            .doc(id)
            .get();

        if (!snapshot.exists) {
            return NextResponse.json(
                { success: false, error: "ไม่พบ Portfolio" },
                { status: 404 }
            );
        }

        const data = snapshot.data() as PortfolioDocument;

        if (data.status !== "active") {
            return NextResponse.json(
                { success: false, error: "ไม่พบ Portfolio" },
                { status: 404 }
            );
        }

        const images = normalizeImages(id, data.images);

        return NextResponse.json(
            {
                success: true,
                portfolio: {
                    id: snapshot.id,
                    title:
                        typeof data.title === "string"
                            ? data.title
                            : "",
                    description:
                        typeof data.description === "string"
                            ? data.description
                            : "",
                    category:
                        typeof data.category === "string"
                            ? data.category
                            : "",
                    eventDate:
                        typeof data.eventDate === "string"
                            ? data.eventDate
                            : "",
                    coverImage:
                        typeof data.coverImage === "string"
                            ? data.coverImage
                            : images[0]?.url || "",
                    featured: data.featured === true,
                    images,
                },
            },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        console.error("Public portfolio detail API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "โหลด Portfolio ไม่สำเร็จ",
            },
            { status: 500 }
        );
    }
}
