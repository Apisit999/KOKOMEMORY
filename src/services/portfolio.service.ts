"use client";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

/* =========================================================
   Portfolio Types
========================================================= */

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

const PORTFOLIO_COLLECTION = "portfolio";

/* =========================================================
   Helpers
========================================================= */

function requireUser() {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
    }

    return user;
}

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

export async function getPortfolios(): Promise<
    Portfolio[]
> {
    requireUser();

    const portfolioRef = collection(
        db,
        PORTFOLIO_COLLECTION
    );

    let snapshot;

    try {
        const q = query(
            portfolioRef,
            orderBy("createdAt", "desc")
        );

        snapshot = await getDocs(q);
    } catch (error) {
        /*
         * หาก Firestore ยังไม่มี index หรือข้อมูลเก่าไม่มี
         * createdAt ให้ fallback เป็น getDocs ปกติ
         */
        console.warn(
            "Portfolio ordered query failed. Falling back.",
            error
        );

        snapshot = await getDocs(portfolioRef);
    }

    const portfolios = snapshot.docs.map((item) =>
        normalizePortfolio(
            item.id,
            item.data()
        )
    );

    portfolios.sort((a, b) => {
        const aTime =
            a.createdAt &&
            typeof a.createdAt === "object" &&
            "seconds" in a.createdAt
                ? Number(
                      (
                          a.createdAt as {
                              seconds?: number;
                          }
                      ).seconds ?? 0
                  )
                : 0;

        const bTime =
            b.createdAt &&
            typeof b.createdAt === "object" &&
            "seconds" in b.createdAt
                ? Number(
                      (
                          b.createdAt as {
                              seconds?: number;
                          }
                      ).seconds ?? 0
                  )
                : 0;

        return bTime - aTime;
    });

    return portfolios;
}

/* =========================================================
   Get single portfolio
========================================================= */

export async function getPortfolio(
    id: string
): Promise<Portfolio | null> {
    requireUser();

    if (!id) {
        throw new Error("ไม่พบ Portfolio ID");
    }

    const ref = doc(
        db,
        PORTFOLIO_COLLECTION,
        id
    );

    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
        return null;
    }

    return normalizePortfolio(
        snapshot.id,
        snapshot.data()
    );
}

/* =========================================================
   Create portfolio
========================================================= */

export async function createPortfolio(
    data: Omit<
        Portfolio,
        "id" | "createdAt" | "updatedAt"
    >
): Promise<string> {
    requireUser();

    const payload = {
        title: data.title.trim(),
        description: data.description.trim(),

        category: data.category.trim(),
        eventDate: data.eventDate.trim(),

        coverImage: data.coverImage.trim(),

        images: data.images.map(
            (image, index) => ({
                ...image,
                order: index,
            })
        ),

        featured: Boolean(data.featured),

        status:
            data.status === "inactive"
                ? "inactive"
                : "active",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (!payload.title) {
        throw new Error(
            "กรุณาระบุชื่อ Portfolio"
        );
    }

    const ref = await addDoc(
        collection(
            db,
            PORTFOLIO_COLLECTION
        ),
        payload
    );

    return ref.id;
}

/* =========================================================
   Update portfolio
========================================================= */

export async function updatePortfolio(
    id: string,
    data: Partial<
        Omit<
            Portfolio,
            "id" | "createdAt" | "updatedAt"
        >
    >
): Promise<void> {
    requireUser();

    if (!id) {
        throw new Error("ไม่พบ Portfolio ID");
    }

    const ref = doc(
        db,
        PORTFOLIO_COLLECTION,
        id
    );

    const payload: Record<
        string,
        unknown
    > = {
        updatedAt: serverTimestamp(),
    };

    if (data.title !== undefined) {
        payload.title =
            data.title.trim();
    }

    if (data.description !== undefined) {
        payload.description =
            data.description.trim();
    }

    if (data.category !== undefined) {
        payload.category =
            data.category.trim();
    }

    if (data.eventDate !== undefined) {
        payload.eventDate =
            data.eventDate.trim();
    }

    if (data.coverImage !== undefined) {
        payload.coverImage =
            data.coverImage.trim();
    }

    if (data.images !== undefined) {
        payload.images =
            data.images.map(
                (image, index) => ({
                    ...image,
                    order: index,
                })
            );
    }

    if (data.featured !== undefined) {
        payload.featured =
            Boolean(data.featured);
    }

    if (data.status !== undefined) {
        payload.status =
            data.status === "inactive"
                ? "inactive"
                : "active";
    }

    await updateDoc(ref, payload);
}

/* =========================================================
   Delete portfolio
========================================================= */

export async function deletePortfolio(
    id: string
): Promise<void> {
    requireUser();

    if (!id) {
        throw new Error("ไม่พบ Portfolio ID");
    }

    const ref = doc(
        db,
        PORTFOLIO_COLLECTION,
        id
    );

    await deleteDoc(ref);
}

/* =========================================================
   Toggle status
========================================================= */

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