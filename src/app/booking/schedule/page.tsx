"use client";

/**
 * ============================================================
 * KOKO Memory - Booking Step 2
 * ============================================================
 *
 * หน้าที่:
 * ------------------------------------------------------------
 * ให้ลูกค้าเลือกวันที่ต้องการจองบริการ Photobooth
 *
 * กฎสำคัญ:
 * ------------------------------------------------------------
 * 1 วัน = 1 คิว
 *
 * ระบบ Availability:
 * ------------------------------------------------------------
 * 🔥 อ่านข้อมูลจาก Firebase Firestore จริง
 * 🔴 ถ้า bookings มี Booking ในวันนั้น → ปิดวัน
 * 🔴 ถ้า bookingDates ล็อกวันนั้น → ปิดวัน
 * 🟢 ถ้าไม่มี Booking → ว่าง
 *
 * Real-time:
 * ------------------------------------------------------------
 * ใช้ onSnapshot() เพื่ออัปเดตสถานะวันแบบ Real-time
 *
 * Flow:
 * ------------------------------------------------------------
 * Step 1 → เลือกแพ็กเกจ
 * Step 2 → เลือกวันจัดงาน       ← หน้านี้
 * Step 3 → ข้อมูลผู้จอง
 * Step 4 → ตรวจสอบข้อมูล
 * Step 5 → ชำระเงิน
 * Step 6 → สำเร็จ
 *
 * ============================================================
 */

import {
    Suspense,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useSearchParams,
    useRouter,
} from "next/navigation";

import {
    collection,
    onSnapshot,
    type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
    CalendarDays,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";


/* ============================================================
   Package Data
============================================================ */

const packages = {

    /* --------------------------------------------------------
       แพ็กเกจเริ่มต้น
    -------------------------------------------------------- */

    "photobooth-s": {
        name: "แพ็กเกจ S",
        category: "แพ็กเกจเริ่มต้น",
        price: 7900,
        hours: 2,
    },

    "photobooth-m": {
        name: "แพ็กเกจ M",
        category: "แพ็กเกจเริ่มต้น",
        price: 8900,
        hours: 3,
    },

    "photobooth-l": {
        name: "แพ็กเกจ L",
        category: "แพ็กเกจเริ่มต้น",
        price: 9900,
        hours: 4,
    },


    /* --------------------------------------------------------
       แพ็กเกจมาตรฐาน
    -------------------------------------------------------- */

    "photobooth-ss": {
        name: "แพ็กเกจ SS",
        category: "แพ็กเกจมาตรฐาน",
        price: 11900,
        hours: 2,
    },

    "photobooth-mm": {
        name: "แพ็กเกจ MM",
        category: "แพ็กเกจมาตรฐาน",
        price: 13900,
        hours: 3,
    },

    "photobooth-ll": {
        name: "แพ็กเกจ LL",
        category: "แพ็กเกจมาตรฐาน",
        price: 15900,
        hours: 4,
    },


    /* --------------------------------------------------------
       แพ็กเกจพรีเมียม
    -------------------------------------------------------- */

    "photobooth-s1": {
        name: "แพ็กเกจ S1",
        category: "แพ็กเกจพรีเมียม",
        price: 12400,
        hours: 2,
    },

    "photobooth-m1": {
        name: "แพ็กเกจ M1",
        category: "แพ็กเกจพรีเมียม",
        price: 14400,
        hours: 3,
    },

    "photobooth-l1": {
        name: "แพ็กเกจ L1",
        category: "แพ็กเกจพรีเมียม",
        price: 16400,
        hours: 4,
    },


    /* --------------------------------------------------------
       360 Photo Booth
    -------------------------------------------------------- */

    "360-2h": {
        name: "360 Photo Booth 2 ชั่วโมง",
        category: "360 Photo Booth",
        price: 5900,
        hours: 2,
    },

    "360-3h": {
        name: "360 Photo Booth 3 ชั่วโมง",
        category: "360 Photo Booth",
        price: 6590,
        hours: 3,
    },

    "360-4h": {
        name: "360 Photo Booth 4 ชั่วโมง",
        category: "360 Photo Booth",
        price: 7590,
        hours: 4,
    },


    /* --------------------------------------------------------
       รองรับ ID เก่า
    -------------------------------------------------------- */

    basic: {
        name: "Basic",
        category: "แพ็กเกจ",
        price: 8900,
        hours: 3,
    },

    premium: {
        name: "Premium",
        category: "แพ็กเกจ",
        price: 14900,
        hours: 5,
    },

    luxury: {
        name: "Luxury",
        category: "แพ็กเกจ",
        price: 24900,
        hours: 6,

    },

} as const;


/* ============================================================
   Admin Closed Dates
   ------------------------------------------------------------
   ตอนนี้ยังเป็นวันปิดรับแบบ Static
   ภายหลังสามารถย้ายไป Firebase ได้
============================================================ */

const closedDates = [
    "2026-08-20",
    "2026-08-21",
    "2026-09-10",
];


/* ============================================================
   Booking Status
   ------------------------------------------------------------
   สถานะเหล่านี้ถือว่า "คืนคิว"
============================================================ */

const RELEASED_BOOKING_STATUSES = new Set([
    "cancelled",
    "canceled",
    "rejected",
    "declined",
    "released",
]);


/* ============================================================
   Helper
   ------------------------------------------------------------
   Date → YYYY-MM-DD
============================================================ */

function formatDateKey(date: Date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* ============================================================
   Helper
   ------------------------------------------------------------
   Firebase Timestamp / Date / String
   → YYYY-MM-DD
============================================================ */

function normalizeDateValue(
    value: unknown
): string {

    if (!value) {
        return "";
    }


    /* --------------------------------------------------------
       String
       --------------------------------------------------------
       รองรับ:
       2026-09-20
       2026-09-20T...
    -------------------------------------------------------- */

    if (typeof value === "string") {

        const trimmed = value.trim();

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                trimmed
            )
        ) {
            return trimmed;
        }


        const parsed =
            new Date(trimmed);

        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {
            return formatDateKey(parsed);
        }

        return "";
    }


    /* --------------------------------------------------------
       JavaScript Date
    -------------------------------------------------------- */

    if (value instanceof Date) {

        if (
            !Number.isNaN(
                value.getTime()
            )
        ) {
            return formatDateKey(value);
        }

        return "";
    }


    /* --------------------------------------------------------
       Firebase Timestamp
    -------------------------------------------------------- */

    const timestamp =
        value as Partial<Timestamp>;

    if (
        typeof timestamp.toDate ===
        "function"
    ) {

        const date =
            timestamp.toDate();

        if (
            date instanceof Date &&
            !Number.isNaN(
                date.getTime()
            )
        ) {
            return formatDateKey(date);
        }
    }


    /* --------------------------------------------------------
       Timestamp แบบ object
       -------------------------------------------------------- */

    if (
        typeof timestamp.seconds ===
            "number"
    ) {

        const date =
            new Date(
                timestamp.seconds * 1000
            );

        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {
            return formatDateKey(date);
        }
    }


    return "";
}


/* ============================================================
   Helper
   ------------------------------------------------------------
   Date → ภาษาไทย
============================================================ */

function formatThaiDate(
    date: Date
) {

    return new Intl.DateTimeFormat(
        "th-TH",
        {
            dateStyle: "long",
        }
    ).format(date);
}


/* ============================================================
   Booking Progress
============================================================ */

const bookingSteps = [
    {
        number: 1,
        label: "แพ็กเกจ",
    },
    {
        number: 2,
        label: "วันจัดงาน",
    },
    {
        number: 3,
        label: "ข้อมูลผู้จอง",
    },
    {
        number: 4,
        label: "ตรวจสอบ",
    },
    {
        number: 5,
        label: "ชำระเงิน",
    },
    {
        number: 6,
        label: "สำเร็จ",
    },
] as const;


/* ============================================================
   Main Component
============================================================ */

function ScheduleContent() {

    /* ========================================================
       Router
    ======================================================== */

    const router = useRouter();


    /* ========================================================
       URL Parameters
    ======================================================== */

    const searchParams =
        useSearchParams();

    const packageId =
        searchParams.get("package");


    /* ========================================================
       Selected Date
    ======================================================== */

    const [
        selectedDate,
        setSelectedDate,
    ] = useState<Date>();


    /* ========================================================
       Firebase Availability
       --------------------------------------------------------
       วันที่ถูกจองจาก bookings
    ======================================================== */

    const [
        bookedDates,
        setBookedDates,
    ] = useState<string[]>([]);


    /* ========================================================
       Firebase bookingDates
       --------------------------------------------------------
       ใช้เป็นระบบ lock สำรอง
    ======================================================== */

    const [
        lockedDates,
        setLockedDates,
    ] = useState<string[]>([]);


    /* ========================================================
       Loading
    ======================================================== */

    const [
        availabilityLoading,
        setAvailabilityLoading,
    ] = useState(true);


    /* ========================================================
       Error
    ======================================================== */

    const [
        availabilityError,
        setAvailabilityError,
    ] = useState("");


    /* ========================================================
       Real-time Firestore
       --------------------------------------------------------
       1. bookings
       2. bookingDates
    ======================================================== */

    useEffect(() => {

        setAvailabilityLoading(true);
        setAvailabilityError("");


        let bookingsLoaded = false;
        let bookingDatesLoaded = false;


        const checkLoadingComplete = () => {

            if (
                bookingsLoaded &&
                bookingDatesLoaded
            ) {
                setAvailabilityLoading(false);
            }

        };


        /* ====================================================
           Listen: bookings
        ==================================================== */

        const unsubscribeBookings =
            onSnapshot(
                collection(
                    db,
                    "bookings"
                ),

                (snapshot) => {

                    const dates =
                        new Set<string>();


                    snapshot.forEach(
                        (document) => {

                            const data =
                                document.data();


                            /* ------------------------------------
                               Booking Status
                            ------------------------------------ */

                            const rawStatus =
                                data.bookingStatus ??
                                data.status ??
                                "";

                            const status =
                                typeof rawStatus ===
                                "string"
                                    ? rawStatus
                                        .trim()
                                        .toLowerCase()
                                    : "";


                            /*
                             * ถ้า Booking ถูกยกเลิก
                             * ให้คืนวัน
                             */

                            if (
                                RELEASED_BOOKING_STATUSES.has(
                                    status
                                )
                            ) {
                                return;
                            }


                            /* ------------------------------------
                               รองรับโครงสร้างวันที่หลายแบบ
                            ------------------------------------ */

                            const possibleDates = [

                                /* โครงสร้างปัจจุบัน */
                                data?.event?.date,

                                /* เผื่อระบบเดิม */
                                data?.eventDate,

                                data?.bookingDate,

                                data?.date,

                            ];


                            let eventDate = "";


                            for (
                                const value
                                of possibleDates
                            ) {

                                const normalized =
                                    normalizeDateValue(
                                        value
                                    );

                                if (
                                    normalized
                                ) {
                                    eventDate =
                                        normalized;
                                    break;
                                }

                            }


                            /* ------------------------------------
                               เพิ่มวันที่ที่มี Booking
                            ------------------------------------ */

                            if (
                                /^\d{4}-\d{2}-\d{2}$/.test(
                                    eventDate
                                )
                            ) {

                                dates.add(
                                    eventDate
                                );

                            }

                        }
                    );


                    setBookedDates(
                        Array.from(dates)
                    );


                    bookingsLoaded = true;

                    checkLoadingComplete();

                },

                (error) => {

                    console.error(
                        "Firestore bookings listener error:",
                        error
                    );


                    setAvailabilityError(
                        "ไม่สามารถตรวจสอบคิวจากระบบได้ กรุณารีเฟรชหน้าอีกครั้ง"
                    );


                    bookingsLoaded = true;

                    setAvailabilityLoading(
                        false
                    );

                }
            );


        /* ====================================================
           Listen: bookingDates
           ----------------------------------------------------
           ใช้เป็น lock สำรอง
        ==================================================== */

        const unsubscribeBookingDates =
            onSnapshot(
                collection(
                    db,
                    "bookingDates"
                ),

                (snapshot) => {

                    const dates =
                        new Set<string>();


                    snapshot.forEach(
                        (document) => {

                            const data =
                                document.data();


                            /* ------------------------------------
                               Status
                            ------------------------------------ */

                            const rawStatus =
                                data.status ??
                                "";

                            const status =
                                typeof rawStatus ===
                                "string"
                                    ? rawStatus
                                        .trim()
                                        .toLowerCase()
                                    : "";


                            /*
                             * lock ที่ถูกยกเลิก
                             * ไม่ต้องปิดวัน
                             */

                            if (
                                RELEASED_BOOKING_STATUSES.has(
                                    status
                                )
                            ) {
                                return;
                            }


                            /* ------------------------------------
                               วันที่
                            ------------------------------------ */

                            const possibleDates = [

                                data?.date,

                                data?.eventDate,

                                document.id,

                            ];


                            let eventDate = "";


                            for (
                                const value
                                of possibleDates
                            ) {

                                const normalized =
                                    normalizeDateValue(
                                        value
                                    );

                                if (
                                    normalized
                                ) {
                                    eventDate =
                                        normalized;
                                    break;
                                }

                            }


                            if (
                                /^\d{4}-\d{2}-\d{2}$/.test(
                                    eventDate
                                )
                            ) {

                                dates.add(
                                    eventDate
                                );

                            }

                        }
                    );


                    setLockedDates(
                        Array.from(dates)
                    );


                    bookingDatesLoaded = true;

                    checkLoadingComplete();

                },

                (error) => {

                    console.error(
                        "Firestore bookingDates listener error:",
                        error
                    );


                    /*
                     * bookingDates เป็นระบบเสริม
                     *
                     * ถ้าอ่านไม่ได้ เราไม่ทำให้ทั้งหน้า
                     * ใช้งานไม่ได้ เพราะ bookings ยังเป็น
                     * แหล่งข้อมูลหลัก
                     */

                    setLockedDates([]);

                    bookingDatesLoaded = true;

                    checkLoadingComplete();

                }
            );


        /* ====================================================
           Cleanup
        ==================================================== */

        return () => {

            unsubscribeBookings();

            unsubscribeBookingDates();

        };

    }, []);


    /* ========================================================
       หา Package
    ======================================================== */

    const selectedPackage =
        useMemo(() => {

            if (!packageId) {
                return null;
            }

            return packages[
                packageId as keyof typeof packages
            ] ?? null;

        }, [packageId]);


    /* ========================================================
       รวมวันที่ถูกปิดทั้งหมด
       --------------------------------------------------------
       bookings
       +
       bookingDates
       +
       closedDates
    ======================================================== */

    const unavailableDates =
        useMemo(() => {

            return new Set([
                ...bookedDates,
                ...lockedDates,
                ...closedDates,
            ]);

        }, [
            bookedDates,
            lockedDates,
        ]);


    /* ========================================================
       ตรวจสอบวันที่ไม่สามารถจองได้
    ======================================================== */

    const isDateUnavailable =
        (date: Date) => {

            const key =
                formatDateKey(date);


            /* -----------------------------------------------
               ระหว่างโหลดข้อมูล
               ห้ามเลือกก่อน
            ----------------------------------------------- */

            if (
                availabilityLoading
            ) {
                return true;
            }


            /* -----------------------------------------------
               โหลดข้อมูลไม่ได้
               ป้องกันการรับคิวซ้ำ
            ----------------------------------------------- */

            if (
                availabilityError
            ) {
                return true;
            }


            /* -----------------------------------------------
               Booking / Lock / Closed
            ----------------------------------------------- */

            return unavailableDates.has(
                key
            );

        };


    /* ========================================================
       ตรวจสอบสถานะวันที่เลือก
    ======================================================== */

    const selectedDateStatus =
        useMemo(() => {

            if (!selectedDate) {
                return null;
            }


            const key =
                formatDateKey(
                    selectedDate
                );


            if (
                availabilityLoading ||
                availabilityError
            ) {
                return null;
            }


            /* -----------------------------------------------
               Booking จริง
            ----------------------------------------------- */

            if (
                bookedDates.includes(
                    key
                )
            ) {
                return "booked";
            }


            /* -----------------------------------------------
               bookingDates lock
            ----------------------------------------------- */

            if (
                lockedDates.includes(
                    key
                )
            ) {
                return "booked";
            }


            /* -----------------------------------------------
               Admin Closed
            ----------------------------------------------- */

            if (
                closedDates.includes(
                    key
                )
            ) {
                return "closed";
            }


            return "available";

        }, [
            selectedDate,
            bookedDates,
            lockedDates,
            availabilityLoading,
            availabilityError,
        ]);


    /* ========================================================
       ไป Step 3
    ======================================================== */

    const handleNext = () => {

        /* -----------------------------------------------
           ยังไม่ได้เลือกวัน
        ----------------------------------------------- */

        if (!selectedDate) {
            return;
        }


        /* -----------------------------------------------
           วันที่ไม่ว่าง
        ----------------------------------------------- */

        if (
            selectedDateStatus !==
            "available"
        ) {
            return;
        }


        /* -----------------------------------------------
           ไม่มี Package
        ----------------------------------------------- */

        if (!packageId) {

            router.push(
                "/booking/package"
            );

            return;
        }


        /* -----------------------------------------------
           แปลงวันที่
        ----------------------------------------------- */

        const date =
            formatDateKey(
                selectedDate
            );


        /* -----------------------------------------------
           ไป Step 3
        ----------------------------------------------- */

        router.push(
            `/booking/customer?package=${encodeURIComponent(
                packageId
            )}&date=${date}`
        );

    };


    /* ========================================================
       Render
    ======================================================== */

    return (

        <main className="min-h-screen overflow-x-hidden bg-slate-50">


            {/* =================================================
                Booking Progress
            ================================================= */}

            <section className="border-b bg-white">

                <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">

                    <div className="overflow-x-auto pb-1 scrollbar-hide">

                        <div className="mx-auto flex min-w-max items-start justify-center px-2 sm:min-w-0">

                            {bookingSteps.map(
                                (
                                    step,
                                    index
                                ) => {

                                    const isCompleted =
                                        step.number < 2;

                                    const isCurrent =
                                        step.number === 2;

                                    const isLast =
                                        index ===
                                        bookingSteps.length - 1;


                                    return (

                                        <div
                                            key={
                                                step.number
                                            }
                                            className="flex items-start"
                                        >

                                            <div className="flex w-[68px] flex-col items-center sm:w-[90px] md:w-[105px]">

                                                <div
                                                    className={`
                                                        flex
                                                        h-9
                                                        w-9
                                                        items-center
                                                        justify-center
                                                        rounded-full
                                                        text-xs
                                                        font-bold
                                                        transition-all
                                                        sm:h-11
                                                        sm:w-11
                                                        sm:text-sm

                                                        ${
                                                            isCompleted
                                                                ? "bg-green-100 text-green-600"
                                                                : isCurrent
                                                                    ? "bg-pink-500 text-white shadow-lg shadow-pink-200 ring-4 ring-pink-50"
                                                                    : "bg-slate-100 text-slate-400"
                                                        }
                                                    `}
                                                >

                                                    {isCompleted ? (

                                                        <CheckCircle2
                                                            size={
                                                                18
                                                            }
                                                        />

                                                    ) : (

                                                        step.number

                                                    )}

                                                </div>


                                                <span
                                                    className={`
                                                        mt-2
                                                        whitespace-nowrap
                                                        text-[10px]
                                                        font-semibold
                                                        sm:text-xs
                                                        md:text-sm

                                                        ${
                                                            isCompleted
                                                                ? "text-green-600"
                                                                : isCurrent
                                                                    ? "text-pink-500"
                                                                    : "text-slate-400"
                                                        }
                                                    `}
                                                >
                                                    {
                                                        step.label
                                                    }
                                                </span>

                                            </div>


                                            {!isLast && (

                                                <div
                                                    className={`
                                                        mt-[18px]
                                                        h-px
                                                        w-7
                                                        shrink-0
                                                        sm:mt-[22px]
                                                        sm:w-10
                                                        md:w-14

                                                        ${
                                                            step.number < 2
                                                                ? "bg-green-200"
                                                                : "bg-slate-200"
                                                        }
                                                    `}
                                                />

                                            )}

                                        </div>

                                    );

                                }
                            )}

                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                Main
            ================================================= */}

            <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">


                    {/* =================================================
                        Calendar
                    ================================================= */}

                    <Card className="overflow-hidden rounded-3xl border-0 shadow-xl">

                        <CardContent className="p-5 sm:p-7 md:p-10">


                            {/* Header */}

                            <div className="mb-7 sm:mb-8">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-500 sm:h-12 sm:w-12">

                                        <CalendarDays
                                            size={22}
                                        />

                                    </div>


                                    <div className="min-w-0">

                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500 sm:text-sm sm:tracking-[0.2em]">
                                            เลือกวันจัดงาน
                                        </p>

                                        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                                            วันที่ต้องการใช้บริการ
                                        </h1>

                                    </div>

                                </div>


                                <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
                                    เลือกวันที่ต้องการใช้บริการ Photobooth
                                </p>


                                {/* =================================================
                                    Loading
                                ================================================= */}

                                {availabilityLoading && (

                                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">

                                        กำลังตรวจสอบคิวจากระบบ...

                                    </div>

                                )}


                                {/* =================================================
                                    Error
                                ================================================= */}

                                {availabilityError && (

                                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">

                                        {availabilityError}

                                    </div>

                                )}


                                {/* =================================================
                                    Firebase Connected
                                ================================================= */}

                                {!availabilityLoading &&
                                    !availabilityError && (

                                        <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">

                                            <div className="flex items-center gap-2">

                                                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                                                <span className="font-medium">
                                                    ระบบตรวจสอบคิวแบบ Real-time
                                                </span>

                                            </div>

                                        </div>

                                    )}

                            </div>


                            {/* =================================================
                                Calendar
                            ================================================= */}

                            <div className="flex justify-center overflow-x-auto">

                                <Calendar
                                    mode="single"
                                    selected={
                                        selectedDate
                                    }
                                    onSelect={
                                        setSelectedDate
                                    }
                                    disabled={[
                                        {
                                            before:
                                                new Date(),
                                        },
                                        isDateUnavailable,
                                    ]}
                                    className="rounded-2xl border p-3 [--cell-size:2.75rem] sm:p-4 sm:[--cell-size:3rem] md:[--cell-size:3.5rem]"
                                />

                            </div>


                            {/* =================================================
                                Legend
                            ================================================= */}

                            <div className="mt-7 grid gap-3 border-t pt-6 sm:mt-8 sm:grid-cols-3">

                                <div className="flex items-center gap-3">

                                    <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" />

                                    <span className="text-sm text-slate-600">
                                        ว่าง
                                    </span>

                                </div>


                                <div className="flex items-center gap-3">

                                    <span className="h-3 w-3 shrink-0 rounded-full bg-red-500" />

                                    <span className="text-sm text-slate-600">
                                        จองแล้ว
                                    </span>

                                </div>


                                <div className="flex items-center gap-3">

                                    <span className="h-3 w-3 shrink-0 rounded-full bg-slate-400" />

                                    <span className="text-sm text-slate-600">
                                        ปิดรับ
                                    </span>

                                </div>

                            </div>

                        </CardContent>

                    </Card>


                    {/* =================================================
                        Booking Summary
                    ================================================= */}

                    <div className="space-y-5 lg:space-y-6">


                        <Card className="rounded-3xl border-0 shadow-xl">

                            <CardContent className="p-5 sm:p-7">


                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500 sm:text-sm sm:tracking-[0.2em]">
                                    Booking Details
                                </p>


                                <h2 className="mt-2 text-2xl font-black text-slate-900 sm:mt-3">
                                    รายละเอียดการจอง
                                </h2>


                                {/* =================================================
                                    Package
                                ================================================= */}

                                <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:mt-8 sm:p-5">

                                    <p className="text-sm text-slate-500">
                                        แพ็กเกจ
                                    </p>


                                    {selectedPackage ? (

                                        <>

                                            <p className="mt-1 text-lg font-bold text-slate-900">
                                                {
                                                    selectedPackage.name
                                                }
                                            </p>


                                            <p className="mt-1 text-sm text-slate-500">
                                                {
                                                    selectedPackage.category
                                                }
                                            </p>


                                            <div className="mt-4 flex items-end justify-between gap-4">

                                                <div>

                                                    <p className="text-xs text-slate-400">
                                                        ราคา
                                                    </p>

                                                    <p className="text-xl font-black text-pink-500">
                                                        ฿
                                                        {
                                                            selectedPackage.price.toLocaleString()
                                                        }
                                                    </p>

                                                </div>


                                                <div className="text-right">

                                                    <p className="text-xs text-slate-400">
                                                        ระยะเวลา
                                                    </p>

                                                    <p className="font-bold text-slate-700">
                                                        {
                                                            selectedPackage.hours
                                                        }{" "}
                                                        ชั่วโมง
                                                    </p>

                                                </div>

                                            </div>

                                        </>

                                    ) : (

                                        <p className="mt-1 font-medium text-red-500">
                                            ไม่พบแพ็กเกจ
                                        </p>

                                    )}

                                </div>


                                {/* =================================================
                                    Date
                                ================================================= */}

                                <div className="mt-4 rounded-2xl bg-slate-50 p-4 sm:p-5">

                                    <p className="text-sm text-slate-500">
                                        วันจัดงาน
                                    </p>


                                    {selectedDate ? (

                                        <div className="mt-2 flex items-start gap-2">

                                            <CheckCircle2
                                                size={20}
                                                className="mt-0.5 shrink-0 text-green-500"
                                            />

                                            <p className="font-bold leading-6 text-slate-900">
                                                {formatThaiDate(
                                                    selectedDate
                                                )}
                                            </p>

                                        </div>

                                    ) : (

                                        <p className="mt-1 font-medium text-slate-400">
                                            กรุณาเลือกวันที่
                                        </p>

                                    )}

                                </div>


                                {/* =================================================
                                    Available
                                ================================================= */}

                                {selectedDate &&
                                    selectedDateStatus ===
                                    "available" && (

                                        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">

                                            <div className="flex items-center gap-3">

                                                <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" />

                                                <p className="font-semibold text-green-700">
                                                    วันที่นี้ยังว่าง
                                                </p>

                                            </div>

                                        </div>

                                    )}


                                {/* =================================================
                                    Booked
                                ================================================= */}

                                {selectedDate &&
                                    selectedDateStatus ===
                                    "booked" && (

                                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">

                                            <div className="flex items-center gap-3">

                                                <span className="h-3 w-3 shrink-0 rounded-full bg-red-500" />

                                                <p className="font-semibold text-red-700">
                                                    วันที่นี้ถูกจองแล้ว
                                                </p>

                                            </div>

                                        </div>

                                    )}


                                {/* =================================================
                                    Closed
                                ================================================= */}

                                {selectedDate &&
                                    selectedDateStatus ===
                                    "closed" && (

                                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-4">

                                            <div className="flex items-center gap-3">

                                                <span className="h-3 w-3 shrink-0 rounded-full bg-slate-400" />

                                                <p className="font-semibold text-slate-600">
                                                    วันที่นี้ปิดรับจอง
                                                </p>

                                            </div>

                                        </div>

                                    )}


                                {/* =================================================
                                    Next
                                ================================================= */}

                                <Button
                                    onClick={
                                        handleNext
                                    }
                                    disabled={
                                        !selectedDate ||
                                        selectedDateStatus !==
                                            "available" ||
                                        !selectedPackage
                                    }
                                    className="mt-5 h-13 w-full rounded-full bg-pink-500 text-sm font-bold text-white shadow-lg shadow-pink-100 hover:bg-pink-400 sm:mt-6 sm:h-14 sm:text-base"
                                >

                                    ดำเนินการต่อ

                                    <ArrowRight
                                        size={19}
                                    />

                                </Button>


                                {/* =================================================
                                    Back
                                ================================================= */}

                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        router.push(
                                            "/booking/package"
                                        )
                                    }
                                    className="mt-2 w-full rounded-full text-sm text-slate-500 sm:text-base"
                                >

                                    <ArrowLeft
                                        size={18}
                                    />

                                    กลับไปเลือกแพ็กเกจ

                                </Button>

                            </CardContent>

                        </Card>


                        {/* =================================================
                            Important Information
                        ================================================= */}

                        <div className="rounded-3xl border border-pink-100 bg-pink-50 p-5 sm:p-6">

                            <h3 className="font-bold text-slate-900">
                                💡 หมายเหตุ
                            </h3>


                            <p className="mt-3 text-sm leading-6 text-slate-600">

                                KOKO Memory รับงานสูงสุด{" "}

                                <span className="font-bold text-pink-600">
                                    1 งานต่อวัน
                                </span>

                                {" "}
                                เพื่อให้ทีมงานสามารถดูแลคุณภาพของงาน
                                และให้บริการได้อย่างเต็มที่

                            </p>

                        </div>


                        {/* =================================================
                            Travel Fee
                        ================================================= */}

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">

                            <h3 className="font-bold text-slate-900">
                                📍 ค่าเดินทาง
                            </h3>


                            <p className="mt-3 text-sm leading-6 text-slate-500">

                                ราคานี้ยังไม่รวมค่าเดินทางสำหรับพื้นที่
                                นอกเงื่อนไขที่กำหนด
                                ระบบจะคำนวณค่าเดินทางหลังจากกรอก
                                สถานที่จัดงานในขั้นตอนถัดไป

                            </p>

                        </div>

                    </div>

                </div>

            </section>

        </main>

    );
}


/* ============================================================
   Page
============================================================ */

export default function SchedulePage() {

    return (

        <Suspense fallback={null}>

            <ScheduleContent />

        </Suspense>

    );

}