"use client";

/**
 * ============================================================
 * KOKO Memory
 * Booking Step 4 : Review Booking
 * ============================================================
 *
 * Flow
 *
 * Step 1
 * เลือก Package
 *      ↓
 * Step 2
 * เลือกวัน
 *      ↓
 * Step 3
 * ข้อมูลลูกค้า / สถานที่
 *      ↓
 * Step 4 ← หน้านี้
 * ตรวจสอบข้อมูล + สร้าง Booking
 *      ↓
 * Step 5
 * Payment
 *      ↓
 * Step 6
 * Success
 *
 * Firebase
 *      ↓
 * Firestore
 *      ↓
 * bookings/{bookingId}
 *
 * Responsive
 *      ↓
 * Mobile / Tablet / Desktop
 * ============================================================
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Suspense,
    useRef,
    useState,
} from "react";

import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Mail,
    MapPin,
    MessageCircle,
    Package,
    Phone,
    ShieldCheck,
    User,
} from "lucide-react";

import {
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";


/* ============================================================
   PACKAGE DATA
   ------------------------------------------------------------
   ใช้สำหรับแสดงชื่อ / ชั่วโมง / เงินมัดจำ
   ส่วน "ราคา" จะให้ความสำคัญกับ packagePrice
   ที่ Step 3 ส่งมา
============================================================ */

const packages = {

    basic: {
        name: "Basic",
        price: 8900,
        deposit: 3000,
        hours: 3,
    },

    premium: {
        name: "Premium",
        price: 14900,
        deposit: 5000,
        hours: 5,
    },

    luxury: {
        name: "Luxury",
        price: 24900,
        deposit: 10000,
        hours: 6,
    },

} as const;


/* ============================================================
   HELPERS
============================================================ */

function formatThaiDate(
    dateString: string
) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(
        `${dateString}T00:00:00`
    );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return dateString;
    }

    return new Intl.DateTimeFormat(
        "th-TH",
        {
            dateStyle: "long",
        }
    ).format(date);
}


function formatMoney(
    value: number
) {

    return new Intl.NumberFormat(
        "th-TH"
    ).format(
        Number.isFinite(value)
            ? value
            : 0
    );
}


/* ============================================================
   UNICODE / MULTI-LANGUAGE HELPERS
   ------------------------------------------------------------
   รองรับภาษาไทย / English / 中文 / 日本語 / 한국어 /
   العربية / हिन्दी / Русский / emoji ฯลฯ

   - normalize เป็น Unicode NFC
   - ลบ invalid UTF-16 surrogate ที่อาจทำให้ browser/XHR พัง
   - ไม่ encode ข้อมูลก่อนเก็บ Firestore เพราะ Firestore รองรับ
     Unicode โดยตรง
============================================================ */

/*
 * Safe Unicode decoder for values coming from URLSearchParams.
 * URLSearchParams already performs UTF-8 decoding, so DO NOT use
 * decodeURIComponent() again on these values.
 */
function safeParam(
    value: string | null
): string {
    if (!value) {
        return "";
    }

    // Remove only unpaired UTF-16 surrogates while preserving
    // valid emoji/supplementary characters.
    let result = "";
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);

        if (
            code >= 0xD800 &&
            code <= 0xDBFF
        ) {
            const next =
                i + 1 < value.length
                    ? value.charCodeAt(i + 1)
                    : 0;

            if (
                next >= 0xDC00 &&
                next <= 0xDFFF
            ) {
                result += value[i] + value[i + 1];
                i++;
            }

            continue;
        }

        if (
            code >= 0xDC00 &&
            code <= 0xDFFF
        ) {
            continue;
        }

        result += value[i];
    }

    return result.normalize("NFC");
}

/*
 * URLSearchParams is the correct UTF-8 transport for the next
 * page. Never manually put raw Unicode into an HTTP header.
 */
function buildSafePaymentParams(
    values: Record<string, string>
) {
    const params = new URLSearchParams();

    Object.entries(values).forEach(
        ([key, value]) => {
            params.set(
                key,
                safeParam(value)
            );
        }
    );

    return params;
}


/* ============================================================
   BOOKING ID
   ------------------------------------------------------------
   สร้าง Booking ID สำหรับ "การจองครั้งนี้" และเก็บไว้ใน
   sessionStorage เพื่อป้องกันการส่งข้อมูลเดิมซ้ำจากการกดปุ่ม
   หรือ request ซ้ำระหว่างหน้า Review → Payment

   ถ้าข้อมูลการจองเปลี่ยน เช่น เปลี่ยนวัน/ลูกค้า/แพ็กเกจ
   fingerprint จะเปลี่ยน และจะได้ Booking ID ใหม่
============================================================ */

function getBookingId(
    fingerprint: string
) {

    const storageKey =
        `koko_booking_id_${fingerprint}`;

    try {

        const existingId =
            sessionStorage.getItem(
                storageKey
            );

        if (existingId) {
            return existingId;
        }

        const newId =
            typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `booking_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 10)}`;

        sessionStorage.setItem(
            storageKey,
            newId
        );

        return newId;

    } catch {

        return `booking_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    }
}


/* ============================================================
   PAGE
============================================================ */

function ReviewBookingContent() {

    const router =
        useRouter();

    const searchParams =
        useSearchParams();


    /* ========================================================
       BOOKING
    ======================================================== */

    const packageId =
        safeParam(searchParams.get("package")) || "";

    const eventDate =
        safeParam(searchParams.get("date")) || "";


    /* ========================================================
       CUSTOMER
    ======================================================== */

    const customerName =
        safeParam(searchParams.get("name")) || "";

    const phone =
        safeParam(searchParams.get("phone")) || "";

    const line =
        safeParam(searchParams.get("line")) || "";

    const email =
        safeParam(searchParams.get("email")) || "";


    /* ========================================================
       EVENT
    ======================================================== */

    const eventType =
        safeParam(searchParams.get("event")) || "";

    const guests =
        safeParam(searchParams.get("guests")) || "";

    const note =
        safeParam(searchParams.get("note")) || "";


    /* ========================================================
       LOCATION
    ======================================================== */

    const venue =
        safeParam(searchParams.get("venue")) || "";

    const province =
        safeParam(searchParams.get("province")) || "";

    const district =
        safeParam(searchParams.get("district")) || "";

    const subdistrict =
        safeParam(searchParams.get("subdistrict")) || "";

    const postalCode =
        safeParam(searchParams.get("postalCode")) || "";

    const address =
        safeParam(searchParams.get("address")) || "";

    const googleMaps =
        safeParam(searchParams.get("googleMaps")) || "";


    /* ========================================================
       PRICE
       --------------------------------------------------------
       ใช้ค่าที่ Step 3 ส่งมา
       ======================================================== */

    const packagePriceFromStep3 =
        Number(
            safeParam(searchParams.get("packagePrice"))
        );

    const travelFeeFromStep3 =
        Number(
            safeParam(searchParams.get("travelFee"))
        );

    const estimatedTotalFromStep3 =
        Number(
            safeParam(searchParams.get("estimatedTotal"))
        );

    const depositFromStep3 =
        Number(
            safeParam(searchParams.get("deposit"))
        );


    /* ========================================================
       PACKAGE
    ======================================================== */

    const packageKey =
        packageId as keyof typeof packages;

    const knownPackage =
        packages[packageKey];


    /*
     * ถ้า Package ID จาก Step 1
     * ไม่ตรงกับ Basic / Premium / Luxury
     *
     * เราจะยังใช้ข้อมูลจาก Step 3
     * ไม่ทำให้ระบบพัง
     */

    const packageName =
        knownPackage?.name ||
        packageId ||
        "แพ็กเกจ";


    const packageHours =
        knownPackage?.hours ||
        0;


    /* ========================================================
       PRICE
       --------------------------------------------------------
       ให้ค่าจาก Step 3 เป็นตัวหลัก
    ======================================================== */

    const packagePrice =
        Number.isFinite(
            packagePriceFromStep3
        )
            ? packagePriceFromStep3
            : (
                knownPackage?.price ||
                0
            );


    const travelFee =
        Number.isFinite(
            travelFeeFromStep3
        )
            ? travelFeeFromStep3
            : 0;


    const discount =
        0;


    const total =
        Number.isFinite(
            estimatedTotalFromStep3
        )
            ? estimatedTotalFromStep3
            : Math.max(
                packagePrice +
                travelFee -
                discount,
                0
            );


    /*
     * เงินมัดจำ
     *
     * ถ้า Package เป็นข้อมูลเดิม
     * จะใช้ deposit จาก package
     *
     * ถ้าเป็น Package ใหม่
     * และยังไม่ได้ส่ง deposit มา
     * ให้เป็น 0 ก่อน
     *
     * เราจะเชื่อมระบบ Deposit จริง
     * ใน Step Payment
     */

    const deposit =
        Number.isFinite(depositFromStep3) &&
            depositFromStep3 > 0
            ? depositFromStep3
            : (knownPackage?.deposit || 0);


    const remaining =
        Math.max(
            total -
            deposit,
            0
        );


    /* ========================================================
       SUBMIT STATE
    ======================================================== */

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);


    const [
        submitError,
        setSubmitError,
    ] = useState("");

    /*
     * Lock การกดปุ่มระดับ synchronous
     * ป้องกันกรณีผู้ใช้กดปุ่ม 2 ครั้งเร็วมากก่อน React
     * จะอัปเดต isSubmitting
     */
    const submitLockRef = useRef(false);


    /* ========================================================
       CREATE BOOKING
    ======================================================== */

    const handleConfirmBooking =
        async () => {

            /*
             * ป้องกันการกดปุ่มซ้ำ
             */

            if (
                isSubmitting ||
                submitLockRef.current
            ) {
                return;
            }

            /*
             * ล็อกทันที ก่อน await ใด ๆ
             * จึงกัน double-click ได้จริง
             */
            submitLockRef.current = true;


            /*
             * ตรวจสอบข้อมูลสำคัญ
             */

            if (
                !packageId
            ) {

                setSubmitError(
                    "ไม่พบข้อมูลแพ็กเกจ กรุณากลับไปเลือกแพ็กเกจอีกครั้ง"
                );
                setIsSubmitting(false);
                submitLockRef.current = false;

                return;
            }


            if (
                !eventDate
            ) {

                setSubmitError(
                    "ไม่พบวันที่จัดงาน กรุณากลับไปเลือกวันอีกครั้ง"
                );
                setIsSubmitting(false);
                submitLockRef.current = false;

                return;
            }


            if (
                !customerName ||
                !phone
            ) {

                setSubmitError(
                    "ข้อมูลลูกค้าไม่ครบ กรุณากลับไปตรวจสอบข้อมูลอีกครั้ง"
                );
                setIsSubmitting(false);
                submitLockRef.current = false;

                return;
            }


            setIsSubmitting(
                true
            );

            setSubmitError("");


            try {

                /* ==================================================
                   BOOKING DATA
                ================================================== */

                const bookingData = {

                    /* ------------------------------------------
                       SYSTEM
                    ------------------------------------------ */

                    bookingVersion:
                        1,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),


                    /* ------------------------------------------
                       PACKAGE
                    ------------------------------------------ */

                    package: {

                        id:
                            packageId,

                        name:
                            packageName,

                        hours:
                            packageHours,

                        price:
                            packagePrice,

                    },


                    /* ------------------------------------------
                       EVENT
                    ------------------------------------------ */

                    event: {

                        date:
                            eventDate,

                        type:
                            eventType,

                        guests:
                            guests,

                    },


                    /* ------------------------------------------
                       CUSTOMER
                    ------------------------------------------ */

                    customer: {

                        name:
                            customerName,

                        phone:
                            phone,

                        line:
                            line,

                        email:
                            email,

                    },


                    /* ------------------------------------------
                       VENUE
                    ------------------------------------------ */

                    venue: {

                        name:
                            venue,

                        province:
                            province,

                        district:
                            district,

                        subdistrict:
                            subdistrict,

                        postalCode:
                            postalCode,

                        address:
                            address,

                        googleMaps:
                            googleMaps,

                    },


                    /* ------------------------------------------
                       PRICE
                    ------------------------------------------ */

                    pricing: {

                        packagePrice:
                            packagePrice,

                        travelFee:
                            travelFee,

                        discount:
                            discount,

                        total:
                            total,

                        deposit:
                            deposit,

                        remaining:
                            remaining,

                    },


                    /* ------------------------------------------
                       PAYMENT
                    ------------------------------------------ */

                    payment: {

                        status:
                            "unpaid",

                        method:
                            null,

                        proofUrl:
                            null,

                        paidAmount:
                            0,

                        paidAt:
                            null,

                        verifiedAt:
                            null,

                        verifiedBy:
                            null,

                    },


                    /* ------------------------------------------
                       BOOKING STATUS
                    ------------------------------------------ */

                    bookingStatus:
                        "pending_payment",


                    /* ------------------------------------------
                       NOTE
                    ------------------------------------------ */

                    note:
                        note,

                };


                /* ==================================================
                   CREATE UNIQUE BOOKING ID
                   --------------------------------------------------
                   ใช้ข้อมูลสำคัญของการจองสร้าง fingerprint
                   เพื่อให้การกดซ้ำของการจองเดิมใช้ ID เดิม
                ================================================== */

                const bookingFingerprint =
                    [
                        packageId,
                        eventDate,
                        customerName,
                        phone,
                        email,
                        eventType,
                        guests,
                        venue,
                        province,
                        district,
                        subdistrict,
                        postalCode,
                        address,
                    ]
                        .join("|")
                        .trim();

                const bookingId =
                    getBookingId(
                        bookingFingerprint
                    );

                const bookingRef =
                    doc(
                        db,
                        "bookings",
                        bookingId
                    );


                /* ==================================================
                   IDEMPOTENT BOOKING CREATION
                   --------------------------------------------------
                   ใช้ bookingId ที่สร้างจาก fingerprint เดิมเสมอ
                   แทน Firestore transaction

                   เหตุผล:
                   - กัน double-click ด้วย submitLockRef
                   - การส่งข้อมูลซ้ำจากหน้าเดิมใช้ document ID เดิม
                   - ไม่ต้องเปิด transaction/retry loop ของ Firestore
                   - ข้อมูล Unicode ถูกส่งเป็น Firestore document data
                     ไม่ได้ถูกใส่ลง HTTP Header

                   ถ้า bookingId เดิมถูกสร้างแล้ว การกดซ้ำจะเขียนข้อมูล
                   ลง document เดิม ไม่สร้าง document ใหม่
                ================================================== */

                await setDoc(
                    bookingRef,
                    bookingData,
                    { merge: false }
                );

                console.log(
                    "KOKO Booking saved:",
                    bookingId
                );


                /* ==================================================
                   PAYMENT PARAMETERS
                   --------------------------------------------------
                   ส่ง Booking ID ไป Payment
                ================================================== */

                const paymentParams =
                    buildSafePaymentParams({

                        bookingId:
                            bookingId,

                        package:
                            packageId,

                        date:
                            eventDate,

                        name:
                            customerName,

                        phone:
                            phone,

                        line:
                            line,

                        email:
                            email,

                        event:
                            eventType,

                        guests:
                            guests,

                        venue:
                            venue,

                        province:
                            province,

                        district:
                            district,

                        subdistrict:
                            subdistrict,

                        postalCode:
                            postalCode,

                        address:
                            address,

                        googleMaps:
                            googleMaps,

                        note:
                            note,

                        packagePrice:
                            String(
                                packagePrice
                            ),

                        travelFee:
                            String(
                                travelFee
                            ),

                        estimatedTotal:
                            String(
                                total
                            ),

                        deposit:
                            String(
                                deposit
                            ),

                        remaining:
                            String(
                                remaining
                            ),

                    });


                /* ==================================================
                   GO PAYMENT
                ================================================== */

                router.push(
                    `/booking/payment?${paymentParams.toString()}`
                );


            } catch (
            error
            ) {

                console.error(
                    "KOKO CREATE BOOKING ERROR:",
                    error
                );


                const firebaseError =
                    error as {
                        code?: string;
                        message?: string;
                    };

                console.error(
                    "KOKO FIREBASE ERROR CODE:",
                    firebaseError?.code
                );

                console.error(
                    "KOKO FIREBASE ERROR MESSAGE:",
                    firebaseError?.message
                );

                const errorCode =
                    firebaseError?.code ||
                    (error instanceof Error ? error.name : "") ||
                    "UNKNOWN_ERROR";

                let errorMessage =
                    firebaseError?.message ||
                    (error instanceof Error ? error.message : String(error)) ||
                    "ไม่ทราบสาเหตุ";

                if (
                    errorMessage.includes(
                        "setRequestHeader"
                    ) ||
                    errorMessage.includes(
                        "ISO-8859-1"
                    )
                ) {
                    errorMessage =
                        "พบข้อมูล Unicode ที่ browser พยายามส่งเป็น HTTP Header " +
                        "ซึ่งไม่รองรับภาษาไทย/Unicode โดยตรง ระบบจึงหยุดคำขอไว้ " +
                        "โค้ดหน้านี้ได้ทำ normalization และส่งข้อมูลผ่าน UTF-8 URL/Firestore แล้ว " +
                        "หากยังเกิดอีก ให้ตรวจไฟล์ src/lib/firebase และส่วน API/Proxy ที่เพิ่ม Header เอง";
                }

                setSubmitError(
                    `ไม่สามารถสร้างรายการจองได้ (${errorCode})\\n${errorMessage}`
                );

                setIsSubmitting(false);
                submitLockRef.current = false;

            }

        };


    /* ========================================================
       UI
    ======================================================== */

    return (

        <main className="min-h-screen bg-slate-50">

            {/* =================================================
                STEP HEADER
            ================================================= */}

            <section className="border-b bg-white">

                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">

                        {/* Step 1 */}

                        <Link
                            href="/booking/package"
                            className="
                                rounded-full
                                bg-green-100
                                px-3
                                py-2
                                font-semibold
                                text-green-700
                                transition
                                hover:bg-green-200
                                sm:px-4
                            "
                        >
                            ✓ Step 1
                        </Link>


                        <span className="text-slate-300">
                            →
                        </span>


                        {/* Step 2 */}

                        <Link
                            href={`/booking/schedule?package=${encodeURIComponent(
                                packageId
                            )}`}
                            className="
                                rounded-full
                                bg-green-100
                                px-3
                                py-2
                                font-semibold
                                text-green-700
                                transition
                                hover:bg-green-200
                                sm:px-4
                            "
                        >
                            ✓ Step 2
                        </Link>


                        <span className="text-slate-300">
                            →
                        </span>


                        {/* Step 3 */}

                        <Link
                            href={`/booking/customer?package=${encodeURIComponent(
                                packageId
                            )}&date=${encodeURIComponent(
                                eventDate
                            )}`}
                            className="
                                rounded-full
                                bg-green-100
                                px-3
                                py-2
                                font-semibold
                                text-green-700
                                transition
                                hover:bg-green-200
                                sm:px-4
                            "
                        >
                            ✓ Step 3
                        </Link>


                        <span className="text-slate-300">
                            →
                        </span>


                        {/* Step 4 */}

                        <span
                            className="
                                rounded-full
                                bg-pink-500
                                px-3
                                py-2
                                font-semibold
                                text-white
                                sm:px-4
                            "
                        >
                            Step 4
                        </span>

                    </div>

                </div>

            </section>


            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">


                    {/* =================================================
                        LEFT
                    ================================================= */}

                    <div className="space-y-6">


                        {/* =============================================
                            TITLE
                        ============================================= */}

                        <div>

                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-pink-500">
                                Booking Step 4
                            </p>

                            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                ตรวจสอบข้อมูลการจอง
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                                กรุณาตรวจสอบข้อมูลทั้งหมดให้ถูกต้อง
                                ก่อนดำเนินการชำระเงิน
                            </p>

                        </div>


                        {/* =============================================
                            PACKAGE
                        ============================================= */}

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                            <div className="flex items-start gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                    <Package size={23} />
                                </div>

                                <div className="min-w-0">

                                    <p className="text-xs font-semibold text-slate-400">
                                        แพ็กเกจที่เลือก
                                    </p>

                                    <h2 className="mt-1 break-words text-xl font-black text-slate-900 sm:text-2xl">
                                        {packageName}
                                    </h2>

                                    {packageHours > 0 && (
                                        <p className="mt-1 text-sm text-slate-500">
                                            ระยะเวลา {packageHours} ชั่วโมง
                                        </p>
                                    )}

                                </div>

                            </div>

                        </section>


                        {/* =============================================
                            CUSTOMER
                        ============================================= */}

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                    <User size={21} />
                                </div>

                                <div>

                                    <h2 className="text-lg font-black text-slate-900">
                                        ข้อมูลลูกค้า
                                    </h2>

                                    <p className="text-xs text-slate-400">
                                        ข้อมูลสำหรับติดต่อ
                                    </p>

                                </div>

                            </div>


                            <div className="mt-6 grid gap-3 sm:grid-cols-2">


                                {/* Name */}

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">

                                        <User size={14} />

                                        ชื่อ - นามสกุล

                                    </div>

                                    <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                                        {customerName || "-"}
                                    </p>

                                </div>


                                {/* Phone */}

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">

                                        <Phone size={14} />

                                        เบอร์โทรศัพท์

                                    </div>

                                    <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                                        {phone || "-"}
                                    </p>

                                </div>


                                {/* LINE */}

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">

                                        <MessageCircle size={14} />

                                        LINE

                                    </div>

                                    <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                                        {line || "-"}
                                    </p>

                                </div>


                                {/* Email */}

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">

                                        <Mail size={14} />

                                        Email

                                    </div>

                                    <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                                        {email || "-"}
                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* =============================================
                            EVENT
                        ============================================= */}

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                    <CalendarDays size={21} />
                                </div>

                                <div>

                                    <h2 className="text-lg font-black text-slate-900">
                                        รายละเอียดงาน
                                    </h2>

                                    <p className="text-xs text-slate-400">
                                        วันที่และรายละเอียดงาน
                                    </p>

                                </div>

                            </div>


                            <div className="mt-6 grid gap-3 sm:grid-cols-2">

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        วันที่จัดงาน
                                    </p>

                                    <p className="mt-2 font-semibold text-slate-900">
                                        {formatThaiDate(
                                            eventDate
                                        )}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        ประเภทงาน
                                    </p>

                                    <p className="mt-2 font-semibold text-slate-900">
                                        {eventType || "-"}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">

                                    <p className="text-xs text-slate-400">
                                        จำนวนแขกโดยประมาณ
                                    </p>

                                    <p className="mt-2 font-semibold text-slate-900">
                                        {guests
                                            ? `${guests} คน`
                                            : "-"
                                        }
                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* =============================================
                            VENUE
                        ============================================= */}

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                    <MapPin size={21} />
                                </div>

                                <div>

                                    <h2 className="text-lg font-black text-slate-900">
                                        สถานที่จัดงาน
                                    </h2>

                                    <p className="text-xs text-slate-400">
                                        รายละเอียดสถานที่
                                    </p>

                                </div>

                            </div>


                            <div className="mt-6 space-y-3">


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        สถานที่
                                    </p>

                                    <p className="mt-2 font-semibold text-slate-900">
                                        {venue || "-"}
                                    </p>

                                </div>


                                <div className="grid gap-3 sm:grid-cols-2">

                                    <div className="rounded-2xl bg-slate-50 p-4">

                                        <p className="text-xs text-slate-400">
                                            จังหวัด
                                        </p>

                                        <p className="mt-2 font-semibold text-slate-900">
                                            {province || "-"}
                                        </p>

                                    </div>


                                    <div className="rounded-2xl bg-slate-50 p-4">

                                        <p className="text-xs text-slate-400">
                                            เขต / อำเภอ
                                        </p>

                                        <p className="mt-2 font-semibold text-slate-900">
                                            {district || "-"}
                                        </p>

                                    </div>


                                    <div className="rounded-2xl bg-slate-50 p-4">

                                        <p className="text-xs text-slate-400">
                                            แขวง / ตำบล
                                        </p>

                                        <p className="mt-2 font-semibold text-slate-900">
                                            {subdistrict || "-"}
                                        </p>

                                    </div>


                                    <div className="rounded-2xl bg-slate-50 p-4">

                                        <p className="text-xs text-slate-400">
                                            รหัสไปรษณีย์
                                        </p>

                                        <p className="mt-2 font-semibold text-slate-900">
                                            {postalCode || "-"}
                                        </p>

                                    </div>

                                </div>


                                {address && (

                                    <div className="rounded-2xl bg-slate-50 p-4">

                                        <p className="text-xs text-slate-400">
                                            ที่อยู่เพิ่มเติม
                                        </p>

                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                            {address}
                                        </p>

                                    </div>

                                )}


                                {googleMaps && (

                                    <a
                                        href={googleMaps}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="
                                            inline-flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-full
                                            bg-pink-50
                                            px-5
                                            py-3
                                            text-sm
                                            font-bold
                                            text-pink-600
                                            transition
                                            hover:bg-pink-100
                                            sm:w-auto
                                        "
                                    >

                                        <MapPin size={18} />

                                        เปิด Google Maps

                                    </a>

                                )}

                            </div>

                        </section>


                        {/* =============================================
                            NOTE
                        ============================================= */}

                        {note && (

                            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                                <h2 className="text-lg font-black text-slate-900">
                                    รายละเอียดเพิ่มเติม
                                </h2>

                                <p className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                                    {note}
                                </p>

                            </section>

                        )}

                    </div>


                    {/* =================================================
                        RIGHT / PRICE
                    ================================================= */}

                    <aside className="lg:sticky lg:top-6 lg:self-start">

                        <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">


                            {/* Header */}

                            <div className="bg-gradient-to-br from-pink-500 to-pink-400 p-6 text-white sm:p-7">

                                <p className="text-sm font-semibold text-white/80">
                                    สรุปค่าใช้บริการ
                                </p>

                                <h2 className="mt-2 text-2xl font-black">
                                    {packageName}
                                </h2>

                            </div>


                            {/* Price */}

                            <div className="p-5 sm:p-7">

                                <div className="space-y-4">


                                    <div className="flex items-center justify-between gap-4 text-sm">

                                        <span className="text-slate-500">
                                            ราคาแพ็กเกจ
                                        </span>

                                        <span className="shrink-0 font-bold text-slate-900">
                                            ฿{formatMoney(
                                                packagePrice
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex items-center justify-between gap-4 text-sm">

                                        <span className="text-slate-500">
                                            ค่าเดินทาง
                                        </span>

                                        <span className="shrink-0 font-bold text-slate-900">

                                            {travelFee === 0
                                                ? "ฟรี"
                                                : `฿${formatMoney(
                                                    travelFee
                                                )}`
                                            }

                                        </span>

                                    </div>


                                    {discount > 0 && (

                                        <div className="flex items-center justify-between gap-4 text-sm">

                                            <span className="text-slate-500">
                                                ส่วนลด
                                            </span>

                                            <span className="shrink-0 font-bold text-green-600">
                                                -฿{formatMoney(
                                                    discount
                                                )}
                                            </span>

                                        </div>

                                    )}

                                </div>


                                {/* Total */}

                                <div className="mt-6 border-t pt-6">

                                    <div className="flex items-end justify-between gap-4">

                                        <div>

                                            <p className="text-sm text-slate-500">
                                                ยอดรวม
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                ราคาประมาณการ
                                            </p>

                                        </div>

                                        <p className="text-3xl font-black text-pink-500">
                                            ฿{formatMoney(
                                                total
                                            )}
                                        </p>

                                    </div>

                                </div>


                                {/* Deposit */}

                                <div className="mt-6 rounded-2xl bg-pink-50 p-4">

                                    <div className="flex items-center justify-between gap-4">

                                        <span className="text-sm font-semibold text-slate-700">
                                            เงินมัดจำ
                                        </span>

                                        <span className="font-black text-pink-600">
                                            {deposit > 0
                                                ? `฿${formatMoney(
                                                    deposit
                                                )}`
                                                : "รอยืนยัน"
                                            }
                                        </span>

                                    </div>


                                    {deposit > 0 && (

                                        <div className="mt-3 flex items-center justify-between gap-4 border-t border-pink-100 pt-3">

                                            <span className="text-xs text-slate-500">
                                                ยอดคงเหลือ
                                            </span>

                                            <span className="text-sm font-bold text-slate-900">
                                                ฿{formatMoney(
                                                    remaining
                                                )}
                                            </span>

                                        </div>

                                    )}

                                </div>


                                {/* Security */}

                                <div className="mt-6 flex gap-3 rounded-2xl bg-green-50 p-4">

                                    <ShieldCheck
                                        size={20}
                                        className="mt-0.5 shrink-0 text-green-600"
                                    />

                                    <div>

                                        <p className="text-sm font-bold text-green-700">
                                            ข้อมูลของคุณถูกตรวจสอบก่อนชำระเงิน
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-green-700/80">
                                            หลังยืนยัน ระบบจะสร้างเลขรายการจอง
                                            และเชื่อมไปยังขั้นตอนการชำระเงิน
                                        </p>

                                    </div>

                                </div>


                                {/* Error */}

                                {submitError && (

                                    <div
                                        role="alert"
                                        className="
                                            mt-5
                                            rounded-2xl
                                            border
                                            border-red-200
                                            bg-red-50
                                            p-4
                                            text-sm
                                            leading-6
                                            whitespace-pre-wrap
                                            break-words
                                            text-red-600
                                        "
                                    >
                                        {submitError}
                                    </div>

                                )}


                                {/* Confirm */}

                                <button
                                    type="button"
                                    onClick={
                                        handleConfirmBooking
                                    }
                                    disabled={
                                        isSubmitting
                                    }
                                    className="
                                        mt-6
                                        flex
                                        h-14
                                        w-full
                                        items-center
                                        justify-center
                                        gap-3
                                        rounded-full
                                        bg-pink-500
                                        px-6
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

                                    {isSubmitting ? (

                                        <>

                                            <span
                                                className="
                                                    h-5
                                                    w-5
                                                    animate-spin
                                                    rounded-full
                                                    border-2
                                                    border-white
                                                    border-t-transparent
                                                "
                                            />

                                            กำลังสร้างรายการจอง...

                                        </>

                                    ) : (

                                        <>

                                            ยืนยันข้อมูล
                                            และดำเนินการต่อ

                                            <ArrowRight
                                                size={20}
                                            />

                                        </>

                                    )}

                                </button>


                                {/* Back */}

                                <Link
                                    href={`/booking/customer?package=${encodeURIComponent(
                                        packageId
                                    )}&date=${encodeURIComponent(
                                        eventDate
                                    )}`}
                                    className="
                                        mt-3
                                        flex
                                        h-12
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-full
                                        border
                                        border-slate-200
                                        bg-white
                                        text-sm
                                        font-semibold
                                        text-slate-600
                                        transition
                                        hover:bg-slate-50
                                    "
                                >

                                    <ArrowLeft
                                        size={18}
                                    />

                                    กลับไปแก้ไขข้อมูล

                                </Link>

                            </div>

                        </section>

                    </aside>

                </div>

            </section>

        </main>
    );
}

export default function ReviewBookingPage() {
    return (
        <Suspense fallback={null}>
            <ReviewBookingContent />
        </Suspense>
    );
}