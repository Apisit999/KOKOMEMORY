"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import type {
    ThreeDOrder,
    ThreeDOrderInput,
    ThreeDOrderStatus,
    ThreeDPaymentStatus,
} from "@/types/threeDOrder";

export type {
    ThreeDOrder,
    ThreeDOrderInput,
    ThreeDOrderStatus,
    ThreeDPaymentStatus,
};

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

async function adminRequest<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const user = await waitForAuthUser();

    if (!user) {
        throw new Error("กรุณาเข้าสู่ระบบ Admin ก่อนใช้งาน");
    }

    const token = await user.getIdToken();

    const response = await fetch(path, {
        ...init,
        headers: {
            ...(init.body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    const data = (await response.json()) as T & {
        error?: string;
    };

    if (!response.ok) {
        throw new Error(
            data.error || "ไม่สามารถดำเนินการกับ Order ได้"
        );
    }

    return data;
}

/**
 * ดึง Order ทั้งหมด
 */
export async function getThreeDOrders(): Promise<ThreeDOrder[]> {
    const result = await adminRequest<{
        orders?: ThreeDOrder[];
    }>("/api/admin/3d-printing/orders");

    return Array.isArray(result.orders) ? result.orders : [];
}

/**
 * ดึง Order ตาม ID
 */
export async function getThreeDOrder(
    id: string
): Promise<ThreeDOrder> {
    const result = await adminRequest<{
        order: ThreeDOrder;
    }>(
        `/api/admin/3d-printing/orders/${encodeURIComponent(id)}`
    );

    return result.order;
}

/**
 * สร้าง Order ใหม่
 */
export async function createThreeDOrder(
    data: ThreeDOrderInput
): Promise<ThreeDOrder> {
    const result = await adminRequest<{
        order: ThreeDOrder;
    }>("/api/admin/3d-printing/orders", {
        method: "POST",
        body: JSON.stringify(data),
    });

    return result.order;
}

/**
 * แก้ไข Order
 */
export async function updateThreeDOrder(
    id: string,
    data: Partial<ThreeDOrderInput>
): Promise<ThreeDOrder> {
    const result = await adminRequest<{
        order: ThreeDOrder;
    }>(
        `/api/admin/3d-printing/orders/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            body: JSON.stringify(data),
        }
    );

    return result.order;
}

/**
 * เปลี่ยนสถานะงานผลิต
 */
export async function updateThreeDOrderStatus(
    id: string,
    orderStatus: ThreeDOrderStatus
): Promise<ThreeDOrder> {
    return updateThreeDOrder(id, {
        orderStatus,
    });
}

/**
 * เปลี่ยนสถานะการชำระเงิน
 */
export async function updateThreeDPaymentStatus(
    id: string,
    paymentStatus: ThreeDPaymentStatus
): Promise<ThreeDOrder> {
    return updateThreeDOrder(id, {
        paymentStatus,
    });
}

/**
 * ลบ Order
 */
export async function deleteThreeDOrder(
    id: string
): Promise<void> {
    await adminRequest(
        `/api/admin/3d-printing/orders/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
        }
    );
}