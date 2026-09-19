"use client";

import {
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    useRouter,
    useSearchParams,
} from "next/navigation";
import {
    doc,
    getDoc,
} from "firebase/firestore";
import {
    auth,
    db,
} from "@/lib/firebase";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Copy,
    CreditCard,
    Download,
    Loader2,
    Maximize2,
    ShieldCheck,
    Share2,
    Upload,
    X,
} from "lucide-react";

/**
 * ============================================================
 * KOKO Memory - Booking Step 5
 * ============================================================
 *
 * - โหลด Booking จาก Firestore
 * - แสดงยอดมัดจำ / บัญชี / PromptPay QR
 * - อัปโหลดสลิปผ่าน /api/booking/payment
 * - Server จะเก็บไฟล์ไว้ Cloudflare R2
 * - Firestore เก็บ URL / Key และข้อมูล Payment
 * - ไม่ใช้ Firebase Storage สำหรับสลิป
 * - มีระบบกันส่งสลิปซ้ำทั้ง Browser + Server
 *
 * IMPORTANT:
 * ห้ามสร้าง Payment หรือ upload R2 จาก Browser โดยตรง
 * ให้ผ่าน Server API เท่านั้น
 * ============================================================
 */

type Booking = {
    id: string;
    bookingStatus?: string;

    customer?: {
        name?: string;
        phone?: string;
        email?: string;
        line?: string;
    };

    event?: {
        date?: string;
        type?: string;
        guests?: string;
    };

    package?: {
        id?: string;
        name?: string;
        price?: number;
        deposit?: number;
        hours?: number;
        duration?: string;
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
        proofKey?: string | null;
        paidAmount?: number;
    };

    paymentId?: string;
    paymentStatus?: string;
    paymentAmount?: number;
    totalPrice?: number;
    depositAmount?: number;
};

const PAYMENT_ACCOUNT = {
    bankName: "ธนาคารกสิกรไทย",
    bankShortName: "KBank",
    accountName: "KOKO Memory",
    accountNumber: "180-172-8606",
    promptPay: "0827102209",
    logoUrl: "/images/kbank-logo.webp",
    qrUrl: "/images/promptpay-qr.jpg",
};

const FALLBACK_PACKAGES = {
    basic: {
        name: "Basic",
        price: 8900,
        deposit: 3000,
    },
    premium: {
        name: "Premium",
        price: 14900,
        deposit: 5000,
    },
    luxury: {
        name: "Luxury",
        price: 24900,
        deposit: 10000,
    },
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
];

function formatMoney(amount?: number) {
    if (
        typeof amount !== "number" ||
        !Number.isFinite(amount)
    ) {
        return "-";
    }

    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value?: string) {
    if (!value) {
        return "ยังไม่ได้ระบุวันที่";
    }

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

function validateFile(file: File | null) {
    if (!file) {
        return "กรุณาเลือกหลักฐานการโอนเงิน";
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return "รองรับเฉพาะ JPG, PNG หรือ PDF เท่านั้น";
    }

    if (file.size <= 0) {
        return "ไฟล์ว่างเปล่า";
    }

    if (file.size > MAX_FILE_SIZE) {
        return "ไฟล์ต้องมีขนาดไม่เกิน 20 MB";
    }

    return "";
}

function isPaymentSubmitted(booking: Booking) {
    return (
        booking.bookingStatus === "payment_submitted" ||
        booking.bookingStatus === "payment_verified" ||
        booking.bookingStatus === "confirmed" ||
        booking.paymentStatus === "submitted" ||
        booking.paymentStatus === "verified" ||
        booking.payment?.status === "submitted" ||
        booking.payment?.status === "verified"
    );
}

function PaymentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const bookingId =
        searchParams.get("bookingId") ?? "";

    const packageId =
        searchParams.get("package") ?? "premium";

    const dateFromUrl =
        searchParams.get("date") ?? "";

    const [booking, setBooking] =
        useState<Booking | null>(null);

    const [loadingBooking, setLoadingBooking] =
        useState(true);

    const [bookingError, setBookingError] =
        useState("");

    const [slip, setSlip] =
        useState<File | null>(null);

    const [slipPreviewUrl, setSlipPreviewUrl] =
        useState("");

    const [slipError, setSlipError] =
        useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [submitError, setSubmitError] =
        useState("");

    const [copied, setCopied] =
        useState(false);

    const [qrZoom, setQrZoom] =
        useState(false);

    const [qrSaved, setQrSaved] =
        useState(false);

    const [shareMessage, setShareMessage] =
        useState("");

    const submitLockRef =
        useRef(false);

    const fallbackPackage =
        useMemo(
            () =>
                FALLBACK_PACKAGES[
                    packageId as keyof typeof FALLBACK_PACKAGES
                ] ?? FALLBACK_PACKAGES.premium,
            [packageId]
        );

    useEffect(() => {
        let cancelled = false;

        async function loadBooking() {
            if (!bookingId) {
                setLoadingBooking(false);
                setBookingError(
                    "ไม่พบ Booking ID กรุณากลับไปเริ่มขั้นตอนการจองใหม่"
                );
                return;
            }

            try {
                setLoadingBooking(true);
                setBookingError("");

                const snapshot = await getDoc(
                    doc(db, "bookings", bookingId)
                );

                if (!snapshot.exists()) {
                    throw new Error(
                        "ไม่พบรายการจองนี้ในระบบ"
                    );
                }

                if (!cancelled) {
                    setBooking({
                        id: snapshot.id,
                        ...snapshot.data(),
                    } as Booking);
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    console.error(
                        "Load payment booking error:",
                        error
                    );

                    setBookingError(
                        error instanceof Error
                            ? error.message
                            : "ไม่สามารถโหลดข้อมูลการจองได้"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingBooking(false);
                }
            }
        }

        loadBooking();

        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    useEffect(() => {
        if (!slip || slip.type === "application/pdf") {
            setSlipPreviewUrl("");
            return;
        }

        const url =
            URL.createObjectURL(slip);

        setSlipPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [slip]);

    const selectedPackage =
        booking?.package ?? fallbackPackage;

    const paymentAmount =
        typeof booking?.pricing?.deposit === "number" &&
        booking.pricing.deposit > 0
            ? booking.pricing.deposit
            : typeof booking?.depositAmount === "number" &&
              booking.depositAmount > 0
                ? booking.depositAmount
                : typeof selectedPackage.deposit === "number" &&
                  selectedPackage.deposit > 0
                    ? selectedPackage.deposit
                    : 3000;

    const servicePrice =
        booking?.pricing?.total ??
        booking?.totalPrice ??
        selectedPackage.price ??
        fallbackPackage.price;

    const eventDate =
        booking?.event?.date ??
        dateFromUrl;

    const alreadySubmitted =
        booking ? isPaymentSubmitted(booking) : false;

    useEffect(() => {
        if (!bookingId) {
            return;
        }

        try {
            localStorage.setItem(
                `koko-payment-${bookingId}`,
                JSON.stringify({
                    bookingId,
                    amount: paymentAmount,
                    bank: PAYMENT_ACCOUNT.bankName,
                    accountName: PAYMENT_ACCOUNT.accountName,
                    accountNumber: PAYMENT_ACCOUNT.accountNumber,
                    promptPay: PAYMENT_ACCOUNT.promptPay,
                    qrUrl: PAYMENT_ACCOUNT.qrUrl,
                    savedAt: new Date().toISOString(),
                })
            );
        } catch (error) {
            console.warn(
                "Cannot save payment session:",
                error
            );
        }
    }, [bookingId, paymentAmount]);

    function handleFileChange(file: File | null) {
        setSlipError("");
        setSubmitError("");

        const error =
            validateFile(file);

        if (error) {
            setSlip(null);
            setSlipError(error);
            return;
        }

        setSlip(file);
    }

    async function handleCopyAccount() {
        try {
            await navigator.clipboard.writeText(
                PAYMENT_ACCOUNT.accountNumber.replaceAll(
                    "-",
                    ""
                )
            );

            setCopied(true);

            window.setTimeout(
                () => setCopied(false),
                2000
            );
        } catch {
            setSubmitError(
                "ไม่สามารถคัดลอกเลขบัญชีได้"
            );
        }
    }

    async function handleDownloadQR() {
        try {
            const response =
                await fetch(
                    PAYMENT_ACCOUNT.qrUrl
                );

            if (!response.ok) {
                throw new Error();
            }

            const blob =
                await response.blob();

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;
            link.download =
                `KOKO-Memory-QR-${bookingId}.jpg`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);

            setQrSaved(true);

            window.setTimeout(
                () => setQrSaved(false),
                2000
            );
        } catch {
            setSubmitError(
                "ไม่สามารถบันทึก QR ได้"
            );
        }
    }

    async function handleShareQR() {
        try {
            if (navigator.share) {
                await navigator.share({
                    title:
                        "KOKO Memory - ชำระเงิน",
                    text:
                        `KOKO Memory\nBooking ID: ${bookingId}\nยอดชำระ ${formatMoney(
                            paymentAmount
                        )}\nธนาคาร: ${PAYMENT_ACCOUNT.bankName}`,
                    url:
                        window.location.href,
                });

                return;
            }

            await navigator.clipboard.writeText(
                window.location.href
            );

            setShareMessage(
                "คัดลอกลิงก์สำหรับแชร์แล้ว"
            );

            window.setTimeout(
                () => setShareMessage(""),
                2000
            );
        } catch {
            // ผู้ใช้ยกเลิก Share
        }
    }

    async function handleSubmit() {
        if (
            submitLockRef.current ||
            isSubmitting
        ) {
            return;
        }

        setSubmitError("");
        setSlipError("");

        if (!bookingId || !booking) {
            setSubmitError(
                "ไม่พบ Booking ID หรือข้อมูลการจอง"
            );
            return;
        }

        const validationError =
            validateFile(slip);

        if (validationError) {
            setSlipError(validationError);
            return;
        }

        if (!slip) {
            return;
        }

        if (alreadySubmitted) {
            setSubmitError(
                "รายการนี้มีการส่งหลักฐานหรือชำระเงินแล้ว ไม่สามารถส่งซ้ำได้"
            );
            return;
        }

        try {
            submitLockRef.current = true;
            setIsSubmitting(true);

            const formData =
                new FormData();

            formData.append(
                "file",
                slip
            );

            formData.append(
                "bookingId",
                bookingId
            );

            formData.append(
                "amount",
                String(paymentAmount)
            );

            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error(
                    "กรุณาเข้าสู่ระบบก่อนส่งหลักฐานการชำระเงิน"
                );
            }

            if (!currentUser.emailVerified) {
                throw new Error(
                    "กรุณายืนยันอีเมลก่อนส่งหลักฐานการชำระเงิน"
                );
            }

            /*
             * ส่ง Firebase ID Token ไปกับ request
             * เพื่อให้ Server ตรวจว่า Booking นี้เป็นของผู้ใช้จริง
             */
            const idToken =
                await currentUser.getIdToken();

            const response =
                await fetch(
                    "/api/booking/payment-slip",
                    {
                        method: "POST",
                        headers: {
                            Authorization:
                                `Bearer ${idToken}`,
                        },
                        body: formData,
                    }
                );

            let result: {
                success?: boolean;
                paymentId?: string;
                bookingId?: string;
                slipUrl?: string;
                slipKey?: string;
                error?: string;
            } = {};

            try {
                result =
                    await response.json();
            } catch {
                result = {};
            }

            if (
                !response.ok ||
                !result.success ||
                !result.paymentId
            ) {
                throw new Error(
                    result.error ||
                    "ไม่สามารถส่งหลักฐานการชำระเงินได้"
                );
            }

            router.push(
                `/booking/success?bookingId=${encodeURIComponent(
                    bookingId
                )}&paymentId=${encodeURIComponent(
                    result.paymentId
                )}`
            );
        } catch (error: unknown) {
            console.error(
                "Submit payment error:",
                error
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "ไม่สามารถส่งหลักฐานการชำระเงินได้ กรุณาลองใหม่อีกครั้ง";

            const friendlyMessage =
                message === "UNAUTHORIZED"
                    ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง"
                    : message === "INVALID_TOKEN"
                        ? "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง"
                        : message === "EMAIL_NOT_VERIFIED"
                            ? "กรุณายืนยันอีเมลก่อนส่งหลักฐานการชำระเงิน"
                            : message === "BOOKING_NOT_FOUND"
                                ? "ไม่พบรายการจองนี้ในระบบ"
                                : message === "PAYMENT_ALREADY_SUBMITTED"
                                    ? "รายการนี้ส่งหลักฐานไปแล้ว ไม่สามารถส่งซ้ำได้"
                                    : message;

            setSubmitError(friendlyMessage);
        } finally {
            setIsSubmitting(false);
            submitLockRef.current = false;
        }
    }

    if (loadingBooking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                    <Loader2
                        className="mx-auto animate-spin text-pink-500"
                        size={36}
                    />
                    <p className="mt-4 text-sm text-slate-500">
                        กำลังโหลดข้อมูลการจอง...
                    </p>
                </div>
            </main>
        );
    }

    if (bookingError || !booking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <X size={28} />
                    </div>

                    <h1 className="mt-5 text-2xl font-black text-slate-900">
                        ไม่สามารถเปิดรายการชำระเงิน
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        {bookingError}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push("/booking")
                        }
                        className="mt-6 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white hover:bg-pink-600"
                    >
                        กลับไปเริ่มการจอง
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen overflow-x-hidden bg-slate-50">
            {/* STEP INDICATOR */}
            <section className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                    <div className="overflow-x-auto pb-1">
                        <div className="flex min-w-max items-center justify-center gap-2 sm:gap-3">
                            {[
                                {
                                    label: "แพ็กเกจ",
                                    done: true,
                                },
                                {
                                    label: "วันจัดงาน",
                                    done: true,
                                },
                                {
                                    label: "ข้อมูลผู้จอง",
                                    done: true,
                                },
                                {
                                    label: "ตรวจสอบ",
                                    done: true,
                                },
                            ].map((step) => (
                                <div
                                    key={step.label}
                                    className="flex items-center gap-2 sm:gap-3"
                                >
                                    <span className="rounded-full bg-green-100 px-3 py-2 text-xs font-semibold text-green-700 sm:px-4 sm:text-sm">
                                        ✓ {step.label}
                                    </span>
                                    <span className="text-slate-300">
                                        →
                                    </span>
                                </div>
                            ))}

                            <span className="rounded-full bg-pink-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-pink-100 ring-4 ring-pink-50 sm:px-4 sm:text-sm">
                                ⑤ ชำระเงิน
                            </span>

                            <span className="text-slate-300">
                                →
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-500 sm:px-4 sm:text-sm">
                                ⑥ สำเร็จ
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* HEADER */}
            <section className="px-4 py-10 text-center sm:px-6 lg:py-14">
                <div className="mx-auto max-w-3xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-500">
                        <CreditCard size={28} />
                    </div>

                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-pink-500">
                        ขั้นตอนที่ 5 · การชำระเงิน
                    </p>

                    <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
                        ชำระเงิน
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                        โอนค่ามัดจำแล้วอัปโหลดหลักฐานเพื่อให้ทีมงานตรวจสอบ
                    </p>
                </div>
            </section>

            {/* CONTENT */}
            <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_450px] lg:items-start lg:gap-8">
                    {/* LEFT */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-9">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                                    สรุปการจอง
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    ข้อมูลจากรายการจองของคุณ
                                </p>
                            </div>

                            <div
                                className={[
                                    "hidden rounded-2xl px-4 py-3 text-center sm:block",
                                    alreadySubmitted
                                        ? "bg-purple-50"
                                        : "bg-amber-50",
                                ].join(" ")}
                            >
                                <p className="text-xs text-slate-500">
                                    สถานะ
                                </p>
                                <p
                                    className={[
                                        "mt-1 text-sm font-bold",
                                        alreadySubmitted
                                            ? "text-purple-700"
                                            : "text-amber-700",
                                    ].join(" ")}
                                >
                                    {alreadySubmitted
                                        ? "ส่งหลักฐานแล้ว"
                                        : "รอชำระเงิน"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-5 sm:col-span-2">
                                <p className="text-xs text-slate-400">
                                    Booking ID
                                </p>
                                <code className="mt-1 block break-all text-xs font-semibold text-slate-700">
                                    {booking.id}
                                </code>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                                <p className="text-xs text-slate-400">
                                    ลูกค้า
                                </p>
                                <p className="mt-1 font-bold text-slate-900">
                                    {booking.customer?.name || "-"}
                                </p>
                                {booking.customer?.phone && (
                                    <p className="mt-1 text-sm text-slate-500">
                                        {booking.customer.phone}
                                    </p>
                                )}
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                                <p className="text-xs text-slate-400">
                                    แพ็กเกจ
                                </p>
                                <p className="mt-1 font-bold text-slate-900">
                                    {selectedPackage.name}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                                <p className="text-xs text-slate-400">
                                    วันที่จัดงาน
                                </p>
                                <p className="mt-1 font-bold text-slate-900">
                                    {formatDate(eventDate)}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                                <p className="text-xs text-slate-400">
                                    ประเภทงาน
                                </p>
                                <p className="mt-1 font-bold text-slate-900">
                                    {booking.event?.type || "-"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-6">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">
                                    ราคาบริการ
                                </span>
                                <span className="font-semibold text-slate-900">
                                    {formatMoney(servicePrice)}
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-slate-500">
                                    ค่ามัดจำ
                                </span>
                                <span className="font-semibold text-pink-500">
                                    {formatMoney(paymentAmount)}
                                </span>
                            </div>

                            <div className="mt-5 flex items-end justify-between border-t pt-5">
                                <span className="font-bold text-slate-900">
                                    ยอดที่ต้องชำระ
                                </span>
                                <span className="text-3xl font-black text-pink-500">
                                    {formatMoney(paymentAmount)}
                                </span>
                            </div>
                        </div>

                        {alreadySubmitted && booking.payment?.proofUrl && (
                            <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50 p-4">
                                <p className="font-bold text-purple-700">
                                    ✓ ส่งหลักฐานการชำระเงินแล้ว
                                </p>
                                <p className="mt-1 text-xs leading-5 text-purple-700/80">
                                    ทีมงานกำลังตรวจสอบหลักฐานของคุณ
                                </p>
                            </div>
                        )}
                    </div>

                    {/* RIGHT */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-500">
                                <CreditCard size={21} />
                            </div>

                            <div>
                                <h2 className="font-black text-slate-900">
                                    ช่องทางการชำระเงิน
                                </h2>
                                <p className="text-sm text-slate-500">
                                    ชำระค่ามัดจำ{" "}
                                    {formatMoney(paymentAmount)}
                                </p>
                            </div>
                        </div>

                        {/* BANK */}
                        <div className="mt-7 overflow-hidden rounded-3xl border border-emerald-100">
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                                        <img
                                            src={PAYMENT_ACCOUNT.logoUrl}
                                            alt="KBank"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>

                                    <div>
                                        <p className="text-xs text-emerald-700">
                                            บัญชีรับเงิน
                                        </p>
                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            {PAYMENT_ACCOUNT.bankName}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {PAYMENT_ACCOUNT.bankShortName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5 p-5">
                                <div>
                                    <p className="text-xs text-slate-400">
                                        ชื่อบัญชี
                                    </p>
                                    <p className="mt-1 font-bold text-slate-900">
                                        {PAYMENT_ACCOUNT.accountName}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400">
                                        เลขบัญชี
                                    </p>

                                    <div className="mt-1 flex items-center justify-between gap-3">
                                        <span className="text-lg font-black tracking-wide text-slate-900 sm:text-xl">
                                            {PAYMENT_ACCOUNT.accountNumber}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={handleCopyAccount}
                                            className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check size={16} />
                                                    คัดลอกแล้ว
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={16} />
                                                    คัดลอก
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs text-slate-400">
                                        PromptPay
                                    </p>
                                    <p className="mt-1 font-bold tracking-wide text-slate-900">
                                        {PAYMENT_ACCOUNT.promptPay}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                    <p className="text-xs leading-5 text-amber-800">
                                        ⚠️ กรุณาตรวจสอบชื่อบัญชี ธนาคาร และเลขบัญชีให้ตรงก่อนโอนเงิน
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* QR */}
                        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                            <div className="px-5 pt-6 text-center">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                                    <span className="h-2 w-2 rounded-full bg-green-500" />
                                    PromptPay QR Payment
                                </span>

                                <h3 className="mt-4 text-lg font-black text-slate-900">
                                    สแกน QR เพื่อชำระเงิน
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    รองรับ Mobile Banking
                                </p>
                            </div>

                            <div className="p-5 sm:p-6">
                                <button
                                    type="button"
                                    onClick={() => setQrZoom(true)}
                                    className="group relative mx-auto block w-full max-w-[360px] overflow-hidden rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                                >
                                    <img
                                        src={PAYMENT_ACCOUNT.qrUrl}
                                        alt="PromptPay QR สำหรับชำระเงิน KOKO Memory"
                                        className="mx-auto aspect-square w-full object-contain"
                                    />

                                    <div className="pointer-events-none absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                                        <Maximize2 size={14} />
                                        ขยาย QR
                                    </div>
                                </button>

                                <div className="mt-5 rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200">
                                    <p className="text-xs text-slate-400">
                                        ยอดที่ต้องชำระ
                                    </p>
                                    <p className="mt-1 text-3xl font-black text-pink-500">
                                        {formatMoney(paymentAmount)}
                                    </p>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDownloadQR}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                                    >
                                        {qrSaved ? (
                                            <>
                                                <Check size={17} />
                                                บันทึกแล้ว
                                            </>
                                        ) : (
                                            <>
                                                <Download size={17} />
                                                บันทึก QR
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleShareQR}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                    >
                                        <Share2 size={17} />
                                        แชร์ QR
                                    </button>
                                </div>

                                {shareMessage && (
                                    <p className="mt-3 text-center text-xs font-semibold text-green-600">
                                        ✓ {shareMessage}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* UPLOAD */}
                        <div className="mt-6">
                            {alreadySubmitted ? (
                                <div className="rounded-3xl border border-purple-200 bg-purple-50 p-6 text-center">
                                    <CheckCircle2
                                        size={32}
                                        className="mx-auto text-purple-500"
                                    />
                                    <p className="mt-3 font-black text-purple-800">
                                        ส่งหลักฐานแล้ว
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-purple-700/80">
                                        ระบบรับหลักฐานของคุณแล้ว
                                        กรุณารอทีมงานตรวจสอบ
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <label
                                        htmlFor="payment-slip"
                                        className={[
                                            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition",
                                            slip
                                                ? "border-green-300 bg-green-50 hover:border-green-400"
                                                : "border-pink-200 bg-pink-50 hover:border-pink-400 hover:bg-pink-100",
                                        ].join(" ")}
                                    >
                                        <Upload
                                            size={25}
                                            className={
                                                slip
                                                    ? "text-green-500"
                                                    : "text-pink-500"
                                            }
                                        />

                                        <span className="mt-3 break-all font-semibold text-slate-900">
                                            {slip
                                                ? slip.name
                                                : "อัปโหลดหลักฐานการโอน"}
                                        </span>

                                        <span className="mt-1 text-xs text-slate-500">
                                            JPG, PNG หรือ PDF • สูงสุด 20 MB
                                        </span>

                                        <input
                                            id="payment-slip"
                                            type="file"
                                            accept="image/png,image/jpeg,application/pdf"
                                            className="hidden"
                                            disabled={isSubmitting}
                                            onChange={(event) => {
                                                handleFileChange(
                                                    event.currentTarget.files?.[0] ??
                                                        null
                                                );
                                                event.currentTarget.value = "";
                                            }}
                                        />
                                    </label>

                                    {slip && !slipError && (
                                        <div className="mt-3 overflow-hidden rounded-2xl border border-green-100 bg-green-50">
                                            {slipPreviewUrl ? (
                                                <div className="bg-slate-100 p-3">
                                                    <img
                                                        src={slipPreviewUrl}
                                                        alt="ตัวอย่างสลิป"
                                                        className="mx-auto max-h-[360px] w-full rounded-xl object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-5 text-center">
                                                    <CreditCard
                                                        size={28}
                                                        className="mx-auto text-red-500"
                                                    />
                                                    <p className="mt-2 font-bold text-slate-900">
                                                        ไฟล์ PDF
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-green-700">
                                                <span className="min-w-0 truncate">
                                                    ✓ เลือกไฟล์แล้ว ·{" "}
                                                    {(
                                                        slip.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{" "}
                                                    MB
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSlip(null)
                                                    }
                                                    disabled={isSubmitting}
                                                    className="shrink-0 font-bold hover:text-green-900 disabled:opacity-50"
                                                >
                                                    เปลี่ยนไฟล์
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {slipError && (
                                        <p className="mt-2 text-sm font-medium text-red-600">
                                            {slipError}
                                        </p>
                                    )}

                                    {submitError && (
                                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                                            {submitError}
                                        </div>
                                    )}

                                    <div className="mt-5 flex gap-3 rounded-2xl border border-green-100 bg-green-50 p-4">
                                        <ShieldCheck
                                            size={20}
                                            className="mt-0.5 shrink-0 text-green-600"
                                        />
                                        <p className="text-xs leading-5 text-green-700">
                                            สลิปจะถูกเก็บไว้ใน Cloudflare R2
                                            และเชื่อมกับรายการจองนี้
                                            ระบบจะยังไม่ถือว่าชำระเงินสำเร็จ
                                            จนกว่า Admin จะตรวจสอบและยืนยัน
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={
                                            !slip ||
                                            isSubmitting ||
                                            loadingBooking
                                        }
                                        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-pink-500 px-6 font-bold text-white shadow-lg shadow-pink-100 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2
                                                    size={19}
                                                    className="animate-spin"
                                                />
                                                กำลังอัปโหลดและส่งข้อมูล...
                                            </>
                                        ) : (
                                            <>
                                                ยืนยันการชำระเงิน
                                                <ArrowRight size={19} />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            {submitError && alreadySubmitted && (
                                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                                    {submitError}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    router.push(
                                        `/booking/review?package=${encodeURIComponent(
                                            packageId
                                        )}&date=${encodeURIComponent(
                                            eventDate
                                        )}&bookingId=${encodeURIComponent(
                                            bookingId
                                        )}`
                                    )
                                }
                                disabled={isSubmitting}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                <ArrowLeft size={17} />
                                กลับไปตรวจสอบข้อมูล
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mt-8 flex max-w-3xl gap-3 rounded-3xl border border-pink-100 bg-pink-50 p-5">
                    <CheckCircle2
                        size={22}
                        className="mt-0.5 shrink-0 text-pink-500"
                    />
                    <div>
                        <p className="font-bold text-slate-900">
                            หลังส่งหลักฐาน
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            รายการจะเปลี่ยนเป็น “รอตรวจสอบ”
                            และทีมงานจะตรวจสอบก่อนยืนยันการชำระเงิน
                        </p>
                    </div>
                </div>
            </section>

            {/* QR MODAL */}
            {qrZoom && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    onClick={() => setQrZoom(false)}
                >
                    <div
                        className="relative max-h-[95vh] max-w-[95vw] rounded-3xl bg-white p-4 shadow-2xl"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <button
                            type="button"
                            onClick={() => setQrZoom(false)}
                            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black"
                            aria-label="ปิด QR"
                        >
                            <X size={20} />
                        </button>

                        <img
                            src={PAYMENT_ACCOUNT.qrUrl}
                            alt="QR สำหรับชำระเงิน KOKO Memory"
                            className="max-h-[88vh] max-w-[90vw] rounded-2xl object-contain"
                        />

                        <button
                            type="button"
                            onClick={handleDownloadQR}
                            className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg"
                        >
                            <Download size={17} />
                            บันทึก QR
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={null}>
            <PaymentContent />
        </Suspense>
    );
}
