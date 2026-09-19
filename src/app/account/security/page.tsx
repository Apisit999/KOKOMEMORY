"use client";

/**
 * ============================================================
 * KOKO Memory
 * Customer Account : Security
 * ============================================================
 *
 * - Email verification status
 * - Resend verification email via KOKO API + Resend
 * - Change password for Email/Password accounts
 * - Re-authentication before password change
 *
 * Google accounts do not have a KOKO password to change here.
 * ============================================================
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Mail,
    RefreshCw,
    ShieldCheck,
    XCircle,
} from "lucide-react";

import {
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    updatePassword,
    type User as FirebaseUser,
} from "firebase/auth";

import { auth } from "@/lib/firebase";


/* ============================================================
   FRIENDLY ERROR
============================================================ */

function getFriendlyError(
    error: unknown,
) {
    const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
            ? String(error.code)
            : "";

    switch (code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "รหัสผ่านปัจจุบันไม่ถูกต้อง";

        case "auth/too-many-requests":
            return "มีการลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";

        case "auth/requires-recent-login":
            return "เพื่อความปลอดภัย กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน";

        case "auth/email-already-in-use":
            return "Email นี้ถูกใช้งานอยู่แล้ว";

        case "auth/network-request-failed":
            return "ไม่สามารถเชื่อมต่อ Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ต";

        default:
            return "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง";
    }
}


/* ============================================================
   PAGE
============================================================ */

export default function AccountSecurityPage() {
    const router = useRouter();

    const [
        user,
        setUser,
    ] = useState<FirebaseUser | null>(null);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        currentPassword,
        setCurrentPassword,
    ] = useState("");

    const [
        newPassword,
        setNewPassword,
    ] = useState("");

    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState("");

    const [
        showCurrent,
        setShowCurrent,
    ] = useState(false);

    const [
        showNew,
        setShowNew,
    ] = useState(false);

    const [
        showConfirm,
        setShowConfirm,
    ] = useState(false);

    const [
        isChanging,
        setIsChanging,
    ] = useState(false);

    const [
        isSendingVerification,
        setIsSendingVerification,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");


    /* ============================================================
       AUTH STATE
    ============================================================ */

    useEffect(() => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                (currentUser) => {
                    setUser(currentUser);
                    setIsLoading(false);

                    if (!currentUser) {
                        router.replace(
                            "/account/login",
                        );
                    }
                },
            );

        return unsubscribe;
    }, [router]);


    /* ============================================================
       RESEND EMAIL VERIFICATION
       
       Browser
          ↓
       Firebase ID Token
          ↓
       /api/auth/send-verification
          ↓
       Firebase Admin
          ↓
       Resend
          ↓
       Customer Email
    ============================================================ */

    async function handleResendVerification() {
        if (!user || isSendingVerification) {
            return;
        }

        setError("");
        setSuccess("");
        setIsSendingVerification(true);

        try {
            /* ====================================================
               Get fresh Firebase ID Token
            ==================================================== */

            const idToken =
                await user.getIdToken(true);

            /* ====================================================
               Call KOKO Server API
            ==================================================== */

            const response = await fetch(
                "/api/auth/send-verification",
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${idToken}`,
                    },
                },
            );

            /* ====================================================
               Read API Response
            ==================================================== */

            const result =
                (await response.json()) as {
                    success?: boolean;
                    alreadyVerified?: boolean;
                    error?: string;
                    message?: string;
                };

            /* ====================================================
               Handle API Error
            ==================================================== */

            if (
                !response.ok ||
                result.success !== true
            ) {
                console.error(
                    "KOKO VERIFICATION API ERROR:",
                    result,
                );

                throw new Error(
                    result.error ||
                        "SEND_VERIFICATION_FAILED",
                );
            }

            /* ====================================================
               Already Verified
            ==================================================== */

            if (
                result.alreadyVerified === true
            ) {
                await user.reload();

                setUser(auth.currentUser);

                setSuccess(
                    "Email นี้ได้รับการยืนยันแล้ว",
                );

                return;
            }

            /* ====================================================
               SUCCESS
            ==================================================== */

            setSuccess(
                "ส่ง Email ยืนยันตัวตนเรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์ Spam",
            );

        } catch (verificationError) {
            console.error(
                "KOKO SEND VERIFICATION ERROR:",
                verificationError,
            );

            /* ====================================================
               Server Error Codes
            ==================================================== */

            if (
                verificationError instanceof Error
            ) {
                switch (
                    verificationError.message
                ) {
                    case "UNAUTHORIZED":
                    case "MISSING_TOKEN":
                        setError(
                            "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
                        );
                        break;

                    case "NO_EMAIL":
                        setError(
                            "บัญชีนี้ไม่มี Email สำหรับยืนยันตัวตน",
                        );
                        break;

                    case "RESEND_API_KEY_MISSING":
                        setError(
                            "ระบบส่ง Email ยังไม่ได้ตั้งค่า Resend API Key",
                        );
                        break;

                    case "RESEND_SEND_FAILED":
                        setError(
                            "Resend ไม่สามารถส่ง Email ได้ กรุณาตรวจสอบการตั้งค่า Sender และ Domain",
                        );
                        break;

                    default:
                        setError(
                            "ไม่สามารถส่ง Email ยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง",
                        );
                }

                return;
            }

            setError(
                "ไม่สามารถส่ง Email ยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง",
            );

        } finally {
            setIsSendingVerification(false);
        }
    }


    /* ============================================================
       CHANGE PASSWORD
    ============================================================ */

    async function handleChangePassword() {
        if (!user || isChanging) {
            return;
        }

        setError("");
        setSuccess("");

        if (!user.email) {
            setError(
                "บัญชีนี้ไม่มี Email สำหรับยืนยันตัวตน",
            );

            return;
        }

        if (
            !user.providerData.some(
                (provider) =>
                    provider.providerId ===
                    "password",
            )
        ) {
            setError(
                "บัญชี Google ไม่ได้ใช้รหัสผ่านของ KOKO Memory สามารถจัดการความปลอดภัยผ่าน Google ได้",
            );

            return;
        }

        if (!currentPassword) {
            setError(
                "กรุณากรอกรหัสผ่านปัจจุบัน",
            );

            return;
        }

        if (newPassword.length < 8) {
            setError(
                "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร",
            );

            return;
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            setError(
                "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน",
            );

            return;
        }

        if (
            newPassword ===
            currentPassword
        ) {
            setError(
                "รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน",
            );

            return;
        }

        setIsChanging(true);

        try {
            const credential =
                EmailAuthProvider.credential(
                    user.email,
                    currentPassword,
                );

            /*
             * Re-authentication สำคัญ:
             * Firebase จะไม่ยอมให้เปลี่ยน credential สำคัญ
             * จาก session ที่เก่าเกินไปโดยไม่ยืนยันตัวตนใหม่
             */

            await reauthenticateWithCredential(
                user,
                credential,
            );

            await updatePassword(
                user,
                newPassword,
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            setSuccess(
                "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
            );

        } catch (changeError) {
            console.error(
                "KOKO CHANGE PASSWORD ERROR:",
                changeError,
            );

            setError(
                getFriendlyError(
                    changeError,
                ),
            );

        } finally {
            setIsChanging(false);
        }
    }


    /* ============================================================
       LOADING
    ============================================================ */

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <Loader2
                        size={21}
                        className="animate-spin text-pink-500"
                    />

                    กำลังตรวจสอบความปลอดภัย...
                </div>
            </main>
        );
    }


    /* ============================================================
       NOT LOGGED IN
    ============================================================ */

    if (!user) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-sm font-semibold text-slate-500">
                    กำลังพาไปหน้าเข้าสู่ระบบ...
                </p>
            </main>
        );
    }


    /* ============================================================
       PROVIDER
    ============================================================ */

    const isPasswordAccount =
        user.providerData.some(
            (provider) =>
                provider.providerId ===
                "password",
        );


    /* ============================================================
       UI
    ============================================================ */

    return (
        <main className="min-h-screen bg-slate-50">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">

                <div className="mx-auto flex min-h-[72px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">

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


                    <div className="text-right">
                        <Image src="/logo/logo.jpg" alt="KOKO Memory" width={34} height={34} className="ml-auto h-8 w-8 rounded-full object-cover" />

                        <p className="text-sm font-black text-slate-900">
                            ความปลอดภัย
                        </p>
                    </div>

                </div>

            </header>


            {/* ==================================================
                CONTENT
            ================================================== */}

            <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">

                <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-500">
                    Security
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    ความปลอดภัยบัญชี
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                    จัดการการยืนยัน Email และรหัสผ่านของบัญชี KOKO Memory
                </p>


                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div
                        role="alert"
                        className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-600"
                    >
                        {error}
                    </div>
                )}


                {/* ==================================================
                    SUCCESS
                ================================================== */}

                {success && (
                    <div
                        role="status"
                        className="mt-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold leading-6 text-green-700"
                    >
                        <CheckCircle2
                            size={19}
                            className="mt-0.5 shrink-0"
                        />

                        {success}
                    </div>
                )}


                <div className="mt-8 grid gap-6 lg:grid-cols-2">

                    {/* ==================================================
                        EMAIL VERIFICATION
                    ================================================== */}

                    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                        <div className="flex items-center gap-4">

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                <Mail size={23} />
                            </div>

                            <div>
                                <h2 className="text-lg font-black text-slate-900">
                                    ยืนยัน Email
                                </h2>

                                <p className="text-xs text-slate-400">
                                    เพิ่มความปลอดภัยให้บัญชี
                                </p>
                            </div>

                        </div>


                        <div className="mt-6 rounded-2xl bg-slate-50 p-4">

                            <p className="text-xs text-slate-400">
                                Email
                            </p>

                            <p className="mt-1 break-all text-sm font-bold text-slate-900">
                                {user.email || "-"}
                            </p>


                            <div className="mt-4 flex items-center gap-2 text-sm font-bold">

                                {user.emailVerified ? (
                                    <>
                                        <CheckCircle2
                                            size={18}
                                            className="text-green-600"
                                        />

                                        <span className="text-green-600">
                                            ยืนยันแล้ว
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle
                                            size={18}
                                            className="text-amber-600"
                                        />

                                        <span className="text-amber-600">
                                            ยังไม่ได้ยืนยัน
                                        </span>
                                    </>
                                )}

                            </div>

                        </div>


                        {!user.emailVerified && (
                            <button
                                type="button"
                                onClick={
                                    handleResendVerification
                                }
                                disabled={
                                    isSendingVerification
                                }
                                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-pink-500 px-5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:bg-pink-300 disabled:shadow-none"
                            >

                                {isSendingVerification ? (
                                    <>
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />

                                        กำลังส่ง...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw
                                            size={18}
                                        />

                                        ส่ง Email ยืนยันอีกครั้ง
                                    </>
                                )}

                            </button>
                        )}

                    </section>


                    {/* ==================================================
                        PASSWORD
                    ================================================== */}

                    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                        <div className="flex items-center gap-4">

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                <KeyRound size={23} />
                            </div>

                            <div>
                                <h2 className="text-lg font-black text-slate-900">
                                    เปลี่ยนรหัสผ่าน
                                </h2>

                                <p className="text-xs text-slate-400">
                                    ต้องยืนยันรหัสผ่านปัจจุบันก่อน
                                </p>
                            </div>

                        </div>


                        {!isPasswordAccount ? (
                            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                                บัญชีนี้เข้าสู่ระบบด้วย Google
                                จึงไม่มีรหัสผ่าน KOKO Memory
                                ให้เปลี่ยน
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">

                                <PasswordInput
                                    id="current-password"
                                    label="รหัสผ่านปัจจุบัน"
                                    value={
                                        currentPassword
                                    }
                                    onChange={
                                        setCurrentPassword
                                    }
                                    visible={
                                        showCurrent
                                    }
                                    onToggle={() =>
                                        setShowCurrent(
                                            (value) =>
                                                !value,
                                        )
                                    }
                                />


                                <PasswordInput
                                    id="new-password"
                                    label="รหัสผ่านใหม่"
                                    value={
                                        newPassword
                                    }
                                    onChange={
                                        setNewPassword
                                    }
                                    visible={
                                        showNew
                                    }
                                    onToggle={() =>
                                        setShowNew(
                                            (value) =>
                                                !value,
                                        )
                                    }
                                />


                                <PasswordInput
                                    id="confirm-password"
                                    label="ยืนยันรหัสผ่านใหม่"
                                    value={
                                        confirmPassword
                                    }
                                    onChange={
                                        setConfirmPassword
                                    }
                                    visible={
                                        showConfirm
                                    }
                                    onToggle={() =>
                                        setShowConfirm(
                                            (value) =>
                                                !value,
                                        )
                                    }
                                />


                                <p className="text-xs leading-5 text-slate-400">
                                    ใช้อย่างน้อย 8 ตัวอักษร และไม่ควรใช้รหัสผ่านเดียวกับบริการอื่น
                                </p>


                                <button
                                    type="button"
                                    onClick={
                                        handleChangePassword
                                    }
                                    disabled={
                                        isChanging
                                    }
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-pink-500 px-5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:bg-pink-300 disabled:shadow-none"
                                >

                                    {isChanging ? (
                                        <>
                                            <Loader2
                                                size={18}
                                                className="animate-spin"
                                            />

                                            กำลังเปลี่ยนรหัสผ่าน...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck
                                                size={18}
                                            />

                                            เปลี่ยนรหัสผ่าน
                                        </>
                                    )}

                                </button>

                            </div>
                        )}

                    </section>

                </div>

            </section>

        </main>
    );
}


/* ============================================================
   PASSWORD INPUT
============================================================ */

function PasswordInput({
    id,
    label,
    value,
    onChange,
    visible,
    onToggle,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    visible: boolean;
    onToggle: () => void;
}) {
    return (
        <div>

            <label
                htmlFor={id}
                className="mb-2 block text-sm font-bold text-slate-700"
            >
                {label}
            </label>


            <div className="relative">

                <KeyRound
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />


                <input
                    id={id}
                    type={
                        visible
                            ? "text"
                            : "password"
                    }
                    value={value}
                    onChange={(event) =>
                        onChange(
                            event.target.value,
                        )
                    }
                    autoComplete={
                        id ===
                        "current-password"
                            ? "current-password"
                            : "new-password"
                    }
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
                />


                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={
                        visible
                            ? "ซ่อนรหัสผ่าน"
                            : "แสดงรหัสผ่าน"
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >

                    {visible ? (
                        <EyeOff size={17} />
                    ) : (
                        <Eye size={17} />
                    )}

                </button>

            </div>

        </div>
    );
}
