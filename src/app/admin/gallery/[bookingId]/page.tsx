"use client";

import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function BookingQRPage() {
    const params = useParams();

    const bookingId = String(params.bookingId || "");

    const [shareToken, setShareToken] = useState("");
    const [shareExpiresAt, setShareExpiresAt] = useState("");
    const [revoked, setRevoked] = useState(false);
    const [shareError, setShareError] = useState("");
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    useEffect(() => {
        if (!bookingId) return;
        (async () => {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error("ADMIN_LOGIN_REQUIRED");
                const response = await fetch(`/api/admin/gallery/${encodeURIComponent(bookingId)}/share`, { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
                const data = await response.json();
                if (!response.ok || !data.token) throw new Error(data.error || "สร้าง QR ไม่สำเร็จ");
                setShareToken(data.token);
                setShareExpiresAt(typeof data.expiresAt === "string" ? data.expiresAt : "");
            } catch (error) { setShareError(error instanceof Error ? error.message : "สร้าง QR ไม่สำเร็จ"); }
        })();
    }, [bookingId]);
    const galleryUrl = bookingId && shareToken ? `${appUrl}/gallery/${encodeURIComponent(bookingId)}?guestToken=${encodeURIComponent(shareToken)}` : "";
    async function revokeShare() {
        if (!shareToken || !window.confirm("ยืนยันการยกเลิก QR นี้หรือไม่?")) return;
        const user = auth.currentUser;
        if (!user) return;
        const response = await fetch(`/api/admin/gallery/${encodeURIComponent(bookingId)}/share?guestToken=${encodeURIComponent(shareToken)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        if (!response.ok) { setShareError("ยกเลิก QR ไม่สำเร็จ"); return; }
        setRevoked(true);
    }

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
                        {shareError || (revoked ? "QR นี้ถูกยกเลิกแล้ว" : galleryUrl ? "ให้ลูกค้าสแกน QR Code เพื่อเข้าสู่ Gallery" : "กำลังสร้าง QR ที่ปลอดภัย...")}
                    </p>
                    {shareExpiresAt && !revoked && <p className="mt-2 text-xs text-slate-400">หมดอายุ: {new Date(shareExpiresAt).toLocaleString("th-TH")}</p>}
                    {shareToken && !revoked && <button type="button" onClick={() => void revokeShare()} className="mt-5 rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-600 hover:bg-red-50">ยกเลิก QR</button>}

                </div>
            </div>
        </main>
    );
}
