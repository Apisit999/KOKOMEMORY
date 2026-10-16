import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";
import type {
    ThreeDProduct,
    ThreeDProductImage,
    ThreeDProductInput,
} from "@/types/threeDProduct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeImage(value: unknown, index: number): ThreeDProductImage | null {
    if (!value || typeof value !== "object") return null;
    const image = value as Record<string, unknown>;
    if (typeof image.url !== "string" || !image.url) return null;

    const normalized: ThreeDProductImage = {
        url: image.url,
        key: typeof image.key === "string" ? image.key : "",
        name: typeof image.name === "string" ? image.name : "",
        alt: typeof image.alt === "string" ? image.alt : "",
        order: typeof image.order === "number" ? image.order : index,
    };

    if (typeof image.id === "string") normalized.id = image.id;
    if (typeof image.width === "number") normalized.width = image.width;
    if (typeof image.height === "number") normalized.height = image.height;

    return normalized;
}

export function toFirestoreProduct(input: ThreeDProductInput) {
    const payload: Record<string, unknown> = {
        name: input.name,
        description: input.description,
        category: input.category,
        material: input.material,
        price: input.price,
        weight: input.weight,
        printTime: input.printTime,
        previewImage: input.images[0]?.url || input.previewImage || "",
        images: input.images.map((image, index) => ({
            url: image.url,
            key: image.key || "",
            name: image.name || "",
            alt: image.alt || "",
            order: index,
            ...(image.id ? { id: image.id } : {}),
            ...(typeof image.width === "number" ? { width: image.width } : {}),
            ...(typeof image.height === "number" ? { height: image.height } : {}),
        })),
        modelFile: input.modelFile || "",
        status: input.status === "inactive" ? "inactive" : "active",
    };

    if (input.modelFileKey) {
        payload.modelFileKey = input.modelFileKey;
    }

    return payload;
}

export function normalizeProduct(id: string, data: Record<string, unknown>): ThreeDProduct {
    const legacyImage = typeof data.previewImage === "string" ? data.previewImage : "";
    const images = (Array.isArray(data.images) ? data.images : [])
        .map(normalizeImage)
        .filter((image): image is ThreeDProductImage => image !== null)
        .sort((a, b) => a.order - b.order);

    if (images.length === 0 && legacyImage) {
        images.push({ url: legacyImage, order: 0 });
    }

    const coverImage = images[0]?.url || legacyImage;

    return {
        id,
        name: typeof data.name === "string" ? data.name : "",
        description: typeof data.description === "string" ? data.description : "",
        category: typeof data.category === "string" ? data.category : "",
        material: typeof data.material === "string" ? data.material : "",
        price: typeof data.price === "number" ? data.price : Number(data.price ?? 0),
        weight: typeof data.weight === "number" ? data.weight : Number(data.weight ?? 0),
        printTime: typeof data.printTime === "string" ? data.printTime : String(data.printTime ?? ""),
        previewImage: coverImage,
        images,
        modelFile: typeof data.modelFile === "string" ? data.modelFile : "",
        modelFileKey: typeof data.modelFileKey === "string" ? data.modelFileKey : undefined,
        status: data.status === "inactive" ? "inactive" : "active",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

export function validateInput(body: unknown): ThreeDProductInput {
    if (!body || typeof body !== "object") {
        throw new Error("INVALID_INPUT");
    }

    const value = body as Partial<ThreeDProductInput>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const category = typeof value.category === "string" ? value.category.trim() : "";
    const price = Number(value.price);

    if (!name || !category || !Number.isFinite(price) || price < 0) {
        throw new Error("INVALID_PRODUCT");
    }

    const images = Array.isArray(value.images)
        ? value.images
            .map(normalizeImage)
            .filter((image): image is ThreeDProductImage => image !== null)
            .map((image, index) => ({ ...image, order: index }))
        : [];

    return {
        name,
        category,
        description: typeof value.description === "string" ? value.description.trim() : "",
        material: typeof value.material === "string" ? value.material.trim() : "",
        price,
        weight: Number(value.weight) >= 0 ? Number(value.weight) : 0,
        printTime: typeof value.printTime === "string" ? value.printTime.trim() : "",
        previewImage: images[0]?.url || (typeof value.previewImage === "string" ? value.previewImage : ""),
        images,
        modelFile: typeof value.modelFile === "string" ? value.modelFile : "",
        ...(typeof value.modelFileKey === "string" && value.modelFileKey
            ? { modelFileKey: value.modelFileKey }
            : {}),
        status: value.status === "inactive" ? "inactive" : "active",
    };
}

function errorResponse(error: unknown) {
    const message = error instanceof Error ? error.message : "INTERNAL";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "INVALID_PRODUCT" || message === "INVALID_INPUT" || message === "INVALID_PRODUCT_ID" ? 400 : 500;
    const errorText = status === 401 ? "กรุณาเข้าสู่ระบบ Admin ใหม่" : status === 403 ? "บัญชีนี้ไม่มีสิทธิ์ Admin" : status === 400 ? "ข้อมูล Product ไม่ครบถ้วน" : "ไม่สามารถจัดการ Product ได้";
    if (status === 500) console.error("3D product admin API error:", error);
    return NextResponse.json({ success: false, error: errorText }, { status });
}

export async function GET(request: Request) {
    try {
        await requireAdminApi(request);
        const snapshot = await adminDb.collection("threeDProducts").get();
        const products = snapshot.docs
            .map((document) => normalizeProduct(document.id, document.data() as Record<string, unknown>))
            .sort((a, b) => a.name.localeCompare(b.name, "th"));
        return NextResponse.json({ success: true, products });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await requireAdminApi(request);
        const body = await request.json() as Record<string, unknown>;
        const productId = typeof body.productId === "string" ? body.productId : "";
        if (productId && !/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
            throw new Error("INVALID_PRODUCT_ID");
        }
        const input = validateInput(body);
        const payload = {
            ...toFirestoreProduct(input),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        const reference = productId
            ? adminDb.collection("threeDProducts").doc(productId)
            : adminDb.collection("threeDProducts").doc();

        if (productId) {
            await reference.create(payload);
        } else {
            await reference.set(payload);
        }

        return NextResponse.json({ success: true, product: normalizeProduct(reference.id, input as unknown as Record<string, unknown>) }, { status: 201 });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}
