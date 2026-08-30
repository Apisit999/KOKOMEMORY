"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("kokomemory.admin@gmail.com");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );

            console.log("LOGIN SUCCESS");
            console.log("UID:", userCredential.user.uid);
            console.log("EMAIL:", userCredential.user.email);

            // Login สำเร็จ
            router.replace("/admin/dashboard");

        } catch (error: any) {
            console.error("LOGIN ERROR:", error);

            setError(
                error?.code === "auth/invalid-credential"
                    ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
                    : error?.code === "auth/user-not-found"
                        ? "ไม่พบบัญชีนี้"
                        : error?.code === "auth/wrong-password"
                            ? "รหัสผ่านไม่ถูกต้อง"
                            : error?.message || "เข้าสู่ระบบไม่สำเร็จ"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">

                <div className="text-center mb-8">
                    <div className="text-5xl mb-3">🔥</div>

                    <h1 className="text-3xl font-bold">
                        KOKO Memory
                    </h1>

                    <p className="text-gray-500 mt-2">
                        Admin Portal
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">

                    <div>
                        <label className="block mb-2 font-medium">
                            อีเมล
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-400"
                            autoComplete="username"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">
                            รหัสผ่าน
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-400"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold"
                    >
                        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    </button>

                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    🔒 ระบบสำหรับผู้ดูแล KOKO Memory เท่านั้น
                </div>

            </div>
        </main>
    );
}