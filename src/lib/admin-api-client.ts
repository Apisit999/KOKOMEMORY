"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";

function getCurrentUser(): Promise<User | null> {
    if (auth.currentUser) return Promise.resolve(auth.currentUser);

    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

export async function adminApiFetch<T>(
    path: string,
    init: RequestInit = {},
): Promise<T> {
    const user = await getCurrentUser();
    if (!user) throw new Error("UNAUTHORIZED");

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
        cache: "no-store",
    });

    const data = JSON.parse(await response.text(), (_key, value) => {
        // Admin SDK JSON timestamps use _seconds; existing UI expects Client Timestamp.
        if (value && typeof value === "object" && typeof value._seconds === "number") {
            return new Timestamp(value._seconds, value._nanoseconds || 0);
        }
        return value;
    }) as T & {
        error?: string;
        code?: string;
    };

    if (!response.ok) {
        throw new Error(data.code || data.error || "ADMIN_API_ERROR");
    }

    return data;
}
