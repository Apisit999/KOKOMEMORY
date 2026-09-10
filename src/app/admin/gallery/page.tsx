"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { db, auth } from "@/lib/firebase";

type Booking = {
    id: string;
    name?: string;
    customerName?: string;
    phone?: string;
    email?: string;
    date?: string;
    eventDate?: string;
    package?: string;
    packageName?: string;
    status?: string;
    total?: number;
    price?: number;
};

export default function AdminGalleryPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [loadingBookings, setLoadingBookings] = useState(true);

    const [bookings, setBookings] = useState<Booking[]>([]);

    const [search, setSearch] = useState("");

    const [error, setError] = useState("");

    // -----------------------------
    // ตรวจสอบ Login
    // -----------------------------

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.replace("/admin/login");
                return;
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    // -----------------------------
    // โหลด Booking
    // -----------------------------

    useEffect(() => {
        if (loading) return;

        const loadBookings = async () => {
            try {
                setLoadingBookings(true);
                setError("");

                const snapshot = await getDocs(
                    collection(db, "bookings")
                );

                const result: Booking[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    result.push({
                        id: doc.id,

                        name:
                            typeof data.name === "string"
                                ? data.name
                                : undefined,

                        customerName:
                            typeof data.customerName === "string"
                                ? data.customerName
                                : undefined,

                        phone:
                            typeof data.phone === "string"
                                ? data.phone
                                : undefined,

                        email:
                            typeof data.email === "string"
                                ? data.email
                                : undefined,

                        date:
                            typeof data.date === "string"
                                ? data.date
                                : undefined,

                        eventDate:
                            typeof data.eventDate === "string"
                                ? data.eventDate
                                : undefined,

                        package:
                            typeof data.package === "string"
                                ? data.package
                                : undefined,

                        packageName:
                            typeof data.packageName === "string"
                                ? data.packageName
                                : undefined,

                        status:
                            typeof data.status === "string"
                                ? data.status
                                : undefined,

                        total:
                            typeof data.total === "number"
                                ? data.total
                                : undefined,

                        price:
                            typeof data.price === "number"
                                ? data.price
                                : undefined,
                    });
                });

                setBookings(result);
            } catch (error) {
                console.error("โหลด bookings ไม่สำเร็จ:", error);

                setError(
                    "ไม่สามารถโหลดข้อมูลรายการจองจาก Firestore ได้"
                );
            } finally {
                setLoadingBookings(false);
            }
        };

        loadBookings();
    }, [loading]);

    // -----------------------------
    // Logout
    // -----------------------------

    const handleLogout = async () => {
        await signOut(auth);
        router.replace("/admin/login");
    };

    // -----------------------------
    // Helper
    // -----------------------------

    const getName = (booking: Booking) => {
        return (
            booking.name ||
            booking.customerName ||
            "ไม่ระบุชื่อลูกค้า"
        );
    };

    const getDate = (booking: Booking) => {
        return (
            booking.date ||
            booking.eventDate ||
            "-"
        );
    };

    const getPackage = (booking: Booking) => {
        return (
            booking.package ||
            booking.packageName ||
            "-"
        );
    };

    const getStatus = (booking: Booking) => {
        switch (booking.status) {
            case "paid":
                return "ชำระเงินแล้ว";

            case "confirmed":
                return "ยืนยันแล้ว";

            case "completed":
                return "เสร็จสิ้น";

            case "cancelled":
                return "ยกเลิก";

            case "waiting":
            case "pending":
                return "รอตรวจสอบ";

            default:
                return booking.status || "ไม่ระบุ";
        }
    };

    const getStatusStyle = (booking: Booking) => {
        switch (booking.status) {
            case "paid":
            case "confirmed":
            case "completed":
                return "bg-green-50 text-green-700";

            case "cancelled":
                return "bg-red-50 text-red-700";

            default:
                return "bg-yellow-50 text-yellow-700";
        }
    };

    const getPrice = (booking: Booking) => {
        const price = booking.total ?? booking.price;

        if (typeof price !== "number") {
            return "-";
        }

        return (
            "฿" +
            price.toLocaleString("th-TH")
        );
    };

    // -----------------------------
    // Search
    // -----------------------------

    const filteredBookings = bookings.filter(
        (booking) => {
            const keyword = search
                .trim()
                .toLowerCase();

            if (!keyword) {
                return true;
            }

            const name = getName(booking)
                .toLowerCase();

            const phone = (
                booking.phone || ""
            ).toLowerCase();

            const email = (
                booking.email || ""
            ).toLowerCase();

            const id = booking.id.toLowerCase();

            return (
                name.includes(keyword) ||
                phone.includes(keyword) ||
                email.includes(keyword) ||
                id.includes(keyword)
            );
        }
    );

    // -----------------------------
    // Loading
    // -----------------------------

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-5xl mb-4">
                        📷
                    </div>

                    <p className="text-slate-600">
                        กำลังตรวจสอบสิทธิ์...
                    </p>
                </div>
            </main>
        );
    }

    // -----------------------------
    // Page
    // -----------------------------

    return (
        <main className="bg-slate-50">

            {/* Header */}
            <header className="bg-white border-b border-slate-200">

                <div className="max-w-7xl mx-auto px-6 py-5">

                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-4">

                            <button
                                onClick={() =>
                                    router.push("/admin/dashboard")
                                }
                                className="
                  w-10
                  h-10
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  hover:bg-slate-50
                  transition
                "
                            >
                                ←
                            </button>

                            <div>

                                <p className="
                  text-sm
                  tracking-[0.3em]
                  text-pink-500
                  font-semibold
                ">
                                    KOKO MEMORY
                                </p>

                                <h1 className="
                  text-2xl
                  font-bold
                  text-slate-900
                ">
                                    จัดการรูป
                                </h1>

                            </div>

                        </div>

                        <button
                            onClick={handleLogout}
                            className="
                hidden
                sm:block
                px-4
                py-2
                rounded-xl
                border
                border-slate-200
                text-sm
                hover:bg-slate-50
              "
                        >
                            ออกจากระบบ
                        </button>

                    </div>

                </div>

            </header>

            {/* Content */}
            <div className="
        max-w-7xl
        mx-auto
        px-6
        py-10
      ">

                {/* Title */}
                <div className="mb-8">

                    <div className="
            inline-flex
            items-center
            gap-2
            px-3
            py-1.5
            rounded-full
            bg-pink-50
            text-pink-600
            text-sm
            mb-3
          ">
                        📷 Photo Management
                    </div>

                    <h2 className="
            text-3xl
            font-bold
            text-slate-900
          ">
                        Gallery งาน
                    </h2>

                    <p className="
            mt-2
            text-slate-500
          ">
                        เลือกงานเพื่อจัดการรูปภาพ
                    </p>

                </div>

                {/* Search */}
                <div className="
          bg-white
          border
          border-slate-200
          rounded-2xl
          p-5
          mb-8
          shadow-sm
        ">

                    <label className="
            block
            text-sm
            font-medium
            text-slate-700
            mb-2
          ">
                        ค้นหางาน
                    </label>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="
              ค้นหาชื่อลูกค้า / เบอร์โทร / Email / Booking ID
            "
                        className="
              w-full
              h-12
              px-4
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              outline-none
              focus:bg-white
              focus:border-pink-400
              focus:ring-4
              focus:ring-pink-100
            "
                    />

                </div>

                {/* Error */}
                {error && (
                    <div className="
            mb-6
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-5
            text-red-700
          ">
                        <p className="font-semibold">
                            ⚠️ เกิดข้อผิดพลาด
                        </p>

                        <p className="text-sm mt-1">
                            {error}
                        </p>
                    </div>
                )}

                {/* Loading Bookings */}
                {loadingBookings && (
                    <div className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            p-12
            text-center
          ">

                        <div className="
              text-5xl
              mb-4
              animate-pulse
            ">
                            📷
                        </div>

                        <p className="text-slate-500">
                            กำลังโหลดรายการจอง...
                        </p>

                    </div>
                )}

                {/* Empty */}
                {!loadingBookings &&
                    filteredBookings.length === 0 && (
                        <div className="
              bg-white
              border
              border-slate-200
              rounded-2xl
              p-14
              text-center
            ">

                            <div className="text-6xl mb-4">
                                📷
                            </div>

                            <h3 className="
                text-xl
                font-bold
                text-slate-900
              ">
                                ไม่พบรายการ
                            </h3>

                            <p className="
                text-slate-500
                mt-2
              ">
                                ยังไม่มีรายการจองที่ตรงกับการค้นหา
                            </p>

                        </div>
                    )}

                {/* Cards */}
                {!loadingBookings &&
                    filteredBookings.length > 0 && (

                        <div className="
              grid
              grid-cols-1
              md:grid-cols-2
              xl:grid-cols-3
              gap-6
            ">

                            {filteredBookings.map(
                                (booking) => (

                                    <div
                                        key={booking.id}
                                        className="
                      bg-white
                      border
                      border-slate-200
                      rounded-2xl
                      overflow-hidden
                      shadow-sm
                      hover:shadow-lg
                      transition
                    "
                                    >

                                        {/* Preview */}
                                        <div className="
                      h-44
                      bg-gradient-to-br
                      from-pink-50
                      to-purple-50
                      flex
                      items-center
                      justify-center
                    ">

                                            <div className="
                        w-20
                        h-20
                        rounded-2xl
                        bg-white
                        shadow-sm
                        flex
                        items-center
                        justify-center
                        text-4xl
                      ">
                                                📷
                                            </div>

                                        </div>

                                        {/* Information */}
                                        <div className="p-5">

                                            <div className="
                        flex
                        items-start
                        justify-between
                        gap-3
                      ">

                                                <div className="min-w-0">

                                                    <h3 className="
                            text-lg
                            font-bold
                            text-slate-900
                            truncate
                          ">
                                                        {getName(booking)}
                                                    </h3>

                                                    <p className="
                            text-xs
                            text-slate-400
                            mt-1
                            font-mono
                            truncate
                          ">
                                                        {booking.id}
                                                    </p>

                                                </div>

                                                <span className={`
                          shrink-0
                          px-3
                          py-1
                          rounded-full
                          text-xs
                          font-medium
                          ${getStatusStyle(
                                                    booking
                                                )}
                        `}>
                                                    {getStatus(booking)}
                                                </span>

                                            </div>

                                            <div className="
                        mt-5
                        space-y-3
                      ">

                                                <div className="
                          flex
                          justify-between
                          gap-3
                          text-sm
                        ">

                                                    <span className="text-slate-400">
                                                        วันที่จัดงาน
                                                    </span>

                                                    <span className="
                            text-slate-700
                            font-medium
                          ">
                                                        {getDate(booking)}
                                                    </span>

                                                </div>

                                                <div className="
                          flex
                          justify-between
                          gap-3
                          text-sm
                        ">

                                                    <span className="text-slate-400">
                                                        แพ็กเกจ
                                                    </span>

                                                    <span className="
                            text-slate-700
                            font-medium
                            truncate
                            max-w-[180px]
                          ">
                                                        {getPackage(booking)}
                                                    </span>

                                                </div>

                                                <div className="
                          flex
                          justify-between
                          gap-3
                          text-sm
                        ">

                                                    <span className="text-slate-400">
                                                        ราคา
                                                    </span>

                                                    <span className="
                            font-bold
                            text-slate-900
                          ">
                                                        {getPrice(booking)}
                                                    </span>

                                                </div>

                                            </div>

                                            <div className="
                        mt-5
                        pt-5
                        border-t
                        border-slate-100
                      ">

                                                <button
                                                    onClick={() => {
                                                        alert(
                                                            "ขั้นต่อไปเราจะสร้างหน้า Gallery ของงานนี้"
                                                        );
                                                    }}
                                                    className="
                            w-full
                            h-11
                            rounded-xl
                            bg-slate-900
                            text-white
                            font-medium
                            hover:bg-pink-600
                            transition
                          "
                                                >
                                                    📷 จัดการรูปงานนี้
                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>
                    )}

                {/* Count */}
                {!loadingBookings &&
                    bookings.length > 0 && (
                        <p className="
              text-center
              text-sm
              text-slate-400
              mt-8
            ">
                            แสดง {filteredBookings.length} จาก{" "}
                            {bookings.length} รายการ
                        </p>
                    )}

            </div>

        </main>
    );
}