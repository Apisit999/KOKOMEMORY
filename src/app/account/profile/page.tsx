"use client";

/**
 * ============================================================
 * KOKO Memory
 * Customer Account : Profile
 * ============================================================
 *
 * URL
 * /account/profile
 *
 * ใช้ users/{uid} ของ Firebase Auth
 * ลูกค้าสามารถแก้ไขชื่อได้
 * Email / Provider แสดงจาก Firebase Auth และ profile
 * ============================================================
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Mail,
    Save,
    ShieldCheck,
    User,
} from "lucide-react";

import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";

import {
    onAuthStateChanged,
    updateProfile,
    type User as FirebaseUser,
} from "firebase/auth";

import { auth, db } from "@/lib/firebase";


/* ============================================================
   PAGE
============================================================ */

export default function AccountProfilePage() {

    const router = useRouter();

    const [
        authUser,
        setAuthUser,
    ] = useState<FirebaseUser | null>(null);

    const [
        name,
        setName,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        provider,
        setProvider,
    ] = useState("");

    const [
        isAuthLoading,
        setIsAuthLoading,
    ] = useState(true);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");


    /* ========================================================
       AUTH
    ======================================================== */

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (user) => {

                    setAuthUser(user);
                    setIsAuthLoading(false);

                    if (!user) {
                        router.replace(
                            "/account/login",
                        );
                        return;
                    }

                    setEmail(
                        user.email || "",
                    );

                    setName(
                        user.displayName || "",
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

                        if (snapshot.exists()) {

                            const data =
                                snapshot.data();

                            if (
                                typeof data.name === "string" &&
                                data.name.trim()
                            ) {
                                setName(
                                    data.name,
                                );
                            }

                            if (
                                typeof data.email === "string" &&
                                data.email.trim()
                            ) {
                                setEmail(
                                    data.email,
                                );
                            }

                            if (
                                typeof data.provider === "string"
                            ) {
                                setProvider(
                                    data.provider,
                                );
                            }

                        }

                    } catch (loadError) {

                        console.error(
                            "KOKO LOAD PROFILE ERROR:",
                            loadError,
                        );

                        setError(
                            "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้",
                        );

                    } finally {

                        setIsLoading(false);

                    }

                },
            );

        return unsubscribe;

    }, [router]);


    /* ========================================================
       SAVE
    ======================================================== */

    async function handleSave() {

        if (
            !authUser ||
            isSaving
        ) {
            return;
        }

        const cleanName =
            name.trim();

        if (!cleanName) {

            setSuccess("");
            setError(
                "กรุณากรอกชื่อของคุณ",
            );

            return;
        }

        if (cleanName.length > 100) {

            setSuccess("");
            setError(
                "ชื่อยาวเกินไป กรุณากรอกไม่เกิน 100 ตัวอักษร",
            );

            return;
        }

        setIsSaving(true);
        setError("");
        setSuccess("");

        try {

            /*
             * อัปเดต Firebase Auth displayName
             */
            await updateProfile(
                authUser,
                {
                    displayName:
                        cleanName,
                },
            );

            /*
             * อัปเดต users/{uid}
             * โดยคง uid เดิมไว้เสมอ
             */
            await setDoc(
                doc(
                    db,
                    "users",
                    authUser.uid,
                ),
                {
                    uid:
                        authUser.uid,

                    name:
                        cleanName,

                    email:
                        authUser.email || email,

                    provider:
                        provider ||
                        "password",

                    updatedAt:
                        serverTimestamp(),
                },
                {
                    merge: true,
                },
            );

            setName(cleanName);
            setSuccess(
                "บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว",
            );

        } catch (saveError) {

            console.error(
                "KOKO SAVE PROFILE ERROR:",
                saveError,
            );

            setError(
                "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
            );

        } finally {

            setIsSaving(false);

        }

    }


    /* ========================================================
       AUTH LOADING
    ======================================================== */

    if (isAuthLoading || isLoading) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">

                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">

                    <Loader2
                        size={21}
                        className="animate-spin text-pink-500"
                    />

                    กำลังโหลดโปรไฟล์...

                </div>

            </main>
        );

    }


    if (!authUser) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-sm font-semibold text-slate-500">
                    กำลังพาไปหน้าเข้าสู่ระบบ...
                </p>
            </main>
        );

    }


    const providerLabel =
        provider === "google"
            ? "Google"
            : "Email / Password";


    /* ========================================================
       UI
    ======================================================== */

    return (

        <main className="min-h-screen bg-slate-50">

            {/* HEADER */}

            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">

                <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

                    <Link
                        href="/account"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-pink-500"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">
                            กลับบัญชีของฉัน
                        </span>
                        <span className="sm:hidden">
                            กลับ
                        </span>
                    </Link>


                    <div className="min-w-0 text-right">

                        <Image src="/logo/logo.jpg" alt="KOKO Memory" width={34} height={34} className="ml-auto h-8 w-8 rounded-full object-cover" />

                        <p className="truncate text-sm font-black text-slate-900">
                            โปรไฟล์ของฉัน
                        </p>

                    </div>

                </div>

            </header>


            {/* CONTENT */}

            <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">

                <div>

                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-500">
                        My Profile
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        ข้อมูลบัญชี
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                        จัดการข้อมูลพื้นฐานของบัญชี KOKO Memory
                    </p>

                </div>


                {/* MESSAGES */}

                {error && (

                    <div
                        role="alert"
                        className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-600"
                    >
                        {error}
                    </div>

                )}


                {success && (

                    <div
                        role="status"
                        className="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700"
                    >
                        <CheckCircle2
                            size={19}
                            className="shrink-0"
                        />
                        {success}
                    </div>

                )}


                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">


                    {/* PROFILE FORM */}

                    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                        <div className="flex items-center gap-4">

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                <User size={26} />
                            </div>

                            <div>

                                <h2 className="text-lg font-black text-slate-900">
                                    ข้อมูลส่วนตัว
                                </h2>

                                <p className="text-xs text-slate-400">
                                    ข้อมูลที่ใช้ในบัญชีของคุณ
                                </p>

                            </div>

                        </div>


                        <div className="mt-7 space-y-5">

                            {/* NAME */}

                            <div>

                                <label
                                    htmlFor="profile-name"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    ชื่อ - นามสกุล
                                </label>

                                <div className="relative">

                                    <User
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="profile-name"
                                        type="text"
                                        value={name}
                                        onChange={(event) => {
                                            setName(
                                                event.target.value,
                                            );
                                            setSuccess("");
                                            setError("");
                                        }}
                                        maxLength={100}
                                        autoComplete="name"
                                        placeholder="กรอกชื่อ - นามสกุล"
                                        className="
                                            h-13
                                            w-full
                                            rounded-2xl
                                            border
                                            border-slate-200
                                            bg-white
                                            pl-11
                                            pr-4
                                            text-sm
                                            font-semibold
                                            text-slate-900
                                            outline-none
                                            transition
                                            placeholder:text-slate-400
                                            focus:border-pink-300
                                            focus:ring-4
                                            focus:ring-pink-50
                                        "
                                    />

                                </div>

                            </div>


                            {/* EMAIL */}

                            <div>

                                <label
                                    htmlFor="profile-email"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    Email
                                </label>

                                <div className="relative">

                                    <Mail
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="profile-email"
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="
                                            h-13
                                            w-full
                                            cursor-not-allowed
                                            rounded-2xl
                                            border
                                            border-slate-200
                                            bg-slate-50
                                            pl-11
                                            pr-4
                                            text-sm
                                            font-semibold
                                            text-slate-500
                                            outline-none
                                        "
                                    />

                                </div>

                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                    Email ใช้เป็นข้อมูลหลักของบัญชีและยังไม่เปิดให้แก้จากหน้านี้
                                </p>

                            </div>


                            {/* SAVE */}

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="
                                    flex
                                    h-13
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-full
                                    bg-pink-500
                                    px-6
                                    text-sm
                                    font-bold
                                    text-white
                                    shadow-lg
                                    shadow-pink-200
                                    transition
                                    hover:-translate-y-0.5
                                    hover:bg-pink-400
                                    hover:shadow-xl
                                    disabled:cursor-not-allowed
                                    disabled:bg-pink-300
                                    disabled:shadow-none
                                "
                            >

                                {isSaving ? (

                                    <>
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                        กำลังบันทึก...
                                    </>

                                ) : (

                                    <>
                                        <Save size={18} />
                                        บันทึกข้อมูล
                                    </>

                                )}

                            </button>

                        </div>

                    </section>


                    {/* ACCOUNT INFO */}

                    <aside className="space-y-6">

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                                    <ShieldCheck size={21} />
                                </div>

                                <div>

                                    <h2 className="text-base font-black text-slate-900">
                                        บัญชี
                                    </h2>

                                    <p className="text-xs text-slate-400">
                                        ข้อมูลการเข้าสู่ระบบ
                                    </p>

                                </div>

                            </div>


                            <div className="mt-5 space-y-4">

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        Provider
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                        {providerLabel}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        สถานะบัญชี
                                    </p>

                                    <div className="mt-1 flex items-center gap-2 text-sm font-bold text-green-600">
                                        <CheckCircle2 size={16} />
                                        เข้าสู่ระบบอยู่
                                    </div>

                                </div>

                            </div>

                        </section>


                        <section className="rounded-3xl border border-pink-100 bg-pink-50 p-5 sm:p-6">

                            <p className="text-sm font-black text-pink-700">
                                ต้องการดูรายการจอง?
                            </p>

                            <p className="mt-1 text-xs leading-5 text-pink-700/70">
                                ตรวจสอบ Booking และสถานะการชำระเงินได้จากหน้ารายการจอง
                            </p>

                            <Link
                                href="/account/bookings"
                                className="mt-4 flex h-11 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white transition hover:bg-pink-400"
                            >
                                ดูการจองของฉัน
                            </Link>

                        </section>

                    </aside>

                </div>

            </section>

        </main>
    );
}
