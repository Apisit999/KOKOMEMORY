export type PortfolioCategory = {
    id: string;
    name: string;
    slug: string;
    description: string;
    active: boolean;
    order: number;
    createdAt?: unknown;
    updatedAt?: unknown;
};

export type PortfolioCategoryInput = {
    name: string;
    slug: string;
    description?: string;
    active?: boolean;
    order?: number;
};

export const DEFAULT_PORTFOLIO_CATEGORIES = [
    {
        name: "Wedding",
        slug: "wedding",
        description: "Wedding Photobooth",
        active: true,
        order: 0,
    },
    {
        name: "Party",
        slug: "party",
        description: "Party Photobooth",
        active: true,
        order: 1,
    },
    {
        name: "Corporate",
        slug: "corporate",
        description: "Corporate Event Photobooth",
        active: true,
        order: 2,
    },
    {
        name: "Event",
        slug: "event",
        description: "Event Experience",
        active: true,
        order: 3,
    },
] as const;

export function normalizeCategorySlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export function validateCategoryName(name: string): string {
    const normalized = name.trim();

    if (!normalized) {
        throw new Error("กรุณาระบุชื่อหมวดหมู่");
    }

    return normalized;
}

export function validateCategorySlug(slug: string): string {
    const normalized = slug.trim().toLowerCase();

    if (!normalized) {
        throw new Error("กรุณาระบุ Slug ของหมวดหมู่");
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
        throw new Error(
            "Slug ต้องเป็นตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น"
        );
    }

    return normalized;
}

export function categoryMatches(
    portfolioCategory: string,
    category: Pick<PortfolioCategory, "name" | "slug">
): boolean {
    const normalizedPortfolioCategory = normalizeCategorySlug(
        portfolioCategory
    );

    return (
        normalizedPortfolioCategory === category.slug ||
        normalizedPortfolioCategory === normalizeCategorySlug(category.name)
    );
}
