"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";

type Photo = {
    id: string;
    bookingId: string;
    fileName: string;
    contentType: string;
    size: number;
    url: string;
};

export default function GalleryPage() {
    const params = useParams();

    const bookingId = String(
        params.bookingId || ""
    );
    const searchParams = useSearchParams();
    const guestToken = searchParams.get("guestToken") || searchParams.get("token");

    const [photos, setPhotos] =
        useState<Photo[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [downloadingId, setDownloadingId] =
        useState("");
    const [olderCursor, setOlderCursor] = useState("");
    const [loadingOlder, setLoadingOlder] = useState(false);
    const updateCursorRef = useRef("");
    const refreshInProgressRef = useRef(false);

    // =========================================
    // LOAD GALLERY
    // =========================================

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            setError("ไม่พบ Booking ID");
            return;
        }

        async function loadGallery(since?: string, isUpdate = false, older?: string) {
            if (isUpdate) refreshInProgressRef.current = true;
            let nextCursor = "";
            try {
                const user = auth.currentUser;
                const idToken = user ? await user.getIdToken() : "";
                setError("");

                const query = new URLSearchParams();
                if (guestToken) query.set("guestToken", guestToken);
                if (since) query.set("since", since);
                if (older) query.set("older", older);
                const galleryQuery = query.size ? `?${query.toString()}` : "";
                const response = await fetch(
                    `/api/gallery/${encodeURIComponent(bookingId)}${galleryQuery}`,
                    {
                        method: "GET",
                        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
                        ...(guestToken ? { } : {}),
                        cache: "no-store",
                    }
                );

                const text =
                    await response.text();

                let data: {
                    success?: boolean;
                    photos?: Photo[];
                    error?: string;
                    message?: string;
                    nextSince?: string | null;
                    serverCursor?: string;
                    olderCursor?: string | null;
                };

                try {
                    data = JSON.parse(text);
                } catch {
                    console.error(
                        "API returned:",
                        text
                    );

                    throw new Error(
                        "API ไม่ได้ส่ง JSON กลับมา"
                    );
                }

                console.log(
                    "Gallery API:",
                    data
                );

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        data.message ||
                        "โหลดรูปไม่สำเร็จ"
                    );
                }

                if (!data.success) {
                    throw new Error(
                        data.error ||
                        "โหลด Gallery ไม่สำเร็จ"
                    );
                }

                const receivedPhotos = Array.isArray(data.photos) ? data.photos : [];
                if (since || older) {
                    setPhotos((current) => {
                        const merged = new Map(current.map((photo) => [photo.id, photo]));
                        for (const photo of receivedPhotos) merged.set(photo.id, photo);
                        return Array.from(merged.values());
                    });
                } else {
                    setPhotos(receivedPhotos);
                }
                if (data.nextSince) nextCursor = data.nextSince;
                else if (!older && data.serverCursor) updateCursorRef.current = data.serverCursor;
                if (!since) setOlderCursor(data.olderCursor || "");
            } catch (error) {
                console.error(
                    "Gallery error:",
                    error
                );

                setError(
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาด"
                );
            } finally {
                setLoading(false);
                if (older) setLoadingOlder(false);
                if (isUpdate) {
                    if (nextCursor) window.setTimeout(() => void loadGallery(nextCursor, true), 100);
                    else refreshInProgressRef.current = false;
                }
            }
        }

        void loadGallery();
        const refreshTimer = window.setInterval(() => {
            if (document.visibilityState === "visible" && updateCursorRef.current && !refreshInProgressRef.current) void loadGallery(updateCursorRef.current, true);
        }, 8000);
        return () => window.clearInterval(refreshTimer);
    }, [bookingId, guestToken]);

    async function loadOlderPhotos() {
        if (!olderCursor || loadingOlder) return;
        setLoadingOlder(true);
        const query = new URLSearchParams();
        if (guestToken) query.set("guestToken", guestToken);
        query.set("older", olderCursor);
        try {
            const user = auth.currentUser;
            const idToken = user ? await user.getIdToken() : "";
            const response = await fetch(`/api/gallery/${encodeURIComponent(bookingId)}?${query.toString()}`, {
                headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
                cache: "no-store",
            });
            const result = await response.json() as { success?: boolean; photos?: Photo[]; olderCursor?: string | null };
            if (!response.ok || !result.success) throw new Error("โหลดรูปเพิ่มเติมไม่สำเร็จ");
            setPhotos((current) => {
                const merged = new Map(current.map((photo) => [photo.id, photo]));
                for (const photo of result.photos || []) merged.set(photo.id, photo);
                return Array.from(merged.values());
            });
            setOlderCursor(result.olderCursor || "");
        } catch (error) {
            setError(error instanceof Error ? error.message : "โหลดรูปเพิ่มเติมไม่สำเร็จ");
        } finally {
            setLoadingOlder(false);
        }
    }

    // =========================================
    // DOWNLOAD
    // =========================================

    const handleDownload = async (
        photo: Photo
    ) => {
        if (!photo.id) {
            alert(
                "ไม่พบ Photo ID"
            );
            return;
        }

        try {
            setDownloadingId(photo.id);
            const user = auth.currentUser;
            const idToken = user ? await user.getIdToken() : "";
            if (!idToken && !guestToken) throw new Error("กรุณาเข้าสู่ระบบเพื่อดาวน์โหลดรูป");

            console.log(
                "Downloading photo:",
                photo.id
            );

            const downloadUrl = `/api/gallery/${encodeURIComponent(bookingId)}/download/${encodeURIComponent(photo.id)}${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ""}`;

            console.log(
                "Download URL:",
                downloadUrl
            );

            const response = await fetch(downloadUrl, { headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined, cache: "no-store" });
            const result = await response.json().catch(() => ({})) as { success?: boolean; downloadUrl?: string; error?: string };
            if (!response.ok || !result.success || !result.downloadUrl) throw new Error(result.error || "ดาวน์โหลดรูปไม่สำเร็จ");

            const link = document.createElement("a");
            link.href = result.downloadUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (error) {
            console.error(
                "Download error:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "ไม่สามารถบันทึกรูปได้"
            );
        } finally {
            setDownloadingId("");
        }
    };

    // =========================================
    // RENDER
    // =========================================

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">

            <div className="mx-auto max-w-7xl">

                {/* HEADER */}

                <div className="mb-10 text-center">

                    <p className="text-sm font-semibold tracking-[0.35em] text-pink-500">
                        KOKO MEMORY
                    </p>

                    <h1 className="mt-3 text-4xl font-bold text-slate-900">
                        Your Photos
                    </h1>

                    <p className="mt-3 text-slate-500">
                        รูปภาพจากงานของคุณ
                    </p>

                    <div className="mt-5 inline-block rounded-full bg-pink-50 px-5 py-2">

                        <span className="text-sm text-pink-600">

                            Booking:{" "}

                            <span className="font-semibold">
                                {bookingId}
                            </span>

                        </span>

                    </div>

                </div>

                {/* LOADING */}

                {loading && (
                    <div className="flex min-h-[300px] items-center justify-center">

                        <div className="text-center">

                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />

                            <p className="mt-4 text-slate-500">
                                กำลังโหลดรูป...
                            </p>

                        </div>

                    </div>
                )}

                {/* ERROR */}

                {!loading && error && (
                    <div className="mx-auto max-w-xl rounded-2xl bg-red-50 p-6 text-center">

                        <p className="font-semibold text-red-700">
                            โหลด Gallery ไม่สำเร็จ
                        </p>

                        <p className="mt-2 break-all text-sm text-red-500">
                            {error}
                        </p>

                        <button
                            onClick={() =>
                                window.location.reload()
                            }
                            className="mt-5 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-400"
                        >
                            ลองใหม่
                        </button>

                    </div>
                )}

                {/* NO PHOTO */}

                {!loading &&
                    !error &&
                    photos.length === 0 && (

                        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">

                            <div className="text-5xl">
                                📷
                            </div>

                            <h2 className="mt-5 text-xl font-semibold text-slate-900">
                                ยังไม่มีรูป
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                Booking นี้ยังไม่มีรูปภาพ
                            </p>

                        </div>
                    )}

                {/* GALLERY */}

                {!loading &&
                    !error &&
                    photos.length > 0 && (

                        <div>

                            <div className="mb-6">

                                <h2 className="text-2xl font-bold text-slate-900">
                                    Gallery
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {photos.length} รูป
                                </p>

                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                                {photos.map(
                                    (photo) => (

                                        <div
                                            key={photo.id}
                                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                        >

                                            {/* IMAGE */}

                                            <div className="aspect-square bg-slate-100">

                                                <img
                                                    src={
                                                        photo.url
                                                    }
                                                    alt={
                                                        photo.fileName ||
                                                        "KOKO Memory Photo"
                                                    }
                                                    className="h-full w-full object-cover"
                                                />

                                            </div>

                                            {/* INFO */}

                                            <div className="p-4">

                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {
                                                        photo.fileName
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {(
                                                        photo.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(
                                                        2
                                                    )}{" "}
                                                    MB
                                                </p>

                                                {/* OPEN */}

                                                <a
                                                    href={
                                                        photo.url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-4 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    เปิดรูป
                                                </a>

                                                {/* DOWNLOAD */}

                                                <button
                                                    type="button"
                                                    disabled={
                                                        downloadingId ===
                                                        photo.id
                                                    }
                                                    onClick={() =>
                                                        handleDownload(
                                                            photo
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {downloadingId ===
                                                        photo.id
                                                        ? "กำลังบันทึก..."
                                                        : "บันทึกรูป"}
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                            {olderCursor && <button type="button" onClick={() => void loadOlderPhotos()} disabled={loadingOlder} className="mx-auto mt-8 block rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">
                                {loadingOlder ? "กำลังโหลดรูป..." : "โหลดรูปเพิ่มเติม"}
                            </button>}

                        </div>
                    )}

            </div>

        </main>
    );
}
