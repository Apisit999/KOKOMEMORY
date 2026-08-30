"use client";

import { useEffect, useState } from "react";
import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function TestFirebasePage() {
    const [status, setStatus] = useState("กำลังเชื่อมต่อ...");
    const [error, setError] = useState("");

    useEffect(() => {
        async function testFirebase() {
            try {
                console.log("🔥 Firebase test started");

                const snapshot = await getDocs(
                    collection(db, "test")
                );

                console.log("🔥 Firestore connected");
                console.log("Documents:", snapshot.size);

                setStatus("Firebase เชื่อมต่อสำเร็จ ✅");
                setError("");
            } catch (error: any) {
                console.error("🔥 Firebase ERROR:", error);

                setStatus("Firebase เชื่อมต่อไม่สำเร็จ ❌");

                setError(
                    `${error?.code || "unknown"}: ${error?.message || "Unknown error"
                    }`
                );
            }
        }

        testFirebase();
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-8 sm:p-10 shadow-xl text-center">

                <div className="text-5xl mb-6">
                    🔥
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    KOKO Memory
                </h1>

                <p className="mt-4 text-lg font-semibold">
                    {status}
                </p>

                {error && (
                    <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-left">
                        <p className="text-sm font-semibold text-red-600">
                            Firebase Error
                        </p>

                        <p className="mt-2 break-all text-sm text-red-500">
                            {error}
                        </p>
                    </div>
                )}

                <p className="mt-6 text-sm text-slate-500">
                    Firestore Connection Test
                </p>

            </div>
        </main>
    );
}