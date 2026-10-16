import type { Metadata } from "next";
import { headers } from "next/headers";

import { adminDb } from "@/lib/firebase-admin";

const fallbackTitle = "KOKO Memory | Photobooth & Event";
const fallbackDescription =
    "KOKO Memory Photobooth & Event — เก็บทุกช่วงเวลาสำคัญให้กลายเป็นความทรงจำ";
const fallbackImage = "/hero/wedding.jpg";

type PortfolioDocument = {
    title?: unknown;
    description?: unknown;
    coverImage?: unknown;
    images?: unknown;
    status?: unknown;
};

function getImageUrls(rawImages: unknown): string[] {
    if (!Array.isArray(rawImages)) {
        return [];
    }

    return rawImages
        .filter(
            (image): image is Record<string, unknown> =>
                Boolean(image && typeof image === "object")
        )
        .map((image) =>
            typeof image.url === "string" ? image.url : ""
        )
        .filter(Boolean);
}

async function getRequestOrigin(): Promise<string> {
    const requestHeaders = await headers();
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;

    if (configuredOrigin) {
        return configuredOrigin.replace(/\/$/, "");
    }

    const host =
        requestHeaders.get("x-forwarded-host") ||
        requestHeaders.get("host") ||
        "localhost:3000";
    const protocol =
        requestHeaders.get("x-forwarded-proto") ||
        (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
}

function toAbsoluteUrl(value: string, origin: string): string {
    try {
        return new URL(value, origin).toString();
    } catch {
        return new URL(fallbackImage, origin).toString();
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const origin = await getRequestOrigin();
    const canonicalPath = `/gallery/portfolio/${encodeURIComponent(id)}`;
    const canonicalUrl = new URL(canonicalPath, `${origin}/`).toString();
    const fallbackImageUrl = toAbsoluteUrl(fallbackImage, origin);

    try {
        const snapshot = await adminDb
            .collection("portfolio")
            .doc(id)
            .get();

        const data = snapshot.data() as PortfolioDocument | undefined;
        const imageUrls = getImageUrls(data?.images);
        const coverImage =
            typeof data?.coverImage === "string" && data.coverImage
                ? data.coverImage
                : imageUrls[0] || fallbackImage;
        const title =
            typeof data?.title === "string" && data.title
                ? `${data.title} | KOKO Memory`
                : fallbackTitle;
        const description =
            typeof data?.description === "string" && data.description
                ? data.description
                : fallbackDescription;
        const imageUrl = toAbsoluteUrl(coverImage, origin);
        const isActive = snapshot.exists && data?.status === "active";

        return {
            metadataBase: new URL(origin),
            title: isActive ? title : fallbackTitle,
            description: isActive ? description : fallbackDescription,
            alternates: {
                canonical: canonicalUrl,
            },
            openGraph: {
                type: "article",
                url: canonicalUrl,
                title: isActive ? title : fallbackTitle,
                description: isActive
                    ? description
                    : fallbackDescription,
                images: [
                    {
                        url: isActive ? imageUrl : fallbackImageUrl,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title: isActive ? title : fallbackTitle,
                description: isActive
                    ? description
                    : fallbackDescription,
                images: [isActive ? imageUrl : fallbackImageUrl],
            },
        };
    } catch {
        return {
            metadataBase: new URL(origin),
            title: fallbackTitle,
            description: fallbackDescription,
            alternates: {
                canonical: canonicalUrl,
            },
            openGraph: {
                type: "article",
                url: canonicalUrl,
                title: fallbackTitle,
                description: fallbackDescription,
                images: [{ url: fallbackImageUrl }],
            },
            twitter: {
                card: "summary_large_image",
                title: fallbackTitle,
                description: fallbackDescription,
                images: [fallbackImageUrl],
            },
        };
    }
}

export default function PortfolioDetailLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}
