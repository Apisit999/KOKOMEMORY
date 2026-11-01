"use client";
import { adminApiFetch } from "@/lib/admin-api-client";

export type PortfolioStatus = "active" | "inactive";

export type PortfolioImage = {
    id?: string;
    url: string;
    key?: string;
    name?: string;
    alt?: string;
    width?: number;
    height?: number;
    order?: number;
};

export type Portfolio = {
    id: string;

    title: string;
    description: string;

    category: string;
    eventDate: string;

    coverImage: string;

    images: PortfolioImage[];

    featured: boolean;
    status: PortfolioStatus;

    createdAt?: unknown;
    updatedAt?: unknown;
};

/* =========================================================
   Collection
========================================================= */



/* =========================================================
   Helpers
========================================================= */

function normalizeImage(
    image: unknown,
    index = 0
): PortfolioImage | null {
    if (typeof image === "string") {
        return {
            url: image,
            order: index,
        };
    }

    if (!image || typeof image !== "object") {
        return null;
    }

    const value = image as Record<string, unknown>;

    if (typeof value.url !== "string" || !value.url) {
        return null;
    }

    return {
        id:
            typeof value.id === "string"
                ? value.id
                : undefined,

        url: value.url,

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

        width:
            typeof value.width === "number"
                ? value.width
                : undefined,

        height:
            typeof value.height === "number"
                ? value.height
                : undefined,

        order:
            typeof value.order === "number"
                ? value.order
                : index,
    };
}

function normalizePortfolio(
    id: string,
    data: Record<string, unknown>
): Portfolio {
    const rawImages = Array.isArray(data.images)
        ? data.images
        : [];

    const images = rawImages
        .map((image, index) =>
            normalizeImage(image, index)
        )
        .filter(
            (image): image is PortfolioImage =>
                image !== null
        )
        .sort(
            (a, b) =>
                (a.order ?? 0) -
                (b.order ?? 0)
        );

    return {
        id,

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
                : "",

        images,

        featured:
            data.featured === true,

        status:
            data.status === "inactive"
                ? "inactive"
                : "active",

        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

/* =========================================================
   Get all portfolios
========================================================= */

export async function getPortfolios(): Promise<Portfolio[]> {
    const result = await adminApiFetch<{ portfolios: Array<Record<string, unknown> & { id: string }> }>("/api/admin/portfolio");
    return result.portfolios.map(item => normalizePortfolio(item.id, item));
}

export async function getPortfolio(id: string): Promise<Portfolio | null> {
    const result = await adminApiFetch<{ portfolio: Record<string, unknown> & { id: string } }>(
        `/api/admin/portfolio/${encodeURIComponent(id)}`);
    return result.portfolio ? normalizePortfolio(result.portfolio.id, result.portfolio) : null;
}

export async function createPortfolio(data: Omit<Portfolio, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const result = await adminApiFetch<{ id: string }>("/api/admin/portfolio", {
        method: "POST", body: JSON.stringify(data),
    });
    return result.id;
}

export async function updatePortfolio(id: string, data: Partial<Omit<Portfolio, "id" | "createdAt" | "updatedAt">>): Promise<void> {
    await adminApiFetch(`/api/admin/portfolio/${encodeURIComponent(id)}`, {
        method: "PATCH", body: JSON.stringify(data),
    });
}

export async function deletePortfolio(id: string): Promise<void> {
    await adminApiFetch(`/api/admin/portfolio/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function togglePortfolioStatus(
    portfolio: Portfolio
): Promise<void> {
    await updatePortfolio(
        portfolio.id,
        {
            status:
                portfolio.status === "active"
                    ? "inactive"
                    : "active",
        }
    );
}

/* =========================================================
   Toggle featured
========================================================= */

export async function togglePortfolioFeatured(
    portfolio: Portfolio
): Promise<void> {
    await updatePortfolio(
        portfolio.id,
        {
            featured: !portfolio.featured,
        }
    );
}
