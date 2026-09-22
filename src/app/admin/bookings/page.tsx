"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { adminApiFetch } from "@/lib/admin-api-client";


/* ============================================================
   TYPE
============================================================ */

type Booking = {
    id: string;

    bookingStatus?: string;
    archiveStatus?: "active" | "archived";
    archivedAt?: Timestamp | string | Date | null;
    bookingVersion?: number;

    payment?: {
        status?: string | null;
        paidAmount?: number | null;
        paidAt?: Timestamp | string | Date | null;
        submittedAt?: Timestamp | string | Date | null;
        verifiedAt?: Timestamp | string | Date | null;
        proofUrl?: string | null;
    };

    paymentStatus?: string;
    paymentId?: string;
    paymentAmount?: number;
    paidAmount?: number;

    archived?: boolean;

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
    };

    totalPrice?: number;
};


/* ============================================================
   STATUS
============================================================ */

const STATUS_LABEL: Record<string, string> = {
    pending_payment: "รอชำระเงิน",
    payment_submitted: "ส่งหลักฐานแล้ว",
    payment_verified: "ตรวจสอบแล้ว",
    confirmed: "ยืนยันแล้ว",
    completed: "เสร็จแล้ว",
    cancelled: "ยกเลิก",
    expired: "หมดอายุ",
};

type BookingView = "active" | "completed" | "cancelled" | "archived" | "all";


/* ============================================================
   EVENT TYPE
============================================================ */

const EVENT_TYPE_LABEL: Record<string, string> = {
    wedding: "งานแต่งงาน",
    birthday: "วันเกิด",
    corporate: "งานบริษัท",
    graduation: "งานรับปริญญา",
    party: "งานเลี้ยง",
    other: "อื่น ๆ",
};


/* ============================================================
   HELPERS
============================================================ */

function normalizeStatus(
    value?: string | null
) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


/* ============================================================
   PAYMENT
   ------------------------------------------------------------
   ถ้ามีหลักฐานการจ่าย / เงิน / verified
   จะไม่อนุญาตให้ลบถาวร
============================================================ */

function getPaidAmount(
    booking: Booking
) {
    const values = [
        booking.payment?.paidAmount,
        booking.paidAmount,
        booking.paymentAmount,
    ];

    for (const value of values) {
        if (
            typeof value === "number" &&
            Number.isFinite(value) &&
            value > 0
        ) {
            return value;
        }
    }

    return 0;
}


function hasPaymentProtection(
    booking: Booking
) {
    const paymentStatus =
        normalizeStatus(
            booking.payment?.status
        );

    const flatPaymentStatus =
        normalizeStatus(
            booking.paymentStatus
        );

    const bookingStatus =
        normalizeStatus(
            booking.bookingStatus
        );

    return (
        paymentStatus === "submitted" ||
        paymentStatus ===
            "pending_verification" ||
        paymentStatus === "verified" ||
        paymentStatus === "paid" ||
        flatPaymentStatus === "submitted" ||
        flatPaymentStatus ===
            "pending_verification" ||
        flatPaymentStatus === "verified" ||
        flatPaymentStatus === "paid" ||
        bookingStatus ===
            "payment_submitted" ||
        bookingStatus ===
            "payment_verified" ||
        bookingStatus === "confirmed" ||
        Boolean(
            booking.paymentId
        ) ||
        Boolean(
            booking.payment?.proofUrl
        ) ||
        Boolean(
            booking.payment?.paidAt
        ) ||
        Boolean(
            booking.payment?.submittedAt
        ) ||
        Boolean(
            booking.payment?.verifiedAt
        ) ||
        getPaidAmount(booking) > 0
    );
}


/* ============================================================
   DELETE PERMISSION
   ------------------------------------------------------------
   ลบถาวรได้เฉพาะข้อมูลที่ยังไม่มี Payment
   และอยู่ในสถานะที่ปลอดภัยสำหรับ Test
============================================================ */

function canDeleteBooking(
    booking: Booking
) {
    if (
        hasPaymentProtection(
            booking
        )
    ) {
        return false;
    }

    const status =
        normalizeStatus(
            booking.bookingStatus
        );

    return (
        status === "" ||
        status === "pending_payment" ||
        status === "cancelled" ||
        status === "canceled"
    );
}


function getDeleteBlockReason(
    booking: Booking
) {
    if (
        hasPaymentProtection(
            booking
        )
    ) {
        return "รายการนี้มีข้อมูลการชำระเงินหรือหลักฐานการชำระเงินแล้ว จึงไม่อนุญาตให้ลบถาวร";
    }

    const status =
        normalizeStatus(
            booking.bookingStatus
        );

    if (
        status !== "" &&
        status !== "pending_payment" &&
        status !== "cancelled" &&
        status !== "canceled"
    ) {
        return "สถานะของ Booking นี้ไม่อนุญาตให้ลบถาวร";
    }

    return "";
}


/* ============================================================
   FORMAT MONEY
============================================================ */

function formatMoney(
    value?: number
) {
    if (
        typeof value !== "number" ||
        Number.isNaN(value)
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
    ).format(value);
}


/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
    value?: string
) {
    if (!value) {
        return "-";
    }

    const date =
        new Date(
            `${value}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
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


/* ============================================================
   STATUS LABEL
============================================================ */

function getStatusLabel(
    status?: string
) {
    if (!status) {
        return "ไม่ระบุ";
    }

    return (
        STATUS_LABEL[
            status
        ] || status
    );
}


/* ============================================================
   EVENT TYPE LABEL
============================================================ */

function getEventTypeLabel(
    type?: string
) {
    if (!type) {
        return "-";
    }

    return (
        EVENT_TYPE_LABEL[
            type
        ] || type
    );
}


/* ============================================================
   STATUS CLASS
============================================================ */

function getStatusClass(
    status?: string
) {
    switch (status) {
        case "confirmed":
            return "bg-green-100 text-green-700";

        case "completed":
            return "bg-slate-100 text-slate-700";

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


/* ============================================================
   STATUS DOT
============================================================ */

function getStatusDotClass(
    status?: string
) {
    switch (status) {
        case "confirmed":
            return "bg-green-500";

        case "completed":
            return "bg-slate-500";

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


/* ============================================================
   CREATED AT
============================================================ */

function getCreatedAtMillis(
    value?: Booking["createdAt"]
) {
    if (!value) {
        return 0;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toMillis" in value &&
        typeof value.toMillis ===
            "function"
    ) {
        return value.toMillis();
    }

    if (
        value instanceof Date
    ) {
        return value.getTime();
    }

    if (
        typeof value === "string"
    ) {
        const time =
            new Date(value).getTime();

        return Number.isNaN(
            time
        )
            ? 0
            : time;
    }

    return 0;
}


/* ============================================================
   MAIN
============================================================ */

export default function AdminBookingsPage() {
    const router =
        useRouter();

    const [
        bookings,
        setBookings,
    ] = useState<Booking[]>(
        []
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState("");

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState("all");

    const [
        bookingView,
        setBookingView,
    ] = useState<BookingView>("active");


    /* ========================================================
       DELETE STATE
    ======================================================== */

    const [
        deleteTarget,
        setDeleteTarget,
    ] = useState<Booking | null>(
        null
    );

    const [
        deleteConfirmText,
        setDeleteConfirmText,
    ] = useState("");

    const [
        deleteLoading,
        setDeleteLoading,
    ] = useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState("");

    const [
        deleteSuccess,
        setDeleteSuccess,
    ] = useState("");
    const [archiveLoading, setArchiveLoading] = useState("");


    /* ========================================================
       LOAD BOOKINGS
       --------------------------------------------------------
       Realtime Firestore
    ======================================================== */

    useEffect(() => {
        setLoading(true);
        setError("");

        let cancelled = false;

        void adminApiFetch<{ bookings?: Booking[] }>(`/api/admin/booking?view=${bookingView}`)
            .then((result) => {
                if (cancelled) return;
                setBookings(result.bookings || []);
                setLoading(false);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                console.error("Load bookings error:", err);
                setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลการจองได้");
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [bookingView]);


    /* ========================================================
       FILTER
    ======================================================== */

    const filteredBookings =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return bookings.filter(
                (booking) => {
                    const name =
                        booking.customer?.name?.toLowerCase() ||
                        "";

                    const phone =
                        booking.customer?.phone?.toLowerCase() ||
                        "";

                    const email =
                        booking.customer?.email?.toLowerCase() ||
                        "";

                    const bookingId =
                        booking.id.toLowerCase();

                    const matchesSearch =
                        !keyword ||
                        name.includes(
                            keyword
                        ) ||
                        phone.includes(
                            keyword
                        ) ||
                        email.includes(
                            keyword
                        ) ||
                        bookingId.includes(
                            keyword
                        );

                    const isArchived = booking.archiveStatus === "archived";
                    const matchesView =
                        bookingView === "all" ||
                        (bookingView === "archived" && isArchived) ||
                        (bookingView === "completed" && booking.bookingStatus === "completed" && !isArchived) ||
                        (bookingView === "cancelled" && booking.bookingStatus === "cancelled") ||
                        (bookingView === "active" && !isArchived && booking.bookingStatus !== "completed" && booking.bookingStatus !== "cancelled");
                    const matchesStatus =
                        (statusFilter === "all" || booking.bookingStatus === statusFilter) &&
                        matchesView;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );
    }, [
        bookings,
        bookingView,
        search,
            statusFilter,
    ]);

    async function handleArchive(booking: Booking) {
        const archived = booking.archiveStatus === "archived";
        if (normalizeStatus(booking.bookingStatus) !== "completed") return;
        if (!window.confirm(archived ? "นำรายการนี้ออกจากประวัติหรือไม่?" : "เก็บรายการนี้เข้าประวัติหรือไม่?")) return;
        setArchiveLoading(booking.id);
        try {
            const user = getAuth().currentUser;
            if (!user) throw new Error("UNAUTHORIZED");
            const token = await user.getIdToken();
            const response = await fetch(`/api/admin/booking/${encodeURIComponent(booking.id)}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: archived ? "restore" : "archive" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "ARCHIVE_FAILED");
            setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, archiveStatus: archived ? "active" : "archived" } : item));
        } catch (error) {
            setError(error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนสถานะ Archive ได้");
        } finally {
            setArchiveLoading("");
        }
    }


    /* ========================================================
       STATISTICS
    ======================================================== */

    const statistics =
        useMemo(() => {
            return {
                total:
                    bookings.length,

                pending:
                    bookings.filter(
                        (item) =>
                            item.bookingStatus ===
                            "pending_payment"
                    ).length,

                submitted:
                    bookings.filter(
                        (item) =>
                            item.bookingStatus ===
                            "payment_submitted"
                    ).length,

                confirmed:
                    bookings.filter(
                        (item) =>
                            item.bookingStatus ===
                            "confirmed"
                    ).length,

                completed:
                    bookings.filter(
                        (item) => item.bookingStatus === "completed"
                    ).length,
            };
        }, [
            bookings,
        ]);


    /* ========================================================
       OPEN DELETE
    ======================================================== */

    const openDeleteDialog =
        (
            booking: Booking
        ) => {
            setDeleteSuccess("");
            setDeleteError("");
            setDeleteConfirmText("");

            if (
                !canDeleteBooking(
                    booking
                )
            ) {
                setDeleteError(
                    getDeleteBlockReason(
                        booking
                    )
                );

                return;
            }

            setDeleteTarget(
                booking
            );
        };


    /* ========================================================
       CLOSE DELETE
    ======================================================== */

    const closeDeleteDialog =
        () => {
            if (
                deleteLoading
            ) {
                return;
            }

            setDeleteTarget(
                null
            );

            setDeleteConfirmText(
                ""
            );

            setDeleteError(
                ""
            );
        };


    /* ========================================================
       DELETE BOOKING
       --------------------------------------------------------
       IMPORTANT:
       ไม่ใช้ deleteDoc()
       ไม่ใช้ runTransaction() จาก Client

       ใช้ Admin API
       ======================================================== */

    const handleDeleteBooking =
        async () => {
            if (
                !deleteTarget ||
                deleteLoading
            ) {
                return;
            }

            const confirmation =
                deleteConfirmText
                    .trim()
                    .toUpperCase();

            if (
                confirmation !==
                "DELETE"
            ) {
                setDeleteError(
                    'กรุณาพิมพ์ "DELETE" เพื่อยืนยันการลบ'
                );

                return;
            }

            /*
             * ตรวจ UI ก่อนส่ง
             */
            if (
                !canDeleteBooking(
                    deleteTarget
                )
            ) {
                setDeleteError(
                    getDeleteBlockReason(
                        deleteTarget
                    )
                );

                return;
            }

            setDeleteLoading(
                true
            );

            setDeleteError(
                ""
            );

            try {
                /*
                 * Firebase Auth
                 */
                const auth =
                    getAuth();

                const currentUser =
                    auth.currentUser;

                if (
                    !currentUser
                ) {
                    throw new Error(
                        "กรุณาเข้าสู่ระบบ Admin ใหม่ก่อนลบข้อมูล"
                    );
                }

                /*
                 * ขอ ID Token
                 */
                const token =
                    await currentUser.getIdToken(
                        true
                    );

                /*
                 * เรียก Admin API
                 *
                 * ตรงกับ:
                 *
                 * src/app/api/admin/booking/[id]/route.ts
                 */
                const response =
                    await fetch(
                        `/api/admin/booking/${encodeURIComponent(
                            deleteTarget.id
                        )}`,
                        {
                            method:
                                "DELETE",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,

                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify(
                                    {
                                        confirmation:
                                            "DELETE",
                                    }
                                ),

                            cache:
                                "no-store",
                        }
                    );


                /* =================================================
                   ป้องกัน <!DOCTYPE>
                   ================================================= */

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                let result: {
                    success?: boolean;
                    error?: string;
                    code?: string;
                } = {};

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {
                    result =
                        (await response.json()) as {
                            success?: boolean;
                            error?: string;
                            code?: string;
                        };
                } else {
                    const text =
                        await response.text();

                    console.error(
                        "Admin Delete API returned non-JSON:",
                        text.slice(
                            0,
                            1000
                        )
                    );

                    throw new Error(
                        "Admin API ไม่สามารถตอบกลับเป็น JSON ได้ กรุณาตรวจสอบ Terminal ของ Next.js และตรวจว่าไฟล์ route.ts อยู่ที่ src/app/api/admin/booking/[id]/route.ts"
                    );
                }


                /* =================================================
                   API ERROR
                   ================================================= */

                if (
                    !response.ok
                ) {
                    throw new Error(
                        result.error ||
                            `ไม่สามารถลบรายการจองได้ (${response.status})`
                    );
                }


                /* =================================================
                   SUCCESS
                   ================================================= */

                setBookings(
                    (current) =>
                        current.filter(
                            (booking) =>
                                booking.id !==
                                deleteTarget.id
                        )
                );

                setDeleteSuccess(
                    `ลบรายการ ${deleteTarget.id} เรียบร้อยแล้ว`
                );

                setDeleteTarget(
                    null
                );

                setDeleteConfirmText(
                    ""
                );

                setDeleteError(
                    ""
                );
            } catch (
                deleteException
            ) {
                console.error(
                    "Delete booking error:",
                    deleteException
                );

                setDeleteError(
                    deleteException instanceof
                        Error
                        ? deleteException.message
                        : "ไม่สามารถลบรายการจองได้"
                );
            } finally {
                setDeleteLoading(
                    false
                );
            }
        };


    /* ========================================================
       CLEAR FILTER
    ======================================================== */

    const clearFilters =
        () => {
            setSearch("");
            setStatusFilter(
                "all"
            );
        };


    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <main className="bg-slate-50 px-3 py-5 sm:px-5 sm:py-7 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-7xl">

                {/* =================================================
                    HEADER
                ================================================= */}

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
                    </div>
                </div>


                {/* =================================================
                    STATISTICS
                ================================================= */}

                <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs font-medium text-slate-400">
                            การจองทั้งหมด
                        </p>

                        <p className="mt-2 text-2xl font-black text-slate-900">
                            {statistics.total}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs font-medium text-slate-400">
                            รอชำระเงิน
                        </p>

                        <p className="mt-2 text-2xl font-black text-yellow-500">
                            {statistics.pending}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs font-medium text-slate-400">
                            ส่งหลักฐานแล้ว
                        </p>

                        <p className="mt-2 text-2xl font-black text-purple-500">
                            {statistics.submitted}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                        <p className="text-xs font-medium text-slate-400">
                            ยืนยันแล้ว
                        </p>

                        <p className="mt-2 text-2xl font-black text-green-500">
                            {statistics.confirmed}
                        </p>
                    </div>
                </div>


                <section className="mb-4 flex flex-wrap gap-2" aria-label="Booking views">
                    {([
                        ["active", "Active"],
                        ["completed", "Completed"],
                        ["cancelled", "Cancelled"],
                        ["archived", "Archived"],
                        ["all", "All"],
                    ] as const).map(([view, label]) => (
                        <button
                            key={view}
                            type="button"
                            onClick={() => {
                                setBookingView(view);
                                setStatusFilter("all");
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                bookingView === view
                                    ? "bg-pink-500 text-white shadow-sm"
                                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-pink-50 hover:text-pink-600"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </section>

                {/* =================================================
                    SEARCH / FILTER
                ================================================= */}

                <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">

                        <div>
                            <label
                                htmlFor="booking-search"
                                className="mb-2 block text-xs font-semibold text-slate-500"
                            >
                                ค้นหาการจอง
                            </label>

                            <input
                                id="booking-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="ค้นหาชื่อ, เบอร์โทร, Email หรือ Booking ID"
                                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="booking-status"
                                className="mb-2 block text-xs font-semibold text-slate-500"
                            >
                                สถานะ
                            </label>

                            <select
                                id="booking-status"
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                                }
                                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                            >
                                <option value="all">
                                    ทุกสถานะ
                                </option>

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

                    {(search ||
                        statusFilter !==
                            "all") && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <p className="text-sm text-slate-500">
                                พบ{" "}
                                <span className="font-semibold text-slate-800">
                                    {
                                        filteredBookings.length
                                    }
                                </span>{" "}
                                รายการ
                            </p>

                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
                            >
                                ล้างตัวกรอง
                            </button>
                        </div>
                    )}
                </section>


                {/* =================================================
                    DELETE SUCCESS
                ================================================= */}

                {deleteSuccess && (
                    <div
                        role="status"
                        className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 sm:p-5"
                    >
                        <div>
                            <p className="font-semibold">
                                ลบข้อมูลสำเร็จ
                            </p>

                            <p className="mt-1 text-sm">
                                {
                                    deleteSuccess
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setDeleteSuccess(
                                    ""
                                )
                            }
                            className="shrink-0 text-xs font-semibold text-green-700 hover:text-green-900"
                        >
                            ปิด
                        </button>
                    </div>
                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                        <p className="font-semibold">
                            ไม่สามารถโหลดข้อมูลการจองได้
                        </p>

                        <p className="mt-1 break-words">
                            {error}
                        </p>
                    </div>
                )}


                {/* =================================================
                    LOADING
                ================================================= */}

                {loading && (
                    <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />

                        <p className="mt-4 text-sm text-slate-500">
                            กำลังโหลดรายการจอง...
                        </p>
                    </div>
                )}


                {/* =================================================
                    EMPTY
                ================================================= */}

                {!loading &&
                    !error &&
                    filteredBookings.length ===
                        0 && (
                        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 sm:p-14">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                📋
                            </div>

                            <h2 className="mt-5 text-lg font-bold text-slate-900">
                                ไม่พบรายการจอง
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {bookings.length ===
                                0
                                    ? "ตอนนี้ยังไม่มีรายการจองในระบบ"
                                    : "ไม่มีข้อมูลที่ตรงกับการค้นหา หรือตัวกรองที่เลือก"}
                            </p>

                            {(search ||
                                statusFilter !==
                                    "all") && (
                                <button
                                    type="button"
                                    onClick={
                                        clearFilters
                                    }
                                    className="mt-5 min-h-11 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-600"
                                >
                                    ดูรายการทั้งหมด
                                </button>
                            )}
                        </div>
                    )}


                {/* =================================================
                    DESKTOP TABLE
                ================================================= */}

                {!loading &&
                    !error &&
                    filteredBookings.length >
                        0 && (
                        <>
                            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1180px]">
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

                                                <th className="px-5 py-4 font-semibold">
                                                    จัดการ
                                                </th>

                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBookings.map(
                                                (
                                                    booking
                                                ) => (
                                                    <tr
                                                        key={
                                                            booking.id
                                                        }
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
                                                                    booking
                                                                        .event
                                                                        ?.date
                                                                )}
                                                            </p>
                                                        </td>


                                                        <td className="px-5 py-5">
                                                            <span className="inline-flex rounded-lg bg-pink-50 px-3 py-1 text-sm font-medium text-pink-600">
                                                                {getEventTypeLabel(
                                                                    booking
                                                                        .event
                                                                        ?.type
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
                                                                        booking
                                                                            .package
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
                                                                {booking.archiveStatus === "archived" && (
                                                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Archived</span>
                                                                )}
                                                            </span>
                                                        </td>


                                                        <td className="px-5 py-5">
                                                            <div className="flex items-center gap-2">
                                                                <code className="block max-w-[150px] truncate rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                                    {
                                                                        booking.id
                                                                    }
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


                                                        <td className="px-5 py-5">
                                                            {normalizeStatus(booking.bookingStatus) === "completed" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={archiveLoading === booking.id}
                                                                    onClick={() => void handleArchive(booking)}
                                                                    className="mr-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                                                                >
                                                                    {archiveLoading === booking.id ? "กำลังบันทึก..." : booking.archiveStatus === "archived" ? "นำออกจาก Archive" : "Archive"}
                                                                </button>
                                                            )}
                                                            {canDeleteBooking(
                                                                booking
                                                            ) ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openDeleteDialog(
                                                                            booking
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.98]"
                                                                >
                                                                    ลบข้อมูล
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    title={getDeleteBlockReason(
                                                                        booking
                                                                    )}
                                                                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400"
                                                                >
                                                                    🔒 ป้องกันการลบ
                                                                </span>
                                                            )}
                                                        </td>

                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                                    แสดง{" "}
                                    {
                                        filteredBookings.length
                                    }{" "}
                                    รายการ
                                    จากทั้งหมด{" "}
                                    {
                                        bookings.length
                                    }{" "}
                                    รายการ
                                </div>
                            </div>


                            {/* =================================================
                                MOBILE CARDS
                            ================================================= */}

                            <div className="space-y-3 md:hidden">
                                {filteredBookings.map(
                                    (
                                        booking
                                    ) => (
                                        <article
                                            key={
                                                booking.id
                                            }
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
                                                        {booking.archiveStatus === "archived" && <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Archived</span>}
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

                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
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
                                                                booking
                                                                    .package
                                                                    ?.price
                                                        )}
                                                    </p>
                                                </div>

                                            </div>


                                            <div className="flex flex-col gap-2 p-4 sm:flex-row">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.push(
                                                            `/admin/bookings/${booking.id}`
                                                        )
                                                    }
                                                    className="min-h-11 flex-1 rounded-xl bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-600 transition hover:bg-pink-100"
                                                >
                                                    ดูรายละเอียด
                                                </button>

                                                {normalizeStatus(booking.bookingStatus) === "completed" && (
                                                    <button type="button" disabled={archiveLoading === booking.id} onClick={() => void handleArchive(booking)} className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50">
                                                        {booking.archiveStatus === "archived" ? "นำออกจาก Archive" : "Archive"}
                                                    </button>
                                                )}


                                                {canDeleteBooking(
                                                    booking
                                                ) ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDeleteDialog(
                                                                booking
                                                            )
                                                        }
                                                        className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                                    >
                                                        🗑️ ลบข้อมูล
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        title={getDeleteBlockReason(
                                                            booking
                                                        )}
                                                        className="min-h-11 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"
                                                    >
                                                        🔒 ป้องกันการลบ
                                                    </button>
                                                )}

                                            </div>


                                            <div className="border-t border-slate-100 px-4 py-3">
                                                <code className="block truncate text-xs text-slate-400">
                                                    {
                                                        booking.id
                                                    }
                                                </code>
                                            </div>

                                        </article>
                                    )
                                )}
                            </div>

                        </>
                    )}


                {/* =================================================
                    DELETE CONFIRMATION MODAL
                ================================================= */}

                {deleteTarget && (
                    <div
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                        onClick={() => {
                            if (
                                !deleteLoading
                            ) {
                                closeDeleteDialog();
                            }
                        }}
                    >
                        <div
                            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            {/* HEADER */}

                            <div className="border-b border-red-100 bg-red-50 px-5 py-5 sm:px-7 sm:py-6">
                                <div className="flex items-start gap-4">

                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl">
                                        ⚠️
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                                            Permanent Delete
                                        </p>

                                        <h2 className="mt-1 text-xl font-bold text-red-900 sm:text-2xl">
                                            ลบข้อมูลการจอง?
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-red-700">
                                            การลบนี้เป็นการลบถาวรสำหรับข้อมูลทดสอบ
                                            กรุณาตรวจสอบข้อมูลก่อนยืนยัน
                                        </p>
                                    </div>

                                </div>
                            </div>


                            {/* BODY */}

                            <div className="space-y-5 p-5 sm:p-7">

                                {/* BOOKING INFO */}

                                <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            ลูกค้า
                                        </p>

                                        <p className="mt-1 break-words text-sm font-bold text-slate-900">
                                            {deleteTarget.customer?.name ||
                                                "ไม่ระบุชื่อ"}
                                        </p>
                                    </div>


                                    <div>
                                        <p className="text-xs text-slate-400">
                                            วันที่จัดงาน
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {formatDate(
                                                deleteTarget.event?.date
                                            )}
                                        </p>
                                    </div>


                                    <div>
                                        <p className="text-xs text-slate-400">
                                            แพ็กเกจ
                                        </p>

                                        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                                            {deleteTarget.package?.name ||
                                                "-"}
                                        </p>
                                    </div>


                                    <div>
                                        <p className="text-xs text-slate-400">
                                            ราคา
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-slate-900">
                                            {formatMoney(
                                                deleteTarget.totalPrice ??
                                                    deleteTarget.package
                                                        ?.price
                                            )}
                                        </p>
                                    </div>


                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-slate-400">
                                            Booking ID
                                        </p>

                                        <code className="mt-1 block break-all text-xs leading-5 text-slate-600">
                                            {
                                                deleteTarget.id
                                            }
                                        </code>
                                    </div>

                                </div>


                                {/* SAFETY NOTICE */}

                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="font-bold text-amber-800">
                                        ก่อนลบ ระบบจะตรวจสอบข้อมูลล่าสุดอีกครั้ง
                                    </p>

                                    <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-700">
                                        <li>
                                            • ตรวจสอบสถานะการชำระเงินจาก Firestore
                                        </li>

                                        <li>
                                            • ตรวจสอบว่า Booking ยังเป็นรายการที่ลบได้
                                        </li>

                                        <li>
                                            • ตรวจสอบ Date Lock ก่อนลบ
                                        </li>

                                        <li>
                                            • ถ้าพบว่ามีการชำระเงิน ระบบจะหยุดทันที
                                        </li>
                                    </ul>
                                </div>


                                {/* CONFIRM INPUT */}

                                <div>
                                    <label
                                        htmlFor="delete-confirm"
                                        className="block text-sm font-bold text-slate-800"
                                    >
                                        พิมพ์{" "}
                                        <span className="text-red-600">
                                            DELETE
                                        </span>{" "}
                                        เพื่อยืนยัน
                                    </label>

                                    <input
                                        id="delete-confirm"
                                        value={
                                            deleteConfirmText
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setDeleteConfirmText(
                                                event
                                                    .target
                                                    .value
                                            );

                                            setDeleteError(
                                                ""
                                            );
                                        }}
                                        autoComplete="off"
                                        autoFocus
                                        disabled={
                                            deleteLoading
                                        }
                                        placeholder="DELETE"
                                        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] outline-none transition placeholder:font-normal placeholder:tracking-normal focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-slate-100"
                                    />
                                </div>


                                {/* DELETE ERROR */}

                                {deleteError && (
                                    <div
                                        role="alert"
                                        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                                    >
                                        {
                                            deleteError
                                        }
                                    </div>
                                )}


                                {/* BUTTONS */}

                                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                                    <button
                                        type="button"
                                        onClick={
                                            closeDeleteDialog
                                        }
                                        disabled={
                                            deleteLoading
                                        }
                                        className="min-h-12 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        ยกเลิก
                                    </button>


                                    <button
                                        type="button"
                                        onClick={
                                            handleDeleteBooking
                                        }
                                        disabled={
                                            deleteLoading ||
                                            deleteConfirmText
                                                .trim()
                                                .toUpperCase() !==
                                                "DELETE"
                                        }
                                        className="min-h-12 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {deleteLoading
                                            ? "กำลังตรวจสอบและลบ..."
                                            : "ยืนยันลบถาวร"}
                                    </button>

                                </div>

                            </div>

                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
