"use client";

import { useState } from "react";

export default function R2UploadTestPage() {
    const [bookingId, setBookingId] = useState("TEST001");
    const [file, setFile] = useState<File | null>(null);

    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [uploadedKey, setUploadedKey] = useState("");
    const [uploadedUrl, setUploadedUrl] = useState("");

    const handleUpload = async () => {
        // -----------------------------
        // CHECK BOOKING ID
        // -----------------------------

        if (!bookingId.trim()) {
            setMessage("กรุณาใส่ Booking ID");
            return;
        }

        // -----------------------------
        // CHECK FILE
        // -----------------------------

        if (!file) {
            setMessage("กรุณาเลือกรูปภาพ");
            return;
        }

        // -----------------------------
        // START
        // -----------------------------

        setUploading(true);
        setMessage("");
        setUploadedKey("");
        setUploadedUrl("");

        try {
            const formData = new FormData();

            formData.append("file", file);
            formData.append(
                "bookingId",
                bookingId.trim()
            );

            console.log("Uploading:", {
                bookingId,
                file: file.name,
                size: file.size,
                type: file.type,
            });

            // -----------------------------
            // CALL API
            // -----------------------------

            const response = await fetch(
                "/api/r2-test",
                {
                    method: "POST",
                    body: formData,
                }
            );

            // อ่านเป็น text ก่อน
            // เพื่อป้องกัน JSON error
            const text = await response.text();

            let data: any;

            try {
                data = JSON.parse(text);
            } catch {
                console.error(
                    "API RESPONSE:",
                    text
                );

                throw new Error(
                    "API ไม่ได้ส่ง JSON กลับมา"
                );
            }

            console.log(
                "UPLOAD RESPONSE:",
                data
            );

            // -----------------------------
            // ERROR
            // -----------------------------

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    "Upload ไม่สำเร็จ"
                );
            }

            if (!data.success) {
                throw new Error(
                    data.error ||
                    "Upload ไม่สำเร็จ"
                );
            }

            // -----------------------------
            // SUCCESS
            // -----------------------------

            setMessage(
                "Upload รูปสำเร็จ 🎉"
            );

            setUploadedKey(
                data.key || ""
            );

            setUploadedUrl(
                data.url || ""
            );

            // reset file
            setFile(null);

            const input =
                document.getElementById(
                    "r2-file"
                ) as HTMLInputElement | null;

            if (input) {
                input.value = "";
            }

        } catch (error) {
            console.error(
                "Upload error:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "เกิดข้อผิดพลาด"
            );

        } finally {
            setUploading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">

            <div className="mx-auto max-w-2xl">

                {/* HEADER */}

                <div className="mb-8 text-center">

                    <p className="text-sm font-semibold tracking-[0.35em] text-pink-500">
                        KOKO MEMORY
                    </p>

                    <h1 className="mt-3 text-3xl font-bold text-slate-900">
                        R2 Upload Test
                    </h1>

                    <p className="mt-2 text-slate-500">
                        ทดสอบอัปโหลดรูปเข้า Cloudflare R2
                    </p>

                </div>


                {/* CARD */}

                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

                    {/* BOOKING ID */}

                    <label className="block">

                        <span className="mb-3 block text-sm font-semibold text-slate-700">
                            Booking ID
                        </span>

                        <input
                            type="text"
                            value={bookingId}
                            onChange={(event) => {
                                setBookingId(
                                    event.target.value
                                );

                                setMessage("");
                                setUploadedKey("");
                                setUploadedUrl("");
                            }}
                            placeholder="TEST001"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        />

                        <p className="mt-2 text-xs text-slate-400">
                            รูปจะถูกเก็บใน photos/{bookingId || "BOOKING_ID"}/
                        </p>

                    </label>


                    {/* FILE */}

                    <label className="mt-6 block">

                        <span className="mb-3 block text-sm font-semibold text-slate-700">
                            เลือกรูปภาพ
                        </span>

                        <input
                            id="r2-file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {

                                const selectedFile =
                                    event.target.files?.[0] ||
                                    null;

                                setFile(
                                    selectedFile
                                );

                                setMessage("");
                                setUploadedKey("");
                                setUploadedUrl("");

                            }}
                            className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                        />

                    </label>


                    {/* SELECTED FILE */}

                    {file && (

                        <div className="mt-5 rounded-2xl bg-slate-50 p-5">

                            <p className="text-xs font-semibold text-slate-400">
                                ไฟล์ที่เลือก
                            </p>

                            <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                                {file.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)}
                                {" "}MB
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                {file.type}
                            </p>

                        </div>

                    )}


                    {/* UPLOAD BUTTON */}

                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={
                            uploading ||
                            !bookingId.trim() ||
                            !file
                        }
                        className="mt-6 w-full rounded-xl bg-pink-500 px-6 py-4 font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        {uploading
                            ? "กำลัง Upload..."
                            : "Upload รูปไปยัง R2"}

                    </button>


                    {/* MESSAGE */}

                    {message && (

                        <div
                            className={`mt-6 rounded-2xl p-5 text-sm ${message.includes(
                                "สำเร็จ"
                            )
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                        >

                            <p className="font-semibold">
                                {message}
                            </p>

                        </div>

                    )}


                    {/* RESULT */}

                    {uploadedKey && (

                        <div className="mt-5 rounded-2xl bg-slate-50 p-5">

                            <p className="text-xs font-semibold text-slate-400">
                                R2 OBJECT KEY
                            </p>

                            <p className="mt-2 break-all font-mono text-sm text-slate-800">
                                {uploadedKey}
                            </p>

                        </div>

                    )}


                    {/* GALLERY */}

                    {message.includes("สำเร็จ") && (

                        <div className="mt-5 rounded-2xl border border-pink-100 bg-pink-50 p-5">

                            <p className="text-xs font-semibold text-pink-500">
                                GALLERY
                            </p>

                            <p className="mt-2 text-sm text-slate-700">
                                รูปถูกผูกกับ Booking:
                            </p>

                            <p className="mt-1 font-mono text-sm font-semibold text-pink-600">
                                {bookingId}
                            </p>

                            <a
                                href={`/gallery/${encodeURIComponent(
                                    bookingId
                                )}`}
                                className="mt-4 block w-full rounded-xl bg-pink-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pink-400"
                            >
                                เปิด Gallery
                            </a>

                        </div>

                    )}

                </div>

            </div>

        </main>
    );
}