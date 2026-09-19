"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    onAuthStateChanged,
    signOut,
    User,
} from "firebase/auth";
import {
    doc,
    getDoc,
} from "firebase/firestore";

import {
    auth,
    db,
} from "@/lib/firebase";


/* ============================================================
   USER PROFILE
============================================================ */

type UserProfile = {
    uid?: string;
    name?: string;
    email?: string;
    provider?: "password" | "google";
};


/* ============================================================
   PAGE
============================================================ */

export default function AccountPage() {
    const router = useRouter();

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        profile,
        setProfile,
    ] = useState<UserProfile | null>(null);

    const [
        emailVerified,
        setEmailVerified,
    ] = useState(false);


    /* ============================================================
       AUTH STATE
    ============================================================ */

    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (
                    user: User | null,
                ) => {
                    if (!user) {
                        router.replace(
                            "/account/login",
                        );
                        return;
                    }

                    /*
                     * Firebase Auth เป็น Source of Truth
                     * สำหรับ Email และสถานะการยืนยัน
                     */
                    setEmailVerified(
                        user.emailVerified,
                    );

                    try {
                        const userRef =
                            doc(
                                db,
                                "users",
                                user.uid,
                            );

                        const snapshot =
                            await getDoc(
                                userRef,
                            );

                        const firestoreProfile =
                            snapshot.exists()
                                ? (snapshot.data() as UserProfile)
                                : {};

                        /*
                         * Firebase Authentication
                         * เป็น Source of Truth
                         * สำหรับ Provider
                         */
                        const provider =
                            user.providerData[0]
                                ?.providerId ===
                            "google.com"
                                ? "google"
                                : "password";

                        setProfile({
                            uid: user.uid,

                            /*
                             * ชื่อใช้จาก Firestore ก่อน
                             */
                            name:
                                firestoreProfile.name ||
                                user.displayName ||
                                "",

                            /*
                             * Email ใช้จาก Firebase Auth เสมอ
                             */
                            email:
                                user.email ||
                                "",

                            /*
                             * Provider ใช้จาก Firebase Auth
                             */
                            provider,
                        });

                    } catch (error) {
                        console.error(
                            "โหลดข้อมูลบัญชีไม่สำเร็จ:",
                            error,
                        );

                        /*
                         * ถ้า Firestore โหลดไม่ได้
                         * ยังสามารถแสดงข้อมูลจาก Firebase Auth ได้
                         */

                        const provider =
                            user.providerData[0]
                                ?.providerId ===
                            "google.com"
                                ? "google"
                                : "password";

                        setProfile({
                            uid: user.uid,
                            name:
                                user.displayName ||
                                "",
                            email:
                                user.email ||
                                "",
                            provider,
                        });

                    } finally {
                        setLoading(false);
                    }
                },
            );

        return () =>
            unsubscribe();

    }, [router]);


    /* ============================================================
       LOGOUT
    ============================================================ */

    const handleLogout =
        async () => {
            try {
                await signOut(auth);

                router.replace(
                    "/account/login",
                );

            } catch (error) {
                console.error(
                    "Logout error:",
                    error,
                );
            }
        };


    /* ============================================================
       LOADING
    ============================================================ */

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#fff7fb]">

                <div className="text-center">

                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-pink-200 border-t-[#FF4FA3]" />

                    <p className="text-sm text-gray-500">
                        กำลังโหลดข้อมูลบัญชี...
                    </p>

                </div>

            </main>
        );
    }


    /* ============================================================
       UI
    ============================================================ */

    return (
        <main className="min-h-screen bg-[#fff7fb]">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="border-b border-pink-100 bg-white/90 backdrop-blur">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">

                    <button
                        onClick={() =>
                            router.push("/")
                        }
                        className="flex items-center gap-2"
                    >

                        <Image src="/logo/logo.jpg" alt="KOKO Memory" width={44} height={44} className="h-10 w-10 rounded-full object-cover shadow-md transition duration-200 hover:scale-[1.02]" />

                        <div className="text-left">

                            <p className="text-base font-black tracking-tight text-gray-900">
                                KOKO
                            </p>

                            <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-400">
                                MEMORY
                            </p>

                        </div>

                    </button>


                    <button
                        onClick={
                            handleLogout
                        }
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-pink-200 hover:bg-pink-50 hover:text-[#FF4FA3]"
                    >
                        ออกจากระบบ
                    </button>

                </div>

            </header>


            {/* ==================================================
                CONTENT
            ================================================== */}

            <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">

                {/* ==================================================
                    WELCOME
                ================================================== */}

                <div className="mb-8">

                    <p className="mb-2 text-sm font-semibold text-[#FF4FA3]">
                        MY ACCOUNT
                    </p>

                    <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                        สวัสดี
                        {profile?.name
                            ? `, ${profile.name}`
                            : ""}{" "}
                        👋
                    </h1>

                    <p className="mt-2 text-gray-500">
                        จัดการบัญชีและรายการจองของคุณได้ที่นี่
                    </p>

                </div>


                {/* ==================================================
                    PROFILE CARD
                ================================================== */}

                <div className="mb-8 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">

                    <div className="bg-gradient-to-r from-pink-50 via-white to-blue-50 px-6 py-6 sm:px-8">

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

                            {/* AVATAR */}

                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white p-2 shadow-lg shadow-pink-100 ring-1 ring-pink-100">
                                <Image src="/logo/logo.jpg" alt="KOKO Memory" width={72} height={72} className="h-full w-full rounded-full object-cover" />
                            </div>


                            <div className="min-w-0">

                                <h2 className="truncate text-xl font-bold text-gray-900">
                                    {profile?.name ||
                                        "สมาชิก KOKO Memory"}
                                </h2>

                                <p className="mt-1 truncate text-sm text-gray-500">
                                    {profile?.email ||
                                        "-"}
                                </p>


                                {/* ACCOUNT STATUS */}

                                <div className="mt-3 flex flex-wrap items-center gap-2">

                                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm">

                                        <span className="h-2 w-2 rounded-full bg-green-500" />

                                        สมาชิก

                                    </div>


                                    {/* EMAIL STATUS */}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.push(
                                                "/account/security",
                                            )
                                        }
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                                            emailVerified
                                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                        }`}
                                    >

                                        <span
                                            className={`h-2 w-2 rounded-full ${
                                                emailVerified
                                                    ? "bg-green-500"
                                                    : "bg-amber-500"
                                            }`}
                                        />

                                        {emailVerified
                                            ? "Email ยืนยันแล้ว"
                                            : "Email ยังไม่ได้ยืนยัน"}

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* PROFILE DATA */}

                    <div className="grid gap-px bg-gray-100 sm:grid-cols-2">

                        <div className="bg-white px-6 py-5 sm:px-8">

                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                ชื่อ
                            </p>

                            <p className="mt-1 font-semibold text-gray-800">
                                {profile?.name ||
                                    "ยังไม่ได้ตั้งชื่อ"}
                            </p>

                        </div>


                        <div className="bg-white px-6 py-5 sm:px-8">

                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                อีเมล
                            </p>

                            <p className="mt-1 break-all font-semibold text-gray-800">
                                {profile?.email ||
                                    "-"}
                            </p>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    MENU
                ================================================== */}

                <div className="grid gap-5 md:grid-cols-3">

                    {/* ==================================================
                        BOOKINGS
                    ================================================== */}

                    <button
                        onClick={() =>
                            router.push(
                                "/account/bookings",
                            )
                        }
                        className="group rounded-3xl border border-pink-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-xl hover:shadow-pink-100/50"
                    >

                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-2xl transition group-hover:bg-pink-100">
                            📸
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">
                            รายการจองของฉัน
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            ดูรายละเอียดสถานะและข้อมูลการจอง Photobooth
                        </p>

                        <div className="mt-5 text-sm font-bold text-[#FF4FA3]">
                            ดูรายการจอง →
                        </div>

                    </button>


                    {/* ==================================================
                        PROFILE
                    ================================================== */}

                    <button
                        onClick={() =>
                            router.push(
                                "/account/profile",
                            )
                        }
                        className="group rounded-3xl border border-blue-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
                    >

                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl transition group-hover:bg-blue-100">
                            👤
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">
                            โปรไฟล์ของฉัน
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            แก้ไขชื่อและข้อมูลส่วนตัวของคุณ
                        </p>

                        <div className="mt-5 text-sm font-bold text-[#4F8CFF]">
                            จัดการโปรไฟล์ →
                        </div>

                    </button>


                    {/* ==================================================
                        SECURITY
                    ================================================== */}

                    <button
                        onClick={() =>
                            router.push(
                                "/account/security",
                            )
                        }
                        className="group rounded-3xl border border-amber-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/50"
                    >

                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl transition group-hover:bg-amber-100">
                            🔒
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">
                            ความปลอดภัย
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            ยืนยัน Email และจัดการรหัสผ่านของคุณ
                        </p>

                        <div className="mt-5 text-sm font-bold text-amber-600">
                            จัดการความปลอดภัย →
                        </div>

                    </button>


                    {/* ==================================================
                        NEW BOOKING
                    ================================================== */}

                    <button
                        onClick={() =>
                            router.push(
                                "/booking",
                            )
                        }
                        className="group rounded-3xl border border-purple-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100/50"
                    >

                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-2xl transition group-hover:bg-purple-100">
                            ✨
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">
                            จอง Photobooth
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            สร้างรายการจองใหม่สำหรับงานของคุณ
                        </p>

                        <div className="mt-5 text-sm font-bold text-purple-500">
                            เริ่มจอง →
                        </div>

                    </button>

                </div>


                {/* ==================================================
                    ACCOUNT INFO
                ================================================== */}

                <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <h2 className="font-bold text-gray-900">
                                บัญชี KOKO Memory
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                เข้าสู่ระบบด้วย{" "}
                                {profile?.provider ===
                                "google"
                                    ? "Google"
                                    : "Email & Password"}
                            </p>

                        </div>


                        <button
                            onClick={
                                handleLogout
                            }
                            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                        >
                            ออกจากระบบ
                        </button>

                    </div>

                </div>

            </section>

        </main>
    );
}
