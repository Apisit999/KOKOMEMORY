"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    MailCheck,
    Sparkles,
} from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);


    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (loading) {
            return;
        }

        setError("");

        const cleanEmail =
            email.trim().toLowerCase();


        /* ========================================================
           VALIDATION
        ======================================================== */

        if (!cleanEmail) {
            setError("กรุณากรอกอีเมล");
            return;
        }


        setLoading(true);


        try {
            /* ====================================================
               CALL KOKO PASSWORD RESET API
            ==================================================== */

            const response =
                await fetch(
                    "/api/auth/send-password-reset",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            email: cleanEmail,
                        }),
                    },
                );


            const result =
                (await response.json()) as {
                    success?: boolean;
                    error?: string;
                    message?: string;
                };


            /* ====================================================
               API ERROR
            ==================================================== */

            if (!response.ok) {
                console.error(
                    "KOKO PASSWORD RESET RESPONSE:",
                    result,
                );

                switch (
                    result.error
                ) {
                    case "INVALID_EMAIL":
                        setError(
                            "กรุณากรอกอีเมลให้ถูกต้อง",
                        );
                        break;

                    case "RESEND_API_KEY_MISSING":
                        setError(
                            "ระบบส่ง Email ยังไม่ได้ตั้งค่า Resend",
                        );
                        break;

                    case "RESEND_SEND_FAILED":
                        setError(
                            "ไม่สามารถส่ง Email ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
                        );
                        break;

                    default:
                        setError(
                            "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
                        );
                }

                return;
            }


            /* ====================================================
               SUCCESS
            ==================================================== */

            if (result.success === true) {
                setSent(true);
                return;
            }


            setError(
                "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
            );

        } catch (error: unknown) {

            console.error(
                "Forgot Password Error:",
                error,
            );

            setError(
                "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง",
            );

        } finally {
            setLoading(false);
        }
    }


    /* ============================================================
       SUCCESS SCREEN
    ============================================================ */

    if (sent) {
        return (
            <main className="min-h-screen bg-[#FFF8FA] px-4 py-6 sm:px-6 lg:px-8">

                <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-[520px] items-center">

                    <section className="w-full rounded-[24px] border border-[#F3E3E9] bg-white p-5 shadow-[0_25px_70px_-35px_rgba(234,78,128,0.42)] sm:rounded-[28px] sm:p-9">

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0F5] text-[#EA4E80] sm:h-16 sm:w-16">
                            <MailCheck
                                size={29}
                                strokeWidth={1.8}
                            />
                        </div>


                        <h1 className="mt-5 text-center font-serif text-[27px] font-medium leading-tight text-[#3C2430] sm:text-[32px]">
                            ตรวจสอบอีเมลของคุณ
                        </h1>


                        <p className="mx-auto mt-3 max-w-[390px] text-center text-[13px] leading-6 text-[#8C6B79] sm:text-sm">
                            หากอีเมลนี้มีบัญชี KOKO Memory ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
                        </p>


                        <div className="mt-5 rounded-[14px] border border-[#FFDCE8] bg-[#FFF8FA] px-4 py-3">

                            <p className="text-[10px] font-semibold text-[#6E4D59] sm:text-[11px]">
                                อีเมลที่ใช้รีเซ็ตรหัสผ่าน
                            </p>

                            <p className="mt-1 break-all text-[11px] leading-5 text-[#9B7D88] sm:text-[12px]">
                                {email.trim()}
                            </p>

                        </div>


                        <div className="mt-3 rounded-[14px] border border-[#F2E4E9] bg-[#FCFAFB] px-4 py-3">

                            <p className="text-[11px] font-semibold text-[#6E4D59] sm:text-[12px]">
                                ยังไม่พบอีเมล?
                            </p>

                            <ul className="mt-1 space-y-0.5 text-[10px] leading-5 text-[#9B7D88] sm:text-[11px]">
                                <li>
                                    • ตรวจสอบโฟลเดอร์ Spam หรือ Junk
                                </li>

                                <li>
                                    • ตรวจสอบว่าใช้อีเมลที่สมัครสมาชิกไว้
                                </li>

                                <li>
                                    • ใช้ลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่
                                </li>
                            </ul>

                        </div>


                        <button
                            type="button"
                            onClick={() =>
                                router.replace(
                                    "/account/login",
                                )
                            }
                            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-[#FF6C99] to-[#EA4E80] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_25px_-10px_rgba(234,78,128,0.55)] transition hover:-translate-y-px active:translate-y-0"
                        >
                            <ArrowLeft size={17} />
                            กลับเข้าสู่ระบบ
                        </button>


                        <button
                            type="button"
                            onClick={() => {
                                setSent(false);
                                setError("");
                            }}
                            className="mt-4 block min-h-[36px] w-full text-center text-[13px] font-medium text-[#EA4E80] hover:underline"
                        >
                            ใช้อีเมลอื่น
                        </button>

                    </section>

                </div>

            </main>
        );
    }


    /* ============================================================
       MAIN PAGE
    ============================================================ */

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#FFF8FA] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">

            <div className="mx-auto flex w-full max-w-[1120px] items-center lg:min-h-[calc(100svh-4rem)]">

                <div className="koko-auth-shell grid w-full overflow-hidden rounded-[24px] border border-[#F2DDE5] bg-white shadow-[0_35px_90px_-35px_rgba(234,78,128,0.34)] sm:rounded-[30px] lg:grid-cols-2">


                    {/* ==================================================
                        VISUAL
                    ================================================== */}

                    <section className="koko-visual relative order-1 overflow-hidden lg:order-1">

                        <div className="absolute inset-0 bg-[linear-gradient(145deg,#F58CAF_0%,#E75B88_50%,#C94776_100%)]" />

                        <div className="absolute -left-24 -top-24 h-[300px] w-[300px] rounded-full bg-white/20 blur-[75px]" />

                        <div className="absolute -bottom-28 -right-24 h-[360px] w-[360px] rounded-full bg-[#691536]/30 blur-[80px]" />


                        <div className="relative z-30 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7 lg:px-9 lg:pt-8">

                            <Image src="/logo/logo.jpg" alt="KOKO Memory" width={48} height={48} className="h-11 w-11 rounded-full object-cover shadow-md transition duration-200 hover:scale-[1.02]" />

                            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1.5 text-[7px] font-semibold tracking-[0.12em] text-white/90 backdrop-blur-md sm:px-3.5 sm:text-[8px] lg:px-4 lg:py-2 lg:text-[9px]">
                                PHOTOBOOTH & EVENT
                            </span>

                        </div>


                        {/* POLAROIDS */}

                        <div className="koko-polaroid koko-p1">
                            <div className="koko-polaroid-image koko-photo-a" />
                            <span>ช่วงเวลาดี ๆ</span>
                        </div>

                        <div className="koko-polaroid koko-p2">
                            <div className="koko-polaroid-image koko-photo-b" />
                            <span>ความทรงจำ</span>
                        </div>

                        <div className="koko-polaroid koko-p3">
                            <div className="koko-polaroid-image koko-photo-c" />
                            <span>วันสำคัญ</span>
                        </div>

                        <div className="koko-polaroid koko-p4">
                            <div className="koko-polaroid-image koko-photo-d" />
                            <span>ทุกภาพ</span>
                        </div>


                        {/* 3D STAGE */}

                        <div className="koko-3d-stage">

                            <div className="koko-orbit koko-orbit-a" />
                            <div className="koko-orbit koko-orbit-b" />

                            <div className="koko-glow" />


                            <div className="koko-frame">

                                <div className="koko-frame-photo">

                                    <img
                                        src="/images/auth/KOKO-3D.webp"
                                        alt="KOKO Memory Photobooth"
                                        className="h-full w-full object-contain koko-bob"
                                    />

                                    <div className="koko-frame-message">
                                        <span>
                                            เก็บทุกช่วงเวลา
                                        </span>

                                        <small>
                                            KEEP YOUR MEMORIES
                                        </small>
                                    </div>

                                </div>


                                <div className="koko-frame-footer">

                                    <strong>
                                        KOKO MEMORY
                                    </strong>

                                    <span>
                                        PHOTOBOOTH & EVENT
                                    </span>

                                </div>

                            </div>

                        </div>


                        <div className="relative z-30 mx-5 mb-5 mt-auto rounded-[16px] border border-white/20 bg-[#681536]/30 px-4 py-3 backdrop-blur-md sm:mx-8 sm:mb-7 sm:px-5 sm:py-3.5 lg:mx-9 lg:mb-8">

                            <div className="mb-1.5 h-px w-8 bg-white/80" />

                            <p className="font-serif text-[14px] leading-6 text-white sm:text-[16px] lg:text-[17px]">
                                รีเซ็ตรหัสผ่าน แล้วกลับมาเก็บความทรงจำไปด้วยกัน
                            </p>

                        </div>


                        <Sparkles
                            className="koko-sparkle koko-s1"
                            size={14}
                        />

                        <Sparkles
                            className="koko-sparkle koko-s2"
                            size={11}
                        />

                    </section>


                    {/* ==================================================
                        FORM
                    ================================================== */}

                    <section className="relative order-2 flex items-center bg-[#FFF8FA] lg:order-2">

                        <div className="mx-auto w-full max-w-[390px] px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12 xl:px-14">

                            <Link
                                href="/account/login"
                                className="mb-6 inline-flex min-h-[34px] items-center gap-2 text-[12px] font-medium text-[#8C6B79] transition hover:text-[#EA4E80] sm:mb-8 sm:text-[13px]"
                            >
                                <ArrowLeft size={15} />
                                กลับเข้าสู่ระบบ
                            </Link>


                            <div className="mb-6 sm:mb-7">

                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FFEAF1] text-[#EA4E80] sm:h-11 sm:w-11">
                                    <MailCheck size={20} />
                                </div>


                                <h1 className="font-serif text-[28px] font-medium leading-tight tracking-[-0.02em] text-[#3C2430] sm:text-[32px]">
                                    ลืมรหัสผ่าน?
                                </h1>


                                <p className="mt-2 max-w-[360px] text-[12px] leading-5 text-[#8C6B79] sm:text-[13px] sm:leading-6">
                                    กรอกอีเมลที่ใช้สมัครสมาชิก แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
                                </p>

                            </div>


                            {error && (
                                <div
                                    role="alert"
                                    className="mb-4 rounded-[13px] border border-red-100 bg-red-50 px-3.5 py-3 text-[11px] leading-5 text-red-600 sm:text-xs"
                                >
                                    {error}
                                </div>
                            )}


                            <form
                                onSubmit={
                                    handleSubmit
                                }
                                className="w-full"
                            >

                                <label
                                    htmlFor="forgot-email"
                                    className="mb-2 block text-[12px] font-semibold text-[#3C2430] sm:text-[13px]"
                                >
                                    อีเมล
                                </label>


                                <input
                                    id="forgot-email"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(
                                        event,
                                    ) =>
                                        setEmail(
                                            event.target.value,
                                        )
                                    }
                                    disabled={
                                        loading
                                    }
                                    className="box-border block min-h-[48px] w-full rounded-[13px] border-[1.5px] border-[#FFD1DF] bg-white px-3.5 text-[13px] text-[#3C2430] outline-none placeholder:text-[#C8AEB9] transition focus:border-[#FF6C99] focus:ring-4 focus:ring-[#FF6C99]/10 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[50px] sm:text-sm"
                                />


                                <button
                                    type="submit"
                                    disabled={
                                        loading
                                    }
                                    className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-br from-[#FF6C99] to-[#EA4E80] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_13px_25px_-11px_rgba(234,78,128,0.6)] transition hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[50px] sm:text-sm"
                                >

                                    {loading ? (
                                        <>
                                            <Loader2
                                                size={17}
                                                className="animate-spin"
                                            />

                                            กำลังส่งลิงก์...
                                        </>
                                    ) : (
                                        "ส่งลิงก์รีเซ็ตรหัสผ่าน"
                                    )}

                                </button>

                            </form>


                            <div className="mt-5 rounded-[13px] border border-[#F1E2E8] bg-white px-3.5 py-3">

                                <p className="text-[10px] leading-5 text-[#9B7D88] sm:text-[11px]">
                                    เพื่อความปลอดภัย ระบบจะไม่แจ้งว่าอีเมลนี้มีบัญชีอยู่หรือไม่
                                </p>

                            </div>


                            <p className="mt-5 text-center text-[12px] text-[#8C6B79] sm:text-[13px]">

                                จำรหัสผ่านได้แล้ว?{" "}

                                <Link
                                    href="/account/login"
                                    className="font-semibold text-[#EA4E80] hover:underline"
                                >
                                    เข้าสู่ระบบ
                                </Link>

                            </p>

                        </div>

                    </section>

                </div>

            </div>


            <style jsx global>{`

                .koko-auth-shell {
                    isolation: isolate;
                }

                .koko-visual {
                    min-height: 360px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }

                .koko-3d-stage {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    z-index: 20;
                    width: min(190px, 48vw);
                    aspect-ratio: 0.72;
                    transform: translate(-50%, -50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .koko-frame {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    padding: 7px;
                    border-radius: 18px;
                    background: rgba(255, 255, 255, 0.95);
                    box-shadow:
                        0 28px 45px -20px rgba(73, 20, 45, 0.5),
                        0 0 0 2px rgba(255,255,255,0.28);
                    overflow: hidden;
                    animation: kokoFloat 6.5s ease-in-out infinite;
                }

                .koko-frame-photo {
                    position: relative;
                    height: calc(100% - 39px);
                    min-height: 0;
                    overflow: hidden;
                    border-radius: 12px;
                    background: #f7e9ef;
                }

                .koko-frame-photo::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: linear-gradient(
                        115deg,
                        transparent 35%,
                        rgba(255,255,255,0.28) 48%,
                        transparent 60%
                    );
                    transform: translateX(-130%);
                    animation: kokoSweep 5.5s ease-in-out infinite;
                }

                .koko-frame-message {
                    position: absolute;
                    left: 8%;
                    right: 8%;
                    bottom: 8%;
                    z-index: 3;
                    padding: 7px 5px;
                    border-radius: 9px;
                    text-align: center;
                    background: rgba(116, 29, 65, 0.86);
                    color: white;
                    box-shadow: 0 10px 18px -12px rgba(45, 8, 28, 0.8);
                }

                .koko-frame-message span,
                .koko-frame-message small {
                    display: block;
                }

                .koko-frame-message span {
                    font-size: 8px;
                    line-height: 1.3;
                    font-weight: 600;
                }

                .koko-frame-message small {
                    margin-top: 2px;
                    font-size: 5px;
                    letter-spacing: 0.08em;
                    opacity: 0.86;
                }

                .koko-frame-footer {
                    height: 39px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #98506B;
                    text-align: center;
                }

                .koko-frame-footer strong {
                    font-family: Georgia, "Times New Roman", serif;
                    font-size: 9px;
                    letter-spacing: 0.08em;
                }

                .koko-frame-footer span {
                    margin-top: 2px;
                    font-size: 5px;
                    letter-spacing: 0.12em;
                }

                .koko-glow {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 135%;
                    height: 100%;
                    transform: translate(-50%, -50%);
                    border-radius: 999px;
                    background: rgba(255,255,255,0.22);
                    filter: blur(35px);
                    z-index: -2;
                }

                .koko-orbit {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    border: 1px solid rgba(255,255,255,0.22);
                    border-radius: 999px;
                    transform: translate(-50%, -50%);
                }

                .koko-orbit-a {
                    width: 125%;
                    height: 65%;
                    animation: kokoSpin 13s linear infinite;
                }

                .koko-orbit-b {
                    width: 105%;
                    height: 80%;
                    transform: translate(-50%, -50%) rotate(62deg);
                    animation: kokoSpinReverse 16s linear infinite;
                }

                .koko-polaroid {
                    position: absolute;
                    z-index: 10;
                    width: 68px;
                    padding: 5px 5px 9px;
                    border-radius: 4px;
                    background: rgba(255,255,255,0.96);
                    box-shadow: 0 15px 25px -14px rgba(55, 15, 35, 0.55);
                    color: #715664;
                    text-align: center;
                    font-family: Georgia, "Times New Roman", serif;
                    font-size: 6px;
                }

                .koko-polaroid-image {
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 2px;
                    background:
                        radial-gradient(circle at 65% 28%, rgba(255,255,255,0.5) 0 7%, transparent 8%),
                        linear-gradient(135deg, #ffd7e4, #dca8bd 50%, #9d526f);
                }

                .koko-photo-b {
                    background:
                        radial-gradient(circle at 28% 28%, #fff3f7 0 8%, transparent 9%),
                        linear-gradient(135deg, #eadcff, #bda6e4 50%, #7f639f);
                }

                .koko-photo-c {
                    background:
                        radial-gradient(circle at 70% 28%, #fff4dc 0 8%, transparent 9%),
                        linear-gradient(135deg, #ffe8bd, #e7ad87 50%, #a85f63);
                }

                .koko-photo-d {
                    background:
                        radial-gradient(circle at 35% 38%, #ffffff 0 7%, transparent 8%),
                        linear-gradient(135deg, #d9f2ef, #9bc7c1 50%, #5c8580);
                }

                .koko-p1 {
                    left: 8%;
                    top: 30%;
                    transform: rotate(-9deg);
                }

                .koko-p2 {
                    right: 8%;
                    top: 25%;
                    transform: rotate(8deg);
                }

                .koko-p3 {
                    left: 13%;
                    bottom: 24%;
                    transform: rotate(6deg);
                }

                .koko-p4 {
                    right: 11%;
                    bottom: 25%;
                    transform: rotate(-7deg);
                }

                .koko-sparkle {
                    position: absolute;
                    z-index: 12;
                    color: rgba(255,255,255,0.86);
                    animation: kokoSparkle 3.5s ease-in-out infinite;
                }

                .koko-s1 {
                    left: 27%;
                    top: 25%;
                }

                .koko-s2 {
                    right: 28%;
                    bottom: 29%;
                    animation-delay: 1.3s;
                }

                @keyframes kokoFloat {
                    0%, 100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-7px);
                    }
                }

                @keyframes kokoSpin {
                    from {
                        transform:
                            translate(-50%, -50%)
                            rotate(0deg);
                    }

                    to {
                        transform:
                            translate(-50%, -50%)
                            rotate(360deg);
                    }
                }

                @keyframes kokoSpinReverse {
                    from {
                        transform:
                            translate(-50%, -50%)
                            rotate(62deg);
                    }

                    to {
                        transform:
                            translate(-50%, -50%)
                            rotate(-298deg);
                    }
                }

                @keyframes kokoSweep {
                    0%, 55% {
                        transform:
                            translateX(-130%);
                    }

                    75%, 100% {
                        transform:
                            translateX(130%);
                    }
                }

                @keyframes kokoSparkle {
                    0%, 100% {
                        opacity: 0.25;
                        transform:
                            scale(0.75)
                            rotate(0deg);
                    }

                    50% {
                        opacity: 1;
                        transform:
                            scale(1.1)
                            rotate(15deg);
                    }
                }

                @media (min-width: 640px) {

                    .koko-visual {
                        min-height: 430px;
                    }

                    .koko-3d-stage {
                        width: 215px;
                    }

                    .koko-polaroid {
                        width: 78px;
                        padding: 6px 6px 10px;
                        font-size: 7px;
                    }

                    .koko-frame-message {
                        padding: 8px 6px;
                    }

                    .koko-frame-message span {
                        font-size: 9px;
                    }

                    .koko-frame-message small {
                        font-size: 5.5px;
                    }

                }

                @media (min-width: 1024px) {

                    .koko-auth-shell {
                        min-height: 650px;
                    }

                    .koko-visual {
                        min-height: 650px;
                    }

                    .koko-3d-stage {
                        width: 250px;
                    }

                    .koko-polaroid {
                        width: 84px;
                        font-size: 7px;
                    }

                    .koko-p1 {
                        left: 7%;
                        top: 28%;
                    }

                    .koko-p2 {
                        right: 7%;
                        top: 23%;
                    }

                    .koko-p3 {
                        left: 9%;
                        bottom: 22%;
                    }

                    .koko-p4 {
                        right: 9%;
                        bottom: 23%;
                    }

                    .koko-s1 {
                        left: 27%;
                        top: 25%;
                    }

                    .koko-s2 {
                        right: 26%;
                        bottom: 29%;
                    }

                }

                @media (min-width: 1280px) {

                    .koko-3d-stage {
                        width: 270px;
                    }

                    .koko-polaroid {
                        width: 90px;
                    }

                }

                @media (max-height: 700px) and (min-width: 1024px) {

                    .koko-auth-shell,
                    .koko-visual {
                        min-height: 600px;
                    }

                    .koko-3d-stage {
                        width: 225px;
                    }

                }

                @media (max-width: 639px) {

                    .koko-polaroid {
                        display: none;
                    }

                    .koko-sparkle {
                        display: none;
                    }

                    .koko-visual {
                        min-height: 330px;
                    }

                    .koko-3d-stage {
                        width: min(175px, 46vw);
                        top: 50%;
                    }

                    .koko-visual > div:last-of-type {
                        margin-top: auto;
                    }

                }

                @media (prefers-reduced-motion: reduce) {

                    *,
                    *::before,
                    *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        scroll-behavior: auto !important;
                        transition-duration: 0.01ms !important;
                    }

                }

                button:focus-visible,
                a:focus-visible,
                input:focus-visible {
                    outline: 2px solid #EA4E80;
                    outline-offset: 2px;
                }

            `}</style>

        </main>
    );
}
