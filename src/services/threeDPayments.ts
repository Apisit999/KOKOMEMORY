"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import type {
    ThreeDPayment,
    ThreeDPaymentInput,
    ThreeDPaymentStatus,
} from "@/types/threeDPayment";

export type {
    ThreeDPayment,
    ThreeDPaymentInput,
    ThreeDPaymentStatus,
};

function waitForAuthUser(): Promise<User | null> {
    if (auth.currentUser) {
        return Promise.resolve(auth.currentUser);
    }

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                unsubscribe();
                resolve(user);
            }
        );
    });
}

async function adminRequest<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const user = await waitForAuthUser();

    if (!user) {
        throw new Error(
            "กรุณาเข้าสู่ระบบ Admin ก่อนใช้งาน"
        );
    }

    const token = await user.getIdToken();

    const response = await fetch(path, {
        ...init,
        headers: {
            ...(init.body instanceof FormData
                ? {}
                : {
                      "Content-Type":
                          "application/json",
                  }),
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    const data = (await response.json()) as T & {
        error?: string;
    };

    if (!response.ok) {
        throw new Error(
            data.error ||
                "ไม่สามารถดำเนินการกับ Payment ได้"
        );
    }

    return data;
}

export async function getThreeDPayments(
    orderId?: string
): Promise<ThreeDPayment[]> {
    const query = orderId
        ? `?orderId=${encodeURIComponent(orderId)}`
        : "";

    const result = await adminRequest<{
        payments?: ThreeDPayment[];
    }>(
        `/api/admin/3d-printing/payments${query}`
    );

    return Array.isArray(result.payments)
        ? result.payments
        : [];
}

export async function createThreeDPayment(
    data: ThreeDPaymentInput
): Promise<ThreeDPayment> {
    const result = await adminRequest<{
        payment: ThreeDPayment;
    }>("/api/admin/3d-printing/payments", {
        method: "POST",
        body: JSON.stringify(data),
    });

    return result.payment;
}

export async function updateThreeDPaymentStatus(
    id: string,
    status: ThreeDPaymentStatus
): Promise<ThreeDPayment> {
    const result = await adminRequest<{
        payment: ThreeDPayment;
    }>(
        `/api/admin/3d-printing/payments/${encodeURIComponent(
            id
        )}`,
        {
            method: "PATCH",
            body: JSON.stringify({
                status,
            }),
        }
    );

    return result.payment;
}