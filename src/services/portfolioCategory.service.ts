import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
    categoryMatches,
    normalizeCategorySlug,
    validateCategoryName,
    validateCategorySlug,
    type PortfolioCategory,
    type PortfolioCategoryInput,
    DEFAULT_PORTFOLIO_CATEGORIES,
} from "@/types/portfolioCategory";

const CATEGORY_COLLECTION = "portfolioCategories";

export class PortfolioCategoryServiceError extends Error {
    code: "INVALID" | "DUPLICATE_SLUG" | "IN_USE" | "NOT_FOUND";

    constructor(
        code: PortfolioCategoryServiceError["code"],
        message: string
    ) {
        super(message);
        this.name = "PortfolioCategoryServiceError";
        this.code = code;
    }
}

function normalizeCategory(
    id: string,
    data: Record<string, unknown>
): PortfolioCategory {
    return {
        id,
        name: typeof data.name === "string" ? data.name : "",
        slug:
            typeof data.slug === "string"
                ? normalizeCategorySlug(data.slug)
                : "",
        description:
            typeof data.description === "string"
                ? data.description
                : "",
        active: data.active === true,
        order: typeof data.order === "number" ? data.order : 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

function sortCategories(
    categories: PortfolioCategory[]
): PortfolioCategory[] {
    return categories.sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name, "th")
    );
}

function validateInput(input: PortfolioCategoryInput) {
    try {
        return {
            name: validateCategoryName(input.name),
            slug: validateCategorySlug(input.slug),
            description: (input.description || "").trim(),
            active: input.active !== false,
            order: Number.isFinite(input.order) ? Number(input.order) : 0,
        };
    } catch (error) {
        throw new PortfolioCategoryServiceError(
            "INVALID",
            error instanceof Error
                ? error.message
                : "ข้อมูลหมวดหมู่ไม่ถูกต้อง"
        );
    }
}

async function getAllCategories(): Promise<PortfolioCategory[]> {
    const snapshot = await adminDb.collection(CATEGORY_COLLECTION).get();

    return sortCategories(
        snapshot.docs.map((item) =>
            normalizeCategory(item.id, item.data() as Record<string, unknown>)
        )
    );
}

export async function ensureDefaultCategories(): Promise<void> {
    const categories = await getAllCategories();

    if (categories.length > 0) return;

    const batch = adminDb.batch();

    DEFAULT_PORTFOLIO_CATEGORIES.forEach((category) => {
        const ref = adminDb.collection(CATEGORY_COLLECTION).doc();
        batch.set(ref, {
            ...category,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    });

    await batch.commit();
}

async function ensureUniqueSlug(slug: string, excludedId?: string) {
    const categories = await getAllCategories();
    const duplicate = categories.find(
        (category) =>
            category.id !== excludedId &&
            normalizeCategorySlug(category.slug) === slug
    );

    if (duplicate) {
        throw new PortfolioCategoryServiceError(
            "DUPLICATE_SLUG",
            "Slug นี้ถูกใช้งานแล้ว กรุณาเลือก Slug อื่น"
        );
    }
}

export async function getCategories(options?: {
    activeOnly?: boolean;
}): Promise<PortfolioCategory[]> {
    const categories = await getAllCategories();

    return options?.activeOnly
        ? categories.filter((category) => category.active)
        : categories;
}

export async function getCategory(
    id: string
): Promise<PortfolioCategory | null> {
    const snapshot = await adminDb
        .collection(CATEGORY_COLLECTION)
        .doc(id)
        .get();

    if (!snapshot.exists) return null;

    return normalizeCategory(
        snapshot.id,
        snapshot.data() as Record<string, unknown>
    );
}

export async function createCategory(
    input: PortfolioCategoryInput
): Promise<PortfolioCategory> {
    const value = validateInput(input);
    await ensureUniqueSlug(value.slug);

    const categoryRef = adminDb.collection(CATEGORY_COLLECTION).doc();

    await categoryRef.set({
        ...value,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    return {
        id: categoryRef.id,
        ...value,
    };
}

export async function updateCategory(
    id: string,
    input: PortfolioCategoryInput
): Promise<PortfolioCategory> {
    const existing = await getCategory(id);

    if (!existing) {
        throw new PortfolioCategoryServiceError(
            "NOT_FOUND",
            "ไม่พบหมวดหมู่นี้"
        );
    }

    const value = validateInput(input);
    await ensureUniqueSlug(value.slug, id);

    await adminDb.collection(CATEGORY_COLLECTION).doc(id).update({
        ...value,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return {
        ...existing,
        ...value,
    };
}

export async function getCategoryUsageCount(
    category: Pick<PortfolioCategory, "name" | "slug">
): Promise<number> {
    const snapshot = await adminDb.collection("portfolio").get();

    return snapshot.docs.filter((item) => {
        const value = item.data().category;
        return (
            typeof value === "string" && categoryMatches(value, category)
        );
    }).length;
}

export async function deleteCategory(id: string): Promise<void> {
    const category = await getCategory(id);

    if (!category) {
        throw new PortfolioCategoryServiceError(
            "NOT_FOUND",
            "ไม่พบหมวดหมู่นี้"
        );
    }

    const usageCount = await getCategoryUsageCount(category);

    if (usageCount > 0) {
        throw new PortfolioCategoryServiceError(
            "IN_USE",
            `ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมี Portfolio ใช้งานอยู่ ${usageCount} รายการ`
        );
    }

    await adminDb.collection(CATEGORY_COLLECTION).doc(id).delete();
}
