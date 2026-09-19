"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    updateProfile,
} from "firebase/auth";

import {
    doc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import {
    Eye,
    EyeOff,
    Loader2,
} from "lucide-react";


export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");

    const redirectTarget =
        typeof window !== "undefined"
            ? (() => {
                  const value = new URLSearchParams(
                      window.location.search,
                  ).get("redirect");

                  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
                      ? value
                      : "/account";
              })()
            : "/account";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [googleLoading, setGoogleLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    /* ============================================================
       EMAIL REGISTER
    ============================================================ */

    async function handleRegister(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (loading || googleLoading) {
            return;
        }

        setError("");

        const cleanName = name.trim();
        const cleanEmail =
            email.trim().toLowerCase();

        /* ========================================================
           VALIDATION
        ======================================================== */

        if (!cleanName) {
            setError("กรุณากรอกชื่อ");
            return;
        }

        if (!cleanEmail) {
            setError("กรุณากรอกอีเมล");
            return;
        }

        if (!password) {
            setError("กรุณากรอกรหัสผ่าน");
            return;
        }

        if (password.length < 6) {
            setError(
                "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
            );
            return;
        }

        if (
            password !==
            confirmPassword
        ) {
            setError(
                "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
            );
            return;
        }

        setLoading(true);

        try {
            /* ====================================================
               CREATE FIREBASE USER
            ==================================================== */

            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    cleanEmail,
                    password,
                );

            /* ====================================================
               UPDATE DISPLAY NAME
            ==================================================== */

            await updateProfile(
                result.user,
                {
                    displayName: cleanName,
                },
            );

            /* ====================================================
               CREATE / UPDATE CUSTOMER PROFILE
            ==================================================== */

            await setDoc(
                doc(
                    db,
                    "users",
                    result.user.uid,
                ),
                {
                    uid: result.user.uid,
                    name: cleanName,
                    email: cleanEmail,
                    provider: "password",
                    createdAt:
                        serverTimestamp(),
                },
                {
                    merge: true,
                },
            );

            /* ====================================================
               SEND VERIFICATION EMAIL

               Browser
                  ↓
               Firebase ID Token
                  ↓
               KOKO API
                  ↓
               Firebase Admin
                  ↓
               Resend
                  ↓
               Customer Email
            ==================================================== */

            const idToken =
                await result.user.getIdToken(
                    true,
                );

            const verificationResponse =
                await fetch(
                    "/api/auth/send-verification",
                    {
                        method: "POST",

                        headers: {
                            Authorization:
                                `Bearer ${idToken}`,
                        },
                    },
                );

            const verificationResult =
                (await verificationResponse.json()) as {
                    success?: boolean;
                    error?: string;
                    message?: string;
                };

            /* ====================================================
               HANDLE VERIFICATION ERROR
            ==================================================== */

            if (
                !verificationResponse.ok ||
                verificationResult.success !==
                    true
            ) {
                console.error(
                    "KOKO REGISTER VERIFICATION ERROR:",
                    verificationResult,
                );

                throw new Error(
                    verificationResult.error ||
                        "SEND_VERIFICATION_FAILED",
                );
            }

            /* ====================================================
               SIGN OUT AFTER REGISTRATION
            ==================================================== */

            await signOut(auth);

            /* ====================================================
               REDIRECT TO LOGIN
            ==================================================== */

            router.replace(
                `/account/login?registered=1&provider=email&email=${encodeURIComponent(
                    cleanEmail,
                )}&redirect=${encodeURIComponent(
                    redirectTarget,
                )}`,
            );

        } catch (error: unknown) {
            console.error(
                "Customer Register Error:",
                error,
            );

            switch (
                getFirebaseErrorCode(error)
            ) {
                case "auth/email-already-in-use":
                    setError(
                        "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ",
                    );
                    break;

                case "auth/invalid-email":
                    setError(
                        "รูปแบบอีเมลไม่ถูกต้อง",
                    );
                    break;

                case "auth/weak-password":
                    setError(
                        "รหัสผ่านไม่ปลอดภัยเพียงพอ",
                    );
                    break;

                case "auth/operation-not-allowed":
                    setError(
                        "ระบบสมัครสมาชิกด้วยอีเมลยังไม่ได้เปิดใช้งานใน Firebase",
                    );
                    break;

                case "auth/network-request-failed":
                    setError(
                        "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาลองใหม่",
                    );
                    break;

                case "auth/too-many-requests":
                    setError(
                        "มีการทำรายการมากเกินไป กรุณารอสักครู่",
                    );
                    break;

                default:
                    if (
                        error instanceof Error &&
                        error.message ===
                            "RESEND_SEND_FAILED"
                    ) {
                        setError(
                            "สร้างบัญชีเรียบร้อยแล้ว แต่ไม่สามารถส่ง Email ยืนยันได้ กรุณาเข้าสู่ระบบแล้วกดส่ง Email ยืนยันอีกครั้งที่หน้า Security",
                        );
                    } else if (
                        error instanceof Error &&
                        error.message ===
                            "RESEND_API_KEY_MISSING"
                    ) {
                        setError(
                            "สร้างบัญชีเรียบร้อยแล้ว แต่ระบบส่ง Email ยังไม่ได้ตั้งค่า Resend",
                        );
                    } else {
                        setError(
                            "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
                        );
                    }
            }

            /*
             * ถ้าเกิด Error หลังจาก Firebase
             * สร้าง User สำเร็จแล้ว ให้ Logout
             * เพื่อไม่ให้ผู้ใช้ค้างอยู่ใน session
             */
            try {
                if (auth.currentUser) {
                    await signOut(auth);
                }
            } catch (signOutError) {
                console.error(
                    "Register Sign Out Error:",
                    signOutError,
                );
            }
        } finally {
            setLoading(false);
        }
    }


    /* ============================================================
       GOOGLE REGISTER
    ============================================================ */

    async function handleGoogleRegister() {
        if (
            loading ||
            googleLoading
        ) {
            return;
        }

        setError("");
        setGoogleLoading(true);

        try {
            const provider =
                new GoogleAuthProvider();

            provider.setCustomParameters({
                prompt: "select_account",
            });

            const result =
                await signInWithPopup(
                    auth,
                    provider,
                );

            if (!result.user) {
                throw new Error(
                    "ไม่พบข้อมูลบัญชี Google",
                );
            }

            /* ====================================================
               CREATE / UPDATE CUSTOMER PROFILE
            ==================================================== */

            await setDoc(
                doc(
                    db,
                    "users",
                    result.user.uid,
                ),
                {
                    uid: result.user.uid,
                    name:
                        result.user
                            .displayName ||
                        "",
                    email:
                        result.user.email ||
                        "",
                    provider: "google",
                    createdAt:
                        serverTimestamp(),
                },
                {
                    merge: true,
                },
            );

            /* ====================================================
               GOOGLE DOES NOT NEED KOKO EMAIL VERIFICATION
            ==================================================== */

            await signOut(auth);

            router.replace(
                `/account/login?registered=1&provider=google&redirect=${encodeURIComponent(
                    redirectTarget,
                )}`,
            );

        } catch (error: unknown) {
            console.error(
                "Google Register Error:",
                error,
            );

            switch (
                getFirebaseErrorCode(error)
            ) {
                case "auth/popup-closed-by-user":
                    setError(
                        "หน้าต่าง Google ถูกปิดก่อนสมัครสมาชิก",
                    );
                    break;

                case "auth/popup-blocked":
                    setError(
                        "เบราว์เซอร์บล็อกหน้าต่าง Google กรุณาอนุญาต Popup แล้วลองใหม่",
                    );
                    break;

                case "auth/cancelled-popup-request":
                    setError(
                        "การสมัครสมาชิกถูกยกเลิก",
                    );
                    break;

                case "auth/account-exists-with-different-credential":
                    setError(
                        "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีที่สมัครไว้",
                    );
                    break;

                case "auth/network-request-failed":
                    setError(
                        "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาลองใหม่",
                    );
                    break;

                case "auth/operation-not-allowed":
                    setError(
                        "Google Login ยังไม่ได้เปิดใช้งานใน Firebase Authentication",
                    );
                    break;

                default:
                    setError(
                        "ไม่สามารถสมัครสมาชิกด้วย Google ได้ กรุณาลองใหม่อีกครั้ง",
                    );
            }
        } finally {
            setGoogleLoading(false);
        }
    }


    /* ============================================================
       UI
    ============================================================ */

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#FFF8FA] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

            <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1080px] items-center sm:min-h-[calc(100vh-3rem)] lg:min-h-[640px]">

                <div className="grid w-full overflow-hidden rounded-[24px] bg-white shadow-[0_40px_90px_-30px_rgba(234,78,128,0.35),0_4px_14px_rgba(60,36,48,0.06)] sm:rounded-[30px] lg:grid-cols-[1.05fr_0.95fr]">

                    {/* ==================================================
                        VISUAL PANEL
                    ================================================== */}

                    <section className="relative isolate min-h-[390px] overflow-hidden bg-[#E75B88] px-5 py-6 sm:min-h-[430px] sm:px-8 sm:py-8 lg:h-[640px] lg:min-h-[640px] lg:px-10 lg:py-10">

                        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">

                            <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#FFDCE8]/70 blur-[100px]" />

                            <div className="absolute -bottom-48 -right-32 h-[520px] w-[520px] rounded-full bg-[#7A1642]/40 blur-[110px]" />

                            <div className="absolute left-[25%] top-[35%] h-[260px] w-[260px] rounded-full bg-white/10 blur-[90px]" />

                            <div className="absolute -right-[110px] -top-[110px] h-[390px] w-[390px] koko-spin opacity-35">

                                <svg
                                    viewBox="0 0 390 390"
                                    className="h-full w-full"
                                    aria-hidden="true"
                                >
                                    <circle
                                        cx="195"
                                        cy="195"
                                        r="150"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.7)"
                                        strokeWidth="1"
                                        strokeDasharray="2 10"
                                    />

                                    <circle
                                        cx="195"
                                        cy="195"
                                        r="188"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.55)"
                                        strokeWidth="1"
                                        strokeDasharray="1 14"
                                    />
                                </svg>

                            </div>

                        </div>


                        <div className="relative z-40 flex items-center justify-between">

                            <Image src="/logo/logo.jpg" alt="KOKO Memory" width={48} height={48} className="h-11 w-11 rounded-full object-cover shadow-md transition duration-200 hover:scale-[1.02]" />

                            <span className="hidden rounded-full border border-white/30 bg-[#7A1642]/20 px-4 py-2 text-[9px] font-medium tracking-[0.18em] text-white backdrop-blur-md sm:block">
                                PHOTOBOOTH & EVENT
                            </span>

                        </div>


                        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">

                            <FloatingCard
                                image="/gallery/1.jpg"
                                className="left-[3%] top-[25%] sm:left-[6%] sm:top-[19%] lg:left-[4%] lg:top-[18%]"
                                delay="0s"
                                rotate="-8deg"
                                caption="ทุกภาพ คือความทรงจำที่มีชีวิต"
                            />

                            <FloatingCard
                                image="/gallery/2.jpg"
                                className="right-[1%] top-[58%] sm:right-[7%] sm:top-[48%] lg:right-[4%] lg:left-auto lg:top-[48%]"
                                delay="1.4s"
                                rotate="7deg"
                                caption="เก็บวันนี้ไว้ ให้เป็นของวันหน้า"
                            />

                            <FloatingCard
                                image="/gallery/3.jpg"
                                className="right-[4%] top-[18%] sm:right-[14%] sm:top-[11%] lg:right-[8%] lg:left-auto lg:top-[16%]"
                                delay="2.6s"
                                rotate="8deg"
                                caption="หนึ่งช็อต หนึ่งความทรงจำที่ไม่มีวันซ้ำ"
                            />

                            <FloatingCard
                                image="/gallery/4.jpg"
                                className="left-[2%] bottom-[14%] sm:left-[12%] sm:bottom-[10%] lg:left-[4%] lg:top-[58%] lg:bottom-auto"
                                delay="0.8s"
                                rotate="8deg"
                                caption="ยิ้มไว้ก่อน แล้วให้เวลาที่เหลือทำหน้าที่มัน"
                            />

                        </div>


                        {/* 3D MEMORY FRAME */}

                        <div className="pointer-events-none absolute left-1/2 top-[53%] z-20 w-[210px] -translate-x-1/2 -translate-y-1/2 sm:top-[53%] sm:w-[235px] lg:top-[51%] lg:w-[245px]">

                            <div className="relative overflow-visible koko-float">

                                <div className="absolute left-1/2 top-1/2 -z-20 h-[82%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-[55px]" />

                                <div className="absolute bottom-[-5%] left-1/2 -z-20 h-[12%] w-[64%] -translate-x-1/2 rounded-full bg-[#641133]/45 blur-[25px]" />


                                <div className="relative rounded-[18px] bg-gradient-to-br from-white via-[#F8E8EE] to-[#D7A5B7] p-[6px] shadow-[0_34px_45px_-20px_rgba(45,8,25,0.7)]">

                                    <div className="absolute inset-[2px] rounded-[16px] border border-white/80" />

                                    <div className="absolute inset-[6px] rounded-[12px] border border-[#B65D7D]/25" />


                                    <div className="relative overflow-hidden rounded-[11px] bg-[#25131C]">

                                        <img
                                            src="/images/auth/KOKO-3D.webp"
                                            alt="KOKO Memory"
                                            className="block aspect-[4/5] h-auto w-full object-cover object-center"
                                        />


                                        <div className="absolute inset-x-[8%] bottom-[9%] rounded-[12px] border border-white/35 bg-[#5F1738]/88 px-3 py-2.5 text-center shadow-[0_10px_22px_rgba(35,5,20,0.35)] backdrop-blur-[3px]">

                                            <p className="font-serif text-[13px] font-medium leading-[1.35] text-white sm:text-[14px]">
                                                เก็บทุกช่วงเวลา
                                            </p>

                                            <p className="mt-0.5 text-[8px] tracking-[0.12em] text-white/80 sm:text-[9px]">
                                                KEEP YOUR MEMORIES
                                            </p>

                                        </div>


                                        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent" />

                                    </div>


                                    <div className="relative px-2 pb-1 pt-2 text-center">

                                        <p className="font-serif text-[11px] font-medium tracking-[0.12em] text-[#6B3449] sm:text-[12px]">
                                            KOKO MEMORY
                                        </p>

                                        <p className="mt-0.5 text-[7px] tracking-[0.18em] text-[#A66D80] sm:text-[8px]">
                                            PHOTOBOOTH & EVENT
                                        </p>

                                    </div>

                                </div>


                                <div className="pointer-events-none absolute left-[10%] top-[5%] h-[2px] w-[34%] rotate-[-8deg] rounded-full bg-white/80 blur-[1px]" />

                            </div>

                        </div>


                        <div className="pointer-events-none absolute left-[50%] top-[30%] z-30 flex h-6 w-6 -translate-x-1/2 koko-sparkle items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-md sm:left-[43%] sm:top-[32%]">
                            ✦
                        </div>


                        <div className="absolute inset-x-0 bottom-0 z-50 border-t border-white/10 bg-gradient-to-t from-[#9E315C]/30 to-transparent px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6 lg:px-10 lg:pb-9 lg:pt-8">

                            <div className="inline-flex max-w-[290px] flex-col rounded-[18px] border border-white/25 bg-[#651537]/35 px-4 py-3 shadow-[0_14px_35px_-18px_rgba(55,10,30,0.7)] backdrop-blur-md sm:max-w-[320px] sm:px-5 sm:py-3.5">

                                <div className="mb-2 h-px w-10 bg-white/80" />

                                <p className="font-serif text-[17px] font-light leading-[1.45] text-white drop-shadow-[0_2px_8px_rgba(80,10,35,0.5)] sm:text-[20px]">
                                    ทุกภาพ คือความทรงจำที่มีชีวิต
                                </p>

                            </div>

                        </div>


                        <div className="pointer-events-none absolute left-[-35%] top-[-25%] z-0 h-[170%] w-[28%] rotate-[24deg] koko-light-sweep bg-gradient-to-r from-transparent via-white/15 to-transparent blur-2xl" />

                    </section>


                    {/* ==================================================
                        FORM
                    ================================================== */}

                    <section className="flex items-center justify-center bg-[#FFF8FA] px-5 py-10 sm:px-8 sm:py-12 md:px-12 lg:px-12 lg:py-14">

                        <div className="w-full max-w-[350px]">

                            <div className="mb-7">

                                <h1 className="font-serif text-[30px] font-medium leading-tight text-[#3C2430] sm:text-[32px]">
                                    สร้างบัญชีใหม่
                                </h1>

                                <p className="mt-2 text-sm leading-6 text-[#8C6B79]">
                                    สมัครสมาชิกเพื่อดูและจัดการการจองของคุณ
                                </p>

                            </div>


                            {error && (
                                <div
                                    role="alert"
                                    className="mb-5 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-red-600"
                                >
                                    {error}

                                    {error.includes(
                                        "มีบัญชีอยู่แล้ว",
                                    ) && (
                                        <Link
                                            href={`/account/login?redirect=${encodeURIComponent(redirectTarget)}`}
                                            className="ml-1 font-semibold underline underline-offset-4"
                                        >
                                            เข้าสู่ระบบ
                                        </Link>
                                    )}
                                </div>
                            )}


                            <form
                                onSubmit={
                                    handleRegister
                                }
                            >

                                {/* NAME */}

                                <div className="mb-[18px]">

                                    <label
                                        htmlFor="name"
                                        className="mb-2 block text-[13.5px] font-medium text-[#3C2430]"
                                    >
                                        ชื่อ
                                    </label>

                                    <div className="flex min-h-[48px] items-center rounded-[14px] border-[1.5px] border-[#FFD3E1] bg-white px-3.5 transition focus-within:border-[#FF6C99] focus-within:shadow-[0_0_0_4px_rgba(255,108,153,0.15)]">

                                        <input
                                            id="name"
                                            type="text"
                                            autoComplete="name"
                                            placeholder="ชื่อของคุณ"
                                            value={name}
                                            onChange={(
                                                event,
                                            ) =>
                                                setName(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                googleLoading
                                            }
                                            className="min-w-0 flex-1 border-none bg-transparent py-3 text-sm text-[#3C2430] outline-none placeholder:text-[#C9AFB9] disabled:opacity-50"
                                        />

                                    </div>

                                </div>


                                {/* EMAIL */}

                                <div className="mb-[18px]">

                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-[13.5px] font-medium text-[#3C2430]"
                                    >
                                        อีเมล
                                    </label>

                                    <div className="flex min-h-[48px] items-center rounded-[14px] border-[1.5px] border-[#FFD3E1] bg-white px-3.5 transition focus-within:border-[#FF6C99] focus-within:shadow-[0_0_0_4px_rgba(255,108,153,0.15)]">

                                        <input
                                            id="email"
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(
                                                event,
                                            ) =>
                                                setEmail(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                googleLoading
                                            }
                                            className="min-w-0 flex-1 border-none bg-transparent py-3 text-sm text-[#3C2430] outline-none placeholder:text-[#C9AFB9] disabled:opacity-50"
                                        />

                                    </div>

                                </div>


                                {/* PASSWORD */}

                                <div className="mb-[18px]">

                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-[13.5px] font-medium text-[#3C2430]"
                                    >
                                        รหัสผ่าน
                                    </label>

                                    <div className="flex min-h-[48px] items-center rounded-[14px] border-[1.5px] border-[#FFD3E1] bg-white px-3.5 transition focus-within:border-[#FF6C99] focus-within:shadow-[0_0_0_4px_rgba(255,108,153,0.15)]">

                                        <input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            autoComplete="new-password"
                                            placeholder="อย่างน้อย 6 ตัวอักษร"
                                            value={password}
                                            onChange={(
                                                event,
                                            ) =>
                                                setPassword(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                googleLoading
                                            }
                                            className="min-w-0 flex-1 border-none bg-transparent py-3 text-sm text-[#3C2430] outline-none placeholder:text-[#C9AFB9] disabled:opacity-50"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (
                                                        value,
                                                    ) =>
                                                        !value,
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                googleLoading
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "ซ่อนรหัสผ่าน"
                                                    : "แสดงรหัสผ่าน"
                                            }
                                            className="flex shrink-0 items-center justify-center rounded-md p-1 text-[#8C6B79] hover:text-[#EA4E80]"
                                        >
                                            {showPassword ? (
                                                <EyeOff
                                                    size={
                                                        19
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        19
                                                    }
                                                />
                                            )}
                                        </button>

                                    </div>

                                </div>


                                {/* CONFIRM PASSWORD */}

                                <div className="mb-[22px]">

                                    <label
                                        htmlFor="confirmPassword"
                                        className="mb-2 block text-[13.5px] font-medium text-[#3C2430]"
                                    >
                                        ยืนยันรหัสผ่าน
                                    </label>

                                    <div className="flex min-h-[48px] items-center rounded-[14px] border-[1.5px] border-[#FFD3E1] bg-white px-3.5 transition focus-within:border-[#FF6C99] focus-within:shadow-[0_0_0_4px_rgba(255,108,153,0.15)]">

                                        <input
                                            id="confirmPassword"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            autoComplete="new-password"
                                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                                            value={
                                                confirmPassword
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setConfirmPassword(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                googleLoading
                                            }
                                            className="min-w-0 flex-1 border-none bg-transparent py-3 text-sm text-[#3C2430] outline-none placeholder:text-[#C9AFB9] disabled:opacity-50"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (
                                                        value,
                                                    ) =>
                                                        !value,
                                                )
                                            }
                                            disabled={
                                                loading ||
                                                googleLoading
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "ซ่อนรหัสผ่าน"
                                                    : "แสดงรหัสผ่าน"
                                            }
                                            className="flex shrink-0 items-center justify-center rounded-md p-1 text-[#8C6B79] hover:text-[#EA4E80]"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff
                                                    size={
                                                        19
                                                    }
                                                />
                                            ) : (
                                                <Eye
                                                    size={
                                                        19
                                                    }
                                                />
                                            )}
                                        </button>

                                    </div>

                                </div>


                                {/* REGISTER BUTTON */}

                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        googleLoading
                                    }
                                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border-none bg-gradient-to-br from-[#FF6C99] to-[#EA4E80] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_26px_-10px_rgba(234,78,128,0.55)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                                >

                                    {loading ? (
                                        <>
                                            <Loader2
                                                size={
                                                    18
                                                }
                                                className="animate-spin"
                                            />

                                            กำลังสร้างบัญชี...
                                        </>
                                    ) : (
                                        "สมัครสมาชิก"
                                    )}

                                </button>

                            </form>


                            {/* DIVIDER */}

                            <div className="my-6 flex items-center gap-3 text-xs text-[#8C6B79]">

                                <div className="h-px flex-1 bg-[#FFD3E1]" />

                                <span>
                                    หรือ
                                </span>

                                <div className="h-px flex-1 bg-[#FFD3E1]" />

                            </div>


                            {/* GOOGLE */}

                            <button
                                type="button"
                                onClick={
                                    handleGoogleRegister
                                }
                                disabled={
                                    loading ||
                                    googleLoading
                                }
                                className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-[#FFD3E1] bg-white px-4 py-3 text-sm font-medium text-[#3C2430] transition hover:border-[#FFB4CB] hover:bg-[#FFF8FA] disabled:cursor-not-allowed disabled:opacity-60"
                            >

                                {googleLoading ? (
                                    <>
                                        <Loader2
                                            size={
                                                18
                                            }
                                            className="animate-spin text-[#EA4E80]"
                                        />

                                        กำลังเชื่อมต่อ Google...
                                    </>
                                ) : (
                                    <>
                                        <GoogleIcon />

                                        สมัครสมาชิกด้วย Google
                                    </>
                                )}

                            </button>


                            {/* LOGIN */}

                            <p className="mt-[26px] text-center text-[13.5px] text-[#8C6B79]">

                                มีบัญชีอยู่แล้ว?{" "}

                                <Link
                                    href={`/account/login?redirect=${encodeURIComponent(redirectTarget)}`}
                                    className="font-semibold text-[#EA4E80] hover:underline"
                                >
                                    เข้าสู่ระบบ
                                </Link>

                            </p>

                        </div>

                    </section>

                </div>

            </div>


            {/* ==================================================
                ANIMATIONS
            ================================================== */}

            <style jsx global>{`

                @keyframes kokoSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes kokoFloat {
                    0%, 100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-14px);
                    }
                }

                @keyframes kokoSparkle {
                    0%, 100% {
                        transform:
                            translateY(0)
                            scale(1);
                        opacity: 0.7;
                    }

                    50% {
                        transform:
                            translateY(-7px)
                            scale(1.08);
                        opacity: 1;
                    }
                }

                @keyframes kokoLightSweep {
                    0%, 55% {
                        left: -35%;
                        opacity: 0;
                    }

                    65% {
                        opacity: 0.65;
                    }

                    82%, 100% {
                        left: 120%;
                        opacity: 0;
                    }
                }

                @keyframes kokoBob {
                    0%, 100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-12px);
                    }
                }

                button:focus-visible,
                a:focus-visible,
                input:focus-visible {
                    outline: 2px solid #EA4E80;
                    outline-offset: 2px;
                }

                @media (prefers-reduced-motion: reduce) {
                    *,
                    *::before,
                    *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }

            `}</style>

        </main>
    );
}


/* ============================================================
   FLOATING CARD
============================================================ */

function FloatingCard({
    image,
    className,
    delay,
    rotate,
    gradient = "",
    caption,
}: {
    image?: string;
    className: string;
    delay: string;
    rotate: string;
    gradient?: string;
    caption: string;
}) {
    return (
        <div
            className={`absolute w-[92px] animate-[kokoBob_6.5s_ease-in-out_infinite] sm:w-[108px] lg:w-[124px] ${className}`}
            style={{
                animationDelay: delay,
            }}
        >

            <div
                className="rounded-[6px] bg-white px-2.5 pb-5 pt-2.5 shadow-[0_24px_40px_-14px_rgba(60,20,40,0.45)]"
                style={{
                    transform:
                        `rotate(${rotate})`,
                }}
            >

                {image ? (
                    <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        className="block aspect-square w-full rounded-[2px] object-cover"
                    />
                ) : (
                    <div
                        className={`aspect-square w-full rounded-[2px] bg-gradient-to-br ${gradient}`}
                    />
                )}

                <span className="mt-2 block text-center font-serif text-[9px] italic text-[#6B5560] sm:text-[10px]">
                    {caption}
                </span>

            </div>

        </div>
    );
}


/* ============================================================
   GOOGLE ICON
============================================================ */

function GoogleIcon() {
    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">

            <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.95 2.94v2.44h3.16c1.85-1.7 2.9-4.2 2.9-7.21z"
                />

                <path
                    fill="#34A853"
                    d="M12 21.75c2.65 0 4.88-.88 6.51-2.39l-3.16-2.44c-.88.59-2 .94-3.35.94-2.57 0-4.75-1.74-5.53-4.08H3.2v2.52A9.83 9.83 0 0 0 12 21.75z"
                />

                <path
                    fill="#FBBC05"
                    d="M6.47 13.78A5.91 5.91 0 0 1 6.16 12c0-.62.11-1.22.31-1.78V7.7H3.2A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05.95 4.3l3.27-2.52z"
                />

                <path
                    fill="#EA4335"
                    d="M12 6.14c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.87 3.19 14.64 2.25 12 2.25A9.83 9.83 0 0 0 3.2 7.7l3.27 2.52C7.25 7.88 9.43 6.14 12 6.14z"
                />

            </svg>

        </span>
    );
}


/* ============================================================
   FIREBASE ERROR CODE
============================================================ */

function getFirebaseErrorCode(
    error: unknown,
): string {
    if (
        error &&
        typeof error === "object" &&
        "code" in error
    ) {
        const firebaseError =
            error as {
                code?: unknown;
            };

        return typeof firebaseError.code ===
            "string"
            ? firebaseError.code
            : "";
    }

    return "";
}
