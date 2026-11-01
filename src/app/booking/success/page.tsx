"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Copy,
    CreditCard,
    Home,
    LoaderCircle,
    ShieldCheck,
    XCircle,
} from "lucide-react";

import { useI18n } from "@/i18n";
import { auth, db } from "@/lib/firebase";

type BookingRecord = {
    userId?: string;
    bookingStatus?: string;
    paymentStatus?: string;
    paymentId?: string;
    package?: {
        id?: string;
        name?: string;
    };
    event?: {
        date?: string;
    };
    payment?: {
        status?: string;
    };
};

type LoadState =
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; booking: BookingRecord };

const steps = ["แพ็กเกจ", "วันจัดงาน", "ข้อมูล", "ตรวจสอบ", "ชำระเงิน", "สำเร็จ"];

function formatEventDate(date: string | undefined, locale: string) {
    if (!date) return "—";
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00`)
        : new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return new Intl.DateTimeFormat(locale === "en" ? "en" : "th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(parsedDate);
}

function getPaymentState(booking: BookingRecord) {
    const bookingStatus = booking.bookingStatus?.toLowerCase();
    const paymentStatus = booking.paymentStatus?.toLowerCase();
    const nestedStatus = booking.payment?.status?.toLowerCase();

    if (["payment_rejected", "rejected"].includes(bookingStatus ?? "") || paymentStatus === "rejected" || nestedStatus === "rejected") {
        return "rejected" as const;
    }
    if (
        ["payment_verified", "confirmed"].includes(bookingStatus ?? "") ||
        ["verified", "paid"].includes(paymentStatus ?? "") ||
        ["verified", "paid"].includes(nestedStatus ?? "")
    ) {
        return "verified" as const;
    }
    if (
        bookingStatus === "payment_submitted" ||
        paymentStatus === "submitted" ||
        nestedStatus === "submitted"
    ) {
        return "submitted" as const;
    }
    return "not-submitted" as const;
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const { locale, translate } = useI18n();
    const bookingId = searchParams.get("bookingId")?.trim() ?? "";
    const paymentId = searchParams.get("paymentId")?.trim() ?? "";
    const [state, setState] = useState<LoadState>({ kind: "loading" });
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    useEffect(() => {
        let cancelled = false;

        async function loadBooking() {
            if (!bookingId || !paymentId || !/^[A-Za-z0-9_-]{1,128}$/.test(bookingId)) {
                setState({ kind: "error", message: translate("ไม่พบข้อมูลการส่งหลักฐาน กรุณาเปิดจากหน้าชำระเงินอีกครั้ง") });
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                setState({ kind: "error", message: translate("กรุณาเข้าสู่ระบบเพื่อดูสถานะการจอง") });
                return;
            }

            try {
                const snapshot = await getDoc(doc(db, "bookings", bookingId));
                if (!snapshot.exists()) throw new Error("BOOKING_NOT_FOUND");

                const booking = snapshot.data() as BookingRecord;
                if (booking.userId !== user.uid) {
                    throw new Error("BOOKING_FORBIDDEN");
                }
                if (booking.paymentId !== paymentId) {
                    throw new Error("PAYMENT_REFERENCE_MISMATCH");
                }
                if (getPaymentState(booking) === "not-submitted") {
                    throw new Error("PAYMENT_NOT_SUBMITTED");
                }

                if (!cancelled) setState({ kind: "ready", booking });
            } catch (error) {
                if (!cancelled) {
                    const code = error instanceof Error ? error.message : "";
                    const messages: Record<string, string> = {
                        BOOKING_NOT_FOUND: "ไม่พบรายการจองนี้ในระบบ",
                        BOOKING_FORBIDDEN: "คุณไม่มีสิทธิ์ดูรายการจองนี้",
                        PAYMENT_REFERENCE_MISMATCH: "ข้อมูลการชำระเงินไม่ตรงกับรายการจองนี้",
                        PAYMENT_NOT_SUBMITTED: "ยังไม่พบหลักฐานการชำระเงินที่ส่งในรายการนี้",
                    };
                    setState({
                        kind: "error",
                        message: translate(messages[code] ?? "ไม่สามารถตรวจสอบรายการจองได้ กรุณาลองอีกครั้ง"),
                    });
                }
            }
        }

        void loadBooking();
        return () => {
            cancelled = true;
        };
    }, [bookingId, paymentId, translate]);

    async function copyBookingId() {
        try {
            await navigator.clipboard.writeText(bookingId);
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }
    }

    const stepper = (
        <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-pink-500">KOKO Memory</p>
                        <p className="truncate text-sm font-bold text-slate-900">{translate("ขั้นตอนการจอง")}</p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-slate-700">06 <span className="font-normal text-slate-300">/</span> 06</span>
                </div>
                <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <ol aria-label={translate("ขั้นตอนการจอง")} className="flex min-w-max items-center justify-start gap-2 sm:justify-center sm:gap-3">
                        {steps.map((step, index) => (
                            <li key={step} aria-current={index === 5 ? "step" : undefined} className="flex items-center gap-2 sm:gap-3">
                                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm ${index === 5 ? "bg-pink-500 text-white shadow-sm" : "bg-green-50 text-green-700"}`}>
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${index === 5 ? "bg-white/20" : "bg-green-100"}`}>{index === 5 ? "✓" : index + 1}</span>
                                    {translate(step)}
                                </span>
                                {index < steps.length - 1 && <span aria-hidden="true" className="text-slate-300">→</span>}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );

    if (state.kind === "loading") {
        return (
            <main className="min-h-screen bg-slate-50">
                {stepper}
                <div role="status" className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 text-center">
                    <LoaderCircle className="h-9 w-9 animate-spin text-pink-500" aria-hidden="true" />
                    <p className="mt-4 font-semibold text-slate-700">{translate("กำลังตรวจสอบข้อมูลการจอง")}</p>
                </div>
            </main>
        );
    }

    if (state.kind === "error") {
        return (
            <main className="min-h-screen bg-slate-50">
                {stepper}
                <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
                    <div role="alert" className="rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-9">
                        <XCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
                        <h1 className="mt-4 text-2xl font-black text-slate-900">{translate("ยังยืนยันผลการชำระเงินไม่ได้")}</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{state.message}</p>
                        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link href="/account/bookings" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-pink-500 px-6 font-bold text-white transition hover:bg-pink-600">{translate("รายการจองของฉัน")}<ArrowRight size={17} /></Link>
                            <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-6 font-bold text-slate-700 transition hover:bg-slate-50">{translate("กลับหน้าแรก")}</Link>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const { booking } = state;
    const paymentState = getPaymentState(booking);
    const isVerified = paymentState === "verified";
    const isRejected = paymentState === "rejected";
    const title = isVerified
        ? translate("ยืนยันการจองสำเร็จ")
        : isRejected
            ? translate("หลักฐานการชำระเงินถูกปฏิเสธ")
            : translate("ส่งหลักฐานสำเร็จ กำลังตรวจสอบ");
    const description = isVerified
        ? translate("ทีมงานยืนยันการชำระเงินและการจองของคุณแล้ว")
        : isRejected
            ? translate("กรุณาดูรายละเอียดและส่งหลักฐานการชำระเงินใหม่อีกครั้ง")
            : translate("ระบบได้รับหลักฐานการชำระเงินแล้ว ทีมงานจะตรวจสอบและยืนยันการจองอีกครั้ง");

    return (
        <main className="min-h-screen bg-slate-50">
            {stepper}
            <section className="px-4 py-10 text-center sm:px-6 sm:py-14">
                <div className="mx-auto max-w-3xl">
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${isRejected ? "bg-red-100" : "bg-green-100"}`}>
                        {isRejected ? <XCircle className="h-10 w-10 text-red-500" /> : <CheckCircle2 className="h-10 w-10 text-green-500" />}
                    </div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-sm">{translate("ผลการจอง")}</p>
                    <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl">{title}</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{description}</p>
                </div>
            </section>

            <section className="mx-auto max-w-5xl space-y-5 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
                <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-500">{translate("Booking ID")}</p>
                            <div className="mt-2 flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
                                <code className="min-w-0 break-all text-sm font-black leading-6 text-slate-900 sm:text-lg">{bookingId}</code>
                                <button type="button" onClick={copyBookingId} className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-pink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500" aria-label={translate("คัดลอก Booking ID")}>
                                    <Copy size={18} />
                                </button>
                            </div>
                            <p aria-live="polite" className="mt-1 min-h-5 text-xs text-slate-500">
                                {copyState === "copied" ? translate("คัดลอก Booking ID แล้ว") : copyState === "failed" ? translate("คัดลอกไม่สำเร็จ กรุณาคัดลอกรหัสด้วยตนเอง") : ""}
                            </p>
                        </div>
                        <div className={`inline-flex w-fit max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isVerified ? "border border-green-200 bg-green-50 text-green-700" : isRejected ? "border border-red-200 bg-red-50 text-red-700" : "border border-amber-200 bg-amber-50 text-amber-700"}`}>
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isVerified ? "bg-green-500" : isRejected ? "bg-red-500" : "bg-amber-400"}`} />
                            <span>{isVerified ? translate("ชำระเงินแล้ว") : isRejected ? translate("ต้องส่งหลักฐานใหม่") : translate("รอตรวจสอบการชำระเงิน")}</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-500"><CalendarDays size={21} /></span>
                            <div><h2 className="font-black text-slate-900">{translate("รายละเอียดการจอง")}</h2><p className="text-sm text-slate-500">{translate("ข้อมูลบริการ")}</p></div>
                        </div>
                        <dl className="mt-5 space-y-3">
                            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs text-slate-500">{translate("แพ็กเกจ")}</dt><dd className="mt-1 break-words font-bold text-slate-900">{booking.package?.name || booking.package?.id || "—"}</dd></div>
                            <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs text-slate-500">{translate("วันที่จัดงาน")}</dt><dd className="mt-1 font-bold text-slate-900">{formatEventDate(booking.event?.date, locale)}</dd></div>
                        </dl>
                    </article>

                    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600"><CreditCard size={21} /></span>
                            <div><h2 className="font-black text-slate-900">{translate("การชำระเงิน")}</h2><p className="text-sm text-slate-500">{translate("Payment information")}</p></div>
                        </div>
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs text-slate-500">{translate("เลขอ้างอิงการชำระเงิน")}</p>
                            <code className="mt-1 block break-all font-bold text-slate-900">{paymentId}</code>
                        </div>
                        <div className={`mt-3 flex items-start gap-3 rounded-2xl p-4 ${isVerified ? "bg-green-50 text-green-800" : isRejected ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                            <ShieldCheck size={20} className="mt-0.5 shrink-0" />
                            <p className="text-sm leading-6">{description}</p>
                        </div>
                    </article>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                    <Link href={`/account/bookings/${encodeURIComponent(bookingId)}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-pink-500 px-7 font-bold text-white transition hover:bg-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2">
                        {translate("ดูรายละเอียดการจอง")}<ArrowRight size={18} />
                    </Link>
                    <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 font-bold text-slate-700 transition hover:border-pink-200 hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2">
                        <Home size={18} />{translate("กลับหน้าแรก")}
                    </Link>
                </div>
            </section>
        </main>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
            <SuccessContent />
        </Suspense>
    );
}
