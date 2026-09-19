"use client";

/**
 * ============================================================
 * KOKO Memory
 * Customer Account : Booking Detail
 * ============================================================
 *
 * URL
 * /account/bookings/[id]
 *
 * อ่าน Booking จาก Firestore โดยตรวจสอบว่า
 * booking.userId === Firebase Auth UID
 *
 * ระบบ Payment เดิมยังคงใช้ /booking/payment
 * โดยส่ง bookingId ไปเป็นตัวอ้างอิงหลัก
 * ============================================================
 */

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    FileText,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    Package,
    Phone,
    ReceiptText,
    RefreshCw,
    ShieldCheck,
    User,
} from "lucide-react";

import {
    doc,
    getDoc,
} from "firebase/firestore";

import {
    onAuthStateChanged,
    type User as FirebaseUser,
} from "firebase/auth";

import { auth, db } from "@/lib/firebase";


/* ============================================================
   TYPES
============================================================ */

type Booking = {
    userId?: string;

    bookingVersion?: number;

    package?: {
        id?: string;
        name?: string;
        hours?: number;
        category?: string;
        group?: string;
        paperSize?: string;
        price?: number;
    };

    event?: {
        date?: string;
        startTime?: string;
        endTime?: string;
        durationHours?: number;
        type?: string;
        guests?: string | number;
    };

    customer?: {
        name?: string;
        phone?: string;
        line?: string;
        email?: string;
    };

    venue?: {
        name?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        postalCode?: string;
        address?: string;
        googleMaps?: string;
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
        paidAt?: unknown;
        verifiedAt?: unknown;
        verifiedBy?: string | null;
    };

    bookingStatus?: string;

    note?: string;

    createdAt?: unknown;
    updatedAt?: unknown;
};


/* ============================================================
   HELPERS
============================================================ */

function formatMoney(value: unknown) {

    const number =
        Number(value);

    return new Intl.NumberFormat(
        "th-TH",
    ).format(
        Number.isFinite(number)
            ? number
            : 0,
    );
}


function formatThaiDate(
    value?: string,
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(
            `${value}T00:00:00`,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "th-TH",
        {
            dateStyle: "long",
        },
    ).format(date);
}


function getStatusLabel(
    status?: string,
) {

    switch (
        status?.toLowerCase()
    ) {

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


function getStatusClass(
    status?: string,
) {

    switch (
        status?.toLowerCase()
    ) {

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


function getPaymentLabel(
    status?: string,
) {

    switch (
        status?.toLowerCase()
    ) {

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


function getPaymentClass(
    status?: string,
) {

    switch (
        status?.toLowerCase()
    ) {

        case "verified":
        case "paid":
            return "bg-green-50 text-green-700 ring-green-200";

        case "pending":
            return "bg-amber-50 text-amber-700 ring-amber-200";

        case "rejected":
            return "bg-red-50 text-red-700 ring-red-200";

        default:
            return "bg-slate-50 text-slate-600 ring-slate-200";
    }
}


function canPay(
    booking: Booking,
) {

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


/* ============================================================
   PAGE
============================================================ */

export default function BookingDetailPage() {

    const params =
        useParams();

    const router =
        useRouter();

    const bookingId =
        typeof params?.id === "string"
            ? params.id
            : Array.isArray(params?.id)
                ? params.id[0]
                : "";

    const [
        authUser,
        setAuthUser,
    ] = useState<FirebaseUser | null>(null);

    const [
        booking,
        setBooking,
    ] = useState<Booking | null>(null);

    const [
        isAuthLoading,
        setIsAuthLoading,
    ] = useState(true);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    const [
        isRefreshing,
        setIsRefreshing,
    ] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);


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
                            "/account/login",
                        );
                    }

                },
            );

        return unsubscribe;

    }, [router]);


    /* ========================================================
       LOAD BOOKING
    ======================================================== */

    async function loadBooking(
        user: FirebaseUser,
        showRefresh = false,
    ) {

        if (!bookingId) {

            setError(
                "ไม่พบรหัสรายการจอง",
            );

            setIsLoading(false);
            setIsRefreshing(false);

            return;
        }

        if (showRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        setError("");

        try {

            const bookingRef =
                doc(
                    db,
                    "bookings",
                    bookingId,
                );

            const snapshot =
                await getDoc(
                    bookingRef,
                );

            /*
             * ไม่เปิดเผยรายละเอียดของ Booking
             * ถ้าไม่มีเอกสารหรือ UID ไม่ตรงกัน
             */
            if (
                !snapshot.exists()
            ) {

                setBooking(null);
                setError(
                    "ไม่พบรายการจองนี้",
                );

                return;
            }

            const data =
                snapshot.data() as Booking;

            if (
                data.userId !== user.uid
            ) {

                setBooking(null);
                setError(
                    "ไม่พบรายการจองนี้",
                );

                return;
            }

            setBooking(data);

        } catch (loadError) {

            console.error(
                "KOKO LOAD BOOKING DETAIL ERROR:",
                loadError,
            );

            setBooking(null);
            setError(
                "ไม่สามารถโหลดรายละเอียดการจองได้ กรุณาลองใหม่อีกครั้ง",
            );

        } finally {

            setIsLoading(false);
            setIsRefreshing(false);

        }

    }


    useEffect(() => {

        if (
            !authUser ||
            !bookingId
        ) {
            return;
        }

        void loadBooking(
            authUser,
        );

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        authUser,
        bookingId,
    ]);

    async function cancelBooking() {
        if (!authUser || !booking) return;
        const reason = window.prompt("กรุณาระบุเหตุผลการยกเลิก");
        if (reason === null) return;
        if (!reason.trim() || reason.trim().length > 500) {
            window.alert("กรุณาระบุเหตุผลไม่เกิน 500 ตัวอักษร");
            return;
        }
        if (!window.confirm("ยืนยันการยกเลิกการจองนี้หรือไม่?")) return;
        setIsCancelling(true);
        try {
            const token = await authUser.getIdToken();
            const response = await fetch(`/api/booking/${encodeURIComponent(bookingId)}/cancel`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ cancellationReason: reason.trim() }),
            });
            if (!response.ok) throw new Error("CANCEL_FAILED");
            await loadBooking(authUser, true);
        } catch {
            window.alert("ไม่สามารถยกเลิกการจองได้ กรุณาลองใหม่อีกครั้ง");
        } finally { setIsCancelling(false); }
    }


    /* ========================================================
       LOADING
    ======================================================== */

    if (isAuthLoading || isLoading) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">

                <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">

                    <Loader2
                        size={21}
                        className="animate-spin text-pink-500"
                    />

                    กำลังโหลดรายละเอียดการจอง...

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


    if (error || !booking) {

        return (

            <main className="min-h-screen bg-slate-50">

                <header className="border-b border-slate-200 bg-white">

                    <div className="mx-auto flex min-h-[72px] max-w-6xl items-center px-4 sm:px-6">

                        <Link
                            href="/account/bookings"
                            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-pink-500"
                        >
                            <ArrowLeft size={18} />
                            กลับรายการจอง
                        </Link>

                    </div>

                </header>

                <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                        <ReceiptText size={28} />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        ไม่พบรายการจอง
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {error || "ไม่พบข้อมูลรายการจองนี้"}
                    </p>

                    <Link
                        href="/account/bookings"
                        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-pink-500 px-6 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-400"
                    >
                        กลับไปการจองของฉัน
                    </Link>

                </section>

            </main>

        );

    }


    const status =
        booking.bookingStatus || "";
    const canCancel = ["pending_payment", "payment_submitted", "confirmed"].includes(status.toLowerCase());

    const paymentStatus =
        booking.payment?.status || "unpaid";

    const total =
        Number(
            booking.pricing?.total,
        );

    const deposit =
        Number(
            booking.pricing?.deposit,
        );

    const remaining =
        Number(
            booking.pricing?.remaining,
        );


    /* ========================================================
       UI
    ======================================================== */

    return (

        <main className="min-h-screen bg-slate-50">

            {/* HEADER */}

            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">

                <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

                    <Link
                        href="/account/bookings"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-pink-500"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">
                            กลับรายการจอง
                        </span>
                        <span className="sm:hidden">
                            กลับ
                        </span>
                    </Link>


                    <div className="min-w-0 text-right">

                        <Image src="/logo/logo.jpg" alt="KOKO Memory" width={34} height={34} className="ml-auto h-8 w-8 rounded-full object-cover" />

                        <p className="truncate text-sm font-black text-slate-900">
                            รายละเอียดการจอง
                        </p>

                    </div>

                </div>

            </header>


            {/* CONTENT */}

            <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">

                {/* TITLE */}

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

                    <div className="min-w-0">

                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-500">
                            Booking Detail
                        </p>

                        <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            {booking.package?.name || "รายการจอง"}
                        </h1>

                        <p className="mt-2 break-all text-xs font-medium text-slate-400">
                            Booking ID: {bookingId}
                        </p>

                    </div>


                    <div className="flex items-center gap-2">

                        <button
                            type="button"
                            onClick={() => {
                                if (authUser) {
                                    void loadBooking(
                                        authUser,
                                        true,
                                    );
                                }
                            }}
                            disabled={isRefreshing}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                            aria-label="รีเฟรช"
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

                        <span
                            className={`
                                rounded-full
                                px-4
                                py-2
                                text-xs
                                font-bold
                                ring-1
                                ${getStatusClass(status)}
                            `}
                        >
                            {getStatusLabel(status)}
                        </span>

                    </div>

                </div>


                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">


                    {/* =================================================
                        LEFT
                    ================================================= */}

                    <div className="space-y-6">


                        {/* EVENT */}

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
                                        วัน เวลา และประเภทงาน
                                    </p>
                                </div>

                            </div>


                            <div className="mt-6 grid gap-3 sm:grid-cols-2">

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        วันที่จัดงาน
                                    </p>

                                    <p className="mt-2 font-bold text-slate-900">
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

                                    <p className="mt-2 font-bold text-slate-900">
                                        {booking.event?.startTime &&
                                        booking.event?.endTime
                                            ? `${booking.event.startTime} - ${booking.event.endTime} น.`
                                            : "-"
                                        }
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        ประเภทงาน
                                    </p>

                                    <p className="mt-2 font-bold text-slate-900">
                                        {booking.event?.type || "-"}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <p className="text-xs text-slate-400">
                                        จำนวนแขก
                                    </p>

                                    <p className="mt-2 font-bold text-slate-900">
                                        {booking.event?.guests
                                            ? `${booking.event.guests} คน`
                                            : "-"
                                        }
                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* PACKAGE */}

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                            <div className="flex items-center gap-3">

                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                    <Package size={21} />
                                </div>

                                <div>
                                    <h2 className="text-lg font-black text-slate-900">
                                        แพ็กเกจ
                                    </h2>

                                    <p className="text-xs text-slate-400">
                                        รายละเอียดบริการที่เลือก
                                    </p>
                                </div>

                            </div>


                            <div className="mt-6 rounded-2xl bg-slate-50 p-5">

                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                                    <div>

                                        <p className="text-xl font-black text-slate-900">
                                            {booking.package?.name || "-"}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">

                                            {booking.package?.hours && (
                                                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-100">
                                                    {booking.package.hours} ชั่วโมง
                                                </span>
                                            )}

                                            {booking.package?.paperSize && (
                                                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-100">
                                                    ขนาด {booking.package.paperSize}
                                                </span>
                                            )}

                                            {booking.package?.category && (
                                                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-100">
                                                    {booking.package.category === "360"
                                                        ? "360 Photobooth"
                                                        : "Photobooth"
                                                    }
                                                </span>
                                            )}

                                        </div>

                                    </div>

                                    <p className="text-xl font-black text-pink-500">
                                        ฿{formatMoney(
                                            booking.package?.price ??
                                            booking.pricing?.packagePrice,
                                        )}
                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* CUSTOMER */}

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
                                        ข้อมูลติดต่อที่ใช้ในการจอง
                                    </p>
                                </div>

                            </div>


                            <div className="mt-6 grid gap-3 sm:grid-cols-2">

                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <User size={14} />
                                        ชื่อ - นามสกุล
                                    </div>

                                    <p className="mt-2 break-words text-sm font-bold text-slate-900">
                                        {booking.customer?.name || "-"}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Phone size={14} />
                                        เบอร์โทรศัพท์
                                    </div>

                                    <p className="mt-2 break-words text-sm font-bold text-slate-900">
                                        {booking.customer?.phone || "-"}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <MessageCircle size={14} />
                                        LINE
                                    </div>

                                    <p className="mt-2 break-words text-sm font-bold text-slate-900">
                                        {booking.customer?.line || "-"}
                                    </p>

                                </div>


                                <div className="rounded-2xl bg-slate-50 p-4">

                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Mail size={14} />
                                        Email
                                    </div>

                                    <p className="mt-2 break-words text-sm font-bold text-slate-900">
                                        {booking.customer?.email || "-"}
                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* VENUE */}

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

                                    <p className="mt-2 font-bold text-slate-900">
                                        {booking.venue?.name || "-"}
                                    </p>

                                </div>


                                <div className="grid gap-3 sm:grid-cols-2">

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-400">
                                            จังหวัด
                                        </p>
                                        <p className="mt-2 font-bold text-slate-900">
                                            {booking.venue?.province || "-"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-400">
                                            เขต / อำเภอ
                                        </p>
                                        <p className="mt-2 font-bold text-slate-900">
                                            {booking.venue?.district || "-"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-400">
                                            แขวง / ตำบล
                                        </p>
                                        <p className="mt-2 font-bold text-slate-900">
                                            {booking.venue?.subdistrict || "-"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-400">
                                            รหัสไปรษณีย์
                                        </p>
                                        <p className="mt-2 font-bold text-slate-900">
                                            {booking.venue?.postalCode || "-"}
                                        </p>
                                    </div>

                                </div>


                                {booking.venue?.address && (

                                    <div className="rounded-2xl bg-slate-50 p-4">

                                        <p className="text-xs text-slate-400">
                                            ที่อยู่เพิ่มเติม
                                        </p>

                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                                            {booking.venue.address}
                                        </p>

                                    </div>

                                )}


                                {booking.venue?.googleMaps && (

                                    <a
                                        href={booking.venue.googleMaps}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-5 py-3 text-sm font-bold text-pink-600 transition hover:bg-pink-100"
                                    >
                                        <MapPin size={17} />
                                        เปิด Google Maps
                                    </a>

                                )}

                            </div>

                        </section>


                        {/* NOTE */}

                        {booking.note && (

                            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                                        <FileText size={21} />
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-black text-slate-900">
                                            รายละเอียดเพิ่มเติม
                                        </h2>
                                    </div>

                                </div>

                                <p className="mt-5 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                                    {booking.note}
                                </p>

                            </section>

                        )}

                    </div>


                    {/* =================================================
                        RIGHT / PAYMENT SUMMARY
                    ================================================= */}

                    <aside className="lg:sticky lg:top-24 lg:self-start">

                        <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">

                            <div className="bg-gradient-to-br from-pink-500 to-pink-400 p-6 text-white">

                                <p className="text-xs font-semibold text-white/75">
                                    สถานะการชำระเงิน
                                </p>

                                <div className="mt-2 flex items-center justify-between gap-4">

                                    <h2 className="text-2xl font-black">
                                        {getPaymentLabel(
                                            paymentStatus,
                                        )}
                                    </h2>

                                    <CreditCard size={27} />

                                </div>

                            </div>


                            <div className="p-5 sm:p-6">

                                {/* PAYMENT STATUS */}

                                <div
                                    className={`
                                        flex
                                        items-center
                                        gap-3
                                        rounded-2xl
                                        px-4
                                        py-3
                                        text-sm
                                        font-bold
                                        ring-1
                                        ${getPaymentClass(paymentStatus)}
                                    `}
                                >

                                    {paymentStatus === "verified" ||
                                    paymentStatus === "paid" ? (
                                        <CheckCircle2 size={19} />
                                    ) : (
                                        <ReceiptText size={19} />
                                    )}

                                    {getPaymentLabel(
                                        paymentStatus,
                                    )}

                                </div>


                                {/* PRICE */}

                                <div className="mt-6 space-y-4">

                                    <div className="flex items-center justify-between gap-4 text-sm">
                                        <span className="text-slate-500">
                                            ราคาแพ็กเกจ
                                        </span>

                                        <span className="font-bold text-slate-900">
                                            ฿{formatMoney(
                                                booking.pricing?.packagePrice,
                                            )}
                                        </span>
                                    </div>


                                    <div className="flex items-center justify-between gap-4 text-sm">
                                        <span className="text-slate-500">
                                            ค่าเดินทาง
                                        </span>

                                        <span className="font-bold text-slate-900">
                                            {Number(
                                                booking.pricing?.travelFee,
                                            ) === 0
                                                ? "ฟรี"
                                                : `฿${formatMoney(
                                                    booking.pricing?.travelFee,
                                                )}`
                                            }
                                        </span>
                                    </div>


                                    {Number(
                                        booking.pricing?.discount,
                                    ) > 0 && (

                                        <div className="flex items-center justify-between gap-4 text-sm">
                                            <span className="text-slate-500">
                                                ส่วนลด
                                            </span>

                                            <span className="font-bold text-green-600">
                                                -฿{formatMoney(
                                                    booking.pricing?.discount,
                                                )}
                                            </span>
                                        </div>

                                    )}

                                </div>


                                <div className="mt-6 border-t border-slate-100 pt-6">

                                    <div className="flex items-end justify-between gap-4">

                                        <div>
                                            <p className="text-sm text-slate-500">
                                                ยอดรวม
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                ราคาการจอง
                                            </p>
                                        </div>

                                        <p className="text-3xl font-black text-pink-500">
                                            ฿{formatMoney(
                                                total,
                                            )}
                                        </p>

                                    </div>

                                </div>


                                {/* DEPOSIT */}

                                <div className="mt-6 rounded-2xl bg-pink-50 p-4">

                                    <div className="flex items-center justify-between gap-4">

                                        <span className="text-sm font-semibold text-slate-700">
                                            เงินมัดจำ
                                        </span>

                                        <span className="font-black text-pink-600">
                                            {deposit > 0
                                                ? `฿${formatMoney(deposit)}`
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
                                                    remaining,
                                                )}
                                            </span>

                                        </div>

                                    )}

                                </div>


                                {/* PAYMENT ACTION */}

                                {canPay(booking) && (

                                    <div className="mt-6">

                                        <Link
                                            href={`/booking/payment?bookingId=${encodeURIComponent(
                                                bookingId,
                                            )}`}
                                            className="
                                                flex
                                                h-14
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
                                            "
                                        >
                                            <CreditCard size={19} />
                                            ดำเนินการชำระเงิน
                                        </Link>

                                    </div>

                                )}

                                {canCancel && (
                                    <button type="button" onClick={() => void cancelBooking()} disabled={isCancelling}
                                        className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-red-200 bg-white px-6 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                                        {isCancelling ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
                                    </button>
                                )}


                                {/* VERIFIED */}

                                {(paymentStatus === "verified" ||
                                paymentStatus === "paid") && (

                                    <div className="mt-6 rounded-2xl bg-green-50 p-4">

                                        <div className="flex gap-3">

                                            <ShieldCheck
                                                size={20}
                                                className="mt-0.5 shrink-0 text-green-600"
                                            />

                                            <div>

                                                <p className="text-sm font-bold text-green-700">
                                                    การชำระเงินได้รับการตรวจสอบแล้ว
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-green-700/80">
                                                    ระบบยืนยันรายการชำระเงินของคุณเรียบร้อยแล้ว
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                )}


                                {/* PENDING */}

                                {paymentStatus === "pending" && (

                                    <div className="mt-6 rounded-2xl bg-amber-50 p-4">

                                        <div className="flex gap-3">

                                            <ReceiptText
                                                size={20}
                                                className="mt-0.5 shrink-0 text-amber-600"
                                            />

                                            <div>

                                                <p className="text-sm font-bold text-amber-700">
                                                    กำลังตรวจสอบหลักฐานการชำระเงิน
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-amber-700/80">
                                                    รอทีมงานตรวจสอบสลิปและยืนยันรายการ
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                )}


                                {/* REJECTED */}

                                {paymentStatus === "rejected" && (

                                    <div className="mt-6 rounded-2xl bg-red-50 p-4">

                                        <div className="flex gap-3">

                                            <ReceiptText
                                                size={20}
                                                className="mt-0.5 shrink-0 text-red-600"
                                            />

                                            <div>

                                                <p className="text-sm font-bold text-red-700">
                                                    หลักฐานการชำระเงินถูกปฏิเสธ
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-red-700/80">
                                                    กรุณาตรวจสอบข้อมูลและส่งหลักฐานใหม่อีกครั้ง
                                                </p>

                                            </div>

                                        </div>

                                        <Link
                                            href={`/booking/payment?bookingId=${encodeURIComponent(
                                                bookingId,
                                            )}`}
                                            className="mt-4 inline-flex rounded-full bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-500"
                                        >
                                            ไปที่หน้าชำระเงิน
                                        </Link>

                                    </div>

                                )}


                                {/* FOOTER */}

                                <Link
                                    href="/account/bookings"
                                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                    <ArrowLeft size={17} />
                                    กลับรายการจอง
                                </Link>

                            </div>

                        </section>

                    </aside>

                </div>

            </section>

        </main>
    );
}
