"use client";

import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";

export default function BookingQRPage() {
    const params = useParams();

    const bookingId = String(params.bookingId || "");

    // สำหรับทดสอบในวง Wi-Fi เดียวกัน
    const galleryUrl = bookingId
        ? `http://192.168.1.170:3000/gallery/${encodeURIComponent(
            bookingId
        )}`
        : "";

    if (!bookingId) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-red-500">
                    ไม่พบ Booking ID
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">
            <div className="mx-auto max-w-xl">

                {/* Header */}
                <div className="mb-8 text-center">
                    <p className="text-sm font-semibold tracking-[0.35em] text-pink-500">
                        KOKO MEMORY
                    </p>

                    <h1 className="mt-3 text-3xl font-bold text-slate-900">
                        Gallery QR Code
                    </h1>

                    <p className="mt-2 text-slate-500">
                        QR สำหรับเข้า Gallery ของลูกค้า
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">

                    {/* Booking */}
                    <p className="text-sm font-semibold text-slate-500">
                        BOOKING
                    </p>

                    <p className="mt-2 text-xl font-bold text-pink-500">
                        {bookingId}
                    </p>

                    {/* QR */}
                    <div className="mt-8 flex justify-center">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <QRCodeSVG
                                value={galleryUrl}
                                size={280}
                                level="H"
                            />
                        </div>
                    </div>

                    {/* URL */}
                    <div className="mt-8 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-400">
                            GALLERY URL
                        </p>

                        <p className="mt-2 break-all font-mono text-sm text-slate-700">
                            {galleryUrl}
                        </p>
                    </div>

                    {/* Instruction */}
                    <p className="mt-6 text-sm text-slate-500">
                        ให้ลูกค้าสแกน QR Code เพื่อเข้าสู่ Gallery
                    </p>

                </div>
            </div>
        </main>
    );
}