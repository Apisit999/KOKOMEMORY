"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
    const router = useRouter();
    const [bookingId, setBookingId] = useState("");

    function handleSearch() {
        const id = bookingId.trim();

        if (!id) {
            alert("กรุณากรอก Booking ID");
            return;
        }

        router.push(`/gallery/${encodeURIComponent(id)}`);
    }

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-32">

            <div className="mx-auto max-w-xl">

                {/* HEADER */}

                <div className="text-center">

                    <p className="text-sm font-semibold tracking-[0.35em] text-pink-500">
                        KOKO MEMORY
                    </p>

                    <h1 className="mt-4 text-4xl font-bold text-slate-900">
                        ค้นหารูปของคุณ
                    </h1>

                    <p className="mt-4 text-slate-500">
                        เข้าสู่ Gallery เพื่อดูและดาวน์โหลดรูปภาพ
                    </p>

                </div>


                {/* SEARCH CARD */}

                <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

                    <div className="text-center">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-3xl">
                            🔎
                        </div>

                        <h2 className="mt-5 text-2xl font-bold text-slate-900">
                            กรอก Booking ID
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            กรอกรหัสที่ได้รับจากงาน
                        </p>

                    </div>


                    {/* INPUT */}

                    <div className="mt-8">

                        <label
                            htmlFor="bookingId"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Booking ID
                        </label>

                        <input
                            id="bookingId"
                            type="text"
                            value={bookingId}
                            onChange={(e) =>
                                setBookingId(e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSearch();
                                }
                            }}
                            placeholder="เช่น TEST001"
                            autoComplete="off"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center font-mono text-lg font-semibold uppercase text-slate-900 outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-100"
                        />

                    </div>


                    {/* BUTTON */}

                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={!bookingId.trim()}
                        className="mt-5 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ค้นหารูป
                    </button>


                    {/* QR INFO */}

                    <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center">

                        <div className="text-3xl">
                            📱
                        </div>

                        <p className="mt-3 font-semibold text-slate-700">
                            มี QR Code?
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            สามารถสแกน QR Code
                            จากหน้างานเพื่อเข้าสู่ Gallery
                            ได้โดยตรง
                        </p>

                    </div>

                </div>


                {/* TEST */}

                <div className="mt-6 text-center">

                    <button
                        type="button"
                        onClick={() => {
                            setBookingId("TEST001");
                        }}
                        className="text-sm text-pink-500 underline hover:text-pink-400"
                    >
                        ใส่ TEST001 สำหรับทดสอบ
                    </button>

                </div>


                <p className="mt-8 text-center text-xs text-slate-400">
                    KOKO MEMORY • Photobooth & Event
                </p>

            </div>

        </main>
    );
}