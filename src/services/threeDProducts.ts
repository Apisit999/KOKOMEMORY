"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import type {
    ThreeDProduct,
    ThreeDProductImage,
    ThreeDProductInput,
} from "@/types/threeDProduct";

export type {
    ThreeDProduct,
    ThreeDProductImage,
    ThreeDProductInput,
};
export type ThreeDProductStatus = ThreeDProduct["status"];

function waitForAuthUser(): Promise<User | null> {
    if (auth.currentUser) {
        return Promise.resolve(auth.currentUser);
    }

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const user = await waitForAuthUser();
    if (!user) throw new Error("กรุณาเข้าสู่ระบบ Admin ก่อนใช้งาน");
    const token = await user.getIdToken();
    const response = await fetch(path, {
        ...init,
        headers: {
            ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "ไม่สามารถดำเนินการกับ Product ได้");
    return data;
}

export async function getThreeDProducts(): Promise<ThreeDProduct[]> {
    const result = await adminRequest<{ products?: ThreeDProduct[] }>("/api/admin/3d-printing/products");
    return Array.isArray(result.products) ? result.products : [];
}

export async function getThreeDProduct(id: string): Promise<ThreeDProduct> {
    const result = await adminRequest<{ product: ThreeDProduct }>(`/api/admin/3d-printing/products/${encodeURIComponent(id)}`);
    return result.product;
}

export async function createThreeDProduct(data: ThreeDProductInput, productId?: string): Promise<string> {
    const result = await adminRequest<{ product: ThreeDProduct }>("/api/admin/3d-printing/products", {
        method: "POST",
        body: JSON.stringify(productId ? { ...data, productId } : data),
    });
    return result.product.id;
}

export async function updateThreeDProduct(id: string, data: ThreeDProductInput): Promise<void> {
    await adminRequest(`/api/admin/3d-printing/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteThreeDProduct(id: string): Promise<void> {
    await adminRequest(`/api/admin/3d-printing/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

export async function uploadThreeDFile(file: File, kind: "image" | "model", productId: string) {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    body.set("productId", productId);
    const result = await adminRequest<{ file: ThreeDProductImage & { size: number; contentType: string } }>("/api/admin/3d-printing/upload", {
        method: "POST",
        body,
    });
    return result.file;
}

export async function deleteThreeDFile(key: string): Promise<void> {
    await adminRequest("/api/admin/3d-printing/upload", {
        method: "DELETE",
        body: JSON.stringify({ key }),
    });
}
