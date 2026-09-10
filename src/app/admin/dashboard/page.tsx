"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
    onAuthStateChanged,
    signOut,
    User,
} from "firebase/auth";

import {
    collection,
    getDocs,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";

import {
    CalendarDays,
    CreditCard,
    Image as ImageIcon,
    Settings,
    Users,
    Clock3,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowRight,
    LogOut,
    Loader2,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";


/* =========================================================
   TYPES
========================================================= */

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


/* =========================================================
   STATUS
========================================================= */

const STATUS_LABEL: Record<string, string> = {
    pending_payment: "รอชำระเงิน",
    payment_submitted: "ส่งหลักฐานแล้ว",
    payment_verified: "ตรวจสอบแล้ว",
    confirmed: "ยืนยันแล้ว",
    cancelled: "ยกเลิก",
};


/* =========================================================
   HELPERS
========================================================= */

function getTimestampMillis(
    value?: Booking["createdAt"]
) {
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


function formatMoney(value: number) {
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
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}


/* =========================================================
   COMPONENT
========================================================= */

export default function AdminDashboardPage() {

    const router = useRouter();

    const [user, setUser] = useState<User | null>(null);

    const [checking, setChecking] = useState(true);

    const [bookings, setBookings] = useState<Booking[]>([]);

    const [loadingBookings, setLoadingBookings] =
        useState(true);


    /* =====================================================
       AUTH
    ===================================================== */

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(
            auth,
            async (currentUser) => {

                if (!currentUser) {
                    router.replace("/admin/login");
                    return;
                }

                setUser(currentUser);

                setChecking(false);

            }
        );

        return () => unsubscribe();

    }, [router]);


    /* =====================================================
       LOAD BOOKINGS
    ===================================================== */

    useEffect(() => {

        if (!user) return;

        async function loadBookings() {

            try {

                setLoadingBookings(true);

                const bookingsRef =
                    collection(db, "bookings");

                const bookingsQuery = query(
                    bookingsRef,
                    orderBy("createdAt", "desc")
                );

                const snapshot =
                    await getDocs(bookingsQuery);

                const data: Booking[] =
                    snapshot.docs.map((item) => ({
                        id: item.id,
                        ...item.data(),
                    }));

                setBookings(data);

            } catch (error) {

                console.error(
                    "Load dashboard bookings error:",
                    error
                );

            } finally {

                setLoadingBookings(false);

            }
        }

        loadBookings();

    }, [user]);


    /* =====================================================
       LOGOUT
    ===================================================== */

    const handleLogout = async () => {

        await signOut(auth);

        router.replace("/admin/login");

    };


    /* =====================================================
       LOADING AUTH
    ===================================================== */

    if (checking) {

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">

                <div className="text-center">

                    <Loader2
                        size={38}
                        className="mx-auto animate-spin text-pink-500"
                    />

                    <p className="mt-4 text-sm text-slate-500">
                        กำลังตรวจสอบสิทธิ์...
                    </p>

                </div>

            </main>
        );

    }


    /* =====================================================
       STATISTICS
    ===================================================== */

    const totalBookings =
        bookings.length;

    const pendingPayment =
        bookings.filter(
            (item) =>
                item.bookingStatus ===
                "pending_payment"
        ).length;

    const paymentSubmitted =
        bookings.filter(
            (item) =>
                item.bookingStatus ===
                "payment_submitted"
        ).length;

    const paymentVerified =
        bookings.filter(
            (item) =>
                item.bookingStatus ===
                "payment_verified"
        ).length;

    const confirmedBookings =
        bookings.filter(
            (item) =>
                item.bookingStatus ===
                "confirmed"
        ).length;

    const cancelledBookings =
        bookings.filter(
            (item) =>
                item.bookingStatus ===
                "cancelled"
        ).length;


    /* =====================================================
       UNIQUE CUSTOMERS
    ===================================================== */

    const customerKeys = new Set(
        bookings
            .map((booking) => {

                const email =
                    booking.customer?.email?.trim();

                const phone =
                    booking.customer?.phone?.trim();

                const name =
                    booking.customer?.name?.trim();

                return (
                    email ||
                    phone ||
                    name ||
                    booking.id
                );

            })
            .filter(Boolean)
    );

    const totalCustomers =
        customerKeys.size;


    /* =====================================================
       REVENUE
    ===================================================== */

    const totalRevenue =
        bookings
            .filter(
                (booking) =>
                    booking.bookingStatus ===
                    "confirmed"
            )
            .reduce(
                (total, booking) =>
                    total +
                    (booking.totalPrice ??
                        booking.package?.price ??
                        0),
                0
            );


    /* =====================================================
       RECENT BOOKINGS
    ===================================================== */

    const recentBookings =
        [...bookings]
            .sort(
                (a, b) =>
                    getTimestampMillis(
                        b.createdAt
                    ) -
                    getTimestampMillis(
                        a.createdAt
                    )
            )
            .slice(0, 5);


    return (
        <main className="bg-slate-50">

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="border-b border-slate-200 bg-white">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">

                    <div>

                        <p className="text-xs font-semibold tracking-[0.3em] text-pink-500">
                            KOKO MEMORY
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-slate-900">
                            Admin Dashboard
                        </h1>

                    </div>


                    <div className="flex items-center gap-4">

                        <div className="hidden text-right sm:block">

                            <p className="text-sm font-semibold text-slate-900">
                                ผู้ดูแลระบบ
                            </p>

                            <p className="text-xs text-slate-500">
                                {user?.email}
                            </p>

                        </div>


                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >

                            <LogOut size={17} />

                            <span className="hidden sm:inline">
                                ออกจากระบบ
                            </span>

                        </button>

                    </div>

                </div>

            </header>


            {/* =================================================
                CONTENT
            ================================================= */}

            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">

                {/* Welcome */}

                <div className="mb-8">

                    <p className="text-sm font-semibold text-pink-500">
                        ADMIN PANEL
                    </p>

                    <h2 className="mt-1 text-3xl font-bold text-slate-900">
                        ยินดีต้อนรับ 👋
                    </h2>

                    <p className="mt-2 text-slate-500">
                        ภาพรวมการทำงานของ KOKO Memory
                    </p>

                </div>


                {/* =================================================
                    MAIN STATS
                ================================================= */}

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">


                    {/* TOTAL */}

                    <StatCard
                        title="การจองทั้งหมด"
                        value={totalBookings}
                        description="รายการ"
                        icon={
                            <CalendarDays size={22} />
                        }
                        iconClass="bg-pink-50 text-pink-500"
                    />


                    {/* CUSTOMERS */}

                    <StatCard
                        title="ลูกค้า"
                        value={totalCustomers}
                        description="คน"
                        icon={
                            <Users size={22} />
                        }
                        iconClass="bg-blue-50 text-blue-500"
                    />


                    {/* CONFIRMED */}

                    <StatCard
                        title="ยืนยันแล้ว"
                        value={confirmedBookings}
                        description="งาน"
                        icon={
                            <CheckCircle2 size={22} />
                        }
                        iconClass="bg-green-50 text-green-500"
                    />


                    {/* REVENUE */}

                    <StatCard
                        title="รายได้"
                        value={formatMoney(totalRevenue)}
                        description="จากงานที่ยืนยัน"
                        icon={
                            <CreditCard size={22} />
                        }
                        iconClass="bg-purple-50 text-purple-500"
                    />

                </div>


                {/* =================================================
                    STATUS SUMMARY
                ================================================= */}

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                    <MiniStat
                        title="รอชำระเงิน"
                        value={pendingPayment}
                        icon={
                            <Clock3 size={18} />
                        }
                        className="text-yellow-600 bg-yellow-50"
                    />

                    <MiniStat
                        title="ส่งหลักฐานแล้ว"
                        value={paymentSubmitted}
                        icon={
                            <AlertCircle size={18} />
                        }
                        className="text-purple-600 bg-purple-50"
                    />

                    <MiniStat
                        title="ตรวจสอบแล้ว"
                        value={paymentVerified}
                        icon={
                            <CheckCircle2 size={18} />
                        }
                        className="text-blue-600 bg-blue-50"
                    />

                    <MiniStat
                        title="ยืนยันแล้ว"
                        value={confirmedBookings}
                        icon={
                            <CheckCircle2 size={18} />
                        }
                        className="text-green-600 bg-green-50"
                    />

                    <MiniStat
                        title="ยกเลิก"
                        value={cancelledBookings}
                        icon={
                            <XCircle size={18} />
                        }
                        className="text-red-600 bg-red-50"
                    />

                </div>


                {/* =================================================
                    RECENT BOOKINGS
                ================================================= */}

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">

                        <div>

                            <h3 className="font-bold text-slate-900">
                                การจองล่าสุด
                            </h3>

                            <p className="mt-1 text-xs text-slate-400">
                                รายการ Booking ล่าสุดจากระบบ
                            </p>

                        </div>


                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/admin/bookings"
                                )
                            }
                            className="flex items-center gap-1 text-sm font-semibold text-pink-500 hover:text-pink-600"
                        >
                            ดูทั้งหมด

                            <ArrowRight size={16} />

                        </button>

                    </div>


                    {loadingBookings ? (

                        <div className="flex items-center justify-center py-16">

                            <Loader2
                                size={28}
                                className="animate-spin text-pink-500"
                            />

                        </div>

                    ) : recentBookings.length === 0 ? (

                        <div className="px-6 py-16 text-center">

                            <CalendarDays
                                size={40}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 font-semibold text-slate-600">
                                ยังไม่มีรายการจอง
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                                เมื่อมีลูกค้าจอง รายการจะแสดงที่นี่
                            </p>

                        </div>

                    ) : (

                        <div className="overflow-x-auto">

                            <table className="w-full min-w-[700px]">

                                <thead>

                                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-400">

                                        <th className="px-6 py-4 font-medium">
                                            ลูกค้า
                                        </th>

                                        <th className="px-6 py-4 font-medium">
                                            ประเภทงาน
                                        </th>

                                        <th className="px-6 py-4 font-medium">
                                            วันที่
                                        </th>

                                        <th className="px-6 py-4 font-medium">
                                            แพ็กเกจ
                                        </th>

                                        <th className="px-6 py-4 font-medium">
                                            สถานะ
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {recentBookings.map(
                                        (booking) => (

                                            <tr
                                                key={booking.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/admin/bookings/${booking.id}`
                                                    )
                                                }
                                                className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                                            >

                                                <td className="px-6 py-4">

                                                    <p className="font-semibold text-slate-800">
                                                        {booking.customer?.name ||
                                                            "ไม่ระบุชื่อ"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {booking.customer?.phone ||
                                                            "-"}
                                                    </p>

                                                </td>


                                                <td className="px-6 py-4">

                                                    <span className="text-sm text-slate-600">
                                                        {booking.event?.type ||
                                                            "-"}
                                                    </span>

                                                </td>


                                                <td className="px-6 py-4">

                                                    <span className="text-sm text-slate-600">
                                                        {formatDate(
                                                            booking.event?.date
                                                        )}
                                                    </span>

                                                </td>


                                                <td className="px-6 py-4">

                                                    <span className="text-sm text-slate-600">
                                                        {booking.package?.name ||
                                                            "-"}
                                                    </span>

                                                </td>


                                                <td className="px-6 py-4">

                                                    <StatusBadge
                                                        status={
                                                            booking.bookingStatus
                                                        }
                                                    />

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>


                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

                <section className="mt-8">

                    <h3 className="mb-4 text-lg font-bold text-slate-900">
                        จัดการระบบ
                    </h3>


                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


                        <AdminCard
                            icon={
                                <CalendarDays size={24} />
                            }
                            title="รายการจอง"
                            description="ดูและจัดการรายการจอง"
                            className="bg-pink-50 text-pink-500"
                            onClick={() =>
                                router.push(
                                    "/admin/bookings"
                                )
                            }
                        />


                        <AdminCard
                            icon={
                                <CreditCard size={24} />
                            }
                            title="การชำระเงิน"
                            description="ตรวจสอบการชำระเงิน"
                            className="bg-green-50 text-green-500"
                            onClick={() =>
                                router.push(
                                    "/admin/payments"
                                )
                            }
                        />


                        <AdminCard
                            icon={
                                <ImageIcon size={24} />
                            }
                            title="จัดการรูป"
                            description="จัดการรูปภาพของงาน"
                            className="bg-purple-50 text-purple-500"
                            onClick={() =>
                                router.push(
                                    "/admin/gallery"
                                )
                            }
                        />


                        <AdminCard
                            icon={
                                <Settings size={24} />
                            }
                            title="ตั้งค่าระบบ"
                            description="ตั้งค่าและจัดการระบบ"
                            className="bg-slate-100 text-slate-600"
                            onClick={() =>
                                router.push(
                                    "/admin/settings"
                                )
                            }
                        />

                    </div>

                </section>

            </div>

        </main>
    );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
    title,
    value,
    description,
    icon,
    iconClass,
}: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
    iconClass: string;
}) {

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

            <div className="flex items-start justify-between">

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}
                >
                    {icon}
                </div>

            </div>

            <p className="mt-5 text-sm text-slate-500">
                {title}
            </p>

            <div className="mt-1 flex flex-wrap items-end gap-2">

                <h3 className="text-3xl font-bold text-slate-900">
                    {value}
                </h3>

                <span className="mb-1 text-xs text-slate-400">
                    {description}
                </span>

            </div>

        </div>
    );
}


/* =========================================================
   MINI STAT
========================================================= */

function MiniStat({
    title,
    value,
    icon,
    className,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    className: string;
}) {

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">

            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${className}`}
            >
                {icon}
            </div>

            <div>

                <p className="text-xs text-slate-400">
                    {title}
                </p>

                <p className="mt-0.5 text-xl font-bold text-slate-800">
                    {value}
                </p>

            </div>

        </div>
    );
}


/* =========================================================
   ADMIN CARD
========================================================= */

function AdminCard({
    icon,
    title,
    description,
    className,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    className: string;
    onClick: () => void;
}) {

    return (
        <button
            type="button"
            onClick={onClick}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >

            <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${className}`}
            >
                {icon}
            </div>

            <h4 className="mt-4 font-bold text-slate-900">
                {title}
            </h4>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>

        </button>
    );
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
    status,
}: {
    status?: string;
}) {

    const styles: Record<string, string> = {

        pending_payment:
            "bg-yellow-50 text-yellow-700",

        payment_submitted:
            "bg-purple-50 text-purple-700",

        payment_verified:
            "bg-blue-50 text-blue-700",

        confirmed:
            "bg-green-50 text-green-700",

        cancelled:
            "bg-red-50 text-red-700",

    };

    return (
        <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${styles[status || ""] ||
                "bg-slate-100 text-slate-500"
                }`}
        >
            {STATUS_LABEL[status || ""] ||
                "ไม่ระบุ"}
        </span>
    );
}