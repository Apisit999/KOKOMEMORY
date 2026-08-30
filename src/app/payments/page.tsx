"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
    collection,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import {
    getDownloadURL,
    ref,
    uploadBytes,
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";

import {
    ArrowLeft,
    CheckCircle2,
    CreditCard,
    FileImage,
    Loader2,
    Upload,
    XCircle,
} from "lucide-react";

export default function PaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ================================
    // Booking Data
    // ================================

    const bookingId = searchParams.get("bookingId") || "";
    const packageName = searchParams.get("package") || "Photobooth";
    const date = searchParams.get("date") || "";
    const name = searchParams.get("name") || "";
    const phone = searchParams.get("phone") || "";
    const amountFromUrl = searchParams.get("amount") || "0";

    // ================================
    // State
    // ================================

    const [amount, setAmount] = useState<number>(
        Number(amountFromUrl) || 0
    );

    const [loadingBooking, setLoadingBooking] = useState(false);

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null);

    const [uploading, setUploading] = useState(false);

    const [success, setSuccess] = useState(false);

    const [error, setError] = useState("");

    // ================================
    // Load Booking
    // ================================

    useEffect(() => {
        if (!bookingId) return;

        const loadBooking = async () => {
            try {
                setLoadingBooking(true);

                const bookingRef = doc(
                    db,
                    "bookings",
                    bookingId
                );

                const bookingSnap = await getDoc(bookingRef);

                if (!bookingSnap.exists()) {
                    setError("ไม่พบข้อมูลการจอง");
                    return;
                }

                const data = bookingSnap.data();

                if (data.amount) {
                    setAmount(Number(data.amount));
                }

                if (data.totalPrice) {
                    setAmount(Number(data.totalPrice));
                }

            } catch (err) {
                console.error(err);

                setError(
                    "ไม่สามารถโหลดข้อมูลการจองได้"
                );
            } finally {
                setLoadingBooking(false);
            }
        };

        loadBooking();
    }, [bookingId]);

    // ================================
    // Select File
    // ================================

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setError("");

        const file = event.target.files?.[0];

        if (!file) return;

        // จำกัดขนาด 10MB
        if (file.size > 10 * 1024 * 1024) {
            setError(
                "ไฟล์มีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 10MB"
            );

            return;
        }

        // ตรวจสอบประเภทไฟล์
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "รองรับเฉพาะ JPG, PNG และ WEBP"
            );

            return;
        }

        setSelectedFile(file);

        const url = URL.createObjectURL(file);

        setPreviewUrl(url);
    };

    // ================================
    // Remove File
    // ================================

    const removeFile = () => {
        setSelectedFile(null);

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(null);
    };

    // ================================
    // Upload Payment
    // ================================

    const handleUploadPayment = async () => {
        if (!bookingId) {
            setError(
                "ไม่พบ Booking ID"
            );

            return;
        }

        if (!selectedFile) {
            setError(
                "กรุณาเลือกหลักฐานการชำระเงิน"
            );

            return;
        }

        try {
            setUploading(true);
            setError("");
            setSuccess(false);

            // ====================================
            // 1. สร้างชื่อไฟล์
            // ====================================

            const timestamp = Date.now();

            const fileName =
                `${timestamp}-${selectedFile.name}`;

            // ====================================
            // 2. Path ใน Firebase Storage
            // ====================================

            const storagePath =
                `payments/${bookingId}/${fileName}`;

            const storageRef =
                ref(storage, storagePath);

            // ====================================
            // 3. Upload
            // ====================================

            await uploadBytes(
                storageRef,
                selectedFile,
                {
                    contentType: selectedFile.type,
                }
            );

            // ====================================
            // 4. Get URL
            // ====================================

            const downloadURL =
                await getDownloadURL(storageRef);

            // ====================================
            // 5. Create Payment ID
            // ====================================

            const paymentRef = doc(
                collection(db, "payments")
            );

            const paymentId =
                paymentRef.id;

            // ====================================
            // 6. Save Payment
            // ====================================

            await setDoc(paymentRef, {
                paymentId,

                bookingId,

                customerName: name,

                phone,

                packageName,

                amount,

                slipUrl: downloadURL,

                slipPath: storagePath,

                status: "submitted",

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp(),
            });

            // ====================================
            // 7. Update Booking
            // ====================================

            const bookingRef =
                doc(
                    db,
                    "bookings",
                    bookingId
                );

            await updateDoc(
                bookingRef,
                {
                    paymentStatus:
                        "submitted",

                    paymentId,

                    slipUrl:
                        downloadURL,

                    updatedAt:
                        serverTimestamp(),
                }
            );

            // ====================================
            // Success
            // ====================================

            setSuccess(true);

        } catch (err) {
            console.error(
                "Payment upload error:",
                err
            );

            setError(
                "ไม่สามารถส่งหลักฐานการชำระเงินได้ กรุณาลองใหม่อีกครั้ง"
            );

        } finally {
            setUploading(false);
        }
    };

    // ================================
    // Success Screen
    // ================================

    if (success) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

                <div className="w-full max-w-lg rounded-[32px] bg-white p-8 sm:p-10 text-center shadow-xl border border-slate-100">

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">

                        <CheckCircle2
                            size={46}
                            className="text-green-500"
                        />

                    </div>

                    <p className="mt-6 text-sm font-semibold tracking-[0.3em] text-pink-500">
                        KOKO MEMORY
                    </p>

                    <h1 className="mt-3 text-3xl font-bold text-slate-900">
                        ส่งหลักฐานสำเร็จ
                    </h1>

                    <p className="mt-4 leading-7 text-slate-500">
                        ระบบได้รับหลักฐานการชำระเงินของคุณแล้ว
                        <br />
                        ทางทีมงานจะตรวจสอบและยืนยันการชำระเงิน
                    </p>

                    <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-left">

                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Booking ID
                            </span>

                            <span className="font-semibold text-slate-900">
                                {bookingId}
                            </span>
                        </div>

                        <div className="mt-3 flex justify-between">

                            <span className="text-slate-500">
                                สถานะ
                            </span>

                            <span className="font-semibold text-orange-500">
                                รอตรวจสอบ
                            </span>

                        </div>

                    </div>

                    <button
                        onClick={() =>
                            router.push("/")
                        }
                        className="mt-8 w-full rounded-2xl bg-pink-500 py-4 font-semibold text-white transition hover:bg-pink-400"
                    >
                        กลับหน้าแรก
                    </button>

                </div>

            </main>
        );
    }

    // ================================
    // Main Page
    // ================================

    return (
        <main className="min-h-screen bg-slate-50">

            {/* Header */}

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

                <button
                    onClick={() =>
                        router.back()
                    }
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-pink-500"
                >
                    <ArrowLeft size={18} />

                    กลับ
                </button>

            </div>

            {/* Title */}

            <section className="px-4 pb-10 text-center sm:px-6">

                <p className="text-sm font-semibold tracking-[0.35em] text-pink-500">
                    KOKO MEMORY
                </p>

                <h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">
                    ชำระค่าบริการ
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                    กรุณาตรวจสอบรายละเอียดการจอง
                    และส่งหลักฐานการชำระเงิน
                </p>

            </section>

            {/* Content */}

            <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">

                <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">

                    {/* Booking Information */}

                    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">

                        <div className="flex items-center gap-4">

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50">

                                <CreditCard
                                    size={24}
                                    className="text-pink-500"
                                />

                            </div>

                            <div>

                                <p className="text-sm text-slate-400">
                                    รายละเอียดการจอง
                                </p>

                                <h2 className="text-xl font-bold text-slate-900">
                                    KOKO Memory
                                </h2>

                            </div>

                        </div>

                        <div className="mt-8 divide-y divide-slate-100">

                            <InfoRow
                                label="ชื่อผู้จอง"
                                value={name || "-"}
                            />

                            <InfoRow
                                label="เบอร์โทรศัพท์"
                                value={phone || "-"}
                            />

                            <InfoRow
                                label="แพ็กเกจ"
                                value={packageName}
                            />

                            <InfoRow
                                label="วันที่จัดงาน"
                                value={date || "-"}
                            />

                            <InfoRow
                                label="Booking ID"
                                value={bookingId || "-"}
                            />

                        </div>

                        <div className="mt-8 rounded-2xl bg-slate-50 p-5">

                            <p className="text-sm text-slate-500">
                                สถานะการชำระเงิน
                            </p>

                            <div className="mt-2 flex items-center gap-2 text-orange-500">

                                <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />

                                <span className="font-semibold">
                                    รอชำระเงิน
                                </span>

                            </div>

                        </div>

                    </div>

                    {/* Payment */}

                    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">

                        <p className="text-sm font-semibold tracking-[0.25em] text-pink-500">
                            PAYMENT
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            ชำระเงิน
                        </h2>

                        {/* Amount */}

                        <div className="mt-6 rounded-2xl bg-pink-50 p-6 text-center">

                            <p className="text-sm text-slate-500">
                                ยอดที่ต้องชำระ
                            </p>

                            <p className="mt-2 text-4xl font-bold text-pink-500">
                                ฿
                                {amount.toLocaleString(
                                    "th-TH"
                                )}
                            </p>

                        </div>

                        {/* QR */}

                        <div className="mt-6 rounded-2xl border border-slate-200 p-5 text-center">

                            <p className="font-semibold text-slate-900">
                                สแกน QR เพื่อชำระเงิน
                            </p>

                            <div className="mx-auto mt-5 flex aspect-square w-48 items-center justify-center rounded-2xl bg-slate-100">

                                <p className="px-6 text-sm leading-6 text-slate-400">
                                    QR PromptPay
                                    <br />
                                    KOKO Memory
                                    <br />
                                    <span className="text-xs">
                                        ใส่รูป QR จริงภายหลัง
                                    </span>
                                </p>

                            </div>

                            <p className="mt-4 text-xs text-slate-400">
                                กรุณาตรวจสอบชื่อบัญชีก่อนโอนเงิน
                            </p>

                        </div>

                        {/* Upload */}

                        <div className="mt-6">

                            <p className="mb-3 font-semibold text-slate-900">
                                หลักฐานการชำระเงิน
                            </p>

                            {!selectedFile ? (

                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center transition hover:border-pink-300 hover:bg-pink-50">

                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">

                                        <Upload
                                            size={24}
                                            className="text-pink-500"
                                        />

                                    </div>

                                    <p className="mt-4 font-semibold text-slate-700">
                                        คลิกเพื่อเลือกสลิป
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        JPG, PNG หรือ WEBP
                                        <br />
                                        ขนาดไม่เกิน 10MB
                                    </p>

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                </label>

                            ) : (

                                <div className="overflow-hidden rounded-2xl border border-slate-200">

                                    {previewUrl && (
                                        <img
                                            src={previewUrl}
                                            alt="Payment Slip"
                                            className="max-h-[420px] w-full object-contain bg-slate-100"
                                        />
                                    )}

                                    <div className="flex items-center justify-between gap-3 p-4">

                                        <div className="flex min-w-0 items-center gap-3">

                                            <FileImage
                                                size={20}
                                                className="shrink-0 text-pink-500"
                                            />

                                            <p className="truncate text-sm font-medium text-slate-700">
                                                {selectedFile.name}
                                            </p>

                                        </div>

                                        <button
                                            type="button"
                                            onClick={removeFile}
                                            className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <XCircle size={20} />
                                        </button>

                                    </div>

                                </div>

                            )}

                        </div>

                        {/* Error */}

                        {error && (

                            <div className="mt-5 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">

                                <XCircle
                                    size={20}
                                    className="shrink-0 text-red-500"
                                />

                                <p className="text-sm leading-6 text-red-600">
                                    {error}
                                </p>

                            </div>

                        )}

                        {/* Submit */}

                        <button
                            onClick={handleUploadPayment}
                            disabled={
                                uploading ||
                                loadingBooking ||
                                !selectedFile
                            }
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-4 font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {uploading ? (
                                <>
                                    <Loader2
                                        size={20}
                                        className="animate-spin"
                                    />

                                    กำลังส่งหลักฐาน...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={20} />

                                    ส่งหลักฐานการชำระเงิน
                                </>
                            )}

                        </button>

                    </div>

                </div>

            </section>

        </main>
    );
}

// ========================================
// Info Row
// ========================================

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-6 py-4">

            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span className="text-right text-sm font-semibold text-slate-900">
                {value}
            </span>

        </div>
    );
}