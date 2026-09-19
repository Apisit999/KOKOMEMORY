"use client";

/**
 * ============================================================
 * KOKO Memory
 * Customer Account : My Bookings
 * ============================================================
 *
 * แสดงเฉพาะ Booking ของผู้ใช้ที่ Login อยู่
 * โดยอ้างอิงจาก bookings/{bookingId}.userId
 *
 * Flow
 * Login
 *   ↓
 * Firebase Auth UID
 *   ↓
 * bookings
 *   ↓
 * filter userId
 *   ↓
 * แสดงรายการจองของฉัน
 * ============================================================
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    CalendarDays,
    ChevronRight,
    Clock3,
    Loader2,
    LogIn,
    MapPin,
    Package,
    ReceiptText,
    RefreshCw,
} from "lucide-react";

import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
} from "firebase/firestore";

import {
    onAuthStateChanged,
    type User,
} from "firebase/auth";

import { auth, db } from "@/lib/firebase";


/* ============================================================
   TYPES
============================================================ */

type BookingStatus =
    | "pending_payment"
    | "confirmed"
    | "payment_rejected"
    | "cancelled"
    | "canceled"
    | "completed"
    | "rejected"
    | "declined"
    | "released"
    | string;

type Booking = {
    id: string;
    userId?: string;

    bookingStatus?: BookingStatus;

    package?: {
        id?: string;
        name?: string;
        hours?: number;
        price?: number;
        category?: string;
        group?: string;
        paperSize?: string;
    };

    event?: {
        date?: string;
        startTime?: string;
        endTime?: string;
        durationHours?: number;
        type?: string;
        guests?: string | number;
    };

    venue?: {
        name?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
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
        paidAmount?: number;
    };

    createdAt?: unknown;
    updatedAt?: unknown;
};


/* ============================================================
   HELPERS
============================================================ */

function formatMoney(value: unknown) {
    const number = Number(value);

    return new Intl.NumberFormat("th-TH").format(
        Number.isFinite(number) ? number : 0,
    );
}


function formatThaiDate(value?: string) {
    if (!value) {
        return "-";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "long",
    }).format(date);
}


function getStatusLabel(status?: string) {
    switch (status?.toLowerCase()) {
        case "pending_payment":
            return "รอชำระเงิน";

        case "confirmed":
            return "ยืนยันการจองแล้ว";

        case "payment_rejected":
            return "ชำระเงินไม่ผ่าน";

        case "cancelled":
        case "canceled":
            return "ยกเลิกแล้ว";

        case "completed":
            return "เสร็จสิ้น";

        case "rejected":
        case "declined":
            return "รายการถูกปฏิเสธ";

        case "released":
            return "ปล่อยคิวแล้ว";

        default:
            return "กำลังตรวจสอบ";
    }
}


function getStatusClass(status?: string) {
    switch (status?.toLowerCase()) {
        case "pending_payment":
            return "bg-amber-50 text-amber-700 ring-amber-200";

        case "confirmed":
            return "bg-green-50 text-green-700 ring-green-200";

        case "payment_rejected":
        case "rejected":
        case "declined":
            return "bg-red-50 text-red-700 ring-red-200";

        case "cancelled":
        case "canceled":
        case "released":
            return "bg-slate-100 text-slate-500 ring-slate-200";

        case "completed":
            return "bg-blue-50 text-blue-700 ring-blue-200";

        default:
            return "bg-slate-50 text-slate-600 ring-slate-200";
    }
}


function getPaymentLabel(status?: string) {
    switch (status?.toLowerCase()) {
        case "verified":
        case "paid":
            return "ชำระเงินแล้ว";

        case "pending":
            return "รอตรวจสอบ";

        case "rejected":
            return "หลักฐานถูกปฏิเสธ";

        case "unpaid":
        default:
            return "ยังไม่ได้ชำระ";
    }
}


function getPaymentClass(status?: string) {
    switch (status?.toLowerCase()) {
        case "verified":
        case "paid":
            return "text-green-600";

        case "pending":
            return "text-amber-600";

        case "rejected":
            return "text-red-600";

        case "unpaid":
        default:
            return "text-slate-500";
    }
}


function canPay(booking: Booking) {
    const bookingStatus =
        booking.bookingStatus?.toLowerCase();

    const paymentStatus =
        booking.payment?.status?.toLowerCase();

    return (
        bookingStatus === "pending_payment" &&
        paymentStatus !== "verified" &&
        paymentStatus !== "paid"
    );
}


function sortBookingsByCreatedAt(
    items: Booking[],
) {
    return [...items].sort((a, b) => {

        const getMillis = (value: unknown) => {

            if (
                typeof value === "object" &&
                value !== null &&
                "toMillis" in value &&
                typeof value.toMillis === "function"
            ) {
                return value.toMillis();
            }

            return 0;
        };

        return (
            getMillis(b.createdAt) -
            getMillis(a.createdAt)
        );
    });
}


/* ============================================================
   PAGE
============================================================ */

export default function MyBookingsPage() {

    const router = useRouter();

    const [
        authUser,
        setAuthUser,
    ] = useState<User | null>(null);

    const [
        bookings,
        setBookings,
    ] = useState<Booking[]>([]);

    const [
        isAuthLoading,
        setIsAuthLoading,
    ] = useState(true);

    const [
        isLoading,
        setIsLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        isRefreshing,
        setIsRefreshing,
    ] = useState(false);


    /* ========================================================
       AUTH
    ======================================================== */

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                (user) => {

                    setAuthUser(user);
                    setIsAuthLoading(false);

                    if (!user) {
                        router.replace(
                            "/account/login"
                        );
                    }

                },
            );

        return unsubscribe;

    }, [router]);


    /* ========================================================
       LOAD BOOKINGS
    ======================================================== */

    useEffect(() => {

        if (!authUser) {
            return;
        }

        const currentUser = authUser;

        let cancelled = false;

        async function loadBookings() {

            setIsLoading(true);
            setError("");

            try {

                /*
                 * สำคัญ:
                 * ใช้ UID จาก Firebase Auth เท่านั้น
                 * ไม่รับ userId จาก URL
                 */
                const bookingsQuery =
                    query(
                        collection(
                            db,
                            "bookings",
                        ),
                        where(
                            "userId",
                            "==",
                            currentUser.uid,
                        ),
                    );

                const snapshot =
                    await getDocs(
                        bookingsQuery,
                    );

                if (cancelled) {
                    return;
                }

                const result =
                    snapshot.docs.map(
                        (item) => ({
                            id: item.id,
                            ...item.data(),
                        }) as Booking,
                    );

                setBookings(
                    sortBookingsByCreatedAt(result),
                );

            } catch (loadError) {

                console.error(
                    "KOKO LOAD MY BOOKINGS ERROR:",
                    loadError,
                );

                if (!cancelled) {
                    setError(
                        "ไม่สามารถโหลดรายการจองได้ กรุณาลองใหม่อีกครั้ง",
                    );
                }

            } finally {

                if (!cancelled) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                }

            }

        }

        loadBookings();

        return () => {
            cancelled = true;
        };

    }, [authUser]);


    /* ========================================================
       REFRESH
    ======================================================== */

    async function handleRefresh() {

        if (!authUser || isLoading) {
            return;
        }

        const currentUser = authUser;

        setIsRefreshing(true);

        try {

            const bookingsQuery =
                query(
                    collection(
                        db,
                        "bookings",
                    ),
                    where(
                        "userId",
                        "==",
                        currentUser.uid,
                    ),
                    orderBy(
                        "createdAt",
                        "desc",
                    ),
                );

            const snapshot =
                await getDocs(
                    bookingsQuery,
                );

            const result =
                snapshot.docs.map(
                    (item) => ({
                        id: item.id,
                        ...item.data(),
                    }) as Booking,
                );

            setBookings(result);
            setError("");

        } catch (refreshError) {

            console.error(
                "KOKO REFRESH MY BOOKINGS ERROR:",
                refreshError,
            );

            setError(
                "รีเฟรชรายการจองไม่สำเร็จ",
            );

        } finally {

            setIsRefreshing(false);

        }

    }


    /* ========================================================
       LOADING AUTH
    ======================================================== */

    if (isAuthLoading) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <Loader2
                        size={20}
                        className="animate-spin text-pink-500"
                    />
                    กำลังตรวจสอบบัญชี...
                </div>
            </main>
        );

    }


    if (!authUser) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="text-center">
                    <LogIn
                        size={36}
                        className="mx-auto text-pink-500"
                    />

                    <h1 className="mt-4 text-xl font-black text-slate-900">
                        กรุณาเข้าสู่ระบบ
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        คุณต้องเข้าสู่ระบบเพื่อดูรายการจอง
                    </p>
                </div>
            </main>
        );

    }


    /* ========================================================
       UI
    ======================================================== */

    return (

        <main className="min-h-screen bg-slate-50">

            {/* HEADER */}

            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">

                <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

                    <div className="min-w-0">

                        <Image src="/logo/logo.jpg" alt="KOKO Memory" width={34} height={34} className="h-8 w-8 rounded-full object-cover" />

                        <h1 className="truncate text-lg font-black text-slate-900 sm:text-xl">
                            การจองของฉัน
                        </h1>

                    </div>


                    <div className="flex shrink-0 items-center gap-2">

                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing || isLoading}
                            aria-label="รีเฟรชรายการจอง"
                            className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-slate-200
                                bg-white
                                text-slate-500
                                transition
                                hover:bg-slate-50
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    isRefreshing
                                        ? "animate-spin"
                                        : ""
                                }
                            />
                        </button>

                        <Link
                            href="/account"
                            className="
                                rounded-full
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-2.5
                                text-sm
                                font-bold
                                text-slate-600
                                transition
                                hover:bg-slate-50
                            "
                        >
                            บัญชีของฉัน
                        </Link>

                    </div>

                </div>

            </header>


            {/* CONTENT */}

            <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">

                {/* TITLE */}

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

                    <div>

                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-500">
                            My Bookings
                        </p>

                        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            รายการจองของคุณ
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                            ดูรายละเอียดการจอง สถานะการชำระเงิน
                            และดำเนินการต่อจากรายการของคุณได้ที่นี่
                        </p>

                    </div>


                    <Link
                        href="/booking"
                        className="
                            inline-flex
                            h-12
                            shrink-0
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
                        "
                    >
                        จองบริการใหม่
                        <ChevronRight size={18} />
                    </Link>

                </div>


                {/* ERROR */}

                {error && (

                    <div
                        role="alert"
                        className="
                            mt-6
                            rounded-2xl
                            border
                            border-red-200
                            bg-red-50
                            p-4
                            text-sm
                            leading-6
                            text-red-600
                        "
                    >
                        {error}
                    </div>

                )}


                {/* LOADING */}

                {isLoading && (

                    <div className="mt-8 grid gap-5 lg:grid-cols-2">

                        {[1, 2].map((item) => (
                            <div
                                key={item}
                                className="
                                    h-72
                                    animate-pulse
                                    rounded-3xl
                                    bg-white
                                    ring-1
                                    ring-slate-100
                                "
                            />
                        ))}

                    </div>

                )}


                {/* EMPTY */}

                {!isLoading && bookings.length === 0 && !error && (

                    <section className="mt-10 rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-100 sm:px-10">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-50 text-pink-500">
                            <CalendarDays size={28} />
                        </div>

                        <h3 className="mt-5 text-xl font-black text-slate-900">
                            ยังไม่มีรายการจอง
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            เมื่อคุณยืนยันการจอง รายการจองของคุณจะแสดงอยู่ที่หน้านี้
                        </p>

                        <Link
                            href="/booking"
                            className="
                                mt-6
                                inline-flex
                                h-12
                                items-center
                                justify-center
                                rounded-full
                                bg-pink-500
                                px-6
                                text-sm
                                font-bold
                                text-white
                                shadow-lg
                                shadow-pink-200
                                transition
                                hover:bg-pink-400
                            "
                        >
                            เริ่มจองบริการ
                        </Link>

                    </section>

                )}


                {/* BOOKINGS */}

                {!isLoading && bookings.length > 0 && (

                    <div className="mt-8 grid gap-5 lg:grid-cols-2">

                        {bookings.map((booking) => {

                            const status =
                                booking.bookingStatus || "";

                            const paymentStatus =
                                booking.payment?.status || "unpaid";

                            const total =
                                Number(
                                    booking.pricing?.total,
                                );

                            return (

                                <article
                                    key={booking.id}
                                    className="
                                        overflow-hidden
                                        rounded-3xl
                                        bg-white
                                        shadow-sm
                                        ring-1
                                        ring-slate-100
                                    "
                                >

                                    {/* CARD HEADER */}

                                    <div className="bg-gradient-to-br from-pink-500 to-pink-400 p-5 text-white sm:p-6">

                                        <div className="flex items-start justify-between gap-4">

                                            <div className="min-w-0">

                                                <p className="text-xs font-semibold text-white/75">
                                                    KOKO Memory
                                                </p>

                                                <h3 className="mt-1 break-words text-xl font-black">
                                                    {booking.package?.name || "แพ็กเกจ"}
                                                </h3>

                                            </div>

                                            <span
                                                className={`
                                                    shrink-0
                                                    rounded-full
                                                    px-3
                                                    py-1.5
                                                    text-xs
                                                    font-bold
                                                    ring-1
                                                    ${getStatusClass(status)}
                                                `}
                                            >
                                                {getStatusLabel(status)}
                                            </span>

                                        </div>

                                        <p className="mt-4 break-all text-[11px] font-medium text-white/70">
                                            Booking ID: {booking.id}
                                        </p>

                                    </div>


                                    {/* BODY */}

                                    <div className="p-5 sm:p-6">

                                        <div className="grid gap-3 sm:grid-cols-2">

                                            <div className="rounded-2xl bg-slate-50 p-4">

                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <CalendarDays size={14} />
                                                    วันที่จัดงาน
                                                </div>

                                                <p className="mt-2 text-sm font-bold text-slate-900">
                                                    {formatThaiDate(
                                                        booking.event?.date,
                                                    )}
                                                </p>

                                            </div>


                                            <div className="rounded-2xl bg-slate-50 p-4">

                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Clock3 size={14} />
                                                    เวลา
                                                </div>

                                                <p className="mt-2 text-sm font-bold text-slate-900">
                                                    {booking.event?.startTime &&
                                                    booking.event?.endTime
                                                        ? `${booking.event.startTime} - ${booking.event.endTime} น.`
                                                        : "-"
                                                    }
                                                </p>

                                            </div>


                                            <div className="rounded-2xl bg-slate-50 p-4">

                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <MapPin size={14} />
                                                    สถานที่
                                                </div>

                                                <p className="mt-2 break-words text-sm font-bold text-slate-900">
                                                    {booking.venue?.name || "-"}
                                                </p>

                                                {booking.venue?.province && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {booking.venue.province}
                                                    </p>
                                                )}

                                            </div>


                                            <div className="rounded-2xl bg-slate-50 p-4">

                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Package size={14} />
                                                    ราคา
                                                </div>

                                                <p className="mt-2 text-lg font-black text-pink-500">
                                                    ฿{formatMoney(total)}
                                                </p>

                                            </div>

                                        </div>


                                        {/* PAYMENT */}

                                        <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">

                                            <div className="min-w-0">

                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <ReceiptText size={14} />
                                                    การชำระเงิน
                                                </div>

                                                <p
                                                    className={`
                                                        mt-1
                                                        text-sm
                                                        font-bold
                                                        ${getPaymentClass(paymentStatus)}
                                                    `}
                                                >
                                                    {getPaymentLabel(paymentStatus)}
                                                </p>

                                            </div>


                                            <div className="flex shrink-0 items-center gap-2">

                                                {canPay(booking) && (

                                                    <Link
                                                        href={`/booking/payment?bookingId=${encodeURIComponent(
                                                            booking.id,
                                                        )}`}
                                                        className="
                                                            rounded-full
                                                            bg-pink-500
                                                            px-4
                                                            py-2.5
                                                            text-xs
                                                            font-bold
                                                            text-white
                                                            transition
                                                            hover:bg-pink-400
                                                        "
                                                    >
                                                        ชำระเงิน
                                                    </Link>

                                                )}

                                                <Link
                                                    href={`/account/bookings/${encodeURIComponent(
                                                        booking.id,
                                                    )}`}
                                                    className="
                                                        inline-flex
                                                        items-center
                                                        gap-1
                                                        rounded-full
                                                        border
                                                        border-slate-200
                                                        px-4
                                                        py-2.5
                                                        text-xs
                                                        font-bold
                                                        text-slate-600
                                                        transition
                                                        hover:bg-slate-50
                                                    "
                                                >
                                                    รายละเอียด
                                                    <ChevronRight size={15} />
                                                </Link>

                                            </div>

                                        </div>

                                    </div>

                                </article>

                            );

                        })}

                    </div>

                )}

            </section>

        </main>
    );
}
