"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Booking = {
    id: string;
    bookingStatus?: string;
    bookingVersion?: number;
    createdAt?: Timestamp | string | Date | null;

    customer?: {
        name?: string;
        phone?: string;
        line?: string;
        email?: string;
    };

    event?: {
        date?: string;
        type?: string;
        guests?: string | number;
        location?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        postcode?: string;
    };

    package?: {
        name?: string;
        price?: number;
    };

    totalPrice?: number;
};

const STATUS_LABEL: Record<string, string> = {
    pending_payment: "รอชำระเงิน",
    payment_submitted: "ส่งหลักฐานแล้ว",
    payment_verified: "ตรวจสอบแล้ว",
    confirmed: "ยืนยันแล้ว",
    cancelled: "ยกเลิก",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
    wedding: "งานแต่งงาน",
    birthday: "วันเกิด",
    corporate: "งานบริษัท",
    graduation: "งานรับปริญญา",
    party: "งานเลี้ยง",
    other: "อื่น ๆ",
};

function formatMoney(value?: number) {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";

    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value?: string) {
    if (!value) return "-";

    // รองรับทั้ง YYYY-MM-DD และวันที่ที่ Firebase/ระบบอื่นส่งมา
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function getStatusLabel(status?: string) {
    if (!status) return "ไม่ระบุ";
    return STATUS_LABEL[status] || status;
}

function getEventTypeLabel(type?: string) {
    if (!type) return "-";
    return EVENT_TYPE_LABEL[type] || type;
}

function getStatusClass(status?: string) {
    switch (status) {
        case "confirmed":
            return "bg-green-100 text-green-700";
        case "payment_verified":
            return "bg-blue-100 text-blue-700";
        case "payment_submitted":
            return "bg-purple-100 text-purple-700";
        case "cancelled":
            return "bg-red-100 text-red-700";
        case "pending_payment":
        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function getStatusDotClass(status?: string) {
    switch (status) {
        case "confirmed":
            return "bg-green-500";
        case "payment_verified":
            return "bg-blue-500";
        case "payment_submitted":
            return "bg-purple-500";
        case "cancelled":
            return "bg-red-500";
        case "pending_payment":
        default:
            return "bg-yellow-500";
    }
}

function getCreatedAtMillis(value?: Booking["createdAt"]) {
    if (!value) return 0;

    if (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof value.toMillis === "function"
    ) {
        return value.toMillis();
    }

    if (value instanceof Date) return value.getTime();

    if (typeof value === "string") {
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? 0 : time;
    }

    return 0;
}

export default function AdminBookingsPage() {
    const router = useRouter();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        setLoading(true);
        setError("");

        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(
            bookingsRef,
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
            bookingsQuery,
            (snapshot) => {
                const data = snapshot.docs.map(
                    (doc) =>
                        ({
                            id: doc.id,
                            ...doc.data(),
                        }) as Booking
                );

                setBookings(data);
                setLoading(false);
            },
            (err) => {
                console.error("Load bookings error:", err);

                setError(
                    err?.message ||
                    "ไม่สามารถโหลดข้อมูลการจองได้"
                );
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const filteredBookings = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return bookings.filter((booking) => {
            const name =
                booking.customer?.name?.toLowerCase() || "";
            const phone =
                booking.customer?.phone?.toLowerCase() || "";
            const email =
                booking.customer?.email?.toLowerCase() || "";
            const bookingId = booking.id.toLowerCase();

            const matchesSearch =
                !keyword ||
                name.includes(keyword) ||
                phone.includes(keyword) ||
                email.includes(keyword) ||
                bookingId.includes(keyword);

            const matchesStatus =
                statusFilter === "all" ||
                booking.bookingStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [bookings, search, statusFilter]);

    const statistics = useMemo(() => {
        return {
            total: bookings.length,
            pending: bookings.filter(
                (item) => item.bookingStatus === "pending_payment"
            ).length,
            submitted: bookings.filter(
                (item) => item.bookingStatus === "payment_submitted"
            ).length,
            confirmed: bookings.filter(
                (item) => item.bookingStatus === "confirmed"
            ).length,
        };
    }, [bookings]);

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
    };

    return (
        <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5 sm:py-7 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500 sm:text-sm">
                            KOKO Memory
                        </p>

                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            จัดการรายการจอง
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                            ดูและจัดการข้อมูลการจองทั้งหมดจากระบบ
                            <span className="ml-1 hidden sm:inline">
                                • ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีรายการใหม่
                            </span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="hidden rounded-full bg-green-50 px-3 py-2 text-xs font-medium text-green-700 sm:inline-flex">
                            <span className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-green-500" />
                            Realtime
                        </span>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            disabled={loading}
                            className="min-h-11 flex-1 rounded-xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5"
                        >
                            {loading ? "กำลังโหลด..." : "รีเฟรช"}
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs text-slate-500 sm:text-sm">
                            การจองทั้งหมด
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                            {statistics.total}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs text-slate-500 sm:text-sm">
                            รอชำระเงิน
                        </p>
                        <p className="mt-2 text-2xl font-bold text-yellow-500 sm:text-3xl">
                            {statistics.pending}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs text-slate-500 sm:text-sm">
                            ส่งหลักฐานแล้ว
                        </p>
                        <p className="mt-2 text-2xl font-bold text-purple-500 sm:text-3xl">
                            {statistics.submitted}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs text-slate-500 sm:text-sm">
                            ยืนยันแล้ว
                        </p>
                        <p className="mt-2 text-2xl font-bold text-green-500 sm:text-3xl">
                            {statistics.confirmed}
                        </p>
                    </div>
                </div>

                {/* Search / Filter */}
                <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                        <div>
                            <label
                                htmlFor="booking-search"
                                className="mb-2 block text-sm font-medium text-slate-700"
                            >
                                ค้นหาการจอง
                            </label>

                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    🔎
                                </span>

                                <input
                                    id="booking-search"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder="ชื่อ, เบอร์โทร, Email หรือ Booking ID"
                                    autoComplete="off"
                                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:text-base"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="booking-status"
                                className="mb-2 block text-sm font-medium text-slate-700"
                            >
                                สถานะ
                            </label>

                            <select
                                id="booking-status"
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value)
                                }
                                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:text-base"
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="pending_payment">
                                    รอชำระเงิน
                                </option>
                                <option value="payment_submitted">
                                    ส่งหลักฐานแล้ว
                                </option>
                                <option value="payment_verified">
                                    ตรวจสอบแล้ว
                                </option>
                                <option value="confirmed">
                                    ยืนยันแล้ว
                                </option>
                                <option value="cancelled">
                                    ยกเลิก
                                </option>
                            </select>
                        </div>
                    </div>

                    {(search || statusFilter !== "all") && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <p className="text-sm text-slate-500">
                                พบ{" "}
                                <span className="font-semibold text-slate-800">
                                    {filteredBookings.length}
                                </span>{" "}
                                รายการ
                            </p>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
                            >
                                ล้างตัวกรอง
                            </button>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 sm:p-5">
                        <p className="font-semibold">
                            ไม่สามารถโหลดรายการจองได้
                        </p>
                        <p className="mt-1 break-words text-sm leading-6">
                            {error}
                        </p>
                        <p className="mt-3 text-xs text-red-600">
                            หากขึ้นข้อความเกี่ยวกับ createdAt
                            ให้ตรวจสอบว่ารายการจองทุกตัวมีฟิลด์ createdAt
                        </p>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />
                        <p className="text-sm text-slate-500 sm:text-base">
                            กำลังโหลดรายการจอง...
                        </p>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && filteredBookings.length === 0 && (
                    <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-slate-100 sm:px-10 sm:py-16">
                        <div className="text-5xl">📋</div>

                        <h2 className="mt-4 text-xl font-bold text-slate-900">
                            ไม่พบรายการจอง
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            {bookings.length === 0
                                ? "ตอนนี้ยังไม่มีรายการจองในระบบ"
                                : "ไม่มีข้อมูลที่ตรงกับการค้นหา หรือตัวกรองที่เลือก"}
                        </p>

                        {(search || statusFilter !== "all") && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 min-h-11 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-600"
                            >
                                ดูรายการทั้งหมด
                            </button>
                        )}
                    </div>
                )}

                {/* Desktop / Tablet table */}
                {!loading &&
                    !error &&
                    filteredBookings.length > 0 && (
                        <>
                            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[980px]">
                                        <thead className="bg-slate-50">
                                            <tr className="text-left text-sm text-slate-500">
                                                <th className="px-5 py-4 font-semibold">
                                                    ลูกค้า
                                                </th>
                                                <th className="px-5 py-4 font-semibold">
                                                    วันที่จัดงาน
                                                </th>
                                                <th className="px-5 py-4 font-semibold">
                                                    ประเภทงาน
                                                </th>
                                                <th className="px-5 py-4 font-semibold">
                                                    แพ็กเกจ
                                                </th>
                                                <th className="px-5 py-4 font-semibold">
                                                    ราคา
                                                </th>
                                                <th className="px-5 py-4 font-semibold">
                                                    สถานะ
                                                </th>
                                                <th className="px-5 py-4 font-semibold">
                                                    Booking ID
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBookings.map((booking) => (
                                                <tr
                                                    key={booking.id}
                                                    className="transition hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-5">
                                                        <p className="font-semibold text-slate-900">
                                                            {booking.customer?.name ||
                                                                "ไม่ระบุชื่อ"}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {booking.customer?.phone ||
                                                                "-"}
                                                        </p>
                                                        <p className="max-w-[220px] truncate text-sm text-slate-400">
                                                            {booking.customer?.email ||
                                                                "-"}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <p className="font-medium text-slate-800">
                                                            {formatDate(
                                                                booking.event?.date
                                                            )}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <span className="inline-flex rounded-lg bg-pink-50 px-3 py-1 text-sm font-medium text-pink-600">
                                                            {getEventTypeLabel(
                                                                booking.event?.type
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <p className="max-w-[180px] truncate font-medium text-slate-800">
                                                            {booking.package?.name ||
                                                                "-"}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <p className="font-semibold text-slate-900">
                                                            {formatMoney(
                                                                booking.totalPrice ??
                                                                booking.package
                                                                    ?.price
                                                            )}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <span
                                                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                                                                booking.bookingStatus
                                                            )}`}
                                                        >
                                                            <span
                                                                className={`h-2 w-2 rounded-full ${getStatusDotClass(
                                                                    booking.bookingStatus
                                                                )}`}
                                                            />
                                                            {getStatusLabel(
                                                                booking.bookingStatus
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <code className="block max-w-[150px] truncate rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                                {booking.id}
                                                            </code>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/admin/bookings/${booking.id}`
                                                                    )
                                                                }
                                                                className="shrink-0 rounded-lg bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-600 transition hover:bg-pink-100 active:scale-[0.98]"
                                                            >
                                                                ดูรายละเอียด
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                                    แสดง {filteredBookings.length} รายการ
                                    จากทั้งหมด {bookings.length} รายการ
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="space-y-3 md:hidden">
                                {filteredBookings.map((booking) => (
                                    <article
                                        key={booking.id}
                                        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
                                    >
                                        <div className="border-b border-slate-100 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-bold text-slate-900">
                                                        {booking.customer?.name ||
                                                            "ไม่ระบุชื่อ"}
                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {booking.customer?.phone ||
                                                            "-"}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                                        booking.bookingStatus
                                                    )}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(
                                                            booking.bookingStatus
                                                        )}`}
                                                    />
                                                    {getStatusLabel(
                                                        booking.bookingStatus
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-px bg-slate-100">
                                            <div className="bg-white p-4">
                                                <p className="text-xs text-slate-400">
                                                    วันที่จัดงาน
                                                </p>
                                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                                    {formatDate(
                                                        booking.event?.date
                                                    )}
                                                </p>
                                            </div>

                                            <div className="bg-white p-4">
                                                <p className="text-xs text-slate-400">
                                                    ประเภทงาน
                                                </p>
                                                <p className="mt-1 text-sm font-semibold text-pink-600">
                                                    {getEventTypeLabel(
                                                        booking.event?.type
                                                    )}
                                                </p>
                                            </div>

                                            <div className="bg-white p-4">
                                                <p className="text-xs text-slate-400">
                                                    แพ็กเกจ
                                                </p>
                                                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                                                    {booking.package?.name ||
                                                        "-"}
                                                </p>
                                            </div>

                                            <div className="bg-white p-4">
                                                <p className="text-xs text-slate-400">
                                                    ราคา
                                                </p>
                                                <p className="mt-1 text-sm font-bold text-slate-900">
                                                    {formatMoney(
                                                        booking.totalPrice ??
                                                        booking.package?.price
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-400">
                                                        Booking ID
                                                    </p>
                                                    <code className="mt-1 block max-w-[180px] truncate text-xs text-slate-600">
                                                        {booking.id}
                                                    </code>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400">
                                                        ผู้ติดต่อ
                                                    </p>
                                                    <p className="mt-1 max-w-[120px] truncate text-xs text-slate-600">
                                                        {booking.customer?.email ||
                                                            booking.customer?.line ||
                                                            "-"}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(
                                                        `/admin/bookings/${booking.id}`
                                                    )
                                                }
                                                className="mt-3 min-h-11 w-full rounded-xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-600 active:scale-[0.99]"
                                            >
                                                ดูรายละเอียดการจอง →
                                            </button>
                                        </div>
                                    </article>
                                ))}

                                <div className="rounded-xl px-2 py-2 text-center text-xs text-slate-500">
                                    แสดง {filteredBookings.length} รายการ
                                    จากทั้งหมด {bookings.length} รายการ
                                </div>
                            </div>
                        </>
                    )}
            </div>
        </main>
    );
}
