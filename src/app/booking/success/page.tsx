"use client";

import { Suspense } from "react";

/**
 * ============================================================
 * KOKO Memory - Booking Step 6 : Success
 * ============================================================
 *
 * หน้าที่:
 * ------------------------------------------------------------
 * แสดงผลหลังจากลูกค้าส่งข้อมูลการชำระเงิน
 *
 * Flow:
 * ------------------------------------------------------------
 * Step 1 → Package
 * Step 2 → Schedule
 * Step 3 → Customer
 * Step 4 → Review
 * Step 5 → Payment
 * Step 6 → Success
 *
 * หมายเหตุ:
 * ------------------------------------------------------------
 * ตอนนี้สถานะการชำระเงินยังเป็น "กำลังตรวจสอบ"
 *
 * ภายหลัง:
 * ------------------------------------------------------------
 * - Firebase
 * - Payment Gateway
 * - Webhook
 * - Payment Verification
 * - Booking Status
 * ============================================================
 */

import { useSearchParams, useRouter } from "next/navigation";

import {
    CheckCircle2,
    CalendarDays,
    CreditCard,
    Home,
    ArrowRight,
    ShieldCheck,
    Copy,
} from "lucide-react";

function SuccessContent() {
    const router = useRouter();

    const searchParams = useSearchParams();

    const packageId = searchParams.get("package") ?? "premium";
    const date = searchParams.get("date") ?? "";

    /*
     * ตอนนี้ใช้ Booking ID จำลอง
     *
     * ภายหลังจะสร้างจาก Firebase / Server
     */
    const bookingId = "KM-2026-000125";

    /*
     * Payment Reference จำลอง
     *
     * ภายหลังจะมาจาก Payment Gateway
     */
    const paymentReference = "PAY-20260810-8F32A";

    const handleCopyBookingId = async () => {
        try {
            await navigator.clipboard.writeText(bookingId);

            alert("คัดลอก Booking ID แล้ว");
        } catch {
            // ไม่ต้องทำอะไร
        }
    };

    return (
        <main className="min-h-screen bg-slate-50">

            {/* =================================================
                Step Indicator
            ================================================= */}

            <section className="border-b bg-white">

                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">

                        <span className="shrink-0 rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700">
                            ✓ Step 1
                        </span>

                        <span className="text-slate-300">
                            →
                        </span>

                        <span className="shrink-0 rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700">
                            ✓ Step 2
                        </span>

                        <span className="text-slate-300">
                            →
                        </span>

                        <span className="shrink-0 rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700">
                            ✓ Step 3
                        </span>

                        <span className="text-slate-300">
                            →
                        </span>

                        <span className="shrink-0 rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700">
                            ✓ Step 4
                        </span>

                        <span className="text-slate-300">
                            →
                        </span>

                        <span className="shrink-0 rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700">
                            ✓ Step 5
                        </span>

                        <span className="text-slate-300">
                            →
                        </span>

                        <span className="shrink-0 rounded-full bg-pink-500 px-4 py-2 font-semibold text-white">
                            Step 6
                        </span>

                    </div>

                </div>

            </section>

            {/* =================================================
                Success Header
            ================================================= */}

            <section className="px-4 py-12 text-center sm:px-6 lg:py-16">

                <div className="mx-auto max-w-3xl">

                    {/* Success Icon */}

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">

                        <CheckCircle2
                            size={46}
                            className="text-green-500"
                        />

                    </div>

                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-pink-500">
                        Booking Completed
                    </p>

                    <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
                        ส่งข้อมูลการจองสำเร็จ
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">

                        ระบบได้รับข้อมูลการจองและหลักฐานการชำระเงินของคุณแล้ว
                        ทีมงานจะตรวจสอบและยืนยันการจองอีกครั้ง

                    </p>

                </div>

            </section>

            {/* =================================================
                Booking Information
            ================================================= */}

            <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">

                {/* =================================================
                    Booking ID
                ================================================= */}

                <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm sm:p-8">

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <p className="text-sm text-slate-500">
                                Booking ID
                            </p>

                            <div className="mt-2 flex items-center gap-3">

                                <span className="text-2xl font-black tracking-wide text-slate-900">
                                    {bookingId}
                                </span>

                                <button
                                    type="button"
                                    onClick={handleCopyBookingId}
                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-pink-500"
                                    aria-label="คัดลอก Booking ID"
                                >
                                    <Copy size={18} />
                                </button>

                            </div>

                        </div>

                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700">

                            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />

                            รอตรวจสอบการชำระเงิน

                        </div>

                    </div>

                </div>

                {/* =================================================
                    Grid
                ================================================= */}

                <div className="mt-6 grid gap-6 md:grid-cols-2">

                    {/* Booking */}

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

                        <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-500">

                                <CalendarDays size={21} />

                            </div>

                            <div>

                                <h2 className="font-black text-slate-900">
                                    รายละเอียดการจอง
                                </h2>

                                <p className="text-sm text-slate-500">
                                    ข้อมูลบริการ
                                </p>

                            </div>

                        </div>

                        <div className="mt-6 space-y-4">

                            <div className="rounded-2xl bg-slate-50 p-4">

                                <p className="text-xs text-slate-400">
                                    แพ็กเกจ
                                </p>

                                <p className="mt-1 font-bold text-slate-900">
                                    {packageId}
                                </p>

                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">

                                <p className="text-xs text-slate-400">
                                    วันที่จัดงาน
                                </p>

                                <p className="mt-1 font-bold text-slate-900">
                                    {date || "รอข้อมูล"}
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* Payment */}

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

                        <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">

                                <CreditCard size={21} />

                            </div>

                            <div>

                                <h2 className="font-black text-slate-900">
                                    การชำระเงิน
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Payment information
                                </p>

                            </div>

                        </div>

                        <div className="mt-6 space-y-4">

                            <div className="rounded-2xl bg-slate-50 p-4">

                                <p className="text-xs text-slate-400">
                                    Payment Reference
                                </p>

                                <p className="mt-1 break-all font-bold text-slate-900">
                                    {paymentReference}
                                </p>

                            </div>

                            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">

                                <div className="flex items-center gap-3">

                                    <span className="h-3 w-3 shrink-0 rounded-full bg-yellow-400" />

                                    <div>

                                        <p className="font-bold text-yellow-800">
                                            กำลังตรวจสอบ
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-yellow-700">

                                            ทีมงานจะตรวจสอบหลักฐานการชำระเงิน
                                            ก่อนยืนยันการจอง

                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    Security Notice
                ================================================= */}

                <div className="mt-6 flex gap-3 rounded-3xl border border-green-100 bg-green-50 p-5 sm:p-6">

                    <ShieldCheck
                        size={23}
                        className="mt-0.5 shrink-0 text-green-600"
                    />

                    <div>

                        <p className="font-bold text-slate-900">
                            ข้อมูลการจองของคุณถูกบันทึกแล้ว
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">

                            กรุณาเก็บ Booking ID นี้ไว้สำหรับติดต่อทีมงาน
                            และตรวจสอบสถานะการจองในภายหลัง

                        </p>

                    </div>

                </div>

                {/* =================================================
                    Buttons
                ================================================= */}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 font-bold text-slate-700 transition hover:border-pink-200 hover:text-pink-500"
                    >

                        <Home size={18} />

                        กลับหน้าแรก

                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                `/booking/status?id=${bookingId}`
                            )
                        }
                        className="flex h-14 items-center justify-center gap-2 rounded-full bg-pink-500 px-7 font-bold text-white transition hover:bg-pink-400"
                    >

                        ตรวจสอบสถานะการจอง

                        <ArrowRight size={18} />

                    </button>

                </div>

            </section>

        </main>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={null}>
            <SuccessContent />
        </Suspense>
    );
}