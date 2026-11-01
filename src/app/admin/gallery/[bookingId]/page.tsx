"use client";

import { QRCodeSVG } from "qrcode.react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function BookingQRPage() {
    const params = useParams();

    const bookingId = String(params.bookingId || "");

    const [shareToken, setShareToken] = useState("");
    const [shareId, setShareId] = useState("");
    const [shareExpiresAt, setShareExpiresAt] = useState("");
    const [revoked, setRevoked] = useState(false);
    const [shareError, setShareError] = useState("");
    const [uploadState, setUploadState] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploaderConfigState, setUploaderConfigState] = useState("");
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
                setShareId(typeof data.shareId === "string" ? data.shareId : "");
                setShareExpiresAt(typeof data.expiresAt === "string" ? data.expiresAt : "");
            } catch (error) { setShareError(error instanceof Error ? error.message : "สร้าง QR ไม่สำเร็จ"); }
        })();
    }, [bookingId]);
    const galleryUrl = bookingId && shareToken ? `${appUrl}/gallery/${encodeURIComponent(bookingId)}?guestToken=${encodeURIComponent(shareToken)}` : "";
    async function uploadFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0 || !shareId) return;
        const files = Array.from(fileList);
        setUploading(true);
        let complete = 0;
        let failed = 0;
        setUploadState(`กำลังเตรียมอัปโหลด ${files.length} รูป...`);
        const user = auth.currentUser;
        if (!user) { setUploading(false); setUploadState("กรุณาเข้าสู่ระบบใหม่"); return; }
        const idToken = await user.getIdToken();
        for (let offset = 0; offset < files.length; offset += 3) {
            const group = files.slice(offset, offset + 3);
            await Promise.all(group.map(async (file) => {
                try {
                    const init = await fetch(`/api/admin/gallery/${encodeURIComponent(bookingId)}/uploads`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ shareId, fileName: file.name, contentType: file.type, size: file.size }),
                    });
                    const upload = await init.json();
                    if (!init.ok || typeof upload.uploadUrl !== "string" || typeof upload.photoId !== "string") throw new Error(upload.error || "เริ่มอัปโหลดไม่สำเร็จ");
                    let putOk = false;
                    try {
                        const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
                        putOk = put.ok;
                    } catch {
                        // Fall back to the same-origin streaming route if R2 CORS is unavailable.
                    }
                    if (!putOk) {
                        const fallback = await fetch(`/api/admin/gallery/${encodeURIComponent(bookingId)}/uploads?shareId=${encodeURIComponent(shareId)}&photoId=${encodeURIComponent(upload.photoId)}`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${idToken}`, "Content-Type": file.type },
                            body: file,
                        });
                        if (!fallback.ok) throw new Error("ส่งไฟล์ไปยังคลังรูปไม่สำเร็จ");
                    }
                    const finish = await fetch(`/api/admin/gallery/${encodeURIComponent(bookingId)}/uploads`, {
                        method: "PATCH",
                        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ shareId, photoId: upload.photoId }),
                    });
                    if (!finish.ok) throw new Error("ตรวจสอบไฟล์หลังอัปโหลดไม่สำเร็จ");
                    complete++;
                } catch (error) {
                    failed++;
                    console.error("Gallery upload failed", file.name, error);
                } finally {
                    setUploadState(`ส่งแล้ว ${complete}/${files.length}${failed ? ` · ผิดพลาด ${failed}` : ""}`);
                }
            }));
        }
        setUploading(false);
        setUploadState(failed ? `ส่งสำเร็จ ${complete} รูป · ${failed} รูปส่งไม่สำเร็จ ลองเลือกส่งซ้ำได้` : `ส่งรูป ${complete} รูปแล้ว · พร้อมให้ลูกค้าดูและดาวน์โหลด`);
    }
    async function downloadUploaderConfig() {
        const user = auth.currentUser;
        if (!user || !shareId) return;
        setUploaderConfigState("กำลังสร้างไฟล์เชื่อม Windows...");
        try {
            const response = await fetch(`/api/admin/gallery/${encodeURIComponent(bookingId)}/uploads/device-token`, {
                method: "POST",
                headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
                body: JSON.stringify({ shareId }),
            });
            const data = await response.json() as { success?: boolean; token?: string; error?: string };
            if (!response.ok || !data.success || !data.token) throw new Error(data.error || "สร้างไฟล์เชื่อม Windows ไม่สำเร็จ");
            const file = new Blob([JSON.stringify({ apiBaseUrl: appUrl, bookingId, shareId, uploadToken: data.token, watchFolder: "" }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.href = url;
            link.download = `koko-uploader-${bookingId}.json`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setUploaderConfigState("ดาวน์โหลดไฟล์แล้ว เปิด PowerShell Uploader บน Windows เพื่อเลือกโฟลเดอร์รูป");
        } catch (error) {
            setUploaderConfigState(error instanceof Error ? error.message : "สร้างไฟล์เชื่อม Windows ไม่สำเร็จ");
        }
    }
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
                    {shareId && !revoked && <div className="mt-7 border-t border-slate-100 pt-6 text-left">
                        <label htmlFor="gallery-upload" className="block text-sm font-semibold text-slate-700">เพิ่มรูปเข้า QR ชุดนี้</label>
                        <p className="mt-1 text-xs text-slate-500">เลือกรูป JPEG, PNG หรือ WebP ขนาดไม่เกิน 25 MB ต่อรูป ลูกค้าจะเห็นรูปเมื่อส่งไฟล์ครบ</p>
                        <input id="gallery-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(event) => { void uploadFiles(event.target.files); event.currentTarget.value = ""; }} className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:font-semibold file:text-pink-700 disabled:opacity-50" />
                        {uploadState && <p aria-live="polite" className="mt-3 text-sm text-slate-600">{uploadState}</p>}
                        <button type="button" onClick={() => void downloadUploaderConfig()} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">ตั้งค่า Windows ให้ส่งรูปจากโฟลเดอร์อัตโนมัติ</button>
                        {uploaderConfigState && <p aria-live="polite" className="mt-2 text-xs text-slate-500">{uploaderConfigState}</p>}
                        <a href="/downloads/KokoUploader.ps1" download className="mt-3 block text-center text-sm font-semibold text-pink-600 underline">ดาวน์โหลดโปรแกรม KOKO Uploader สำหรับ Windows</a>
                        <p className="mt-2 text-xs text-slate-400">สร้างไฟล์ตั้งค่าใหม่จะยกเลิกรหัสของไฟล์ตั้งค่าเดิม</p>
                    </div>}
                    {shareExpiresAt && !revoked && <p className="mt-2 text-xs text-slate-400">หมดอายุ: {new Date(shareExpiresAt).toLocaleString("th-TH")}</p>}
                    {shareToken && !revoked && <button type="button" onClick={() => void revokeShare()} className="mt-5 rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-600 hover:bg-red-50">ยกเลิก QR</button>}

                </div>
            </div>
        </main>
    );
}
