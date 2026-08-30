"use client";

/**
 * ============================================================
 * KOKO Memory - Booking Step 5
 * ============================================================
 *
 * หน้าที่:
 * ------------------------------------------------------------
 * หน้าชำระเงินและอัปโหลดหลักฐานการโอนเงิน
 *
 * Flow:
 * ------------------------------------------------------------
 * Step 1 → เลือกแพ็กเกจ
 * Step 2 → เลือกวันจัดงาน
 * Step 3 → ข้อมูลผู้จอง
 * Step 4 → ตรวจสอบข้อมูล
 * Step 5 → ชำระเงิน       ← หน้านี้
 * Step 6 → จองสำเร็จ
 *
 * หน้าที่หลัก:
 * ------------------------------------------------------------
 * - โหลดข้อมูล Booking จาก Firebase
 * - แสดงยอดค่ามัดจำ
 * - แสดงบัญชีธนาคาร
 * - แสดง PromptPay QR
 * - ดาวน์โหลด / แชร์ QR
 * - อัปโหลดสลิป
 * - บันทึกสลิปลง Firebase Storage
 * - สร้าง Payment ใน Firestore
 * - อัปเดตสถานะ Booking
 * - ส่งลูกค้าไปหน้า Success
 *
 * ============================================================
 */


/* =========================================================
   IMPORTS
   ---------------------------------------------------------
   รวม Library และ Component ที่หน้านี้ต้องใช้
========================================================= */

import { useEffect, useMemo, useState } from "react";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";


/* =========================================================
   FIREBASE
   ---------------------------------------------------------
   ใช้สำหรับ:
   - อ่าน Booking
   - สร้าง Payment
   - อัปเดต Booking
   - Upload สลิป
========================================================= */

import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import {
    getDownloadURL,
    ref,
    uploadBytes,
} from "firebase/storage";

import {
    db,
    storage,
} from "@/lib/firebase";


/* =========================================================
   ICONS
   ---------------------------------------------------------
   ไอคอนที่ใช้ในหน้า Payment
========================================================= */

import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Copy,
    CreditCard,
    Download,
    ExternalLink,
    Loader2,
    Maximize2,
    ShieldCheck,
    Share2,
    Upload,
    X,
} from "lucide-react";


/* =========================================================
   TYPES
   ---------------------------------------------------------
   กำหนดโครงสร้างข้อมูล Booking
   ที่อ่านมาจาก Firestore
========================================================= */

type Booking = {
    id: string;

    bookingStatus?: string;

    customer?: {
        name?: string;
        phone?: string;
        email?: string;
        line?: string;
    };

    event?: {
        date?: string;
        type?: string;
    };

    package?: {
        id?: string;
        name?: string;
        price?: number;
        deposit?: number;
        hours?: number;
        duration?: string;
    };

    pricing?: {
        packagePrice?: number;
        travelFee?: number;
        discount?: number;
        total?: number;
        deposit?: number;
        remaining?: number;
    };

    payment?: {
        status?: string;
        method?: string | null;
        proofUrl?: string | null;
        paidAmount?: number;
    };

    paymentId?: string;

    paymentStatus?: string;

    totalPrice?: number;

    depositAmount?: number;
};


/* =========================================================
   PAYMENT ACCOUNT
   ---------------------------------------------------------
   ข้อมูลบัญชีสำหรับให้ลูกค้าโอนเงิน
 *
   ⚠️ แก้ข้อมูลจริงตรงนี้
========================================================= */

const PAYMENT_ACCOUNT = {

    // ธนาคาร
    bankName: "ธนาคารกสิกรไทย",

    // ชื่อย่อธนาคาร
    bankShortName: "KBank",

    // ชื่อเจ้าของบัญชี
    accountName: "KOKO Memory",

    // เลขบัญชี
    accountNumber: "180-172-8606",

    // PromptPay
    promptPay: "0827102209",

    // Logo ธนาคาร
    logoUrl: "/images/kbank-logo.webp",

    // QR Code
    qrUrl: "/images/promptpay-qr.jpg",
};


/* =========================================================
   FALLBACK PACKAGE
   ---------------------------------------------------------
   ใช้กรณีไม่พบข้อมูล Package จาก Booking
========================================================= */

const FALLBACK_PACKAGES = {

    basic: {
        name: "Basic",
        price: 8900,
        deposit: 3000,
    },

    premium: {
        name: "Premium",
        price: 14900,
        deposit: 5000,
    },

    luxury: {
        name: "Luxury",
        price: 24900,
        deposit: 10000,
    },

};


/* =========================================================
   FILE SETTINGS
   ---------------------------------------------------------
   กำหนดประเภทและขนาดไฟล์สลิปที่อนุญาต
========================================================= */

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
];


/* =========================================================
   HELPERS
   ---------------------------------------------------------
   Function ช่วยจัดรูปแบบข้อมูล
========================================================= */


/* ---------------------------------------------------------
   formatMoney
   ---------------------------------------------------------
   แปลงตัวเลขเป็นเงินบาท
--------------------------------------------------------- */

function formatMoney(amount?: number) {

    if (
        typeof amount !== "number" ||
        Number.isNaN(amount)
    ) {
        return "-";
    }

    return new Intl.NumberFormat(
        "th-TH",
        {
            style: "currency",
            currency: "THB",
            maximumFractionDigits: 0,
        }
    ).format(amount);
}


/* ---------------------------------------------------------
   formatDate
   ---------------------------------------------------------
   แปลงวันที่จาก Database
   ให้เป็นวันที่ภาษาไทย
--------------------------------------------------------- */

function formatDate(value?: string) {

    if (!value) {
        return "ยังไม่ได้ระบุวันที่";
    }

    const date =
        new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "th-TH",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
        }
    );
}


/* =========================================================
   PAGE
   ---------------------------------------------------------
   Component หลักของหน้า Payment
========================================================= */

export default function PaymentPage() {

    /* =======================================================
       ROUTER
       -------------------------------------------------------
       ใช้สำหรับเปลี่ยนหน้า Booking
    ======================================================= */

    const router = useRouter();

    const searchParams =
        useSearchParams();


    /* =======================================================
       URL PARAMS
       -------------------------------------------------------
       รับข้อมูลจาก URL เช่น:
 *
       /booking/payment
       ?bookingId=xxxx
       &package=premium
       &date=2026-08-27
    ======================================================= */

    const bookingId =
        searchParams.get("bookingId") ?? "";

    const packageId =
        searchParams.get("package") ??
        "premium";

    const dateFromUrl =
        searchParams.get("date") ?? "";


    /* =======================================================
       STATE
       -------------------------------------------------------
       เก็บข้อมูลที่เปลี่ยนแปลงระหว่างใช้งาน
    ======================================================= */

    // Booking จาก Firebase
    const [booking, setBooking] =
        useState<Booking | null>(null);

    // สถานะโหลด Booking
    const [loadingBooking, setLoadingBooking] =
        useState(true);

    // Error โหลด Booking
    const [bookingError, setBookingError] =
        useState("");


    // ไฟล์สลิป
    const [slip, setSlip] =
        useState<File | null>(null);

    // Error ไฟล์สลิป
    const [slipError, setSlipError] =
        useState("");


    // สถานะกำลังส่งข้อมูล
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    // Error ตอน Submit
    const [submitError, setSubmitError] =
        useState("");


    // สถานะ Copy เลขบัญชี
    const [copied, setCopied] =
        useState(false);


    // เปิด / ปิด QR Zoom
    const [qrZoom, setQrZoom] =
        useState(false);


    // สถานะบันทึก QR
    const [qrSaved, setQrSaved] =
        useState(false);


    // ข้อความ Share
    const [shareMessage, setShareMessage] =
        useState("");


    /* =======================================================
       FALLBACK PACKAGE
       -------------------------------------------------------
       ถ้า Booking ไม่มีข้อมูล Package
       จะใช้ Package สำรอง
    ======================================================= */

    const fallbackPackage =
        useMemo(
            () =>
                FALLBACK_PACKAGES[
                packageId as
                keyof typeof FALLBACK_PACKAGES
                ] ??
                FALLBACK_PACKAGES.premium,

            [packageId]
        );


    /* =======================================================
       LOAD BOOKING
       -------------------------------------------------------
       โหลดข้อมูล Booking จาก Firestore
    ======================================================= */

    useEffect(() => {

        async function loadBooking() {

            /* -------------------------------------------------
               ตรวจสอบ Booking ID
            ------------------------------------------------- */

            if (!bookingId) {

                setLoadingBooking(false);

                setBookingError(
                    "ไม่พบ Booking ID กรุณากลับไปเริ่มขั้นตอนการจองใหม่"
                );

                return;
            }


            try {

                setLoadingBooking(true);

                setBookingError("");


                /* -------------------------------------------------
                   อ่าน Booking
                ------------------------------------------------- */

                const snapshot =
                    await getDoc(
                        doc(
                            db,
                            "bookings",
                            bookingId
                        )
                    );


                /* -------------------------------------------------
                   ไม่พบ Booking
                ------------------------------------------------- */

                if (!snapshot.exists()) {

                    throw new Error(
                        "ไม่พบรายการจองนี้ในระบบ"
                    );

                }


                /* -------------------------------------------------
                   เก็บข้อมูล Booking
                ------------------------------------------------- */

                setBooking({

                    id: snapshot.id,

                    ...snapshot.data(),

                } as Booking);


            } catch (error: any) {

                console.error(
                    "Load payment booking error:",
                    error
                );

                setBookingError(
                    error?.message ??
                    "ไม่สามารถโหลดข้อมูลการจองได้"
                );


            } finally {

                setLoadingBooking(false);

            }

        }


        loadBooking();

    }, [bookingId]);


    /* =======================================================
       BOOKING DATA
       -------------------------------------------------------
       เตรียมข้อมูลที่ใช้แสดงบนหน้า Payment
    ======================================================= */

    const selectedPackage =
        booking?.package ??
        fallbackPackage;


    /* -------------------------------------------------------
       ยอดเงินที่ต้องชำระ
    ------------------------------------------------------- */

    const paymentAmount =
        (
            typeof booking?.pricing?.deposit ===
            "number" &&
            booking.pricing.deposit > 0
        )
            ? booking.pricing.deposit

            : (
                typeof booking?.depositAmount ===
                "number" &&
                booking.depositAmount > 0
            )
                ? booking.depositAmount

                : (
                    typeof selectedPackage.deposit ===
                    "number" &&
                    selectedPackage.deposit > 0
                )
                    ? selectedPackage.deposit

                    : 3000;


    /* -------------------------------------------------------
       ราคาบริการทั้งหมด
    ------------------------------------------------------- */

    const servicePrice =
        booking?.pricing?.total ??
        booking?.totalPrice ??
        selectedPackage.price ??
        fallbackPackage.price;


    /* -------------------------------------------------------
       วันที่จัดงาน
    ------------------------------------------------------- */

    const eventDate =
        booking?.event?.date ??
        dateFromUrl;


    /* =======================================================
       SAVE PAYMENT SESSION
       -------------------------------------------------------
       เก็บข้อมูล Payment ไว้ใน Browser
       เผื่อผู้ใช้กลับเข้ามาหน้านี้
    ======================================================= */

    useEffect(() => {

        if (!bookingId) {
            return;
        }

        try {

            const paymentSession = {

                bookingId,

                amount:
                    paymentAmount,

                bank:
                    PAYMENT_ACCOUNT.bankName,

                accountName:
                    PAYMENT_ACCOUNT.accountName,

                accountNumber:
                    PAYMENT_ACCOUNT.accountNumber,

                promptPay:
                    PAYMENT_ACCOUNT.promptPay,

                qrUrl:
                    PAYMENT_ACCOUNT.qrUrl,

                savedAt:
                    new Date().toISOString(),

            };


            localStorage.setItem(
                `koko-payment-${bookingId}`,
                JSON.stringify(
                    paymentSession
                )
            );

        } catch (error) {

            console.warn(
                "Cannot save payment session:",
                error
            );

        }

    }, [
        bookingId,
        paymentAmount,
    ]);


    /* =======================================================
       FILE VALIDATION
       -------------------------------------------------------
       ตรวจสอบสลิปก่อน Upload
    ======================================================= */

    function validateFile(
        file: File | null
    ) {

        if (!file) {

            return "กรุณาเลือกหลักฐานการโอนเงิน";

        }

        if (
            !ALLOWED_TYPES.includes(
                file.type
            )
        ) {

            return "รองรับเฉพาะ JPG, PNG หรือ PDF เท่านั้น";

        }

        if (
            file.size > MAX_FILE_SIZE
        ) {

            return "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";

        }

        return "";

    }


    /* =======================================================
       FILE CHANGE
       -------------------------------------------------------
       ทำงานเมื่อผู้ใช้เลือกสลิป
    ======================================================= */

    function handleFileChange(
        file: File | null
    ) {

        setSlipError("");

        setSubmitError("");


        const error =
            validateFile(file);


        if (error) {

            setSlip(null);

            setSlipError(error);

            return;

        }


        setSlip(file);

    }


    /* =======================================================
       COPY ACCOUNT
       -------------------------------------------------------
       คัดลอกเลขบัญชี
    ======================================================= */

    async function handleCopyAccount() {

        try {

            const cleanAccount =
                PAYMENT_ACCOUNT.accountNumber.replaceAll(
                    "-",
                    ""
                );


            await navigator.clipboard.writeText(
                cleanAccount
            );


            setCopied(true);


            setTimeout(() => {

                setCopied(false);

            }, 2000);


        } catch {

            setSubmitError(
                "ไม่สามารถคัดลอกเลขบัญชีได้"
            );

        }

    }


    /* =======================================================
       DOWNLOAD QR
       -------------------------------------------------------
       ดาวน์โหลด QR Code
    ======================================================= */

    async function handleDownloadQR() {

        try {

            const response =
                await fetch(
                    PAYMENT_ACCOUNT.qrUrl
                );


            const blob =
                await response.blob();


            const url =
                window.URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href = url;


            link.download =
                `KOKO-Memory-QR-${bookingId}.jpg`;


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            window.URL.revokeObjectURL(
                url
            );


            setQrSaved(true);


            setTimeout(() => {

                setQrSaved(false);

            }, 2000);


        } catch {

            setSubmitError(
                "ไม่สามารถบันทึก QR ได้"
            );

        }

    }


    /* =======================================================
       SHARE QR
       -------------------------------------------------------
       แชร์ข้อมูลการชำระเงิน
    ======================================================= */

    async function handleShareQR() {

        try {

            if (
                navigator.share
            ) {

                await navigator.share({

                    title:
                        "KOKO Memory - ชำระเงิน",

                    text:
                        `KOKO Memory\nBooking ID: ${bookingId}\nยอดชำระ ${formatMoney(
                            paymentAmount
                        )}\nธนาคาร: ${PAYMENT_ACCOUNT.bankName}`,

                    url:
                        window.location.href,

                });

                return;

            }


            /* -------------------------------------------------
               ถ้า Browser ไม่รองรับ Share
               ให้ Copy URL แทน
            ------------------------------------------------- */

            await navigator.clipboard.writeText(
                window.location.href
            );


            setShareMessage(
                "คัดลอกลิงก์สำหรับแชร์แล้ว"
            );


            setTimeout(() => {

                setShareMessage("");

            }, 2000);


        } catch {

            // ผู้ใช้ยกเลิก Share

        }

    }


    /* =======================================================
       SUBMIT PAYMENT
       -------------------------------------------------------
       ขั้นตอนสำคัญที่สุดของหน้า
 *
       1. ตรวจสอบข้อมูล
       2. Upload สลิป
       3. สร้าง Payment
       4. Update Booking
       5. ไป Success
    ======================================================= */

    async function handleSubmit() {

        setSubmitError("");

        setSlipError("");


        /* -----------------------------------------------------
           ตรวจสอบ Booking
        ----------------------------------------------------- */

        if (
            !bookingId ||
            !booking
        ) {

            setSubmitError(
                "ไม่พบ Booking ID หรือข้อมูลการจอง"
            );

            return;

        }


        /* -----------------------------------------------------
           ตรวจสอบไฟล์
        ----------------------------------------------------- */

        const validationError =
            validateFile(slip);


        if (validationError) {

            setSlipError(
                validationError
            );

            return;

        }


        if (!slip) {
            return;
        }


        /* -----------------------------------------------------
           ป้องกันการส่งซ้ำ
        ----------------------------------------------------- */

        if (

            booking.bookingStatus ===
            "payment_submitted"

            ||

            booking.bookingStatus ===
            "payment_verified"

            ||

            booking.bookingStatus ===
            "confirmed"

            ||

            booking.paymentStatus ===
            "submitted"

            ||

            booking.payment?.status ===
            "submitted"

            ||

            booking.payment?.status ===
            "verified"

        ) {

            setSubmitError(
                "รายการนี้มีการส่งหลักฐานหรือชำระเงินแล้ว ไม่สามารถส่งซ้ำได้"
            );

            return;

        }


        try {

            setIsSubmitting(true);


            /* =================================================
               1. UPLOAD SLIP
               -------------------------------------------------
               Upload สลิปเข้า Firebase Storage
            ================================================= */

            const safeFileName =
                slip.name
                    .replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    )
                    .slice(-100);


            const storagePath =
                `payment-slips/${bookingId}/${Date.now()}-${safeFileName}`;


            const storageRef =
                ref(
                    storage,
                    storagePath
                );


            const uploadResult =
                await uploadBytes(
                    storageRef,
                    slip,
                    {
                        contentType:
                            slip.type,
                    }
                );


            const slipUrl =
                await getDownloadURL(
                    uploadResult.ref
                );


            /* =================================================
               2. CREATE PAYMENT
               -------------------------------------------------
               สร้างเอกสาร Payment ใหม่ใน Firestore
            ================================================= */

            const paymentRef =
                await addDoc(
                    collection(
                        db,
                        "payments"
                    ),
                    {

                        bookingId,

                        amount:
                            paymentAmount,

                        currency:
                            "THB",

                        method:
                            "bank_transfer",

                        status:
                            "submitted",

                        bankName:
                            PAYMENT_ACCOUNT.bankName,

                        accountName:
                            PAYMENT_ACCOUNT.accountName,

                        accountNumber:
                            PAYMENT_ACCOUNT.accountNumber,

                        slipUrl,

                        slipPath:
                            storagePath,

                        slipFileName:
                            slip.name,

                        slipContentType:
                            slip.type,

                        slipSize:
                            slip.size,

                        customerName:
                            booking.customer?.name ??
                            "",

                        customerPhone:
                            booking.customer?.phone ??
                            "",

                        customerEmail:
                            booking.customer?.email ??
                            "",

                        submittedAt:
                            serverTimestamp(),

                        createdAt:
                            serverTimestamp(),

                    }
                );


            /* =================================================
               3. UPDATE BOOKING
               -------------------------------------------------
               เปลี่ยนสถานะ Booking เป็น
               payment_submitted
            ================================================= */

            await updateDoc(
                doc(
                    db,
                    "bookings",
                    bookingId
                ),
                {

                    bookingStatus:
                        "payment_submitted",

                    paymentId:
                        paymentRef.id,

                    paymentStatus:
                        "submitted",

                    paymentAmount:
                        paymentAmount,

                    "payment.status":
                        "submitted",

                    "payment.method":
                        "bank_transfer",

                    "payment.proofUrl":
                        slipUrl,

                    "payment.paidAmount":
                        paymentAmount,

                    "payment.paidAt":
                        serverTimestamp(),

                    paymentSubmittedAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                }
            );


            /* =================================================
               4. SUCCESS PAGE
               -------------------------------------------------
               ส่งลูกค้าไปหน้าจองสำเร็จ
            ================================================= */

            router.push(
                `/booking/success?bookingId=${encodeURIComponent(
                    bookingId
                )}&paymentId=${encodeURIComponent(
                    paymentRef.id
                )}`
            );


        } catch (error: any) {

            console.error(
                "Submit payment error:",
                error
            );


            setSubmitError(
                error?.message ??
                "ไม่สามารถส่งหลักฐานการชำระเงินได้ กรุณาลองใหม่อีกครั้ง"
            );


        } finally {

            setIsSubmitting(false);

        }

    }


    /* =======================================================
       LOADING STATE
       -------------------------------------------------------
       แสดงระหว่างกำลังโหลด Booking
    ======================================================= */

    if (loadingBooking) {

        return (

            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">

                <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

                    <Loader2
                        className="mx-auto animate-spin text-pink-500"
                        size={36}
                    />

                    <p className="mt-4 text-sm text-slate-500">
                        กำลังโหลดข้อมูลการจอง...
                    </p>

                </div>

            </main>

        );

    }


    /* =======================================================
       ERROR STATE
       -------------------------------------------------------
       แสดงเมื่อไม่พบ Booking
    ======================================================= */

    if (
        bookingError ||
        !booking
    ) {

        return (

            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">

                <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">

                        <X size={28} />

                    </div>


                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        ไม่สามารถเปิดรายการชำระเงิน
                    </h1>


                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {bookingError}
                    </p>


                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/booking"
                            )
                        }
                        className="mt-6 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white hover:bg-pink-600"
                    >
                        กลับไปเริ่มการจอง
                    </button>

                </div>

            </main>

        );

    }


    /* =======================================================
       UI
       -------------------------------------------------------
       ส่วนแสดงผลหลักของหน้า Payment
    ======================================================= */

    return (

        <main className="min-h-screen bg-slate-50">


            {/* =================================================
                STEP INDICATOR
                -------------------------------------------------
                แสดงตำแหน่งของลูกค้าในระบบ Booking
            ================================================= */}

            <section className="border-b bg-white">

                <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">

                        {/* Step 1-4 เสร็จแล้ว */}

                        {[
                            "✓ แพ็กเกจ",
                            "✓ วันจัดงาน",
                            "✓ ข้อมูลผู้จอง",
                            "✓ ตรวจสอบ",
                        ].map(
                            (step) => (

                                <span
                                    key={step}
                                    className="shrink-0 rounded-full bg-green-100 px-4 py-2 font-semibold text-green-700"
                                >
                                    {step}
                                </span>

                            )
                        )}


                        {/* Step 5 ปัจจุบัน */}

                        <span className="shrink-0 rounded-full bg-pink-500 px-4 py-2 font-semibold text-white">
                            ⑤ ชำระเงิน
                        </span>


                        <span className="text-slate-300">
                            →
                        </span>


                        {/* Step 6 */}

                        <span className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-slate-500">
                            ⑥ สำเร็จ
                        </span>

                    </div>

                </div>

            </section>


            {/* =================================================
                PAGE HEADER
                -------------------------------------------------
                หัวข้อหลักของหน้า
            ================================================= */}

            <section className="px-4 py-10 text-center sm:px-6 lg:py-14">

                <div className="mx-auto max-w-3xl">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-500">

                        <CreditCard size={28} />

                    </div>


                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-pink-500">
                        ขั้นตอนที่ 5 · การชำระเงิน
                    </p>


                    <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
                        ชำระเงิน
                    </h1>


                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                        โอนค่ามัดจำแล้วอัปโหลดหลักฐานเพื่อให้ทีมงานตรวจสอบ
                    </p>

                </div>

            </section>


            {/* =================================================
                MAIN CONTENT
                -------------------------------------------------
                แบ่งเป็น 2 ส่วน:
 *
                ซ้าย  → สรุปการจอง
                ขวา   → ชำระเงิน
            ================================================= */}

            <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">

                <div className="grid gap-6 lg:grid-cols-[1fr_450px]">


                    {/* =================================================
                        LEFT COLUMN
                        -------------------------------------------------
                        สรุปข้อมูล Booking
                    ================================================= */}

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-9">

                        {/* ส่วนหัว */}

                        <div className="flex items-center justify-between gap-4">

                            <div>

                                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                                    สรุปการจอง
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    ข้อมูลจากรายการจองของคุณ
                                </p>

                            </div>


                            {/* สถานะ */}

                            <div className="hidden rounded-2xl bg-green-50 px-4 py-3 text-center sm:block">

                                <p className="text-xs text-green-600">
                                    สถานะ
                                </p>

                                <p className="mt-1 text-sm font-bold text-green-700">
                                    รอชำระเงิน
                                </p>

                            </div>

                        </div>


                        {/* =================================================
                            BOOKING INFORMATION
                        ================================================= */}

                        <div className="mt-7 space-y-3">


                            {/* Booking ID */}

                            <div className="rounded-2xl bg-slate-50 p-5">

                                <p className="text-sm text-slate-500">
                                    Booking ID
                                </p>

                                <code className="mt-1 block break-all text-xs font-semibold text-slate-700">
                                    {booking.id}
                                </code>

                            </div>


                            {/* Customer */}

                            <div className="rounded-2xl bg-slate-50 p-5">

                                <p className="text-sm text-slate-500">
                                    ลูกค้า
                                </p>

                                <p className="mt-1 font-bold text-slate-900">
                                    {booking.customer?.name ||
                                        "ไม่ระบุ"}
                                </p>

                                {booking.customer?.phone && (

                                    <p className="mt-1 text-sm text-slate-500">
                                        {booking.customer.phone}
                                    </p>

                                )}

                            </div>


                            {/* Package */}

                            <div className="rounded-2xl bg-slate-50 p-5">

                                <p className="text-sm text-slate-500">
                                    แพ็กเกจ
                                </p>

                                <p className="mt-1 text-lg font-bold text-slate-900">
                                    {selectedPackage.name}
                                </p>

                            </div>


                            {/* Event Date */}

                            <div className="rounded-2xl bg-slate-50 p-5">

                                <p className="text-sm text-slate-500">
                                    วันที่จัดงาน
                                </p>

                                <p className="mt-1 font-bold text-slate-900">
                                    {formatDate(
                                        eventDate
                                    )}
                                </p>

                            </div>

                        </div>


                        {/* =================================================
                            PRICE SUMMARY
                        ================================================= */}

                        <div className="mt-8 border-t pt-6">

                            <div className="flex items-center justify-between">

                                <span className="text-slate-500">
                                    ราคาบริการ
                                </span>

                                <span className="font-semibold text-slate-900">
                                    {formatMoney(
                                        servicePrice
                                    )}
                                </span>

                            </div>


                            <div className="mt-3 flex items-center justify-between">

                                <span className="text-slate-500">
                                    ค่ามัดจำ
                                </span>

                                <span className="font-semibold text-pink-500">
                                    {formatMoney(
                                        paymentAmount
                                    )}
                                </span>

                            </div>


                            <div className="mt-5 flex items-end justify-between border-t pt-5">

                                <span className="font-bold text-slate-900">
                                    ยอดที่ต้องชำระ
                                </span>

                                <span className="text-3xl font-black text-pink-500">
                                    {formatMoney(
                                        paymentAmount
                                    )}
                                </span>

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        RIGHT COLUMN
                        -------------------------------------------------
                        ศูนย์ชำระเงิน
                    ================================================= */}

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">


                        {/* =================================================
                            PAYMENT HEADER
                        ================================================= */}

                        <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-500">

                                <CreditCard size={21} />

                            </div>


                            <div>

                                <h2 className="font-black text-slate-900">
                                    ช่องทางการชำระเงิน
                                </h2>

                                <p className="text-sm text-slate-500">
                                    ชำระค่ามัดจำ{" "}
                                    {formatMoney(
                                        paymentAmount
                                    )}
                                </p>

                            </div>

                        </div>


                        {/* =================================================
                            BANK ACCOUNT
                            -------------------------------------------------
                            แสดงบัญชีธนาคาร
                        ================================================= */}

                        <div className="mt-7 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">


                            {/* BANK HEADER */}

                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-5">

                                <div className="flex items-center gap-4">

                                    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5">

                                        <img
                                            src={
                                                PAYMENT_ACCOUNT.logoUrl
                                            }
                                            alt="KBank"
                                            className="h-full w-full object-contain"
                                        />

                                    </div>


                                    <div className="min-w-0">

                                        <p className="text-xs font-medium text-emerald-700">
                                            บัญชีรับเงิน
                                        </p>

                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            {
                                                PAYMENT_ACCOUNT.bankName
                                            }
                                        </p>

                                        <p className="text-xs text-slate-500">
                                            {
                                                PAYMENT_ACCOUNT.bankShortName
                                            }
                                        </p>

                                    </div>

                                </div>

                            </div>


                            {/* BANK DETAILS */}

                            <div className="space-y-5 p-5">


                                {/* ACCOUNT NAME */}

                                <div>

                                    <p className="text-xs text-slate-400">
                                        ชื่อบัญชี
                                    </p>

                                    <p className="mt-1 font-bold text-slate-900">
                                        {
                                            PAYMENT_ACCOUNT.accountName
                                        }
                                    </p>

                                </div>


                                {/* ACCOUNT NUMBER */}

                                <div>

                                    <p className="text-xs text-slate-400">
                                        เลขบัญชี
                                    </p>

                                    <div className="mt-1 flex items-center justify-between gap-3">

                                        <span className="text-xl font-black tracking-wide text-slate-900">
                                            {
                                                PAYMENT_ACCOUNT.accountNumber
                                            }
                                        </span>


                                        <button
                                            type="button"
                                            onClick={
                                                handleCopyAccount
                                            }
                                            className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                                        >

                                            {copied ? (

                                                <>
                                                    <Check size={17} />

                                                    คัดลอกแล้ว
                                                </>

                                            ) : (

                                                <>
                                                    <Copy size={17} />

                                                    คัดลอก
                                                </>

                                            )}

                                        </button>

                                    </div>

                                </div>


                                {/* PROMPTPAY */}

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        PromptPay
                                    </p>

                                    <p className="mt-1 font-bold tracking-wide text-slate-900">
                                        {
                                            PAYMENT_ACCOUNT.promptPay
                                        }
                                    </p>

                                </div>


                                {/* WARNING */}

                                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">

                                    <div className="flex gap-3">

                                        <span className="text-base">
                                            ⚠️
                                        </span>

                                        <p className="text-xs leading-5 text-amber-800">
                                            กรุณาตรวจสอบชื่อบัญชี
                                            ธนาคาร และเลขบัญชี
                                            ให้ตรงกับข้อมูลก่อนโอนเงินทุกครั้ง
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            QR PAYMENT
                            -------------------------------------------------
                            ชำระผ่าน PromptPay QR
                        ================================================= */}

                        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">


                            {/* QR HEADER */}

                            <div className="px-5 pt-6 text-center">

                                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">

                                    <span className="h-2 w-2 rounded-full bg-green-500" />

                                    PromptPay QR Payment

                                </div>


                                <h3 className="mt-4 text-lg font-black text-slate-900">
                                    สแกน QR เพื่อชำระเงิน
                                </h3>


                                <p className="mt-1 text-xs text-slate-500">
                                    รองรับ Mobile Banking
                                </p>

                            </div>


                            {/* QR IMAGE */}

                            <div className="p-5 sm:p-6">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setQrZoom(true)
                                    }
                                    className="group relative mx-auto block w-full max-w-[360px] overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                                >

                                    <img
                                        src={
                                            PAYMENT_ACCOUNT.qrUrl
                                        }
                                        alt="PromptPay QR สำหรับชำระเงิน KOKO Memory"
                                        className="mx-auto aspect-square w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                                    />

                                    <div className="pointer-events-none absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">

                                        <Maximize2 size={14} />

                                        ขยาย QR

                                    </div>

                                </button>


                                {/* QR AMOUNT */}

                                <div className="mt-5 rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200">

                                    <p className="text-xs text-slate-400">
                                        ยอดที่ต้องชำระ
                                    </p>

                                    <p className="mt-1 text-3xl font-black text-pink-500">
                                        {formatMoney(
                                            paymentAmount
                                        )}
                                    </p>

                                </div>


                                {/* QR ACTIONS */}

                                <div className="mt-4 grid grid-cols-2 gap-3">

                                    <button
                                        type="button"
                                        onClick={
                                            handleDownloadQR
                                        }
                                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                                    >

                                        {qrSaved ? (

                                            <>
                                                <Check size={17} />

                                                บันทึกแล้ว
                                            </>

                                        ) : (

                                            <>
                                                <Download size={17} />

                                                บันทึก QR
                                            </>

                                        )}

                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            handleShareQR
                                        }
                                        className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                    >

                                        <Share2 size={17} />

                                        แชร์ QR

                                    </button>

                                </div>


                                {shareMessage && (

                                    <p className="mt-3 text-center text-xs font-semibold text-green-600">
                                        ✓ {shareMessage}
                                    </p>

                                )}

                            </div>

                        </div>


                        {/* =================================================
                            UPLOAD SLIP
                            -------------------------------------------------
                            อัปโหลดหลักฐานการโอน
                        ================================================= */}

                        <div className="mt-6">

                            <label
                                htmlFor="payment-slip"
                                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50 p-6 text-center transition hover:border-pink-400 hover:bg-pink-100"
                            >

                                <Upload
                                    size={25}
                                    className="text-pink-500"
                                />


                                <span className="mt-3 break-all font-semibold text-slate-900">
                                    {slip
                                        ? slip.name
                                        : "อัปโหลดหลักฐานการโอน"}
                                </span>


                                <span className="mt-1 text-xs text-slate-500">
                                    JPG, PNG หรือ PDF • สูงสุด 10 MB
                                </span>


                                <input
                                    id="payment-slip"
                                    type="file"
                                    accept="image/png,image/jpeg,application/pdf"
                                    className="hidden"
                                    onChange={(event) =>
                                        handleFileChange(
                                            event.target.files?.[0] ??
                                            null
                                        )
                                    }
                                />

                            </label>


                            {slipError && (

                                <p className="mt-2 text-sm font-medium text-red-600">
                                    {slipError}
                                </p>

                            )}

                        </div>


                        {/* =================================================
                            SUBMIT ERROR
                        ================================================= */}

                        {submitError && (

                            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                                {submitError}
                            </div>

                        )}


                        {/* =================================================
                            SECURITY NOTICE
                        ================================================= */}

                        <div className="mt-5 flex gap-3 rounded-2xl border border-green-100 bg-green-50 p-4">

                            <ShieldCheck
                                size={20}
                                className="mt-0.5 shrink-0 text-green-600"
                            />

                            <p className="text-xs leading-5 text-green-700">
                                หลักฐานจะถูกเก็บไว้กับรายการจอง
                                และส่งให้ทีมงานตรวจสอบ
                                ระบบจะยังไม่ถือว่าชำระเงินสำเร็จ
                                จนกว่า Admin จะยืนยัน
                            </p>

                        </div>


                        {/* =================================================
                            SUBMIT PAYMENT
                            -------------------------------------------------
                            ปุ่มส่งหลักฐาน
                        ================================================= */}

                        <button
                            type="button"
                            onClick={
                                handleSubmit
                            }
                            disabled={
                                !slip ||
                                isSubmitting ||
                                loadingBooking
                            }
                            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-pink-500 px-6 font-bold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >

                            {isSubmitting ? (

                                <>
                                    <Loader2
                                        size={19}
                                        className="animate-spin"
                                    />

                                    กำลังอัปโหลดและส่งข้อมูล...
                                </>

                            ) : (

                                <>
                                    ยืนยันการชำระเงิน

                                    <ArrowRight
                                        size={19}
                                    />
                                </>

                            )}

                        </button>


                        {/* =================================================
                            BACK BUTTON
                            -------------------------------------------------
                            กลับไปหน้า Review
                        ================================================= */}

                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    `/booking/review?package=${encodeURIComponent(
                                        packageId
                                    )}&date=${encodeURIComponent(
                                        eventDate
                                    )}&bookingId=${encodeURIComponent(
                                        bookingId
                                    )}`
                                )
                            }
                            disabled={
                                isSubmitting
                            }
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                        >

                            <ArrowLeft size={17} />

                            กลับไปตรวจสอบข้อมูล

                        </button>

                    </div>

                </div>


                {/* =================================================
                    AFTER PAYMENT
                    -------------------------------------------------
                    แจ้งสถานะหลังส่งหลักฐาน
                ================================================= */}

                <div className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-3xl border border-pink-100 bg-pink-50 p-5">

                    <CheckCircle2
                        size={22}
                        className="mt-0.5 shrink-0 text-pink-500"
                    />

                    <div>

                        <p className="font-bold text-slate-900">
                            หลังส่งหลักฐาน
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            รายการจะเปลี่ยนเป็น
                            “รอตรวจสอบ”
                            และทีมงานจะตรวจสอบก่อนยืนยันการชำระเงิน
                        </p>

                    </div>

                </div>

            </section>


            {/* =====================================================
                QR FULLSCREEN MODAL
                -----------------------------------------------------
                แสดง QR ขนาดใหญ่
            ===================================================== */}

            {qrZoom && (

                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    onClick={() =>
                        setQrZoom(false)
                    }
                >

                    <div
                        className="relative max-h-[95vh] max-w-[95vw] rounded-3xl bg-white p-4 shadow-2xl"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* CLOSE BUTTON */}

                        <button
                            type="button"
                            onClick={() =>
                                setQrZoom(false)
                            }
                            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-2xl text-white transition hover:bg-black"
                            aria-label="ปิด QR"
                        >
                            ×
                        </button>


                        {/* QR IMAGE */}

                        <img
                            src={
                                PAYMENT_ACCOUNT.qrUrl
                            }
                            alt="QR สำหรับชำระเงิน KOKO Memory"
                            className="max-h-[88vh] max-w-[90vw] rounded-2xl object-contain"
                        />


                        {/* DOWNLOAD */}

                        <button
                            type="button"
                            onClick={
                                handleDownloadQR
                            }
                            className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg"
                        >

                            <Download size={17} />

                            บันทึก QR

                        </button>

                    </div>

                </div>

            )}

        </main>
    );
}