import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import type { ThreeDProductImage } from "@/types/threeDProduct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicProduct = {
    id: string;
    name: string;
    description: string;
    category: string;
    material: string;
    price: number;
    weight: number;
    printTime: string;
    previewImage: string;
    images: ThreeDProductImage[];
    status: "active";
};

function normalizePublicProduct(id: string, data: Record<string, unknown>): PublicProduct {
    const legacyImage = typeof data.previewImage === "string" ? data.previewImage : "";
    const images: ThreeDProductImage[] = (Array.isArray(data.images) ? data.images : [])
        .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
        .map((image, index) => ({
            id: typeof image.id === "string" ? image.id : undefined,
            url: typeof image.url === "string" ? image.url : "",
            name: typeof image.name === "string" ? image.name : undefined,
            alt: typeof image.alt === "string" ? image.alt : undefined,
            order: typeof image.order === "number" ? image.order : index,
        }))
        .filter((image) => image.url)
        .sort((a, b) => a.order - b.order);
    if (!images.length && legacyImage) images.push({ url: legacyImage, order: 0 });

    return {
        id,
        name: typeof data.name === "string" ? data.name : "",
        description: typeof data.description === "string" ? data.description : "",
        category: typeof data.category === "string" ? data.category : "",
        material: typeof data.material === "string" ? data.material : "",
        price: typeof data.price === "number" ? data.price : Number(data.price ?? 0),
        weight: typeof data.weight === "number" ? data.weight : Number(data.weight ?? 0),
        printTime: typeof data.printTime === "string" ? data.printTime : String(data.printTime ?? ""),
        previewImage: images[0]?.url || legacyImage,
        images,
        status: "active",
    };
}

export async function GET(request: Request) {
    try {
        const id = new URL(request.url).searchParams.get("id");
        if (id) {
            const snapshot = await adminDb.collection("threeDProducts").doc(id).get();
            if (!snapshot.exists || snapshot.data()?.status !== "active") {
                return NextResponse.json({ success: false, error: "ไม่พบ Product" }, { status: 404 });
            }
            return NextResponse.json({ success: true, product: normalizePublicProduct(id, snapshot.data() as Record<string, unknown>) }, {
                headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
            });
        }

        const snapshot = await adminDb.collection("threeDProducts").where("status", "==", "active").get();
        const products = snapshot.docs
            .map((document) => normalizePublicProduct(document.id, document.data() as Record<string, unknown>))
            .sort((a, b) => a.name.localeCompare(b.name, "th"));
        return NextResponse.json({ success: true, products }, {
            headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
        });
    } catch (error) {
        console.error("PUBLIC 3D PRODUCTS API ERROR:", error);
        return NextResponse.json({ success: false, products: [], error: "ไม่สามารถโหลดสินค้า 3D Printing ได้" }, { status: 500 });
    }
}
