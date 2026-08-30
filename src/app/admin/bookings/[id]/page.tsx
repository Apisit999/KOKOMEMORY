"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Booking = {
    id: string;

    bookingStatus?: string;
    bookingVersion?: number;

    createdAt?: Timestamp | string | Date | null;
    updatedAt?: Timestamp | string | Date | null;

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
        duration?: string;
    };

    totalPrice?: number;
    travelFee?: number;
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
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "-";
    }

    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value?: string) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
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

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function getStatusDot(status?: string) {
    switch (status) {
        case "confirmed":
            return "bg-green-500";

        case "payment_verified":
            return "bg-blue-500";

        case "payment_submitted":
            return "bg-purple-500";

        case "cancelled":
            return "bg-red-500";

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

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "string") {
        const time = new Date(value).getTime();

        return Number.isNaN(time) ? 0 : time;
    }

    return 0;
}

function formatCreatedAt(value?: Booking["createdAt"]) {
    const millis = getCreatedAtMillis(value);

    if (!millis) return "-";

    return new Date(millis).toLocaleString("th-TH", {
        dateStyle: "long",
        timeStyle: "short",
    });
}

function InfoItem({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                {value === undefined || value === null || value === ""
                    ? "-"
                    : value}
            </p>
        </div>
    );
}

export default function AdminBookingDetailPage() {
    const params = useParams();
    const router = useRouter();

    const id =
        typeof params?.id === "string"
            ? params.id
            : Array.isArray(params?.id)
                ? params.id[0]
                : "";

    const [booking, setBooking] = useState<Booking | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!id) return;

        let active = true;

        async function loadBooking() {
            try {
                setLoading(true);
                setError("");

                const bookingRef = doc(db, "bookings", id);

                const snapshot = await getDoc(bookingRef);

                if (!snapshot.exists()) {
                    throw new Error(
                        "ไม่พบรายการจองนี้ในระบบ"
                    );
                }

                const data = {
                    id: snapshot.id,
                    ...snapshot.data(),
                } as Booking;

                if (!active) return;

                setBooking(data);
                setStatus(data.bookingStatus || "pending_payment");
            } catch (err: any) {
                console.error(
                    "Load booking detail error:",
                    err
                );

                if (!active) return;

                setError(
                    err?.message ||
                    "ไม่สามารถโหลดรายละเอียดการจองได้"
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadBooking();

        return () => {
            active = false;
        };
    }, [id]);

    async function updateStatus() {
        if (!id || !booking) return;

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const bookingRef = doc(
                db,
                "bookings",
                id
            );

            await updateDoc(bookingRef, {
                bookingStatus: status,
                updatedAt: serverTimestamp(),
            });

            setBooking((previous) =>
                previous
                    ? {
                        ...previous,
                        bookingStatus: status,
                    }
                    : previous
            );

            setSuccess(
                "อัปเดตสถานะการจองเรียบร้อยแล้ว"
            );
        } catch (err: any) {
            console.error(
                "Update booking status error:",
                err
            );

            setError(
                err?.message ||
                "ไม่สามารถอัปเดตสถานะได้"
            );
        } finally {
            setSaving(false);
        }
    }

    async function copyBookingId() {
        if (!booking?.id) return;

        try {
            await navigator.clipboard.writeText(
                booking.id
            );

            setSuccess(
                "คัดลอก Booking ID แล้ว"
            );
        } catch {
            setError(
                "ไม่สามารถคัดลอก Booking ID ได้"
            );
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-10">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />

                        <p className="text-slate-500">
                            กำลังโหลดรายละเอียดการจอง...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error && !booking) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-10">
                <div className="mx-auto max-w-3xl">
                    <button
                        type="button"
                        onClick={() =>
                            router.push("/admin/bookings")
                        }
                        className="mb-5 text-sm font-semibold text-pink-600 hover:text-pink-700"
                    >
                        ← กลับรายการจอง
                    </button>

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        <h1 className="font-bold">
                            ไม่สามารถโหลดข้อมูล
                        </h1>

                        <p className="mt-2 break-words text-sm">
                            {error}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (!booking) {
        return null;
    }

    return (
        <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5 sm:py-7 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-6xl">

                {/* HEADER */}
                <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/admin/bookings"
                                )
                            }
                            className="mb-3 text-sm font-semibold text-pink-600 transition hover:text-pink-700"
                        >
                            ← กลับรายการจอง
                        </button>

                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-500">
                            KOKO Memory
                        </p>

                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            รายละเอียดการจอง
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            ตรวจสอบและจัดการข้อมูลการจอง
                        </p>
                    </div>

                    <div
                        className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                            booking.bookingStatus
                        )}`}
                    >
                        <span
                            className={`h-2.5 w-2.5 rounded-full ${getStatusDot(
                                booking.bookingStatus
                            )}`}
                        />

                        {STATUS_LABEL[
                            booking.bookingStatus || ""
                        ] || "ไม่ระบุ"}
                    </div>
                </div>

                {/* SUCCESS */}
                {success && (
                    <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        ✓ {success}
                    </div>
                )}

                {/* ERROR */}
                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

                    {/* LEFT */}
                    <div className="space-y-5">

                        {/* CUSTOMER */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                    Customer
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    ข้อมูลลูกค้า
                                </h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="ชื่อ - นามสกุล"
                                    value={
                                        booking.customer?.name
                                    }
                                />

                                <InfoItem
                                    label="เบอร์โทรศัพท์"
                                    value={
                                        booking.customer?.phone
                                    }
                                />

                                <InfoItem
                                    label="Email"
                                    value={
                                        booking.customer?.email
                                    }
                                />

                                <InfoItem
                                    label="LINE ID"
                                    value={
                                        booking.customer?.line
                                    }
                                />
                            </div>
                        </section>

                        {/* EVENT */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                    Event
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    รายละเอียดงาน
                                </h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="วันที่จัดงาน"
                                    value={formatDate(
                                        booking.event?.date
                                    )}
                                />

                                <InfoItem
                                    label="ประเภทงาน"
                                    value={
                                        EVENT_TYPE_LABEL[
                                        booking.event?.type ||
                                        ""
                                        ] ||
                                        booking.event?.type ||
                                        "-"
                                    }
                                />

                                <InfoItem
                                    label="จำนวนแขกโดยประมาณ"
                                    value={
                                        booking.event?.guests
                                            ? `${booking.event.guests} คน`
                                            : "-"
                                    }
                                />

                                <InfoItem
                                    label="สถานที่"
                                    value={
                                        booking.event?.location
                                    }
                                />

                                <InfoItem
                                    label="จังหวัด"
                                    value={
                                        booking.event?.province
                                    }
                                />

                                <InfoItem
                                    label="เขต / อำเภอ"
                                    value={
                                        booking.event?.district
                                    }
                                />

                                <InfoItem
                                    label="แขวง / ตำบล"
                                    value={
                                        booking.event?.subdistrict
                                    }
                                />

                                <InfoItem
                                    label="รหัสไปรษณีย์"
                                    value={
                                        booking.event?.postcode
                                    }
                                />
                            </div>
                        </section>

                        {/* PACKAGE */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <div className="mb-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                    Package
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    แพ็กเกจและราคา
                                </h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoItem
                                    label="แพ็กเกจ"
                                    value={
                                        booking.package?.name
                                    }
                                />

                                <InfoItem
                                    label="ระยะเวลา"
                                    value={
                                        booking.package?.duration
                                    }
                                />

                                <InfoItem
                                    label="ราคาแพ็กเกจ"
                                    value={formatMoney(
                                        booking.package?.price
                                    )}
                                />

                                <InfoItem
                                    label="ค่าเดินทาง"
                                    value={formatMoney(
                                        booking.travelFee
                                    )}
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between rounded-xl bg-pink-50 p-5">
                                <div>
                                    <p className="text-sm text-slate-500">
                                        ยอดรวม
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-pink-600">
                                        {formatMoney(
                                            booking.totalPrice ??
                                            booking.package?.price
                                        )}
                                    </p>
                                </div>

                                <span className="text-3xl">
                                    💰
                                </span>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT */}
                    <aside className="space-y-5">

                        {/* STATUS */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                Booking Status
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                                จัดการสถานะ
                            </h2>

                            <div className="mt-5">
                                <label
                                    htmlFor="booking-status"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    สถานะการจอง
                                </label>

                                <select
                                    id="booking-status"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(
                                            e.target.value
                                        )
                                    }
                                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:bg-white focus:ring-2 focus:ring-pink-100"
                                >
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

                                <button
                                    type="button"
                                    onClick={updateStatus}
                                    disabled={
                                        saving ||
                                        status ===
                                        booking.bookingStatus
                                    }
                                    className="mt-3 min-h-12 w-full rounded-xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving
                                        ? "กำลังบันทึก..."
                                        : "บันทึกสถานะ"}
                                </button>
                            </div>
                        </section>

                        {/* BOOKING ID */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                Booking ID
                            </p>

                            <h2 className="mt-1 text-lg font-bold text-slate-900">
                                รหัสรายการจอง
                            </h2>

                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                <code className="block break-all text-xs leading-5 text-slate-600">
                                    {booking.id}
                                </code>
                            </div>

                            <button
                                type="button"
                                onClick={copyBookingId}
                                className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                📋 คัดลอก Booking ID
                            </button>
                        </section>

                        {/* CREATED */}
                        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                                System
                            </p>

                            <div className="mt-4 space-y-4">
                                <div>
                                    <p className="text-xs text-slate-400">
                                        สร้างรายการเมื่อ
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {formatCreatedAt(
                                            booking.createdAt
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">
                                        เวอร์ชันรายการ
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-700">
                                        {booking.bookingVersion ??
                                            1}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
}